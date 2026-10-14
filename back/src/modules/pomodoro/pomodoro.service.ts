import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import { RedisService } from '@/common/cache/redis.service';
import { v4 as uuidv4 } from 'uuid';
import {
  CreatePomodoroSessionDto,
  UpdatePomodoroSessionDto,
  QueryPomodoroSessionsDto,
  PomodoroStatus,
} from './dto/pomodoro.dto';

@Injectable()
export class PomodoroService {
  private readonly logger = new Logger(PomodoroService.name);
  private readonly idempotencyTtl = 30;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  private escapeHtml(input?: string): string | undefined {
    if (!input) return input;
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private getIdempotencyKey(userId: string, dto: CreatePomodoroSessionDto): string {
    return `pomodoro:idempotency:${userId}:${dto.taskTitle}:${dto.durationMinutes ?? 25}`;
  }

  private toSessionDto(record: any) {
    return {
      id: record.id,
      classId: record.class_id,
      userId: record.user_id,
      taskTitle: record.task_title,
      durationMinutes: record.duration_minutes,
      actualMinutes: record.actual_minutes,
      status: record.status,
      startedAt: record.started_at,
      completedAt: record.completed_at,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  async create(classId: string, dto: CreatePomodoroSessionDto, userId: string) {
    const idempotencyKey = this.getIdempotencyKey(userId, dto);
    const exists = await this.redisService.exists(idempotencyKey);
    if (exists) {
      throw new BadRequestException('请勿重复提交');
    }
    await this.redisService.set(idempotencyKey, '1', this.idempotencyTtl);

    try {
      const inProgress = await this.prisma.pomodoro_sessions.findFirst({
        where: { user_id: userId, status: PomodoroStatus.IN_PROGRESS },
      });
      if (inProgress) {
        throw new BadRequestException('已有进行中的专注 session，请先完成或取消');
      }

      const session = await this.prisma.pomodoro_sessions.create({
        data: {
          id: uuidv4(),
          class_id: classId,
          user_id: userId,
          task_title: this.escapeHtml(dto.taskTitle),
          duration_minutes: dto.durationMinutes ?? 25,
          actual_minutes: 0,
          status: PomodoroStatus.IN_PROGRESS,
        },
      });

      return this.toSessionDto(session);
    } catch (error) {
      this.logger.error(`创建番茄钟 session 失败: ${error.message}`, error.stack);
      throw error instanceof BadRequestException
        ? error
        : new BadRequestException(error.message || '创建失败');
    }
  }

  async findAll(classId: string, userId: string, query: QueryPomodoroSessionsDto) {
    const { page = 1, pageSize = 20, userId: filterUserId, status } = query;
    const skip = (page - 1) * pageSize;

    const where: any = { class_id: classId };
    if (filterUserId) {
      where.user_id = filterUserId;
    }
    if (status) {
      where.status = status;
    }

    const [records, total] = await Promise.all([
      this.prisma.pomodoro_sessions.findMany({
        where,
        orderBy: { started_at: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.pomodoro_sessions.count({ where }),
    ]);

    return {
      list: records.map((r) => this.toSessionDto(r)),
      total,
      page,
      pageSize,
    };
  }

  async findOne(classId: string, sessionId: string, userId: string) {
    const session = await this.prisma.pomodoro_sessions.findFirst({
      where: { id: sessionId, class_id: classId },
    });

    if (!session) {
      throw new NotFoundException('专注 session 不存在');
    }

    return this.toSessionDto(session);
  }

  async update(
    classId: string,
    sessionId: string,
    dto: UpdatePomodoroSessionDto,
    userId: string,
  ) {
    const session = await this.prisma.pomodoro_sessions.findFirst({
      where: { id: sessionId, class_id: classId },
    });

    if (!session) {
      throw new NotFoundException('专注 session 不存在');
    }

    if (session.user_id !== userId) {
      throw new BadRequestException('只能更新自己的专注 session');
    }

    if (session.status !== PomodoroStatus.IN_PROGRESS) {
      throw new BadRequestException('只能更新进行中的专注 session');
    }

    const data: any = { status: dto.status };
    if (dto.status === PomodoroStatus.COMPLETED) {
      data.actual_minutes = dto.actualMinutes ?? session.duration_minutes;
      data.completed_at = new Date();
    }

    const updated = await this.prisma.pomodoro_sessions.update({
      where: { id: sessionId },
      data,
    });

    return this.toSessionDto(updated);
  }

  async getStats(classId: string, userId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const [todaySessions, weekSessions, totalSessions] = await Promise.all([
      this.prisma.pomodoro_sessions.findMany({
        where: {
          class_id: classId,
          user_id: userId,
          status: PomodoroStatus.COMPLETED,
          completed_at: { gte: todayStart },
        },
      }),
      this.prisma.pomodoro_sessions.findMany({
        where: {
          class_id: classId,
          user_id: userId,
          status: PomodoroStatus.COMPLETED,
          completed_at: { gte: weekStart },
        },
      }),
      this.prisma.pomodoro_sessions.count({
        where: { class_id: classId, user_id: userId, status: PomodoroStatus.COMPLETED },
      }),
    ]);

    const sumMinutes = (sessions: any[]) =>
      sessions.reduce((acc, s) => acc + (s.actual_minutes || 0), 0);

    return {
      today: {
        count: todaySessions.length,
        minutes: sumMinutes(todaySessions),
      },
      thisWeek: {
        count: weekSessions.length,
        minutes: sumMinutes(weekSessions),
      },
      total: {
        count: totalSessions,
        minutes: sumMinutes(
          await this.prisma.pomodoro_sessions.findMany({
            where: { class_id: classId, user_id: userId, status: PomodoroStatus.COMPLETED },
          }),
        ),
      },
    };
  }
}
