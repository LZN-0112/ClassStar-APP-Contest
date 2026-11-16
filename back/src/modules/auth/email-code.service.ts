import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'crypto';
import * as nodemailer from 'nodemailer';
import { RedisService } from '@/common/cache/redis.service';

export type EmailScene = 'register' | 'bind_email' | 'reset_password';

interface EmailCodeRecord {
  code: string;
  attempts: number;
}

/**
 * 邮箱验证码：注册时验证邮箱归属，替代需要付费短信通道的手机验证码。
 *
 * 复用 SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM（与错误通知邮件相同）。
 * 未配置 SMTP 时：非生产环境直接返回 devCode 便于联调；生产环境拒绝发送。
 */
@Injectable()
export class EmailCodeService {
  private readonly logger = new Logger(EmailCodeService.name);
  private readonly codeTtlSeconds = 300;
  private readonly sendIntervalSeconds = 60;
  private readonly maxAttempts = 5;
  private readonly dailyLimit = 10;
  private readonly transporter: nodemailer.Transporter | null = null;

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    const host = this.configService.get('SMTP_HOST');
    const port = this.configService.get('SMTP_PORT');
    const user = this.configService.get('SMTP_USER');
    const pass = this.configService.get('SMTP_PASS');
    if (host && port && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        secure: Number(port) === 465,
        auth: { user, pass },
      });
      this.logger.log('邮箱验证码服务已初始化');
    } else {
      this.logger.warn('未配置 SMTP，邮箱验证码仅支持开发环境返回 devCode');
    }
  }

  private generateCode(): string {
    return randomInt(0, 1000000).toString().padStart(6, '0');
  }

  private normalize(email: string): string {
    return email.trim().toLowerCase();
  }

  private buildMail(code: string, scene: EmailScene) {
    const sceneText: Record<EmailScene, { subject: string; action: string }> = {
      register: { subject: '注册验证码', action: '你正在注册班务星' },
      bind_email: { subject: '绑定邮箱验证码', action: '你正在绑定 / 更换班务星账号邮箱' },
      reset_password: {
        subject: '重置密码验证码',
        action: '你正在重置班务星账号密码',
      },
    };
    const { subject, action } = sceneText[scene];
    return {
      from: this.configService.get('SMTP_FROM') || this.configService.get('SMTP_USER'),
      subject: `【班务星】${subject}`,
      text: `你的${subject}为 ${code}，5 分钟内有效。如非本人操作，请忽略本邮件。`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;color:#1A1A1A;line-height:1.6">
          <p>你好，</p>
          <p>${action}，本次验证码为：</p>
          <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:16px 0">${code}</p>
          <p style="color:#4B5563">验证码 5 分钟内有效，请勿泄露给他人。如非本人操作，请忽略本邮件。</p>
        </div>
      `,
    };
  }

  async send(email: string, scene: EmailScene) {
    const target = this.normalize(email);
    const rateKey = `email:rate:${scene}:${target}`;
    if (await this.redisService.exists(rateKey)) {
      throw new BadRequestException('验证码发送过于频繁，请 60 秒后重试');
    }

    const dailyKey = `email:daily:${target}`;
    const dailyUsed = Number(await this.redisService.get(dailyKey)) || 0;
    if (dailyUsed >= this.dailyLimit) {
      throw new BadRequestException('该邮箱今日获取验证码次数已达上限');
    }

    const code = this.generateCode();
    let devCode: string | undefined;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({ to: target, ...this.buildMail(code, scene) });
      } catch (err) {
        this.logger.error(
          `验证码邮件发送失败 scene=${scene} email=${this.maskEmail(target)}: ${(err as Error).message}`,
        );
        throw new BadRequestException('验证码邮件发送失败，请稍后重试');
      }
    } else if (process.env.NODE_ENV !== 'production') {
      devCode = code;
      this.logger.warn(
        `未配置 SMTP，验证码未真实发送 scene=${scene} email=${this.maskEmail(target)} code=${code}`,
      );
    } else {
      this.logger.error('未配置 SMTP，无法发送邮箱验证码');
      throw new BadRequestException('邮件服务暂未开通，请联系管理员');
    }

    // 发送成功后再写缓存，避免出现“码已存在但邮件没发出”的情况
    const record: EmailCodeRecord = { code, attempts: 0 };
    await this.redisService.set(
      `email:code:${scene}:${target}`,
      JSON.stringify(record),
      this.codeTtlSeconds,
    );
    await this.redisService.set(rateKey, '1', this.sendIntervalSeconds);
    await this.redisService.set(dailyKey, String(dailyUsed + 1), 86400);

    return {
      sent: true,
      expiresIn: this.codeTtlSeconds,
      devCode,
    };
  }

  /**
   * 校验并消费验证码，失败时累计次数，超过上限直接作废，防止穷举。
   */
  async verify(email: string, scene: EmailScene, code?: string) {
    if (!code || !/^\d{6}$/.test(code)) {
      throw new BadRequestException('请输入 6 位邮箱验证码');
    }

    const target = this.normalize(email);
    const key = `email:code:${scene}:${target}`;
    const raw = await this.redisService.get(key);
    if (!raw) {
      throw new BadRequestException('验证码已失效，请重新获取');
    }

    let record: EmailCodeRecord;
    try {
      record = JSON.parse(raw) as EmailCodeRecord;
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

  maskEmail(email: string): string {
    const [name, domain] = email.split('@');
    if (!domain) return '***';
    const visible = name.slice(0, 2);
    return `${visible}***@${domain}`;
  }
}