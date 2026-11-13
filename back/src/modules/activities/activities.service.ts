import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import { RedisService } from '@/common/cache/redis.service';
import { MinioService } from '@/common/storage/minio.service';
import { MinioPresignedService } from '@/common/storage/minio-presigned.service';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateActivityDto,
  QueryActivitiesDto,
  ReviewRegistrationDto,
  RegistrationStatus,
} from './dto/activities.dto';
import { computeActivityStatus, computeRegistrationOpen, getActivityStartTime } from './activity-status.utils';

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);
  private readonly idempotencyTtl = 30;

  private readonly maxImageSize = 5 * 1024 * 1024;
  private readonly presignExpirySeconds = 3600;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly minioService: MinioService,
    private readonly minioPresignedService: MinioPresignedService,
  ) {}

  private validateImageBuffer(buffer: Buffer): { ext: string; mime: string } {
    if (!buffer || buffer.length < 8) {
      throw new BadRequestException('文件内容不完整');
    }
    if (buffer.length > this.maxImageSize) {
      throw new BadRequestException('图片大小不能超过 5MB');
    }

    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer.slice(0, 8).toString('hex') === '89504e470d0a1a0a';

    if (isJpeg) {
      return { ext: '.jpg', mime: 'image/jpeg' };
    }
    if (isPng) {
      return { ext: '.png', mime: 'image/png' };
    }
    throw new BadRequestException('仅支持 jpg/png 格式的图片');
  }

  async uploadCover(
    file: Express.Multer.File,
    classId: string,
    userId: string,
  ): Promise<{ coverUrl: string }> {
    await this.verifyCommittee(userId, classId);

    if (!file || !file.buffer) {
      throw new BadRequestException('请选择要上传的活动封面图片');
    }

    const { ext, mime } = this.validateImageBuffer(file.buffer);

    const objectName = `activity-covers/${Date.now()}-${createHash('sha256').update(file.buffer).digest('hex').slice(0, 16)}${ext}`;
    const coverUrl = await this.minioService.uploadBuffer(objectName, file.buffer, {
      'Content-Type': mime,
    });

    return { coverUrl };
  }

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

  private getToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private parseDate(dateStr: string) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      throw new BadRequestException('日期格式不正确');
    }
    return d;
  }

  private parseTime(timeStr: string) {
    const match = timeStr.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
    if (!match) {
      throw new BadRequestException('活动时间格式不正确');
    }
    const [, hours, minutes, seconds = '00'] = match;
    return new Date(`1970-01-01T${hours}:${minutes}:${seconds}.000Z`);
  }

  private isRegistrationOpen(activity: {
    event_date: Date;
    event_time?: Date | null;
    deadline?: Date | null;
    status: string;
  }) {
    return computeRegistrationOpen(activity);
  }

  private getIdempotencyKey(userId: string, activityId: string) {
    return `activity:register:${userId}:${activityId}`;
  }

  async create(classId: string, dto: CreateActivityDto, userId: string) {
    await this.verifyCommittee(userId, classId);

    const eventDate = this.parseDate(dto.eventDate);
    const today = this.getToday();
    if (eventDate < today) {
      throw new BadRequestException('活动日期不能早于今天');
    }

    const eventTime = dto.eventTime ? this.parseTime(dto.eventTime) : null;
    const deadline = dto.deadline ? new Date(dto.deadline) : null;
    if (deadline) {
      if (deadline <= new Date()) {
        throw new BadRequestException('报名截止时间不能早于当前时间');
      }
      const deadlineLimit = eventTime
        ? getActivityStartTime({
            event_date: new Date(dto.eventDate),
            event_time: eventTime,
            status: 'registering',
          })
        : (() => {
            const d = new Date(dto.eventDate);
            d.setHours(23, 59, 59, 999);
            return d;
          })();
      if (deadline > deadlineLimit) {
        throw new BadRequestException(
          eventTime ? '报名截止时间不能晚于活动开始时间' : '报名截止时间不能晚于活动当天',
        );
      }
    }

    const data: any = {
      id: uuidv4(),
      class_id: classId,
      publisher_id: userId,
      title: this.escapeHtml(dto.title),
      category: dto.category || undefined,
      event_date: new Date(dto.eventDate),
      event_time: eventTime ?? undefined,
      location: this.escapeHtml(dto.location),
      description: dto.description?.trim() || undefined,
      capacity: dto.capacity,
      deadline: deadline ?? undefined,
      cover_url: dto.coverUrl,
      status: 'registering',
    };

    try {
      const images = (dto.images || []).filter((url) => !!url).slice(0, 6);
      const activity = await this.prisma.$transaction(async (tx) => {
        const created = await tx.activities.create({ data });
        if (images.length) {
          await tx.activity_images.createMany({
            data: images.map((url, index) => ({
              id: uuidv4(),
              activity_id: created.id,
              image_url: url,
              sort_order: index,
            })),
          });
        }
        return created;
      });

      return {
        ...this.toActivityDto({
          ...activity,
          activity_images: images.map((url, index) => ({
            image_url: url,
            sort_order: index,
          })),
        }),
        images,
      };
    } catch (error) {
      this.logger.error(`发布活动失败: ${error.message}`, error.stack);
      throw new BadRequestException(error.message || '发布活动失败');
    }
  }

  async findAll(
    classId: string,
    userId: string,
    query: QueryActivitiesDto,
  ) {
    await this.verifyClassAccess(userId, classId);

    const { status, page = 1, pageSize = 10 } = query;
    const pageNum = Math.max(1, Number(page) || 1);
    const pageSizeNum = Math.max(1, Math.min(100, Number(pageSize) || 10));

    const activities = await this.prisma.activities.findMany({
      where: { class_id: classId },
      include: {
        activity_images: { orderBy: { sort_order: 'asc' }, take: 1 },
      },
    });

    const registrationCounts = activities.length
      ? await this.prisma.activity_registrations.groupBy({
          by: ['activity_id'],
          where: {
            activity_id: { in: activities.map((a) => a.id) },
            status: { in: ['pending', 'registered', 'approved'] },
          },
          _count: { activity_id: true },
        })
      : [];

    const countMap = new Map(
      registrationCounts.map((r) => [r.activity_id, r._count.activity_id]),
    );

    // 当前用户对这批活动的报名状态，供列表直接显示「已报名/待审核/未通过」
    const myRegistrations = activities.length
      ? await this.prisma.activity_registrations.findMany({
          where: {
            student_id: userId,
            activity_id: { in: activities.map((a) => a.id) },
          },
          select: { activity_id: true, status: true },
        })
      : [];
    const myStatusMap = new Map(
      myRegistrations.map((r) => [r.activity_id, r.status]),
    );

    const all = activities.map((a) => ({
      ...this.toActivityDto(a),
      registeredCount: countMap.get(a.id) || 0,
      myRegistrationStatus: myStatusMap.get(a.id) ?? null,
    }));

    // 先按状态筛选再分页，保证 total 与筛选结果一致
    const filtered = status
      ? all.filter((a) => a.displayStatus === status)
      : all;

    // 报名中优先、进行中其次、已结束最后；未结束按活动时间正序，已结束按时间倒序
    const statusOrder: Record<string, number> = {
      registering: 0,
      ongoing: 1,
      ended: 2,
    };
    filtered.sort((a, b) => {
      const orderDiff =
        (statusOrder[a.displayStatus] ?? 3) - (statusOrder[b.displayStatus] ?? 3);
      if (orderDiff !== 0) return orderDiff;
      const aTime = new Date(a.eventDate).getTime();
      const bTime = new Date(b.eventDate).getTime();
      return a.displayStatus === 'ended' ? bTime - aTime : aTime - bTime;
    });

    const start = (pageNum - 1) * pageSizeNum;

    return {
      list: filtered.slice(start, start + pageSizeNum),
      total: filtered.length,
      page: pageNum,
      pageSize: pageSizeNum,
    };
  }

  async findOne(classId: string, activityId: string, userId: string) {
    await this.verifyClassAccess(userId, classId);

    const activity = await this.prisma.activities.findFirst({
      where: { id: activityId, class_id: classId },
      include: {
        activity_images: { orderBy: { sort_order: 'asc' } },
        _count: {
          select: { activity_registrations: true },
        },
        activity_registrations: {
          where: { student_id: userId },
          take: 1,
        },
      },
    });

    if (!activity) {
      throw new NotFoundException('活动不存在');
    }

    const approvedCount = await this.prisma.activity_registrations.count({
      where: {
        activity_id: activityId,
        status: { in: ['pending', 'registered', 'approved'] },
      },
    });

    return {
      ...this.toActivityDto(activity),
      images: activity.activity_images.map((image) => image.image_url),
      registeredCount: approvedCount,
      registration: activity.activity_registrations[0]
        ? {
            id: activity.activity_registrations[0].id,
            status: activity.activity_registrations[0].status,
            registeredAt: activity.activity_registrations[0].registered_at,
          }
        : null,
    };
  }

  async register(classId: string, activityId: string, userId: string) {
    await this.verifyClassAccess(userId, classId);

    const idempotencyKey = this.getIdempotencyKey(userId, activityId);
    const exists = await this.redisService.exists(idempotencyKey);
    if (exists) {
      throw new BadRequestException('请勿重复提交');
    }
    await this.redisService.set(idempotencyKey, '1', this.idempotencyTtl);

    try {
      const activity = await this.prisma.activities.findFirst({
        where: { id: activityId, class_id: classId },
      });
      if (!activity) {
        throw new NotFoundException('活动不存在');
      }
      if (!this.isRegistrationOpen(activity)) {
        throw new BadRequestException('活动报名已截止');
      }

      const existing = await this.prisma.activity_registrations.findFirst({
        where: { activity_id: activityId, student_id: userId },
      });
      if (existing) {
        throw new BadRequestException('您已报名该活动');
      }

      if (activity.capacity) {
        const approvedCount = await this.prisma.activity_registrations.count({
          where: {
            activity_id: activityId,
            status: { in: ['pending', 'registered', 'approved'] },
          },
        });
        if (approvedCount >= activity.capacity) {
          throw new BadRequestException('活动报名人数已满');
        }
      }

      const registration = await this.prisma.activity_registrations.create({
        data: {
          id: uuidv4(),
          activity_id: activityId,
          student_id: userId,
          status: 'pending',
        },
      });

      return {
        id: registration.id,
        status: registration.status,
        registeredAt: registration.registered_at,
      };
    } catch (error) {
      this.logger.error(`活动报名失败: ${error.message}`, error.stack);
      throw error instanceof BadRequestException || error instanceof NotFoundException
        ? error
        : new BadRequestException(error.message || '报名失败');
    }
  }

  async cancel(classId: string, activityId: string, userId: string) {
    await this.verifyClassAccess(userId, classId);

    const activity = await this.prisma.activities.findFirst({
      where: { id: activityId, class_id: classId },
    });
    if (!activity) {
      throw new NotFoundException('活动不存在');
    }

    const registration = await this.prisma.activity_registrations.findFirst({
      where: { activity_id: activityId, student_id: userId },
    });
    if (!registration) {
      throw new BadRequestException('您未报名该活动');
    }

    await this.prisma.activity_registrations.delete({
      where: { id: registration.id },
    });

    return { success: true };
  }

  async getRegistrations(classId: string, activityId: string, userId: string) {
    await this.verifyCommittee(userId, classId);

    const activity = await this.prisma.activities.findFirst({
      where: { id: activityId, class_id: classId },
    });
    if (!activity) {
      throw new NotFoundException('活动不存在');
    }

    const [registrations, pendingCount, approvedCount, rejectedCount] =
      await Promise.all([
        this.prisma.activity_registrations.findMany({
          where: { activity_id: activityId },
          include: {
            users: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { registered_at: 'desc' },
        }),
        this.prisma.activity_registrations.count({
          where: { activity_id: activityId, status: 'pending' },
        }),
        this.prisma.activity_registrations.count({
          where: {
            activity_id: activityId,
            status: { in: ['registered', 'approved'] },
          },
        }),
        this.prisma.activity_registrations.count({
          where: { activity_id: activityId, status: 'rejected' },
        }),
      ]);

    const memberCount = await this.prisma.class_members.count({
      where: { class_id: classId },
    });

    return {
      activityId,
      total: registrations.length,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      participationRate: this.calcRate(approvedCount, memberCount),
      list: registrations.map((r) => ({
        id: r.id,
        studentId: r.student_id,
        studentName: r.users?.name,
        studentAvatar: r.users?.avatar,
        status: r.status,
        registeredAt: r.registered_at,
      })),
    };
  }

  async reviewRegistration(
    classId: string,
    activityId: string,
    registrationId: string,
    dto: ReviewRegistrationDto,
    userId: string,
  ) {
    await this.verifyCommittee(userId, classId);

    const registration = await this.prisma.activity_registrations.findFirst({
      where: { id: registrationId, activity_id: activityId },
      include: { activities: true },
    });
    if (!registration || registration.activities.class_id !== classId) {
      throw new NotFoundException('报名记录不存在');
    }

    if (dto.status === 'registered' && registration.activities.capacity) {
      const approvedCount = await this.prisma.activity_registrations.count({
        where: {
          activity_id: activityId,
          status: { in: ['registered', 'approved'] },
          id: { not: registrationId },
        },
      });
      if (approvedCount >= registration.activities.capacity) {
        throw new BadRequestException('活动报名人数已满，无法继续通过');
      }
    }

    const previousStatus = registration.status;
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.activity_registrations.update({
        where: { id: registrationId },
        data: { status: dto.status },
      });

      const isResult = dto.status === 'registered' || dto.status === 'rejected';
      if (previousStatus !== dto.status && isResult) {
        const activity = registration.activities;
        const approved = dto.status !== 'rejected';
        const startText = this.formatEventStart(activity.event_date, activity.event_time);
        const messageId = uuidv4();
        await tx.messages.create({
          data: {
            id: messageId,
            class_id: classId,
            publisher_id: userId,
            type: 'activity_result',
            title: `【报名结果】${activity.title}`.slice(0, 200),
            content: approved
              ? `你报名的活动「${activity.title}」已审核通过，请于 ${startText} 到 ${activity.location || '活动地点'} 参加。`
              : `很遗憾，你报名的活动「${activity.title}」未通过审核，如有疑问可联系班委了解。`,
            event_time: getActivityStartTime(activity),
            location: activity.location ?? null,
            require_ack: false,
            status: 'published',
          },
        });
        // 仅报名学生收到该消息（私密类型，其他成员在列表中不可见）
        await tx.message_reads.create({
          data: {
            id: uuidv4(),
            message_id: messageId,
            user_id: registration.student_id,
          },
        });
      }

      return row;
    });

    return {
      id: updated.id,
      status: updated.status,
    };
  }

  async findMyRegistrations(
    classId: string,
    userId: string,
    query: QueryActivitiesDto,
  ) {
    await this.verifyClassAccess(userId, classId);

    const { status, page = 1, pageSize = 10 } = query;
    const pageNum = Math.max(1, Number(page) || 1);
    const pageSizeNum = Math.max(1, Math.min(100, Number(pageSize) || 10));

    const registrations = await this.prisma.activity_registrations.findMany({
      where: {
        student_id: userId,
        activities: { class_id: classId },
      },
      include: {
        activities: {
          include: {
            activity_images: { orderBy: { sort_order: 'asc' }, take: 1 },
          },
        },
      },
    });

    const all = registrations.map((r) => ({
      registrationId: r.id,
      status: r.status,
      registeredAt: r.registered_at,
      activity: this.toActivityDto(r.activities),
    }));

    const filtered = status
      ? all.filter((item) => item.activity.displayStatus === status)
      : all;

    const statusOrder: Record<string, number> = {
      registering: 0,
      ongoing: 1,
      ended: 2,
    };
    filtered.sort((a, b) => {
      const orderDiff =
        (statusOrder[a.activity.displayStatus] ?? 3) -
        (statusOrder[b.activity.displayStatus] ?? 3);
      if (orderDiff !== 0) return orderDiff;
      const aTime = new Date(a.activity.eventDate).getTime();
      const bTime = new Date(b.activity.eventDate).getTime();
      return a.activity.displayStatus === 'ended' ? bTime - aTime : aTime - bTime;
    });

    const start = (pageNum - 1) * pageSizeNum;

    return {
      list: filtered.slice(start, start + pageSizeNum),
      total: filtered.length,
      page: pageNum,
      pageSize: pageSizeNum,
    };
  }

  /**
   * 首页活动入口角标：可报名且本人尚未报名的活动数量
   */
  async getSummary(classId: string, userId: string) {
    await this.verifyClassAccess(userId, classId);

    const activities = await this.prisma.activities.findMany({
      where: { class_id: classId },
    });
    const openActivities = activities.filter((a) => computeRegistrationOpen(a));
    const openIds = openActivities.map((a) => a.id);

    const myRegistrations = openIds.length
      ? await this.prisma.activity_registrations.findMany({
          where: {
            student_id: userId,
            activity_id: { in: openIds },
          },
          select: { activity_id: true },
        })
      : [];

    const registeredIds = new Set(myRegistrations.map((r) => r.activity_id));

    const registrationCounts = openIds.length
      ? await this.prisma.activity_registrations.groupBy({
          by: ['activity_id'],
          where: {
            activity_id: { in: openIds },
            status: { in: ['pending', 'registered', 'approved'] },
          },
          _count: { activity_id: true },
        })
      : [];
    const countMap = new Map(
      registrationCounts.map((r) => [r.activity_id, r._count.activity_id]),
    );

    // 名额已满的活动无法报名，不计入首页角标
    const available = openActivities.filter(
      (a) => !a.capacity || (countMap.get(a.id) || 0) < a.capacity,
    );

    return {
      registeringCount: openActivities.length,
      unregisteredCount: available.filter((a) => !registeredIds.has(a.id))
        .length,
    };
  }

  private calcRate(numerator: number, denominator: number): number {
    if (denominator <= 0) return 0;
    return Number(((numerator / denominator) * 100).toFixed(2));
  }

  private toActivityDto(activity: any) {
    return {
      id: activity.id,
      classId: activity.class_id,
      publisherId: activity.publisher_id,
      title: activity.title,
      category: activity.category ?? null,
      eventDate: activity.event_date,
      eventTime: activity.event_time ? this.formatTime(activity.event_time) : null,
      location: activity.location,
      description: activity.description,
      capacity: activity.capacity,
      deadline: activity.deadline,
      coverUrl: activity.cover_url ?? activity.activity_images?.[0]?.image_url ?? null,
      status: activity.status,
      displayStatus: computeActivityStatus(activity),
      registrationOpen: computeRegistrationOpen(activity),
      createdAt: activity.created_at,
      updatedAt: activity.updated_at,
    };
  }

  private formatTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private formatEventStart(eventDate: Date, eventTime?: Date | null): string {
    const date = new Date(eventDate);
    const dateText = `${date.getMonth() + 1}月${date.getDate()}日`;
    return eventTime ? `${dateText} ${this.formatTime(eventTime)}` : dateText;
  }

}
