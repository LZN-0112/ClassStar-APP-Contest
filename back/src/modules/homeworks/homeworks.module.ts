import { Module } from '@nestjs/common';
import { HomeworksController } from './homeworks.controller';
import { HomeworksService } from './homeworks.service';
import { OcrService } from './ocr.service';
import { MinioModule } from '@/common/storage/minio.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [MinioModule, PushModule],
  controllers: [HomeworksController],
  providers: [HomeworksService, OcrService],
  exports: [HomeworksService],
})
export class HomeworksModule {}
