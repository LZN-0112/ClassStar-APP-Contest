import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { Public } from '../decorators/public.decorator';

/**
 * 静态文件读取接口。
 * 图片/附件通过 <img src> / <a href> 直接访问，无法携带 Authorization 头，
 * 因此必须作为公开资源（文件名含哈希，不可枚举）。
 */
@Public()
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
    // Helmet 默认下发 Cross-Origin-Resource-Policy: same-origin，
    // 会导致 App（http://localhost）跨域加载图片/附件被浏览器拦截
    // （net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin），此处按资源放开。
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    fs.createReadStream(resolved).pipe(res);
  }
}
