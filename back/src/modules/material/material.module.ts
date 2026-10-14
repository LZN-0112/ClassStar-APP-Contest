import { Module } from '@nestjs/common';
import { MaterialController } from './material.controller';
import { MaterialService } from './material.service';
import { MinioModule } from '@/common/storage/minio.module';

@Module({
  imports: [MinioModule],
  controllers: [MaterialController],
  providers: [MaterialService],
})
export class MaterialModule {}
