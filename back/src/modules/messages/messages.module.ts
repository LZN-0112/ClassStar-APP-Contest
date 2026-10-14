import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { NotificationSchedulerService } from './notification-scheduler.service';

@Module({
  controllers: [MessagesController],
  providers: [MessagesService, NotificationSchedulerService],
  exports: [MessagesService],
})
export class MessagesModule {}
