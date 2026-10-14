import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { MaterialService } from './material.service';
import { CreateMaterialDto, QueryMaterialDto, BatchUploadMaterialDto, RepostMaterialDto } from './dto/material.dto';

@ApiTags('资料管理')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('material')
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

  @Post('upload')
  @ApiOperation({ summary: '上传文件' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateMaterialDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.materialService.uploadFile(file, dto, userId);
  }

  @Post('batch-upload')
  @ApiOperation({ summary: '批量上传文件' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 20))
  async batchUpload(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: BatchUploadMaterialDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.materialService.batchUploadFile(files, dto, userId);
  }

  @Post('repost')
  @ApiOperation({ summary: '一键转载（上传文件并创建通知）' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 20))
  async repost(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: RepostMaterialDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.materialService.repost(files, dto, userId);
  }

  @Get('list')
  @ApiOperation({ summary: '获取文件列表' })
  async getFileList(@Query() dto: QueryMaterialDto) {
    return this.materialService.getFileList(dto);
  }

  @Get(':fileId')
  @ApiOperation({ summary: '获取文件详情' })
  async getFileDetail(@Param('fileId') fileId: string) {
    return this.materialService.getFileDetail(fileId);
  }

  @Get(':fileId/download')
  @ApiOperation({ summary: '下载文件' })
  async downloadFile(
    @Param('fileId') fileId: string,
    @CurrentUser('userId') userId: string,
    @Res() res: Response,
  ) {
    const result = await this.materialService.downloadFile(fileId, userId);
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.fileName)}"`);
    res.setHeader('Content-Length', result.buffer.length);
    res.send(result.buffer);
  }

  @Delete(':fileId')
  @ApiOperation({ summary: '删除文件' })
  async deleteFile(
    @Param('fileId') fileId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.materialService.deleteFile(fileId, userId);
  }
}
