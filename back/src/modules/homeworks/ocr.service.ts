import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../common/cache/redis.service';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  private async getAccessToken(): Promise<string> {
    const apiKey = this.configService.get<string>('BAIDU_OCR_API_KEY');
    const secretKey = this.configService.get<string>('BAIDU_OCR_SECRET_KEY');

    if (!apiKey || !secretKey) {
      throw new BadRequestException('OCR服务未配置，请联系管理员');
    }

    const cacheKey = 'ocr:baidu:token';
    const cachedToken = await this.redisService.get(cacheKey);
    if (cachedToken) {
      return cachedToken;
    }

    try {
      const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`;
      const response = await fetch(url, { method: 'POST' });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.access_token) {
        throw new Error(data.error_description || '获取access_token失败');
      }

      const accessToken = data.access_token;
      // TTL 30天（2592000秒），但百度token有效期通常为30天，提前一点过期
      await this.redisService.set(cacheKey, accessToken, 2592000);

      return accessToken;
    } catch (error) {
      this.logger.error('获取百度OCR access_token失败', error);
      throw new BadRequestException('OCR服务认证失败，请联系管理员');
    }
  }

  async recognizeStudentIds(
    imageBuffer: Buffer,
  ): Promise<{ rawText: string; studentIds: string[] }> {
    const accessToken = await this.getAccessToken();

    try {
      const base64Image = imageBuffer.toString('base64');
      const url = `https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=${accessToken}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `image=${encodeURIComponent(base64Image)}`,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.error_code) {
        this.logger.error('百度OCR识别失败', data);
        throw new BadRequestException('OCR识别失败，请重试或手动输入学号');
      }

      const wordsResult = data.words_result || [];
      const rawText = wordsResult.map((item: { words: string }) => item.words).join('\n');

      // 提取8-12位纯数字学号
      const matches = rawText.match(/\b\d{8,12}\b/g) || [];
      const studentIds: string[] = Array.from(new Set(matches));

      return { rawText, studentIds };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('OCR识别异常', error);
      throw new BadRequestException('OCR识别失败，请重试或手动输入学号');
    }
  }
}
