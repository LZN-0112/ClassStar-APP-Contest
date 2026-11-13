import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../common/database/prisma.service';
import { getActivityStartTime } from '../activities/activity-status.utils';

type SourceType = 'homework' | 'attendance' | 'activity' | 'vote';

interface DeadlineItem {
  sourceType: SourceType;
  sourceId: string;
  classId: string;
  publisherId: string;
  title: string;
  deadline: Date;
}

interface NotifyPref {
  enabled: boolean;
  advance: number;
}

interface ReminderPlan {
  messageId: string;
  userId: string;
  item: DeadlineItem;
  advance: number;
}

/** 与前端「消息通知设置」的默认值保持一致 */
const DEFAULT_PREF: Record<SourceType, NotifyPref> = {
  homework: { enabled: true, advance: 60 },
  attendance: { enabled: true, advance: 15 },
  activity: { enabled: false, advance: 1440 },
  vote: { enabled: true, advance: 30 },
};

const MAX_ADVANCE_MINUTES = 2880; // 48 小时，与设置项最大提前量一致

/** 活动开始前多久提醒已报名学生 */
const ACTIVITY_START_ADVANCE_MINUTES = 60;

const CONTENT_TEMPLATE: Record<SourceType, (title: string, time: string) => string> = {
  homework: (title, time) => `作业「${title}」将于 ${time} 截止，请及时提交。`,
  attendance: (title, time) => `考勤「${title}」将于 ${time} 开始签到，请按时签到。`,
  activity: (title, time) => `活动「${title}」报名将于 ${time} 截止，请及时报名。`,
  vote: (title, time) => `投票「${title}」将于 ${time} 截止，请及时参与。`,
};

@Injectable()
export class DeadlineReminderService {
  private readonly logger = new Logger(DeadlineReminderService.name);
  private running = false;
  private activityStartRunning = false;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 每分钟扫描一次即将到期的作业/考勤/活动/投票，
   * 按每位成员的提醒设置生成站内消息（只提醒一次）。
   */
  @Cron('* * * * *')
  async scan() {
    if (this.running) return;
    this.running = true;
    try {
      await this.runScan();
    } catch (error) {
      this.logger.error('截止提醒扫描失败', error instanceof Error ? error.stack : String(error));
    } finally {
      this.running = false;
    }
  }

  private async runScan() {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + MAX_ADVANCE_MINUTES * 60 * 1000);
    const deadlineRange = { gte: now, lte: windowEnd };

    const [homeworks, attendances, activities, votes] = await Promise.all([
      this.prisma.homeworks.findMany({
        where: { status: 'published', deadline: deadlineRange },
        select: { id: true, class_id: true, publisher_id: true, title: true, deadline: true },
      }),
      this.prisma.attendances.findMany({
        where: { status: 'open', start_time: deadlineRange },
        select: { id: true, class_id: true, publisher_id: true, title: true, start_time: true },
      }),
      this.prisma.activities.findMany({
        where: { status: 'registering', deadline: deadlineRange },
        select: { id: true, class_id: true, publisher_id: true, title: true, deadline: true },
      }),
      this.prisma.votes.findMany({
        where: { status: 'published', deadline: deadlineRange },
        select: { id: true, class_id: true, publisher_id: true, title: true, deadline: true },
      }),
    ]);

    const items: DeadlineItem[] = [
      ...homeworks.map((h) => ({
        sourceType: 'homework' as const,
        sourceId: h.id,
        classId: h.class_id,
        publisherId: h.publisher_id,
        title: h.title,
        deadline: h.deadline,
      })),
      ...attendances.map((a) => ({
        sourceType: 'attendance' as const,
        sourceId: a.id,
        classId: a.class_id,
        publisherId: a.publisher_id,
        title: a.title,
        deadline: a.start_time,
      })),
      ...activities
        .filter((a) => a.deadline !== null)
        .map((a) => ({
          sourceType: 'activity' as const,
          sourceId: a.id,
          classId: a.class_id,
          publisherId: a.publisher_id,
          title: a.title,
          deadline: a.deadline as Date,
        })),
      ...votes.map((v) => ({
        sourceType: 'vote' as const,
        sourceId: v.id,
        classId: v.class_id,
        publisherId: v.publisher_id,
        title: v.title,
        deadline: v.deadline,
      })),
    ];

    if (items.length === 0) return;

    const classIds = Array.from(new Set(items.map((i) => i.classId)));
    const sourceIds = items.map((i) => i.sourceId);

    const members = await this.prisma.class_members.findMany({
      where: { class_id: { in: classIds } },
      select: { class_id: true, user_id: true },
    });
    const membersByClass = new Map<string, string[]>();
    for (const member of members) {
      const list = membersByClass.get(member.class_id) ?? [];
      list.push(member.user_id);
      membersByClass.set(member.class_id, list);
    }

    const userIds = Array.from(new Set(members.map((m) => m.user_id)));
    if (userIds.length === 0) return;

