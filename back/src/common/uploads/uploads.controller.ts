import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';

@Controller('uploads')
export class UploadsController {
  private readonly localDir: string;

  constructor(private readonly configService: ConfigService) {
    this.localDir = this.configService.get(
      'MINIO_LOCAL_DIR',
      path.join(process.cwd(), 'tmp', 'minio-fallback'),
    );
  }

  @Get('*')
  serveFile(@Param('0') filePath: string, @Res() res: Response) {
    const fullPath = path.join(this.localDir, filePath);
    const resolved = path.resolve(fullPath);
    const resolvedDir = path.resolve(this.localDir);

    if (!resolved.startsWith(resolvedDir)) {
      throw new NotFoundException('文件不存在');
    }

    if (!fs.existsSync(resolved)) {
      throw new NotFoundException('文件不存在');
    }

    const ext = path.extname(resolved).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    fs.createReadStream(resolved).pipe(res);
  }
}
