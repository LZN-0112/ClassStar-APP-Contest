import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ClassesService } from './classes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ImportStudentExcelDto } from './dto/classes.dto';
import { MinioService } from '@/common/storage/minio.service';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@ApiTags('班级成员导入')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('class')
export class ClassImportController {
  constructor(
    private readonly classesService: ClassesService,
    private readonly minioService: MinioService,
  ) {}

  @Post('upload-student-excel')
  @ApiOperation({ summary: '上传学生名单 Excel 到 MinIO' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadStudentExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.xlsx', '.xls'].includes(ext)) {
      throw new BadRequestException('仅支持 .xlsx、.xls 格式的 Excel 文件');
    }

    const objectName = `student-excel/${uuidv4()}${ext}`;
    const fileUrl = await this.minioService.uploadBuffer(objectName, file.buffer, {
      'Content-Type': file.mimetype,
    });

    return { fileUrl };
  }

  @Post('import-student-excel')
  @ApiOperation({ summary: 'Excel 导入学生名单' })
  async importStudentExcel(
    @Body() dto: ImportStudentExcelDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.classesService.importStudentExcel(dto, userId);
  }
}
