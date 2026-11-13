import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@Injectable()
export class MinioService {
  private readonly logger = new Logger(MinioService.name);
  private readonly client: Minio.Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;
  private readonly localFallback: boolean;
  private readonly localDir: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new Minio.Client({
      endPoint: this.configService.get('MINIO_ENDPOINT', 'localhost'),
      port: parseInt(this.configService.get('MINIO_PORT', '9000'), 10),
      useSSL: this.configService.get('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.configService.get('MINIO_ACCESS_KEY', ''),
      secretKey: this.configService.get('MINIO_SECRET_KEY', ''),
    });
    this.bucketName = this.configService.get('MINIO_BUCKET_NAME', 'class-assistant');
    this.publicUrl = this.configService.get(
      'MINIO_PUBLIC_URL',
      `http://${this.configService.get('MINIO_ENDPOINT', 'localhost')}:${this.configService.get('MINIO_PORT', '9000')}`,
    );
    this.localFallback = this.configService.get('MINIO_LOCAL_FALLBACK', 'false') === 'true';
    this.localDir = this.configService.get(
      'MINIO_LOCAL_DIR',
      path.join(process.cwd(), 'tmp', 'minio-fallback'),
    );
  }

  async ensureBucket() {
    if (this.localFallback) {
      if (!fs.existsSync(this.localDir)) {
        fs.mkdirSync(this.localDir, { recursive: true });
      }
      return;
    }
    const exists = await this.client.bucketExists(this.bucketName).catch(() => false);
    if (!exists) {
      await this.client.makeBucket(this.bucketName);
    }
  }

  async uploadFile(
    objectName: string,
    filePath: string,
    metaData?: Minio.ItemBucketMetadata,
  ): Promise<string> {
    await this.ensureBucket();
    if (this.localFallback) {
      const dest = path.join(this.localDir, objectName);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(filePath, dest);
      return `/uploads/${objectName}`;
    }
    await this.client.fPutObject(this.bucketName, objectName, filePath, metaData || {});
    return `${this.publicUrl}/${this.bucketName}/${objectName}`;
  }

  async uploadBuffer(
    objectName: string,
    buffer: Buffer,
    metaData?: Minio.ItemBucketMetadata,
  ): Promise<string> {
    await this.ensureBucket();
    if (this.localFallback) {
      const dest = path.join(this.localDir, objectName);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, buffer);
      return `/uploads/${objectName}`;
    }
    await this.client.putObject(this.bucketName, objectName, buffer, buffer.length, metaData || {});
    return `${this.publicUrl}/${this.bucketName}/${objectName}`;
  }

  async downloadFile(fileUrl: string): Promise<string> {
    // 本地回退模式：fileUrl 格式为 /uploads/xxx，仅允许访问 localDir 内的文件，防止路径穿越
    if (fileUrl.startsWith('/uploads/')) {
      const localDir = path.resolve(this.localDir);
      const localPath = path.resolve(localDir, fileUrl.replace('/uploads/', ''));
      if (!localPath.startsWith(`${localDir}${path.sep}`)) {
        this.logger.warn(`拒绝越权的本地文件访问: ${fileUrl}`);
        throw new Error('非法的文件地址');
      }
      this.logger.debug(`本地回退下载: ${localPath}`);
      if (!fs.existsSync(localPath)) {
        this.logger.error(`本地文件不存在: ${localPath}`);
        throw new Error('本地文件不存在');
      }
      return localPath;
    }

    const objectName = this.extractObjectName(fileUrl);
    if (!objectName) {
      throw new Error('无效的 MinIO 文件地址');
    }

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'class-assistant-'));
    const localPath = path.join(tempDir, path.basename(objectName));

    await this.client.fGetObject(this.bucketName, objectName, localPath);
    return localPath;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    const objectName = this.extractObjectName(fileUrl);
    if (!objectName) return;
    await this.client.removeObject(this.bucketName, objectName).catch((err) => {
      this.logger.warn(`删除 MinIO 文件失败: ${objectName}`, err.message);
    });
  }

  private extractObjectName(fileUrl: string): string | null {
    if (!fileUrl) return null;
    const prefix = `${this.publicUrl}/${this.bucketName}/`;
    if (fileUrl.startsWith(prefix)) {
      return fileUrl.substring(prefix.length);
    }
    return null;
  }
}
