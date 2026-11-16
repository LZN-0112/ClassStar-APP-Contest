import { Module } from '@nestjs/common';
import { DeviceTokensController } from './device-tokens.controller';
import { DeviceTokensService } from './device-tokens.service';
import { JPushService } from './jpush.service';
import { PushCleanupService } from './push-cleanup.service';
import { PushService } from './push.service';

@Module({
  controllers: [DeviceTokensController],
  providers: [DeviceTokensService, JPushService, PushService, PushCleanupService],
  exports: [PushService],
})
export class PushModule {}