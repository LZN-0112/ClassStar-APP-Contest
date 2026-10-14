import { Module } from '@nestjs/common';
import { RandomDrawsController } from './random-draws.controller';
import { RandomDrawsService } from './random-draws.service';

@Module({
  controllers: [RandomDrawsController],
  providers: [RandomDrawsService],
})
export class RandomDrawsModule {}
