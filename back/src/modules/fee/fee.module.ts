import { Module } from '@nestjs/common';
import { FeeController } from './fee.controller';
import { FeeService } from './fee.service';
import { MinioModule } from '@/common/storage/minio.module';
import { MinioPresignedModule } from '@/common/storage/minio-presigned.module';

@Module({
  imports: [MinioModule, MinioPresignedModule],
  controllers: [FeeController],
  providers: [FeeService],
})
export class FeeModule {}
