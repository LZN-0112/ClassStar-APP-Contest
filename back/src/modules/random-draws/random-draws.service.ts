import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import { MessagesService } from '../messages/messages.service';
import { isSystemAccount } from '@/common/utils/system-account.util';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateRandomDrawDto,
  QueryRandomDrawsDto,
} from './dto/random-draws.dto';

@Injectable()
export class RandomDrawsService {
  private readonly logger = new Logger(RandomDrawsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messagesService: MessagesService,
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
    if (member.role_level !== 'owner' && member.role_level !== 'admin') {
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

  private shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  async create(classId: string, dto: CreateRandomDrawDto, userId: string) {
    const member = await this.verifyClassAccess(userId, classId);

    const mainCount = dto.mainCount ?? 1;
    const backupCount = dto.backupCount ?? 0;

    if (mainCount < 1) {
      throw new BadRequestException('正选人数至少为1');
    }
    if (mainCount + backupCount < 1) {
      throw new BadRequestException('正选与候补人数总和至少为1');
    }

    const excludedUserIds = dto.excludedUserIds || [];

    const members = await this.prisma.class_members.findMany({
      where: { class_id: classId },
      include: { users: { select: { id: true, name: true, student_id: true, phone: true } } },
    });

    // 过滤排除人员；平台内置账号（系统管理员）不参与抽签
    const candidates = members.filter(
      (m) => !excludedUserIds.includes(m.user_id) && !isSystemAccount(m.users),
    );

    if (candidates.length < mainCount + backupCount) {
      throw new BadRequestException('候选人人数不足以抽取指定数量');
    }

    let mainList: typeof candidates;
    let backupList: typeof candidates;

    if (dto.mainUserIds || dto.backupUserIds) {
      // 保存时沿用预览页展示的结果，避免再次随机导致展示与保存不一致
      const mainIds = dto.mainUserIds || [];
      const backupIds = dto.backupUserIds || [];
      if (mainIds.length !== mainCount || backupIds.length !== backupCount) {
        throw new BadRequestException('抽签结果与抽签人数不一致，请重新抽签');
      }

      const allIds = [...mainIds, ...backupIds];
      if (new Set(allIds).size !== allIds.length) {
        throw new BadRequestException('抽签结果中存在重复成员，请重新抽签');
      }

      const candidateMap = new Map(candidates.map((m) => [m.user_id, m]));
      const selected = allIds.map((id) => candidateMap.get(id));
      if (selected.some((m) => !m)) {
        throw new BadRequestException('抽签结果中包含无效成员，请重新抽签');
      }

      const selectedMembers = selected as typeof candidates;
      mainList = selectedMembers.slice(0, mainCount);
      backupList = selectedMembers.slice(mainCount);
    } else {
      const shuffled = this.shuffle(candidates);
      mainList = shuffled.slice(0, mainCount);
      backupList = shuffled.slice(mainCount, mainCount + backupCount);
    }

    const drawId = uuidv4();

    try {
      await this.prisma.$transaction([
        this.prisma.random_draw_records.create({
          data: {
            id: drawId,
            class_id: classId,
            created_by: userId,
            creator_role_level: member.role_level,
            title: this.escapeHtml(dto.title),
            main_count: mainCount,
            backup_count: backupCount,
            status: 'confirmed',
          },
        }),
        this.prisma.random_draw_members.createMany({
          data: [
            ...mainList.map((m) => ({
              id: uuidv4(),
              draw_id: drawId,
              student_id: m.user_id,
              draw_type: 'main',
            })),
            ...backupList.map((m) => ({
              id: uuidv4(),
              draw_id: drawId,
              student_id: m.user_id,
              draw_type: 'backup',
            })),
          ],
        }),
      ]);

      return {
        id: drawId,
        classId,
        title: dto.title,
        mainCount,
        backupCount,
        main: mainList.map((m) => ({
          userId: m.user_id,
          studentId: m.users.student_id,
          name: m.users.name,
        })),
        backup: backupList.map((m) => ({
          userId: m.user_id,
          studentId: m.users.student_id,
          name: m.users.name,
        })),
        excludedCount: excludedUserIds.length,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`创建抽签记录失败: ${error.message}`, error.stack);
      throw new BadRequestException(error.message || '创建抽签记录失败');
    }
  }

  /**
   * 预览抽签结果（不入库）
   */
  async preview(classId: string, dto: CreateRandomDrawDto, userId: string) {
    await this.verifyClassAccess(userId, classId);

    const mainCount = dto.mainCount ?? 1;
    const backupCount = dto.backupCount ?? 0;

    if (mainCount < 1) {
      throw new BadRequestException('正选人数至少为1');
    }
    if (mainCount + backupCount < 1) {
      throw new BadRequestException('正选与候补人数总和至少为1');
    }

    const excludedUserIds = dto.excludedUserIds || [];

    const members = await this.prisma.class_members.findMany({
      where: { class_id: classId },
      include: { users: { select: { id: true, name: true, student_id: true, phone: true } } },
    });

    // 过滤排除人员（静默忽略不在 members 中的 ID）；平台内置账号（系统管理员）不参与抽签
    const candidates = members.filter(
      (m) => !excludedUserIds.includes(m.user_id) && !isSystemAccount(m.users),
    );

    if (candidates.length < mainCount + backupCount) {
      throw new BadRequestException(
        `候选人不足，至少需要 ${mainCount + backupCount} 人（当前 ${candidates.length} 人）`,
      );
    }

    const shuffled = this.shuffle(candidates);
    const mainList = shuffled.slice(0, mainCount);
    const backupList = shuffled.slice(mainCount, mainCount + backupCount);

    return {
      main: mainList.map((m) => ({
        userId: m.user_id,
        studentId: m.users.student_id,
        name: m.users.name,
      })),
      backup: backupList.map((m) => ({
        userId: m.user_id,
        studentId: m.users.student_id,
        name: m.users.name,
      })),
      excludedCount: excludedUserIds.length,
    };
  }

  /**
   * 作废抽签记录
   */
  async cancel(classId: string, drawId: string, userId: string) {
    await this.verifyCommittee(userId, classId);

    const record = await this.prisma.random_draw_records.findFirst({
      where: { id: drawId, class_id: classId },
    });

    if (!record) {
      throw new NotFoundException('抽签记录不存在');
    }

    if (record.status === 'cancelled') {
      throw new BadRequestException('该抽签记录已作废，不可重复操作');
    }

    await this.prisma.random_draw_records.update({
      where: { id: drawId },
      data: { status: 'cancelled' },
    });

    return { success: true };
  }

  /**
   * 一键公示：将班委发起的抽签结果以班级消息形式通知全班
   */
  async publish(classId: string, drawId: string, userId: string) {
    await this.verifyCommittee(userId, classId);

    const record = await this.prisma.random_draw_records.findFirst({
      where: { id: drawId, class_id: classId },
      include: {
        random_draw_members: {
          orderBy: { created_at: 'asc' },
          include: { users: { select: { name: true } } },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('抽签记录不存在');
    }

    if (record.creator_role_level !== 'owner' && record.creator_role_level !== 'admin') {
      throw new ForbiddenException('个人抽签记录不能公示给全班');
    }

    if (record.status === 'cancelled') {
      throw new BadRequestException('该抽签记录已作废，不能公示');
    }

    if (record.publicized_at) {
      throw new BadRequestException('该抽签结果已公示，请勿重复操作');
    }

    const namesOf = (type: 'main' | 'backup') =>
      record.random_draw_members
        .filter((m) => m.draw_type === type)
        .map((m) => m.users?.name || '未知成员');

    const mainNames = namesOf('main');
    const backupNames = namesOf('backup');
    const lines = [
      `正选（${mainNames.length}人）：${mainNames.join('、') || '无'}`,
    ];
    if (backupNames.length) {
      lines.push(`候补（${backupNames.length}人）：${backupNames.join('、')}`);
    }
    lines.push('以上结果由班委抽签产生，请相关同学及时查看中签记录。');

    const message = await this.messagesService.create(
      classId,
      {
        type: 'random_draw',
        title: `【抽签公示】${record.title}`,
        content: lines.join('\n'),
      },
      userId,
      { type: 'random_draw', id: drawId },
    );

    const publicizedAt = new Date();
    await this.prisma.random_draw_records.update({
      where: { id: drawId },
      data: { publicized_at: publicizedAt },
    });

    return {
      success: true,
      messageId: message.id,
      publicizedAt: publicizedAt.toISOString(),
    };
  }

  async findAll(classId: string, userId: string, query: QueryRandomDrawsDto) {
    await this.verifyClassAccess(userId, classId);

    const { page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;

    // 班委发起的记录全班可见；普通成员的记录仅本人可见
    const where = {
      class_id: classId,
      OR: [
        { created_by: userId },
        { creator_role_level: { in: ['owner', 'admin'] } },
      ],
    };

    const [records, total] = await Promise.all([
      this.prisma.random_draw_records.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: pageSize,
        include: {
          _count: { select: { random_draw_members: true } },
          users: { select: { id: true, name: true } },
        },
      }),
      this.prisma.random_draw_records.count({ where }),
    ]);

    return {
      list: records.map((r) => this.toDrawDto(r)),
      total,
      page,
      pageSize,
    };
  }

  async findOne(classId: string, drawId: string, userId: string) {
    await this.verifyClassAccess(userId, classId);

    const record = await this.prisma.random_draw_records.findFirst({
      where: { id: drawId, class_id: classId },
      include: {
        users: { select: { id: true, name: true } },
        random_draw_members: {
          orderBy: { created_at: 'asc' },
          include: { users: { select: { id: true, name: true, student_id: true } } },
        },
      },
    });

    if (!record || (record.created_by !== userId && record.creator_role_level === 'member')) {
      throw new NotFoundException('抽签记录不存在');
    }

    return this.toDrawDetailDto(record);
  }

  private toDrawDto(record: any) {
    return {
      id: record.id,
      classId: record.class_id,
      title: record.title,
      mainCount: record.main_count,
      backupCount: record.backup_count,
      memberCount: record._count.random_draw_members,
      createdAt: record.created_at,
      createdBy: record.users?.name || null,
      createdById: record.created_by,
      isCommitteeDraw: record.creator_role_level === 'owner' || record.creator_role_level === 'admin',
      isPublic: !!record.publicized_at,
      publicizedAt: record.publicized_at || null,
      status: record.status,
    };
  }

  private toDrawDetailDto(record: any) {
    const main = record.random_draw_members
      .filter((m: any) => m.draw_type === 'main')
      .map((m: any) => ({
        userId: m.student_id,
        studentId: m.users?.student_id || null,
        name: m.users?.name || null,
      }));
    const backup = record.random_draw_members
      .filter((m: any) => m.draw_type === 'backup')
      .map((m: any) => ({
        userId: m.student_id,
        studentId: m.users?.student_id || null,
        name: m.users?.name || null,
      }));

    return {
      id: record.id,
      classId: record.class_id,
      title: record.title,
      mainCount: record.main_count,
      backupCount: record.backup_count,
      main,
      backup,
      createdAt: record.created_at,
      createdBy: record.users?.name || null,
      createdById: record.created_by,
      isCommitteeDraw: record.creator_role_level === 'owner' || record.creator_role_level === 'admin',
      isPublic: !!record.publicized_at,
      publicizedAt: record.publicized_at || null,
      status: record.status,
    };
  }
}