    const [settings, existingLogs, submissions, attendanceRecords, registrations, voteRecords] =
      await Promise.all([
        this.prisma.user_settings.findMany({
          where: { user_id: { in: userIds } },
          select: { user_id: true, notification_settings: true },
        }),
        this.prisma.deadline_reminder_log.findMany({
          where: { user_id: { in: userIds }, source_id: { in: sourceIds } },
          select: { user_id: true, source_type: true, source_id: true },
        }),
        this.prisma.homework_submissions.findMany({
          where: { homework_id: { in: sourceIds } },
          select: { homework_id: true, student_id: true },
        }),
        this.prisma.attendance_records.findMany({
          where: { attendance_id: { in: sourceIds } },
          select: { attendance_id: true, student_id: true, status: true, check_in_at: true },
        }),
        this.prisma.activity_registrations.findMany({
          where: { activity_id: { in: sourceIds } },
          select: { activity_id: true, student_id: true, status: true },
        }),
        this.prisma.vote_records.findMany({
          where: { vote_id: { in: sourceIds } },
          select: { vote_id: true, student_id: true },
        }),
      ]);

    const settingsMap = new Map(settings.map((s) => [s.user_id, s.notification_settings]));
    const doneKeys = new Set<string>();
    const reminderKey = (sourceId: string, userId: string) => `${sourceId}:${userId}`;

    existingLogs.forEach((log) => doneKeys.add(reminderKey(log.source_id, log.user_id)));
    submissions.forEach((s) => doneKeys.add(reminderKey(s.homework_id, s.student_id)));
    attendanceRecords
      .filter((r) => r.check_in_at !== null || r.status !== 'absent')
      .forEach((r) => doneKeys.add(reminderKey(r.attendance_id, r.student_id)));
    registrations
      .filter((r) => r.status !== 'cancelled')
      .forEach((r) => doneKeys.add(reminderKey(r.activity_id, r.student_id)));
    voteRecords.forEach((r) => doneKeys.add(reminderKey(r.vote_id, r.student_id)));

    const plans: ReminderPlan[] = [];
    for (const item of items) {
      const memberIds = membersByClass.get(item.classId) ?? [];
      for (const userId of memberIds) {
        if (userId === item.publisherId) continue;
        if (doneKeys.has(reminderKey(item.sourceId, userId))) continue;

        const pref = this.resolvePref(settingsMap.get(userId), item.sourceType);
        if (!pref.enabled) continue;

        const remindAt = item.deadline.getTime() - pref.advance * 60 * 1000;
        if (remindAt > now.getTime() || item.deadline.getTime() <= now.getTime()) continue;

        plans.push({ messageId: uuidv4(), userId, item, advance: pref.advance });
      }
    }

    if (plans.length === 0) return;

    // 先抢占发送记录：唯一键 uk_user_source 保证同一用户对同一对象只提醒一次。
    // 必须在创建消息之前完成，避免多实例同时扫描时生成重复消息。
    const claimedPlans: ReminderPlan[] = [];
    for (const plan of plans) {
      try {
        await this.prisma.deadline_reminder_log.create({
          data: {
            id: uuidv4(),
            user_id: plan.userId,
            class_id: plan.item.classId,
            source_type: plan.item.sourceType,
            source_id: plan.item.sourceId,
            deadline: plan.item.deadline,
            advanced_minutes: plan.advance,
            message_id: plan.messageId,
          },
        });
        claimedPlans.push(plan);
      } catch (error) {
        if ((error as { code?: string })?.code === 'P2002') continue;
        throw error;
      }
    }

    if (claimedPlans.length === 0) return;

