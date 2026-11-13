import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import { RedisService } from '@/common/cache/redis.service';
import { v4 as uuidv4 } from 'uuid';
import { CreateFeedbackDto } from './dto/feedback.dto';
import { MonitorEventsService } from '@/modules/monitor/monitor-events.service';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);
  private readonly idempotencyTtl = 30;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly monitorEvents: MonitorEventsService,
  ) {}

  private getIdempotencyKey(userId: string, dto: CreateFeedbackDto): string {
    const hash = `${dto.content}:${dto.contact || ''}:${(dto.images || []).join(',')}`;
    return `feedback:idempotency:${userId}:${hash}`;
  }

  async create(userId: string, dto: CreateFeedbackDto) {
    const idempotencyKey = this.getIdempotencyKey(userId, dto);
    const exists = await this.redisService.exists(idempotencyKey);
    if (exists) {
      throw new BadRequestException('请勿重复提交');
    }
    await this.redisService.set(idempotencyKey, '1', this.idempotencyTtl);

    try {
      const feedback = await this.prisma.feedback.create({
        data: {
          id: uuidv4(),
          user_id: userId,
          content: dto.content,
          contact: dto.contact,
          images: dto.images || [],
          status: 'pending',
        },
      });

      this.monitorEvents.emitFeedbackCreated({
        id: feedback.id,
        content: feedback.content,
        contact: feedback.contact,
        status: feedback.status,
        createdAt: feedback.created_at.toISOString(),
      });

      return {
        id: feedback.id,
        userId: feedback.user_id,
        content: feedback.content,
        contact: feedback.contact,
        images: feedback.images,
        status: feedback.status,
        createdAt: feedback.created_at,
      };
    } catch (error) {
      // 提交失败时释放幂等标记，避免用户在 30 秒内无法重试
      await this.redisService.del(idempotencyKey);
      this.logger.error(`提交反馈失败: ${error.message}`, error.stack);
      throw new BadRequestException('提交失败，请稍后重试');
    }
  }

  async findMyFeedbacks(userId: string, page = 1, pageSize = 20) {
    const safePage = Math.max(1, Math.floor(page) || 1);
    const safePageSize = Math.min(50, Math.max(1, Math.floor(pageSize) || 20));

    const [feedbacks, total] = await this.prisma.$transaction([
      this.prisma.feedback.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
      }),
      this.prisma.feedback.count({ where: { user_id: userId } }),
    ]);

    return {
      items: feedbacks.map((f) => ({
        id: f.id,
        userId: f.user_id,
        content: f.content,
        contact: f.contact,
        images: f.images,
        status: f.status,
        createdAt: f.created_at,
        updatedAt: f.updated_at,
      })),
      total,
      page: safePage,
      pageSize: safePageSize,
      hasMore: safePage * safePageSize < total,
    };
  }

  async findForAdmin(query: {
    status?: string;
    keyword?: string;
    page?: number;
    pageSize?: number;
  }) {
    const safePage = Math.max(1, Math.floor(query.page || 1));
    const safePageSize = Math.min(
      100,
      Math.max(1, Math.floor(query.pageSize || 20)),
    );

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.keyword) {
      where.OR = [
        { content: { contains: query.keyword } },
        { contact: { contains: query.keyword } },
      ];
    }

    const [feedbacks, total] = await this.prisma.$transaction([
      this.prisma.feedback.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
        include: { users: { select: { id: true, name: true, phone: true } } },
      }),
      this.prisma.feedback.count({ where }),
    ]);

    return {
      items: feedbacks.map((f) => ({
        id: f.id,
        userId: f.user_id,
        userName: f.users?.name ?? null,
        userPhone: f.users?.phone ?? null,
        content: f.content,
        contact: f.contact,
        images: f.images,
        status: f.status,
        createdAt: f.created_at,
        updatedAt: f.updated_at,
      })),
      total,
      page: safePage,
      pageSize: safePageSize,
      hasMore: safePage * safePageSize < total,
    };
  }

  async updateStatus(id: string, status: string) {
    const allowed = ['pending', 'processing', 'resolved', 'closed'];
    if (!allowed.includes(status)) {
      throw new BadRequestException('无效的反馈状态');
    }

    const feedback = await this.prisma.feedback.findUnique({ where: { id } });
    if (!feedback) {
      throw new NotFoundException('反馈不存在');
    }

    const updated = await this.prisma.feedback.update({
      where: { id },
      data: { status, updated_at: new Date() },
    });

    this.monitorEvents.emitFeedbackUpdated({
      id: updated.id,
      status: updated.status,
      updatedAt: updated.updated_at.toISOString(),
    });

    return {
      id: updated.id,
      status: updated.status,
      updatedAt: updated.updated_at,
    };
  }
}
