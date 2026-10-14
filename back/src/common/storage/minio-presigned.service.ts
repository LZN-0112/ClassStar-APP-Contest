import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioPresignedService {
  private readonly client: Minio.Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;

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
  }

  async getPresignedUrl(fileUrl: string, expirySeconds = 3600): Promise<string> {
    const objectName = this.extractObjectName(fileUrl);
    if (!objectName) {
      throw new Error('无效的 MinIO 文件地址');
    }
    if (objectName.startsWith('local://')) {
      return objectName;
    }
    return this.client.presignedGetObject(this.bucketName, objectName, expirySeconds);
  }

  async getPresignedUrlByObjectName(objectName: string, expirySeconds = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucketName, objectName, expirySeconds);
  }

  private extractObjectName(fileUrl: string): string | null {
    if (!fileUrl) return null;
    const prefix = `${this.publicUrl}/${this.bucketName}/`;
    if (fileUrl.startsWith(prefix)) {
      return fileUrl.substring(prefix.length);
    }
    if (fileUrl.startsWith('local://')) {
      return fileUrl;
    }
    return null;
  }
}
