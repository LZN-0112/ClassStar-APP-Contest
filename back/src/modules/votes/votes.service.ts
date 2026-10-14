import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import { RedisService } from '@/common/cache/redis.service';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateVoteDto,
  QueryVotesDto,
  SubmitVoteDto,
  VoteType,
} from './dto/votes.dto';

@Injectable()
export class VotesService {
  private readonly logger = new Logger(VotesService.name);
  private readonly idempotencyTtl = 30;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async verifyClassAccess(userId: string, classId: string) {
    if (!classId) {
      throw new BadRequestException('班级ID不能为空');
    }
    const member = await this.prisma.class_members.findFirst({
      where: { user_id: userId, class_id: classId },
    });
    if (!member) {
      throw new ForbiddenException('无权访问该班级数据');
    }
    return member;
  }

  async verifyCommittee(userId: string, classId: string) {
    const member = await this.verifyClassAccess(userId, classId);
    if (!member.is_committee) {
      throw new ForbiddenException('当前身份无权执行该操作');
    }
    return member;
  }

  private escapeHtml(input?: string): string | undefined {
    if (!input) return input;
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private isVoteOpen(vote: { deadline: Date; status: string }) {
    if (vote.status === 'closed') return false;
    return new Date(vote.deadline) > new Date();
  }

  private getIdempotencyKey(userId: string, voteId: string) {
    return `vote:submit:${userId}:${voteId}`;
  }

  async create(classId: string, dto: CreateVoteDto, userId: string) {
    await this.verifyCommittee(userId, classId);

    const deadline = new Date(dto.deadline);
    if (isNaN(deadline.getTime())) {
      throw new BadRequestException('截止时间格式不正确');
    }
    if (deadline <= new Date()) {
      throw new BadRequestException('截止时间必须晚于当前时间');
    }

    const voteId = uuidv4();
    const options = dto.options.map((label, index) => ({
      id: uuidv4(),
      vote_id: voteId,
      label: this.escapeHtml(label),
      sort_order: index,
    }));

    try {
      await this.prisma.$transaction([
        this.prisma.votes.create({
          data: {
            id: voteId,
            class_id: classId,
            publisher_id: userId,
            title: this.escapeHtml(dto.title),
            vote_type: dto.voteType || VoteType.SINGLE,
            deadline,
            status: 'published',
          },
        }),
        this.prisma.vote_options.createMany({ data: options }),
      ]);

      return {
        id: voteId,
        title: dto.title,
        voteType: dto.voteType || VoteType.SINGLE,
        deadline,
        options: options.map((o) => ({ id: o.id, label: o.label })),
      };
    } catch (error) {
      this.logger.error(`发布投票失败: ${error.message}`, error.stack);
      throw new BadRequestException(error.message || '发布投票失败');
    }
  }

  async findAll(classId: string, userId: string, query: QueryVotesDto) {
    await this.verifyClassAccess(userId, classId);

    const { status, page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;

    const where: any = { class_id: classId };
    if (status) {
      where.status = status;
    }

    const [votes, total] = await Promise.all([
      this.prisma.votes.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: pageSize,
        include: {
          _count: { select: { vote_records: true } },
          vote_options: { orderBy: { sort_order: 'asc' } },
        },
      }),
      this.prisma.votes.count({ where }),
    ]);

    const memberCount = await this.prisma.class_members.count({
      where: { class_id: classId },
    });

    const list = votes.map((vote) => {
      const participantCount = vote._count.vote_records;
      return {
        ...this.toVoteDto(vote),
        participantCount,
        participationRate: this.calcRate(participantCount, memberCount),
        options: vote.vote_options.map((o) => ({
          id: o.id,
          label: o.label,
          sortOrder: o.sort_order,
        })),
      };
    });

    return { list, total, page, pageSize };
  }

  async findOne(classId: string, voteId: string, userId: string) {
    await this.verifyClassAccess(userId, classId);

    const vote = await this.prisma.votes.findFirst({
      where: { id: voteId, class_id: classId },
      include: {
        vote_options: { orderBy: { sort_order: 'asc' } },
      },
    });

    if (!vote) {
      throw new NotFoundException('投票不存在');
    }

    const myRecords = await this.prisma.vote_records.findMany({
      where: { vote_id: voteId, student_id: userId },
      select: { option_id: true },
    });

    const participantCount = await this.prisma.vote_records.groupBy({
      by: ['student_id'],
      where: { vote_id: voteId },
      _count: { student_id: true },
    });

    return {
      ...this.toVoteDto(vote),
      isOpen: this.isVoteOpen(vote),
      hasVoted: myRecords.length > 0,
      myOptionIds: myRecords.map((r) => r.option_id),
      participantCount: participantCount.length,
      options: vote.vote_options.map((o) => ({
        id: o.id,
        label: o.label,
        sortOrder: o.sort_order,
      })),
    };
  }

