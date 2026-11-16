import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  constructor(private readonly configService: ConfigService) {}

  private getAiApiKey() {
    return this.configService.get<string>('AI_API_KEY')?.trim() || '';
  }

  /** 用已接入的视觉大模型识别截图中的文字 */
  private async recognizeWithAi(imageBuffer: Buffer, mimeType?: string): Promise<string> {
    const apiKey = this.getAiApiKey();
    const baseUrl = (
      this.configService.get<string>('AI_BASE_URL') ||
      'https://dashscope.aliyuncs.com/compatible-mode/v1'
    ).replace(/\/+$/, '');
    const model = this.configService.get<string>('AI_VL_MODEL') || 'qwen3-vl-plus';
    const mime = mimeType?.startsWith('image/') ? mimeType : 'image/jpeg';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: { url: `data:${mime};base64,${imageBuffer.toString('base64')}` },
                },
                {
                  type: 'text',
                  text: '识别图片中的所有文字，按行原样输出，不要解释、不要总结。',
                },
              ],
            },
          ],
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const detail = await response.text();
        this.logger.warn(`OCR 识别失败：${response.status} ${detail.slice(0, 200)}`);
        throw new Error(`HTTP ${response.status}`);
      }

      const json = (await response.json()) as {
        choices?: { message?: { content?: unknown } }[];
      };
      const content = json.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim()) {
        throw new Error('识别结果为空');
      }
      return content.trim();
    } finally {
      clearTimeout(timeout);
    }
  }

  async recognizeStudentIds(
    imageBuffer: Buffer,
    mimeType?: string,
  ): Promise<{ rawText: string; studentIds: string[] }> {
    if (!this.getAiApiKey()) {
      throw new BadRequestException('OCR 服务未配置，暂时无法识别截图；可手动输入学号完成核对');
    }

    let rawText = '';
    try {
      rawText = await this.recognizeWithAi(imageBuffer, mimeType);
    } catch (error) {
      this.logger.error('OCR识别异常', error);
      throw new BadRequestException('OCR识别失败，请重试或手动输入学号');
    }

    // 提取8-12位纯数字学号
    const matches = rawText.match(/\b\d{8,12}\b/g) || [];
    const studentIds: string[] = Array.from(new Set(matches));

    return { rawText, studentIds };
  }
}