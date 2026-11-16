import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Res,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ArchiveService } from './archive.service';
import { ExportArchiveDto } from './dto/archive.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('班级档案')
@ApiBearerAuth()
@Controller()
export class ArchiveController {
  constructor(private readonly archiveService: ArchiveService) {}

  @Get('classes/:classId/archives')
  @ApiOperation({ summary: '获取班级学期档案列表' })
  async listArchives(@Param('classId') classId: string) {
    return this.archiveService.listArchives(classId);
  }

  @Post('classes/:classId/archives/semester')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '生成本学期档案（仅群主或管理员）' })
  async createSemesterArchive(
    @Param('classId') classId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.archiveService.createSemesterArchive(classId, userId);
  }

  @Get('classes/:classId/archives/:archiveId')
  @ApiOperation({ summary: '获取档案详情' })
  async getArchiveDetail(
    @Param('classId') classId: string,
    @Param('archiveId') archiveId: string,
  ) {
    return this.archiveService.getArchiveDetail(classId, archiveId);
  }

  @Get('classes/:classId/archives/:archiveId/files/:fileId')
  @ApiOperation({ summary: '获取档案附件详情' })
  async getArchiveFile(
    @Param('classId') classId: string,
    @Param('archiveId') archiveId: string,
    @Param('fileId') fileId: string,
  ) {
    return this.archiveService.getArchiveFile(classId, archiveId, fileId);
  }

  @Get('classes/:classId/archives/:archiveId/files/:fileId/download')
  @ApiOperation({ summary: '下载档案附件' })
  async downloadArchiveFile(
    @Param('classId') classId: string,
    @Param('archiveId') archiveId: string,
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ) {
    const result = await this.archiveService.downloadArchiveFile(
      classId,
      archiveId,
      fileId,
    );
    // 静态资源控制器位于全局前缀下（/api/v1/uploads），
    // 直接重定向到相对路径 /uploads/... 会 404。
    const target = /^https?:/i.test(result.fileUrl)
      ? result.fileUrl
      : `/api/v1${result.fileUrl.startsWith('/') ? '' : '/'}${result.fileUrl}`;
    res.redirect(HttpStatus.FOUND, target);
  }

  @Get('classes/:classId/archives/:archiveId/export')
  @ApiOperation({ summary: '导出档案（xlsx 或 pdf）' })
  async exportArchive(
    @Param('classId') classId: string,
    @Param('archiveId') archiveId: string,
    @Query() query: ExportArchiveDto,
    @Res() res: Response,
  ) {
    const format = query.format === 'pdf' ? 'pdf' : 'xlsx';
    const result = await this.archiveService.exportArchive(classId, archiveId, format);
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(result.fileName)}"`,
    );
    res.setHeader('Content-Length', result.buffer.length);
    res.send(result.buffer);
  }
}