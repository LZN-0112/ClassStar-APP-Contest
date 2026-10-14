import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import { RedisService } from '@/common/cache/redis.service';
import { v4 as uuidv4 } from 'uuid';
import { CreateFeedbackDto } from './dto/feedback.dto';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);
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
          content: this.escapeHtml(dto.content),
          contact: this.escapeHtml(dto.contact),
          images: dto.images || [],
          status: 'pending',
        },
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
      this.logger.error(`提交反馈失败: ${error.message}`, error.stack);
      throw new BadRequestException(error.message || '提交失败');
    }
  }

  async findMyFeedbacks(userId: string) {
    const feedbacks = await this.prisma.feedback.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });

    return feedbacks.map((f) => ({
      id: f.id,
      userId: f.user_id,
      content: f.content,
      contact: f.contact,
      images: f.images,
      status: f.status,
      createdAt: f.created_at,
      updatedAt: f.updated_at,
    }));
  }
}