  async submitVote(
    classId: string,
    voteId: string,
    dto: SubmitVoteDto,
    userId: string,
  ) {
    await this.verifyClassAccess(userId, classId);

    const idempotencyKey = this.getIdempotencyKey(userId, voteId);
    const exists = await this.redisService.exists(idempotencyKey);
    if (exists) {
      throw new BadRequestException('请勿重复提交');
    }
    await this.redisService.set(idempotencyKey, '1', this.idempotencyTtl);

    try {
      const vote = await this.prisma.votes.findFirst({
        where: { id: voteId, class_id: classId },
        include: { vote_options: true },
      });
      if (!vote) {
        throw new NotFoundException('投票不存在');
      }
      if (!this.isVoteOpen(vote)) {
        throw new BadRequestException('投票已截止');
      }

      const optionIdSet = new Set(vote.vote_options.map((o) => o.id));
      for (const optionId of dto.optionIds) {
        if (!optionIdSet.has(optionId)) {
          throw new BadRequestException('存在无效的选项');
        }
      }

      if (vote.vote_type === VoteType.SINGLE && dto.optionIds.length !== 1) {
        throw new BadRequestException('单选投票只能选择一个选项');
      }

      if (vote.vote_type === VoteType.MULTIPLE) {
        const unique = new Set(dto.optionIds);
        if (unique.size !== dto.optionIds.length) {
          throw new BadRequestException('多选选项不能重复');
        }
        if (dto.optionIds.length > vote.vote_options.length) {
          throw new BadRequestException('选择项数超过可选项总数');
        }
      }

      const existingRecords = await this.prisma.vote_records.findMany({
        where: { vote_id: voteId, student_id: userId },
      });
      if (existingRecords.length > 0) {
        throw new BadRequestException('您已参与该投票');
      }

      await this.prisma.vote_records.createMany({
        data: dto.optionIds.map((optionId) => ({
          id: uuidv4(),
          vote_id: voteId,
          option_id: optionId,
          student_id: userId,
        })),
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`提交投票失败: ${error.message}`, error.stack);
      throw error instanceof BadRequestException || error instanceof NotFoundException
        ? error
        : new BadRequestException(error.message || '提交投票失败');
    }
  }

  async getResults(classId: string, voteId: string, userId: string) {
    await this.verifyClassAccess(userId, classId);

    const vote = await this.prisma.votes.findFirst({
      where: { id: voteId, class_id: classId },
      include: { vote_options: { orderBy: { sort_order: 'asc' } } },
    });
    if (!vote) {
      throw new NotFoundException('投票不存在');
    }

    const records = await this.prisma.vote_records.groupBy({
      by: ['option_id'],
      where: { vote_id: voteId },
      _count: { option_id: true },
    });

    const participantCount = await this.prisma.vote_records.groupBy({
      by: ['student_id'],
      where: { vote_id: voteId },
      _count: { student_id: true },
    });

    const countMap = new Map(records.map((r) => [r.option_id, r._count.option_id]));
    const totalParticipants = participantCount.length;

    const memberCount = await this.prisma.class_members.count({
      where: { class_id: classId },
    });

    return {
      vote: this.toVoteDto(vote),
      totalParticipants,
      participationRate: this.calcRate(totalParticipants, memberCount),
      isOpen: this.isVoteOpen(vote),
      options: vote.vote_options.map((o) => {
        const count = countMap.get(o.id) || 0;
        return {
          id: o.id,
          label: o.label,
          count,
          rate: this.calcRate(count, totalParticipants),
        };
      }),
    };
  }

  async findMyVotes(classId: string, userId: string, query: QueryVotesDto) {
    await this.verifyClassAccess(userId, classId);

    const { status, page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;

    const where: any = { class_id: classId };
    if (status) {
      where.status = status;
    }

    const votes = await this.prisma.votes.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: pageSize,
      include: {
        vote_options: { orderBy: { sort_order: 'asc' } },
        vote_records: {
          where: { student_id: userId },
          select: { option_id: true },
        },
      },
    });

    const total = await this.prisma.votes.count({ where });

    const list = votes.map((vote) => ({
      ...this.toVoteDto(vote),
      isOpen: this.isVoteOpen(vote),
      hasVoted: vote.vote_records.length > 0,
      myOptionIds: vote.vote_records.map((r) => r.option_id),
      options: vote.vote_options.map((o) => ({
        id: o.id,
        label: o.label,
      })),
    }));

    return { list, total, page, pageSize };
  }

  private calcRate(numerator: number, denominator: number): number {
    if (denominator <= 0) return 0;
    return Number(((numerator / denominator) * 100).toFixed(2));
  }

  private toVoteDto(vote: any) {
    return {
      id: vote.id,
      classId: vote.class_id,
      publisherId: vote.publisher_id,
      title: vote.title,
      voteType: vote.vote_type,
      deadline: vote.deadline,
      status: vote.status,
      createdAt: vote.created_at,
      updatedAt: vote.updated_at,
    };
  }
}
