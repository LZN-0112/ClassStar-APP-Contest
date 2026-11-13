import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '@/common/database/prisma.service';
import { UpdateAlertConfigDto } from './dto/alert-config.dto';

export interface AlertErrorInput {
  fingerprint: string;
  errorType: string;
  severity: string;
  message: string;
  source?: string | null;
  route?: string | null;
  pagePath?: string | null;
}

const SEVERITY_LABELS: Record<string, string> = {
  critical: '致命',
  major: '严重',
  minor: '轻微',
  info: '信息',
};

const CONFIG_ID = 'default';

/**
 * 监控台告警：读取配置、按时间窗口与静默期判断是否触发，
 * 通过飞书群机器人 Webhook 发送文本消息，并记录发送结果。
 * 所有失败静默降级，不影响错误上报链路。
 */
@Injectable()
export class MonitorAlertService {
  private readonly logger = new Logger(MonitorAlertService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getConfig() {
    const config = await this.prisma.monitor_alert_config.findUnique({
      where: { id: CONFIG_ID },
    });
    if (config) return config;

    try {
      return await this.prisma.monitor_alert_config.create({
        data: { id: CONFIG_ID },
      });
    } catch {
      return this.prisma.monitor_alert_config.findUniqueOrThrow({
        where: { id: CONFIG_ID },
      });
    }
  }

  async updateConfig(dto: UpdateAlertConfigDto, userId?: string) {
    await this.getConfig();

    const webhookUrl = dto.webhook_url?.trim();
    if (webhookUrl && !/^https?:\/\//i.test(webhookUrl)) {
      throw new BadRequestException('Webhook 地址需以 http:// 或 https:// 开头');
    }

    const data: Record<string, unknown> = {
      updated_at: new Date(),
      updated_by: userId ?? null,
    };
    if (dto.enabled !== undefined) data.enabled = dto.enabled;
    if (dto.severities !== undefined) data.severities = dto.severities.join(',');
    if (dto.threshold !== undefined) data.threshold = dto.threshold;
    if (dto.window_minutes !== undefined) {
      data.window_minutes = dto.window_minutes;
    }
    if (dto.silence_minutes !== undefined) {
      data.silence_minutes = dto.silence_minutes;
    }
    if (webhookUrl !== undefined) data.webhook_url = webhookUrl || null;

    return this.prisma.monitor_alert_config.update({
      where: { id: CONFIG_ID },
      data,
    });
  }

  async getEvents(limit?: string | number) {
    const parsed = Number(limit);
    const take = Math.min(50, Math.max(1, Number.isFinite(parsed) ? parsed : 20));
    return this.prisma.monitor_alert_events.findMany({
      orderBy: { created_at: 'desc' },
      take,
    });
  }

  async sendTest() {
    const config = await this.getConfig();
    if (!config.webhook_url) {
      throw new BadRequestException('请先填写并保存 Webhook 地址');
    }

    const startedAt = Date.now();
    const result = await this.postWebhook(
      config.webhook_url,
      [
        '【班务星监控台】告警通道测试',
        '这是一条测试消息，收到即代表 Webhook 配置成功。',
        `时间：${this.formatTime(new Date())}`,
      ].join('\n'),
    );

    return {
      success: result.success,
      response: result.response,
      duration_ms: Date.now() - startedAt,
    };
  }

  async evaluateError(input: AlertErrorInput): Promise<void> {
    try {
      const config = await this.getConfig();
      if (!config.enabled || !config.webhook_url) return;

      const severities = config.severities
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      if (severities.length > 0 && !severities.includes(input.severity)) return;

      const since = new Date(Date.now() - config.window_minutes * 60_000);
      const count = await this.prisma.error_logs.count({
        where: {
          fingerprint: input.fingerprint,
          created_at: { gte: since },
        },
      });
      if (count < config.threshold) return;

      const last = await this.prisma.monitor_alert_events.findFirst({
        where: { fingerprint: input.fingerprint, success: true },
        orderBy: { created_at: 'desc' },
      });
      if (
        last &&
        Date.now() - last.created_at.getTime() <
          config.silence_minutes * 60_000
      ) {
        return;
      }

      const group = await this.prisma.error_groups.findUnique({
        where: { fingerprint: input.fingerprint },
        select: { id: true },
      });

      const text = [
        '【班务星监控台】错误告警',
        `级别：${SEVERITY_LABELS[input.severity] ?? input.severity}`,
        `类型：${input.errorType}`,
        `次数：${config.window_minutes} 分钟内出现 ${count} 次`,
        `来源：${input.source ?? '未知'}`,
        `路由：${input.route ?? input.pagePath ?? '—'}`,
        `信息：${input.message.slice(0, 500)}`,
        `时间：${this.formatTime(new Date())}`,
      ].join('\n');

      const result = await this.postWebhook(config.webhook_url, text);

      await this.prisma.monitor_alert_events.create({
        data: {
          id: uuidv4(),
          group_id: group?.id ?? null,
          fingerprint: input.fingerprint,
          error_type: input.errorType,
          message: input.message.slice(0, 2000),
          severity: input.severity,
          count,
          channel: 'feishu',
          success: result.success,
          response: result.response,
        },
      });

      if (!result.success) {
        this.logger.warn(`告警发送失败: ${result.response}`);
      }
    } catch (error) {
      this.logger.warn(
        `告警评估失败: ${(error as Error)?.message ?? error}`,
      );
    }
  }

  private async postWebhook(url: string, text: string) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ msg_type: 'text', content: { text } }),
        signal: AbortSignal.timeout(8000),
      });
      const body = await response.text();
      return { success: response.ok, response: body.slice(0, 500) };
    } catch (error) {
      return {
        success: false,
        response: String((error as Error)?.message ?? error).slice(0, 500),
      };
    }
  }

  private formatTime(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate(),
    )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
      date.getSeconds(),
    )}`;
  }
}