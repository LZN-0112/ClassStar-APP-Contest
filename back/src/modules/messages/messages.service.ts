import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateMessageDto, CreateReminderDto } from './dto/messages.dto';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(classId: string, dto: CreateMessageDto, publisherId: string) {
    const messageId = uuidv4();

    await this.prisma.$transaction(async (tx) => {
      await tx.messages.create({
        data: {
          id: messageId,
          class_id: classId,
          publisher_id: publisherId,
          type: dto.type,
          title: dto.title,
          content: dto.content,
          location: dto.location,
          event_time: dto.eventTime ? new Date(dto.eventTime) : undefined,
          reminder_interval: dto.reminderInterval,
          require_ack: dto.requireAck ?? false,
          ack_deadline: dto.ackDeadline ? new Date(dto.ackDeadline) : undefined,
          status: dto.status ?? 'published',
        },
      });

      if (dto.attachments?.length) {
        await tx.message_attachments.createMany({
          data: dto.attachments.map((a) => ({
            id: uuidv4(),
            message_id: messageId,
            file_name: a.fileName,
            file_url: a.fileUrl,
            file_size: a.fileSize,
          })),
        });
      }

      // 初始化所有班级成员的已读记录
      const members = await tx.class_members.findMany({
        where: { class_id: classId },
        select: { user_id: true },
      });
      await tx.message_reads.createMany({
        data: members.map((m) => ({
          id: uuidv4(),
          message_id: messageId,
          user_id: m.user_id,
        })),
      });
    });

    return { id: messageId };
  }

  async findAll(
    classId: string,
    userId: string,
    options: { type?: string; page?: number; pageSize?: number },
  ) {
    const { type, page = 1, pageSize = 20 } = options;
    const pageNum = Math.max(1, Number(page) || 1);
    const pageSizeNum = Math.max(1, Math.min(100, Number(pageSize) || 20));
    const skip = pageNum > 1 ? (pageNum - 1) * pageSizeNum : undefined;

    const where: any = { class_id: classId };
    if (type) where.type = type;

    const [messages, total, readCounts] = await Promise.all([
      this.prisma.messages.findMany({
        where,
        include: {
          users: { select: { id: true, name: true, avatar: true } },
          message_reads: { where: { user_id: userId } },
        },
        ...(skip ? { skip } : {}),
        take: pageSizeNum,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.messages.count({ where }),
      this.prisma.message_reads.groupBy({
        by: ['message_id'],
        where: {},
        _count: { message_id: true },
      }),
    ]);

    const readCountMap = new Map(readCounts.map((r) => [r.message_id, r._count.message_id]));

    return {
      list: messages.map((m) => ({
        id: m.id,
        type: m.type,
        title: m.title,
        content: m.content,
        location: m.location,
        eventTime: m.event_time,
        publisher: m.users,
        isRead: !!m.message_reads[0]?.read_at,
        requireAck: m.require_ack,
        status: m.status,
        readCount: readCountMap.get(m.id) || 0,
        createdAt: m.created_at,
      })),
      pagination: { page: pageNum, pageSize: pageSizeNum, total, totalPages: Math.ceil(total / pageSizeNum) },
    };
  }

  async findOne(classId: string, id: string, userId: string) {
    const message = await this.prisma.messages.findFirst({
      where: { id, class_id: classId },
      include: {
        users: { select: { id: true, name: true, avatar: true } },
        message_attachments: true,
      },
    });

    if (!message) {
      throw new NotFoundException('通知不存在');
    }

    const acked = await this.prisma.message_acks.findUnique({
      where: { message_id_user_id: { message_id: id, user_id: userId } },
    });

    return {
      id: message.id,
      type: message.type,
      title: message.title,
      content: message.content,
      location: message.location,
      eventTime: message.event_time,
      requireAck: message.require_ack,
      ackDeadline: message.ack_deadline,
      isAcked: !!acked,
      status: message.status,
      publisher: message.users,
      attachments: message.message_attachments,
      createdAt: message.created_at,
    };
  }

  async markAsRead(classId: string, id: string, userId: string) {
    const message = await this.prisma.messages.findFirst({
      where: { id, class_id: classId },
    });
    if (!message) {
      throw new NotFoundException('通知不存在');
    }

    await this.prisma.message_reads.upsert({
      where: { message_id_user_id: { message_id: id, user_id: userId } },
      create: {
        id: uuidv4(),
        message_id: id,
        user_id: userId,
        read_at: new Date(),
      },
      update: { read_at: new Date() },
    });

    return null;
  }

  async ack(classId: string, id: string, userId: string) {
    const message = await this.prisma.messages.findFirst({
      where: { id, class_id: classId },
    });
    if (!message) {
      throw new NotFoundException('通知不存在');
    }

    const existing = await this.prisma.message_acks.findUnique({
      where: { message_id_user_id: { message_id: id, user_id: userId } },
    });
    if (existing) {
      throw new BadRequestException('已签收，不能重复签收');
    }

    await this.prisma.message_acks.create({
      data: {
        id: uuidv4(),
        message_id: id,
        user_id: userId,
        acked_at: new Date(),
      },
    });

    return null;
  }

  async getAcks(classId: string, id: string) {
    const message = await this.prisma.messages.findFirst({
      where: { id, class_id: classId },
    });
    if (!message) {
      throw new NotFoundException('通知不存在');
    }

    const [acked, totalMembers] = await Promise.all([
      this.prisma.message_acks.findMany({
        where: { message_id: id },
        include: {
          users: { select: { id: true, name: true, avatar: true, student_id: true } },
        },
        orderBy: { acked_at: 'desc' },
      }),
      this.prisma.class_members.count({ where: { class_id: classId } }),
    ]);

    const ackedUserIds = new Set(acked.map((a) => a.user_id));
    const unackedMembers = await this.prisma.class_members.findMany({
      where: { class_id: classId, user_id: { notIn: Array.from(ackedUserIds) } },
      include: {
        users: { select: { id: true, name: true, avatar: true, student_id: true } },
      },
    });

    // 判断是否逾期
    const now = new Date();
    const hasDeadline = !!message.ack_deadline;
    const isOverdue = hasDeadline && now > message.ack_deadline;

    return {
      ackedCount: acked.length,
      unackedCount: unackedMembers.length,
      total: totalMembers,
      ackDeadline: message.ack_deadline,
      ackedList: acked.map((a) => ({
        userId: a.user_id,
        name: a.users.name,
        avatar: a.users.avatar,
        studentId: a.users.student_id,
        ackedAt: a.acked_at,
        overdue: false, // 已签收成员 overdue 始终为 false
      })),
      unackedList: unackedMembers.map((m) => ({
        userId: m.user_id,
        name: m.users.name,
        avatar: m.users.avatar,
        studentId: m.users.student_id,
        overdue: isOverdue, // 未签收成员：有截止时间且已逾期则为 true
      })),
    };
  }

  async remind(classId: string, id: string, dto: CreateReminderDto) {
    const message = await this.prisma.messages.findFirst({
      where: { id, class_id: classId },
    });
    if (!message) {
      throw new NotFoundException('通知不存在');
    }

    // 创建再次提醒任务，由定时任务处理
    await this.prisma.message_reminders.create({
      data: {
        id: uuidv4(),
        message_id: id,
        remind_at: new Date(Date.now() + dto.remindAfterMinutes * 60 * 1000),
        status: 'pending',
      },
    });

    return null;
  }

  async exportAcks(classId: string, id: string) {
    const message = await this.prisma.messages.findFirst({
      where: { id, class_id: classId },
    });
    if (!message) {
      throw new NotFoundException('通知不存在');
    }

    const [acked, allMembers] = await Promise.all([
      this.prisma.message_acks.findMany({
        where: { message_id: id },
        include: {
          users: { select: { id: true, name: true, student_id: true, phone: true } },
        },
      }),
      this.prisma.class_members.findMany({
        where: { class_id: classId },
        include: {
          users: { select: { id: true, name: true, student_id: true, phone: true } },
        },
      }),
    ]);

    const ackedUserIds = new Set(acked.map((a) => a.user_id));
    const unackedList = allMembers
      .filter((m) => !ackedUserIds.has(m.user_id))
      .map((m) => ({
        userId: m.user_id,
        name: m.users.name,
        studentId: m.users.student_id,
        phone: m.users.phone,
      }));

    return {
      messageId: id,
      title: message.title,
      total: allMembers.length,
      ackedCount: acked.length,
      unackedCount: unackedList.length,
      unackedList,
    };
  }
}
