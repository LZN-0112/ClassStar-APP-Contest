import { Module } from '@nestjs/common';
import { MinioPresignedService } from './minio-presigned.service';

@Module({
  providers: [MinioPresignedService],
  exports: [MinioPresignedService],
})
export class MinioPresignedModule {}
