import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/common/cache/redis.service';

export type SmsScene = 'register' | 'wechat_bind';

interface SmsCodeRecord {
  code: string;
  attempts: number;
}

/**
 * 短信验证码：用于注册、微信绑定手机号等需要证明手机号归属的场景。
 *
 * 当前未接入短信服务商：仅在非生产环境（或显式配置 SMS_FIXED_CODE）时
 * 使用固定验证码，并在发送响应中返回 devCode 便于测试。
 * 生产环境未配置 SMS_FIXED_CODE 时直接拒绝发送，避免出现万能验证码。
 */
@Injectable()
export class SmsCodeService {
  private readonly logger = new Logger(SmsCodeService.name);
  private readonly codeTtlSeconds = 300;
  private readonly sendIntervalSeconds = 60;
  private readonly maxAttempts = 5;

  constructor(private readonly redisService: RedisService) {}

  private getFixedCode(): string | null {
    const configured = (process.env.SMS_FIXED_CODE || '').trim();
    if (/^\d{6}$/.test(configured)) {
      return configured;
    }
    if (process.env.NODE_ENV !== 'production') {
      return '123456';
    }
    return null;
  }

  async send(phone: string, scene: SmsScene) {
    const rateKey = `sms:rate:${scene}:${phone}`;
    if (await this.redisService.exists(rateKey)) {
      throw new BadRequestException('验证码发送过于频繁，请 60 秒后重试');
    }

    const fixedCode = this.getFixedCode();
    if (!fixedCode) {
      this.logger.error('未配置短信服务商，无法发送验证码');
      throw new BadRequestException('短信服务暂未开通，请联系管理员');
    }

    // 接入真实短信服务商后，在此替换为服务商发送逻辑；固定码仅用于测试环境
    const record: SmsCodeRecord = { code: fixedCode, attempts: 0 };
    await this.redisService.set(
      `sms:code:${scene}:${phone}`,
      JSON.stringify(record),
      this.codeTtlSeconds,
    );
    await this.redisService.set(rateKey, '1', this.sendIntervalSeconds);
    this.logger.log(`验证码已生成 scene=${scene} phone=${phone.slice(0, 3)}****${phone.slice(7)}`);

    return {
      sent: true,
      expiresIn: this.codeTtlSeconds,
      devCode: fixedCode,
    };
  }

  /**
   * 校验并消费验证码，失败时累计次数，超过上限直接作废，防止穷举。
   */
  async verify(phone: string, scene: SmsScene, code?: string) {
    if (!code || !/^\d{6}$/.test(code)) {
      throw new BadRequestException('请输入 6 位短信验证码');
    }

    const key = `sms:code:${scene}:${phone}`;
    const raw = await this.redisService.get(key);
    if (!raw) {
      throw new BadRequestException('验证码已失效，请重新获取');
    }

    let record: SmsCodeRecord;
    try {
      record = JSON.parse(raw) as SmsCodeRecord;
    } catch {
      await this.redisService.del(key);
      throw new BadRequestException('验证码已失效，请重新获取');
    }

    if (record.attempts >= this.maxAttempts) {
      await this.redisService.del(key);
      throw new BadRequestException('验证码错误次数过多，请重新获取');
    }

    if (record.code !== code) {
      await this.redisService.set(
        key,
        JSON.stringify({ ...record, attempts: record.attempts + 1 }),
        this.codeTtlSeconds,
      );
      throw new BadRequestException('验证码错误');
    }

    await this.redisService.del(key);
  }
}