import { Module } from '@nestjs/common';
import { RandomDrawsController } from './random-draws.controller';
import { RandomDrawsService } from './random-draws.service';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [MessagesModule],
  controllers: [RandomDrawsController],
  providers: [RandomDrawsService],
})
export class RandomDrawsModule {}
