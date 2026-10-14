import { Module } from '@nestjs/common';
import { HomeworksController } from './homeworks.controller';
import { HomeworksService } from './homeworks.service';
import { OcrService } from './ocr.service';

@Module({
  controllers: [HomeworksController],
  providers: [HomeworksService, OcrService],
  exports: [HomeworksService],
})
export class HomeworksModule {}
