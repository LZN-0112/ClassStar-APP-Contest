import { Module } from '@nestjs/common';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { MinioModule } from '@/common/storage/minio.module';
import { MinioPresignedModule } from '@/common/storage/minio-presigned.module';

@Module({
  imports: [MinioModule, MinioPresignedModule],
  controllers: [ActivitiesController],
  providers: [ActivitiesService],
})
export class ActivitiesModule {}
