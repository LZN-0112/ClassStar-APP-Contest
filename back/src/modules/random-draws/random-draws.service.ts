import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateRandomDrawDto,
  QueryRandomDrawsDto,
} from './dto/random-draws.dto';

@Injectable()
export class RandomDrawsService {
  private readonly logger = new Logger(RandomDrawsService.name);

  constructor(private readonly prisma: PrismaService) {}

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

  private shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  async create(classId: string, dto: CreateRandomDrawDto, userId: string) {
    await this.verifyCommittee(userId, classId);

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
      include: { users: { select: { id: true, name: true, student_id: true } } },
    });

    // 过滤排除人员
    const candidates = members.filter((m) => !excludedUserIds.includes(m.user_id));

    if (candidates.length < mainCount + backupCount) {
      throw new BadRequestException('候选人人数不足以抽取指定数量');
    }

    const shuffled = this.shuffle(candidates);
    const mainList = shuffled.slice(0, mainCount);
    const backupList = shuffled.slice(mainCount, mainCount + backupCount);

    const drawId = uuidv4();

    try {
      await this.prisma.$transaction([
        this.prisma.random_draw_records.create({
          data: {
            id: drawId,
            class_id: classId,
            created_by: userId,
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
    await this.verifyCommittee(userId, classId);

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
      include: { users: { select: { id: true, name: true, student_id: true } } },
    });

    // 过滤排除人员（静默忽略不在 members 中的 ID）
    const candidates = members.filter((m) => !excludedUserIds.includes(m.user_id));

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

  async findAll(classId: string, userId: string, query: QueryRandomDrawsDto) {
    await this.verifyClassAccess(userId, classId);

    const { page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;

    const [records, total] = await Promise.all([
      this.prisma.random_draw_records.findMany({
        where: { class_id: classId },
        orderBy: { created_at: 'desc' },
        skip,
        take: pageSize,
        include: {
          _count: { select: { random_draw_members: true } },
          users: { select: { id: true, name: true } },
        },
      }),
      this.prisma.random_draw_records.count({ where: { class_id: classId } }),
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
        random_draw_members: {
          orderBy: { created_at: 'asc' },
          include: { users: { select: { id: true, name: true, student_id: true } } },
        },
      },
    });

    if (!record) {
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
    };
  }
}
