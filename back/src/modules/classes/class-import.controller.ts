import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ClassesService } from './classes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ImportStudentExcelDto } from './dto/classes.dto';
import { MinioService } from '@/common/storage/minio.service';
import { ExcelParserService } from '@/common/utils/excel-parser.service';
import { ClassPermissionService } from '@/common/permissions/class-permission.service';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

const MAX_EXCEL_SIZE = 10 * 1024 * 1024;

@ApiTags('班级成员导入')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('class')
export class ClassImportController {
  constructor(
    private readonly classesService: ClassesService,
    private readonly minioService: MinioService,
    private readonly excelParser: ExcelParserService,
    private readonly classPermission: ClassPermissionService,
  ) {}

  @Get('student-excel-template')
  @ApiOperation({ summary: '下载学生名单导入模板' })
  async downloadStudentExcelTemplate(@Res() res: Response) {
    const buffer = await this.excelParser.buildStudentTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="student-template.xlsx"; filename*=UTF-8''${encodeURIComponent('学生名单导入模板.xlsx')}`,
    );
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  @Post('upload-student-excel')
  @ApiOperation({ summary: '上传学生名单 Excel 到 MinIO（仅群主或管理员）' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_EXCEL_SIZE } }))
  async uploadStudentExcel(
    @UploadedFile() file: Express.Multer.File,
    @Body('classId') classId: string,
    @CurrentUser('userId') userId: string,
  ) {
    if (!classId) {
      throw new BadRequestException('缺少班级ID');
    }
    // 仅群主或管理员可上传名单
    await this.classPermission.assertAdminOrOwner(userId, classId);

    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }

    const ext = path.extname(file.originalname).toLowerCase();
    // ExcelJS 只支持 .xlsx，老版 .xls 无法解析，这里直接拦截并提示转换
    if (ext !== '.xlsx') {
      throw new BadRequestException('仅支持 .xlsx 格式，老版 .xls 请先在 Excel 中另存为 .xlsx');
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
