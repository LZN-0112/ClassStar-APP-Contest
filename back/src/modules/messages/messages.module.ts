import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { DeadlineReminderService } from './deadline-reminder.service';

@Module({
  controllers: [MessagesController],
  providers: [MessagesService, NotificationSchedulerService, DeadlineReminderService],
  exports: [MessagesService],
})
export class MessagesModule {}
