import { Module } from '@nestjs/common';
import { ArchiveController } from './archive.controller';
import { ArchiveService } from './archive.service';
import { MinioModule } from '@/common/storage/minio.module';

@Module({
  imports: [MinioModule],
  controllers: [ArchiveController],
  providers: [ArchiveService],
})
export class ArchiveModule {}