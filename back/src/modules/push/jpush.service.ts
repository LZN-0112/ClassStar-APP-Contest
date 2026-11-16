import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PushNotification {
  title: string;
  alert: string;
  /** 随通知透传给客户端，用于点击后跳转 */
  extras: Record<string, string>;
}

const JPUSH_PUSH_URL = 'https://api.jpush.cn/v3/push';
/** 设备查询接口：用于校验 Registration ID 是否仍然有效 */
const JPUSH_DEVICE_URL = 'https://device.jpush.cn/v3/devices';
/** 极光单次推送 audience 上限 1000，留出余量分批 */
const BATCH_SIZE = 500;
/** 离线保留 3 天，与免费版一致 */
const TIME_TO_LIVE_SECONDS = 3 * 24 * 60 * 60;

/**
 * 极光推送 REST API 封装（仅 Android 自有通道）。
 * AppKey / MasterSecret 通过环境变量注入，未配置时整体降级为不发推送。
 */
@Injectable()
export class JPushService {
  private readonly logger = new Logger(JPushService.name);

  constructor(private readonly config: ConfigService) {}

  get enabled(): boolean {
    return Boolean(
      this.config.get<string>('JPUSH_APPKEY')?.trim() &&
        this.config.get<string>('JPUSH_MASTER_SECRET')?.trim(),
    );
  }

  private authorization(): string {
    const appKey = this.config.get<string>('JPUSH_APPKEY')!.trim();
    const masterSecret = this.config.get<string>('JPUSH_MASTER_SECRET')!.trim();
    return `Basic ${Buffer.from(`${appKey}:${masterSecret}`).toString('base64')}`;
  }

  /** 查询设备是否仍注册在极光：true 有效 / false 已失效 / null 查询失败（不做处理） */
  async isRegistrationIdValid(registrationId: string): Promise<boolean | null> {
    if (!this.enabled) return null;
    try {
      const response = await fetch(`${JPUSH_DEVICE_URL}/${encodeURIComponent(registrationId)}`, {
        headers: { Authorization: this.authorization() },
        signal: AbortSignal.timeout(8000),
      });
      if (response.status === 200) return true;
      if (response.status === 404) return false;
      this.logger.warn(
        `查询极光设备失败 status=${response.status} registrationId=${registrationId.slice(0, 12)}…`,
      );
      return null;
    } catch (error) {
      this.logger.warn(`查询极光设备异常: ${(error as Error).message}`);
      return null;
    }
  }

  async send(registrationIds: string[], notification: PushNotification): Promise<void> {
    if (!this.enabled || !registrationIds.length) return;

    const authorization = this.authorization();

    for (let offset = 0; offset < registrationIds.length; offset += BATCH_SIZE) {
      const batch = registrationIds.slice(offset, offset + BATCH_SIZE);
      const body = {
        platform: 'android',
        audience: { registration_id: batch },
        notification: {
          android: {
            alert: notification.alert,
            title: notification.title,
            extras: notification.extras,
          },
        },
        options: { time_to_live: TIME_TO_LIVE_SECONDS },
      };

      try {
        const response = await fetch(JPUSH_PUSH_URL, {
          method: 'POST',
          headers: {
            Authorization: authorization,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(8000),
        });
        const text = await response.text();
        if (!response.ok) {
          this.logger.warn(`极光推送失败 status=${response.status} body=${text.slice(0, 300)}`);
        } else {
          // 仅代表极光平台已受理；msg_id 可用于在极光控制台/回执接口核对真实送达
          const msgId = this.parseMsgId(text);
          this.logger.log(
            `极光推送已受理 msg_id=${msgId ?? 'unknown'} 设备数=${batch.length}`,
          );
        }
      } catch (error) {
        // 推送是旁路能力：任何网络/超时异常都不能影响消息主流程
        this.logger.warn(`极光推送异常: ${(error as Error).message}`);
      }
    }
  }

  private parseMsgId(body: string): string | null {
    try {
      const data = JSON.parse(body) as { msg_id?: unknown };
      return typeof data.msg_id === 'string' ? data.msg_id : null;
    } catch {
      return null;
    }
  }
}