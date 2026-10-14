import { Module } from '@nestjs/common';
import { ClassesController } from './classes.controller';
import { ClassImportController } from './class-import.controller';
import { ClassesService } from './classes.service';
import { MinioModule } from '@/common/storage/minio.module';
import { ExcelParserModule } from '@/common/utils/excel-parser.module';

@Module({
  imports: [MinioModule, ExcelParserModule],
  controllers: [ClassesController, ClassImportController],
  providers: [ClassesService],
  exports: [ClassesService],
})
export class ClassesModule {}
