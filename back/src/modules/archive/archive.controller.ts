import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ArchiveService } from './archive.service';
import { ExportArchiveDto } from './dto/archive.dto';

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

  @Get('classes/:classId/archives/:archiveId')
  @ApiOperation({ summary: '获取档案详情' })
  async getArchiveDetail(@Param('archiveId') archiveId: string) {
    return this.archiveService.getArchiveDetail(archiveId);
  }

  @Get('classes/:classId/archives/:archiveId/files/:fileId')
  @ApiOperation({ summary: '获取档案附件详情' })
  async getArchiveFile(
    @Param('archiveId') archiveId: string,
    @Param('fileId') fileId: string,
  ) {
    return this.archiveService.getArchiveFile(archiveId, fileId);
  }

  @Get('classes/:classId/archives/:archiveId/files/:fileId/download')
  @ApiOperation({ summary: '下载档案附件' })
  async downloadArchiveFile(
    @Param('archiveId') archiveId: string,
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ) {
    const result = await this.archiveService.downloadArchiveFile(
      archiveId,
      fileId,
    );
    res.redirect(HttpStatus.FOUND, result.fileUrl);
  }

  @Get('classes/:classId/archives/:archiveId/export')
  @ApiOperation({ summary: '导出档案（xlsx 或 pdf）' })
  async exportArchive(
    @Param('archiveId') archiveId: string,
    @Query() query: ExportArchiveDto,
    @Res() res: Response,
  ) {
    const format = query.format === 'pdf' ? 'pdf' : 'xlsx';
    const result = await this.archiveService.exportArchive(archiveId, format);
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(result.fileName)}"`,
    );
    res.setHeader('Content-Length', result.buffer.length);
    res.send(result.buffer);
  }
}