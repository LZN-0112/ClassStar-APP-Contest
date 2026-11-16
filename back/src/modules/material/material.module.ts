import { Module } from '@nestjs/common';
import { PushModule } from '../push/push.module';
import { MaterialController } from './material.controller';
import { MaterialService } from './material.service';
import { MinioModule } from '@/common/storage/minio.module';

@Module({
  imports: [MinioModule, PushModule],
  controllers: [MaterialController],
  providers: [MaterialService],
})
export class MaterialModule {}