    const deadlineTime = new Map<string, string>();
    const messageRows = claimedPlans.map((plan) => {
      const timeKey = `${plan.item.sourceType}:${plan.item.sourceId}`;
      let time = deadlineTime.get(timeKey);
      if (!time) {
        time = this.formatDeadline(plan.item.deadline);
        deadlineTime.set(timeKey, time);
      }
      return {
        id: plan.messageId,
        class_id: plan.item.classId,
        publisher_id: plan.item.publisherId,
        // 截止提醒是发给个人的消息，使用独立类型并在查询侧做接收人过滤
        type: 'deadline_reminder',
        title: `【截止提醒】${plan.item.title}`,
        content: CONTENT_TEMPLATE[plan.item.sourceType](plan.item.title, time),
        require_ack: false,
        status: 'published',
      };
    });

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.messages.createMany({ data: messageRows });
        await tx.message_reads.createMany({
          data: claimedPlans.map((plan) => ({
            id: uuidv4(),
            message_id: plan.messageId,
            user_id: plan.userId,
          })),
        });
      });
    } catch (error) {
      // 消息写入失败时释放已抢占的记录，避免用户永远收不到这次提醒
      await this.prisma.deadline_reminder_log.deleteMany({
        where: { message_id: { in: claimedPlans.map((plan) => plan.messageId) } },
      });
      throw error;
    }

    this.logger.log(`已生成 ${claimedPlans.length} 条截止提醒站内消息`);
  }

  /**
   * 每分钟扫描一次即将开始的活动，给已报名学生发送开始前提醒（只提醒一次）。
   */
  @Cron('* * * * *')
  async scanActivityStart() {
    if (this.activityStartRunning) return;
    this.activityStartRunning = true;
    try {
      await this.runActivityStartScan();
    } catch (error) {
      this.logger.error(
        '活动开始提醒扫描失败',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.activityStartRunning = false;
    }
  }

  private async runActivityStartScan() {
    const now = new Date();
    const windowEnd = new Date(
      now.getTime() + ACTIVITY_START_ADVANCE_MINUTES * 60 * 1000,
    );
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 2 * 24 * 60 * 60 * 1000);

    // 仅处理有具体开始时间的活动（event_date 为 Date，event_time 为 Time）
    const activities = await this.prisma.activities.findMany({
      where: {
        status: { not: 'cancelled' },
        event_time: { not: null },
        event_date: { gte: dayStart, lt: dayEnd },
      },
      select: {
        id: true,
        class_id: true,
        publisher_id: true,
        title: true,
        location: true,
        event_date: true,
        event_time: true,
        status: true,
      },
    });

    const items = activities
      .map((activity) => ({
        activity,
        start: getActivityStartTime(activity),
      }))
      .filter(({ start }) => start > now && start <= windowEnd);

    if (items.length === 0) return;

    const activityIds = items.map(({ activity }) => activity.id);

    const [registrations, existingLogs] = await Promise.all([
      this.prisma.activity_registrations.findMany({
        where: {
          activity_id: { in: activityIds },
          status: { notIn: ['rejected', 'cancelled'] },
        },
        select: { activity_id: true, student_id: true },
      }),
      this.prisma.deadline_reminder_log.findMany({
        where: { source_type: 'activity_start', source_id: { in: activityIds } },
        select: { source_id: true, user_id: true },
      }),
    ]);

    const doneKeys = new Set(
      existingLogs.map((log) => `${log.source_id}:${log.user_id}`),
    );

    const plans: {
      messageId: string;
      activity: (typeof items)[number]['activity'];
      start: Date;
      userId: string;
    }[] = [];

    for (const { activity, start } of items) {
      for (const registration of registrations) {
        if (registration.activity_id !== activity.id) continue;
        const key = `${activity.id}:${registration.student_id}`;
        if (doneKeys.has(key)) continue;
        doneKeys.add(key);
        plans.push({
          messageId: uuidv4(),
          activity,
          start,
          userId: registration.student_id,
        });
      }
    }

    if (plans.length === 0) return;

    // 先抢占发送记录，避免多实例同时扫描时重复生成活动提醒
    const claimedPlans: typeof plans = [];
    for (const plan of plans) {
      try {
        await this.prisma.deadline_reminder_log.create({
          data: {
            id: uuidv4(),
            user_id: plan.userId,
            class_id: plan.activity.class_id,
            source_type: 'activity_start',
            source_id: plan.activity.id,
            deadline: plan.start,
            advanced_minutes: ACTIVITY_START_ADVANCE_MINUTES,
            message_id: plan.messageId,
          },
        });
        claimedPlans.push(plan);
      } catch (error) {
        if ((error as { code?: string })?.code === 'P2002') continue;
        throw error;
      }
    }

    if (claimedPlans.length === 0) return;

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.messages.createMany({
          data: claimedPlans.map((plan) => ({
            id: plan.messageId,
            class_id: plan.activity.class_id,
            publisher_id: plan.activity.publisher_id,
            type: 'activity_start',
            title: `【活动提醒】${plan.activity.title}`.slice(0, 200),
            content: `活动「${plan.activity.title}」将于 ${this.formatDeadline(
              plan.start,
            )} 开始，请提前做好准备。地点：${plan.activity.location || '待定'}`,
            event_time: plan.start,
            location: plan.activity.location ?? null,
            require_ack: false,
            status: 'published',
          })),
        });
        await tx.message_reads.createMany({
          data: claimedPlans.map((plan) => ({
            id: uuidv4(),
            message_id: plan.messageId,
            user_id: plan.userId,
          })),
        });
      });
    } catch (error) {
      await this.prisma.deadline_reminder_log.deleteMany({
        where: { message_id: { in: claimedPlans.map((plan) => plan.messageId) } },
      });
      throw error;
    }

    this.logger.log(`已生成 ${claimedPlans.length} 条活动开始提醒站内消息`);
  }

  private resolvePref(raw: unknown, type: SourceType): NotifyPref {
    const fallback = DEFAULT_PREF[type];
    if (!raw || typeof raw !== 'object') return fallback;

    const value = (raw as Record<string, unknown>)[type];
    if (typeof value === 'boolean') return { ...fallback, enabled: value };
    if (!value || typeof value !== 'object') return fallback;

    const { enabled, advance } = value as { enabled?: unknown; advance?: unknown };
    return {
      enabled: typeof enabled === 'boolean' ? enabled : fallback.enabled,
      advance: typeof advance === 'number' ? advance : fallback.advance,
    };
  }

  private formatDeadline(date: Date): string {
    const parts = new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);
    const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    return `${pick('month')}月${pick('day')}日 ${pick('hour')}:${pick('minute')}`;
  }
}