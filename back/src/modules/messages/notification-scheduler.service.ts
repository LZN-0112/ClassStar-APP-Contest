import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 每分钟执行一次，处理到期的催办提醒
   */
  @Cron('* * * * *')
  async handleReminders() {
    const now = new Date();

    // 查询所有到期且状态为 pending 的提醒
    const pendingReminders = await this.prisma.message_reminders.findMany({
      where: {
        status: 'pending',
        remind_at: { lte: now },
      },
      include: {
        messages: {
          include: {
            message_acks: true,
          },
        },
      },
    });

    if (pendingReminders.length === 0) {
      return;
    }

    this.logger.log(`发现 ${pendingReminders.length} 条到期提醒需要处理`);

    // 逐条处理提醒
    for (const reminder of pendingReminders) {
      try {
        await this.processReminder(reminder);
      } catch (error) {
        this.logger.error(`处理提醒失败 (reminder_id: ${reminder.id})`, error.stack);
        // 单条失败不影响其他提醒的处理
      }
    }
  }

  /**
   * 处理单条提醒：为未签收成员创建催办通知
   */
  private async processReminder(reminder: any) {
    const message = reminder.messages;
    if (!message) {
      this.logger.warn(`提醒关联的通知不存在 (reminder_id: ${reminder.id})`);
      await this.prisma.message_reminders.update({
        where: { id: reminder.id },
        data: { status: 'failed' },
      });
      return;
    }

    // 获取所有班级成员
    const allMembers = await this.prisma.class_members.findMany({
      where: { class_id: message.class_id },
      select: { user_id: true },
    });

    // 获取已签收成员
    const ackedUserIds = new Set(message.message_acks.map((ack: any) => ack.user_id));

    // 计算未签收成员
    const unackedMembers = allMembers.filter((m) => !ackedUserIds.has(m.user_id));

    if (unackedMembers.length === 0) {
      this.logger.log(`所有成员已签收，跳过催办 (message_id: ${message.id})`);
      await this.prisma.message_reminders.update({
        where: { id: reminder.id },
        data: { status: 'sent' },
      });
      return;
    }

    // 使用事务创建催办通知并更新提醒状态
    await this.prisma.$transaction(async (tx) => {
      // 为每个未签收成员创建催办通知
      for (const member of unackedMembers) {
        const reminderMessageId = uuidv4();

        await tx.messages.create({
          data: {
            id: reminderMessageId,
            class_id: message.class_id,
            publisher_id: message.publisher_id,
            type: 'reminder',
            title: `【催办】${message.title}`,
            content: `您有一条通知尚未签收：${message.title}，请尽快处理。`,
            require_ack: false,
            status: 'published',
          },
        });

        // 初始化已读记录（与 create() 保持一致）
        await tx.message_reads.create({
          data: {
            id: uuidv4(),
            message_id: reminderMessageId,
            user_id: member.user_id,
          },
        });
      }

      // 更新提醒状态为已发送
      await tx.message_reminders.update({
        where: { id: reminder.id },
        data: { status: 'sent' },
      });
    });

    this.logger.log(
      `催办通知已发送，为 ${unackedMembers.length} 位未签收成员创建催办 (message_id: ${message.id})`,
    );
  }
}
