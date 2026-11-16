import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateMessageDto, CreateReminderDto } from './dto/messages.dto';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { PushService } from '../push/push.service';

/** 私密消息类型：仅预置了已读记录的接收人可见（活动报名结果、活动开始提醒、截止提醒、作业催交、作业驳回） */
const PRIVATE_MESSAGE_TYPES = [
  'activity_result',
  'activity_start',
  'deadline_reminder',
  'homework_urge',
  'homework_rejected',
];

/** 一键提醒的冷却时间：避免管理员连续点击造成同一条通知重复催办 */
const REMIND_COOLDOWN_MS = 30 * 60 * 1000;

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationScheduler: NotificationSchedulerService,
    private readonly push: PushService,
  ) {}

  async create(
    classId: string,
    dto: CreateMessageDto,
    publisherId: string,
    source?: { type: string; id: string },
  ) {
    const title = dto.title?.trim();
    const content = dto.content?.trim();
    if (!title) throw new BadRequestException('通知标题不能为空');
    if (!content) throw new BadRequestException('通知内容不能为空');
    const messageId = uuidv4();
    let recipientIds: string[] = [];

    await this.prisma.$transaction(async (tx) => {
      await tx.messages.create({
        data: {
          id: messageId,
          class_id: classId,
          publisher_id: publisherId,
          type: dto.type,
          title,
          content,
          location: dto.location,
          event_time: dto.eventTime ? new Date(dto.eventTime) : undefined,
          reminder_interval: dto.reminderInterval,
          require_ack: dto.requireAck ?? false,
          ack_deadline: dto.ackDeadline ? new Date(dto.ackDeadline) : undefined,
          status: dto.status ?? 'published',
          source_type: source?.type,
          source_id: source?.id,
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
      // 发布者本人不需要接收推送
      recipientIds = members.map((m) => m.user_id).filter((id) => id !== publisherId);
    });

    // 推送为旁路能力：接口先返回，失败不影响消息落库
    if ((dto.status ?? 'published') === 'published' && recipientIds.length) {
      void this.push.sendMessagePush(recipientIds, {
        title: dto.title,
        content: dto.content,
        messageId,
        classId,
        type: dto.type,
      });
    }

    return { id: messageId };
  }

  /**
   * 已结束签到关联的消息：签到结束后不再提醒，列表与未读数统一按已读处理
   * - 催签等考勤消息自身记录 source_type/source_id
   * - 截止提醒按人下发，来源关系存在 deadline_reminder_log 里
   */
  private async collectEndedAttendanceMessageIds(
    rows: Array<{
      id: string;
      type: string;
      source_type: string | null;
      source_id: string | null;
    }>,
  ): Promise<Set<string>> {
    const endedMessageIds = new Set<string>();
    if (rows.length === 0) return endedMessageIds;

    const attendanceByMessage = new Map<string, string>();
    for (const row of rows) {
      if (row.source_type === 'attendance' && row.source_id) {
        attendanceByMessage.set(row.id, row.source_id);
      }
    }

    const reminderMessageIds = rows
      .filter((row) => row.type === 'deadline_reminder' && !attendanceByMessage.has(row.id))
      .map((row) => row.id);
    if (reminderMessageIds.length > 0) {
      const logs = await this.prisma.deadline_reminder_log.findMany({
        where: { message_id: { in: reminderMessageIds }, source_type: 'attendance' },
        select: { message_id: true, source_id: true },
      });
      for (const log of logs) {
        attendanceByMessage.set(log.message_id, log.source_id);
      }
    }

    const attendanceIds = Array.from(new Set(attendanceByMessage.values()));
    if (attendanceIds.length === 0) return endedMessageIds;

    const ended = await this.prisma.attendances.findMany({
      where: {
        id: { in: attendanceIds },
        OR: [{ status: 'closed' }, { end_time: { lt: new Date() } }],
      },
      select: { id: true },
    });
    const endedIds = new Set(ended.map((item) => item.id));
    attendanceByMessage.forEach((attendanceId, messageId) => {
      if (endedIds.has(attendanceId)) endedMessageIds.add(messageId);
    });
    return endedMessageIds;
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
    if (type) {
      where.type = type;
      // 私密类型只返回当前用户作为接收人的消息
      if (PRIVATE_MESSAGE_TYPES.includes(type)) {
        where.message_reads = { some: { user_id: userId } };
      }
    } else {
      where.OR = [
        { type: { notIn: PRIVATE_MESSAGE_TYPES } },
        { message_reads: { some: { user_id: userId } } },
      ];
    }

    const [messages, total, readCounts, memberCount] = await Promise.all([
      this.prisma.messages.findMany({
        where,
        include: {
          users: { select: { id: true, name: true } },
          message_reads: { where: { user_id: userId } },
          // 当前用户是否已签收 + 该消息的总签收人数，用于列表展示签收进度
          message_acks: { where: { user_id: userId }, select: { id: true } },
          _count: { select: { message_acks: true } },
        },
        ...(skip ? { skip } : {}),
        take: pageSizeNum,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.messages.count({ where }),
      // 已读数只统计真正标记已读（read_at 非空）的记录；发布时预建的未读记录不计入
      this.prisma.message_reads.groupBy({
        by: ['message_id'],
        where: { read_at: { not: null } },
        _count: { message_id: true },
      }),
      // 班级总人数，用于计算签收进度分母
      this.prisma.class_members.count({ where: { class_id: classId } }),
    ]);

    const readCountMap = new Map(readCounts.map((r) => [r.message_id, r._count.message_id]));
    // 已结束签到的通知自动归为已读，不再显示红点
    const endedAttendanceMessageIds = await this.collectEndedAttendanceMessageIds(messages);

    return {
      list: messages.map((m) => ({
        id: m.id,
        type: m.type,
        title: m.title,
        content: m.content,
        location: m.location,
        eventTime: m.event_time,
        publisher: m.users,
        // 自己发布的消息不需要提醒自己，与首页“待签收通知”口径保持一致
        isRead:
          m.publisher_id === userId ||
          !!m.message_reads[0]?.read_at ||
          endedAttendanceMessageIds.has(m.id),
        requireAck: m.require_ack,
        status: m.status,
        ackDeadline: m.ack_deadline,
        isAcked: m.message_acks.length > 0,
        ackCount: m._count.message_acks,
        readCount: readCountMap.get(m.id) || 0,
        createdAt: m.created_at,
      })),
      memberCount,
      pagination: { page: pageNum, pageSize: pageSizeNum, total, totalPages: Math.ceil(total / pageSizeNum) },
    };
  }

  async getUnreadCount(classId: string, userId: string) {
    // 与列表 isRead 口径一致：没有 read_at 非空的已读记录即视为未读
    // 新成员加入前发布的消息不会预建已读记录，同样需要计入未读
    // 自己发布的消息不计入未读，避免“发完通知自己出现红点”
    const rows = await this.prisma.messages.findMany({
      where: {
        class_id: classId,
        publisher_id: { not: userId },
        message_reads: { none: { user_id: userId, read_at: { not: null } } },
        OR: [
          { type: { notIn: PRIVATE_MESSAGE_TYPES } },
          { message_reads: { some: { user_id: userId } } },
        ],
      },
      select: { id: true, type: true, source_type: true, source_id: true },
    });

    // 已结束签到的通知按已读处理，不计入未读
    const endedAttendanceMessageIds = await this.collectEndedAttendanceMessageIds(rows);
    const unreadRows = rows.filter((row) => !endedAttendanceMessageIds.has(row.id));

    let notice = 0;
    for (const row of unreadRows) {
      // reminder（催办/催交）、deadline_reminder（截止提醒）属于通知类，与前端“通知”Tab 保持一致
      if (row.type === 'notice' || row.type === 'reminder' || row.type === 'deadline_reminder') {
        notice++;
      }
    }

    return { total: unreadRows.length, notice, interaction: unreadRows.length - notice };
  }

  async findOne(classId: string, id: string, userId: string) {
    const message = await this.prisma.messages.findFirst({
      where: { id, class_id: classId },
      include: {
        users: { select: { id: true, name: true } },
        message_attachments: true,
        message_reads: { where: { user_id: userId }, select: { id: true } },
      },
    });

    if (
      !message ||
      (PRIVATE_MESSAGE_TYPES.includes(message.type) && message.message_reads.length === 0)
    ) {
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
      classId: message.class_id,
      sourceType: message.source_type,
      sourceId: message.source_id,
      requireAck: message.require_ack,
      ackDeadline: message.ack_deadline,
      isAcked: !!acked,
      status: message.status,
      publisher: message.users,
      attachments: message.message_attachments,
      createdAt: message.created_at,
    };
  }

  /**
   * 列表“曝光即已读”：批量标记当前用户可见的通知
   * - 本人发布、私密类型中非本人可见的消息不处理
   * - 需要签收且尚未签收的消息不自动已读，红点保留到签收完成
   */
  async markManyAsRead(classId: string, ids: string[], userId: string) {
    const uniqueIds = Array.from(new Set(ids)).slice(0, 200);
    if (uniqueIds.length === 0) return { updated: 0 };

    const targets = await this.prisma.messages.findMany({
      where: {
        id: { in: uniqueIds },
        class_id: classId,
        publisher_id: { not: userId },
        AND: [
          {
            OR: [
              { type: { notIn: PRIVATE_MESSAGE_TYPES } },
              { message_reads: { some: { user_id: userId } } },
            ],
          },
          {
            OR: [{ require_ack: false }, { message_acks: { some: { user_id: userId } } }],
          },
        ],
      },
      select: { id: true },
    });
    const targetIds = targets.map((item) => item.id);
    if (targetIds.length === 0) return { updated: 0 };

    const now = new Date();
    const [created, updated] = await this.prisma.$transaction([
      // 新成员加入前发布的消息没有预建已读记录，先补齐再更新
      this.prisma.message_reads.createMany({
        data: targetIds.map((id) => ({ id: uuidv4(), message_id: id, user_id: userId })),
        skipDuplicates: true,
      }),
      this.prisma.message_reads.updateMany({
        where: { user_id: userId, message_id: { in: targetIds }, read_at: null },
        data: { read_at: now },
      }),
    ]);

    return { updated: updated.count, created: created.count };
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
          users: { select: { id: true, name: true, student_id: true } },
        },
        orderBy: { acked_at: 'desc' },
      }),
      this.prisma.class_members.count({ where: { class_id: classId } }),
    ]);

    const ackedUserIds = new Set(acked.map((a) => a.user_id));
    const unackedMembers = await this.prisma.class_members.findMany({
      where: { class_id: classId, user_id: { notIn: Array.from(ackedUserIds) } },
      include: {
        users: { select: { id: true, name: true, student_id: true } },
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
        studentId: a.users.student_id,
        ackedAt: a.acked_at,
        overdue: false, // 已签收成员 overdue 始终为 false
      })),
      unackedList: unackedMembers.map((m) => ({
        userId: m.user_id,
        name: m.users.name,
        studentId: m.users.student_id,
        overdue: isOverdue, // 未签收成员：有截止时间且已逾期则为 true
      })),
    };
  }

  async remind(classId: string, id: string, _dto: CreateReminderDto) {
    const message = await this.prisma.messages.findFirst({
      where: { id, class_id: classId },
    });
    if (!message) {
      throw new NotFoundException('通知不存在');
    }

    // 冷却期内不允许重复催办，避免同一条通知在列表里出现多条【催办】
    const recentReminder = await this.prisma.message_reminders.findFirst({
      where: {
        message_id: id,
        created_at: { gte: new Date(Date.now() - REMIND_COOLDOWN_MS) },
      },
      orderBy: { created_at: 'desc' },
    });
    if (recentReminder) {
      throw new BadRequestException('该通知刚刚已提醒过，请 30 分钟后再试');
    }

    // 创建提醒记录后立即下发，未签收同学马上能在通知列表看到
    const reminderId = uuidv4();
    await this.prisma.message_reminders.create({
      data: {
        id: reminderId,
        message_id: id,
        remind_at: new Date(),
        status: 'pending',
      },
    });
    await this.notificationScheduler.processReminderById(reminderId);

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
