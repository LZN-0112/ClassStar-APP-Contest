import { Module } from '@nestjs/common';
import { PushModule } from '../push/push.module';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { DeadlineReminderService } from './deadline-reminder.service';

@Module({
  imports: [PushModule],
  controllers: [MessagesController],
  providers: [MessagesService, NotificationSchedulerService, DeadlineReminderService],
  exports: [MessagesService],
})
export class MessagesModule {}
