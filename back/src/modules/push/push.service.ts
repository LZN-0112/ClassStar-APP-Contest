import { Injectable, Logger } from '@nestjs/common';
import { DeviceTokensService } from './device-tokens.service';
import { JPushService } from './jpush.service';

export interface MessagePushParams {
  title: string;
  content: string;
  messageId: string;
  classId: string;
  /** notice / reminder 等，仅用于客户端埋点与跳转兜底 */
  type: string;
}

/**
 * 业务侧推送入口：按用户拉取其已登记的设备，再走极光下发。
 * 所有调用方都应 fire-and-forget，推送失败不回滚业务。
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private readonly jpush: JPushService,
    private readonly deviceTokens: DeviceTokensService,
  ) {}

  async sendMessagePush(userIds: string[], params: MessagePushParams): Promise<void> {
    try {
      if (!this.jpush.enabled || !userIds.length) return;

      const registrationIds = await this.deviceTokens.findEnabledRegistrationIds(userIds);
      if (!registrationIds.length) return;

      await this.jpush.send(registrationIds, {
        title: params.title,
        alert: this.toAlert(params.content),
        extras: {
          route: `/message-detail/${params.messageId}?classId=${params.classId}`,
          messageId: params.messageId,
          classId: params.classId,
          type: params.type,
        },
      });
    } catch (error) {
      this.logger.warn(`推送下发失败: ${(error as Error).message}`);
    }
  }

  /** 通知栏正文：压缩空白并截断，避免超长被系统截断得很难看 */
  private toAlert(content: string): string {
    const compact = content.replace(/\s+/g, ' ').trim();
    return compact.length > 100 ? `${compact.slice(0, 100)}…` : compact;
  }
}