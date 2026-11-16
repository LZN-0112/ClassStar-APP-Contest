import { Module } from '@nestjs/common';
import { PushModule } from '../push/push.module';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { MinioModule } from '@/common/storage/minio.module';
import { MinioPresignedModule } from '@/common/storage/minio-presigned.module';

@Module({
  imports: [MinioModule, MinioPresignedModule, PushModule],
  controllers: [ActivitiesController],
  providers: [ActivitiesService],
})
export class ActivitiesModule {}
