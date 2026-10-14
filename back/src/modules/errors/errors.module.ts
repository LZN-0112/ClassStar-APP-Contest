import { Module } from '@nestjs/common';
import { ErrorsController } from './errors.controller';
import { ErrorsService } from './errors.service';
import { NotificationService } from './notification.service';

@Module({
  controllers: [ErrorsController],
  providers: [ErrorsService, NotificationService],
  exports: [ErrorsService],
})
export class ErrorsModule {}
