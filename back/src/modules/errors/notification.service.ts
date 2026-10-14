import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initTransporter();
  }

  private initTransporter() {
    const host = this.configService.get('SMTP_HOST');
    const port = this.configService.get('SMTP_PORT');
    const user = this.configService.get('SMTP_USER');
    const pass = this.configService.get('SMTP_PASS');

    if (host && port && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log('邮件通知服务已初始化');
    } else {
      this.logger.warn('邮件通知服务未配置，跳过邮件发送');
    }
  }

  async sendErrorNotification(errorLog: any) {
    const notifyEmails = this.configService.get('ERROR_NOTIFY_EMAILS');
    if (!notifyEmails) {
      this.logger.debug('未配置错误通知邮箱');
      return;
    }

    const emails = notifyEmails.split(',').map((e) => e.trim()).filter(Boolean);
    if (emails.length === 0) return;

    const severityEmoji = {
      critical: '🔴',
      major: '🟠',
      minor: '🟡',
      info: '🔵',
    };
    const emoji = severityEmoji[errorLog.severity] || '⚪';

    const subject = `${emoji} [${errorLog.severity?.toUpperCase()}] ${errorLog.error_type} - 班务星系统错误通知`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #0062FF 0%, #0052CC 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .field { margin-bottom: 12px; }
    .label { font-weight: 600; color: #4B5563; font-size: 13px; }
    .value { color: #1F2937; font-size: 14px; word-break: break-all; }
    .severity-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .severity-critical { background: #FEE2E2; color: #DC2626; }
    .severity-major { background: #FEF3C7; color: #D97706; }
    .severity-minor { background: #DBEAFE; color: #2563EB; }
    .severity-info { background: #E5E7EB; color: #6B7280; }
    .stack-trace { background: #1F2937; color: #10B981; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 12px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #9CA3AF; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin:0;">班务星系统错误通知</h2>
      <p style="margin:8px 0 0 0; opacity:0.9;">系统检测到异常，请及时处理</p>
    </div>
    <div class="content">
      <div class="field">
        <div class="label">严重程度</div>
        <div class="value">
          <span class="severity-badge severity-${errorLog.severity}">${emoji} ${errorLog.severity?.toUpperCase()}</span>
        </div>
      </div>
      <div class="field">
        <div class="label">错误类型</div>
        <div class="value">${errorLog.error_type}</div>
      </div>
      <div class="field">
        <div class="label">错误信息</div>
        <div class="value">${errorLog.message}</div>
      </div>
      ${errorLog.page_path ? `
      <div class="field">
        <div class="label">发生页面</div>
        <div class="value">${errorLog.page_path}</div>
      </div>` : ''}
      ${errorLog.device_info ? `
      <div class="field">
        <div class="label">设备信息</div>
        <div class="value">${errorLog.device_info}</div>
      </div>` : ''}
      ${errorLog.browser_info ? `
      <div class="field">
        <div class="label">浏览器</div>
        <div class="value">${errorLog.browser_info}</div>
      </div>` : ''}
      ${errorLog.user_id ? `
      <div class="field">
        <div class="label">用户ID</div>
        <div class="value">${errorLog.user_id}</div>
      </div>` : ''}
      ${errorLog.ip_address ? `
      <div class="field">
        <div class="label">IP地址</div>
        <div class="value">${errorLog.ip_address}</div>
      </div>` : ''}
      <div class="field">
        <div class="label">发生时间</div>
        <div class="value">${new Date(errorLog.created_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</div>
      </div>
      ${errorLog.stack_trace ? `
      <div class="field">
        <div class="label">错误堆栈</div>
        <div class="stack-trace">${this.escapeHtml(errorLog.stack_trace)}</div>
      </div>` : ''}
      ${errorLog.user_feedback ? `
      <div class="field">
        <div class="label">用户反馈</div>
        <div class="value">${this.escapeHtml(errorLog.user_feedback)}</div>
      </div>` : ''}
    </div>
    <div class="footer">
      <p>此邮件由班务星系统自动发送，请勿直接回复</p>
    </div>
  </div>
</body>
</html>`;

    try {
      if (this.transporter) {
        await this.transporter.sendMail({
          from: this.configService.get('SMTP_FROM') || this.configService.get('SMTP_USER'),
          to: emails.join(','),
          subject,
          html,
        });
        this.logger.log(`错误通知邮件已发送至: ${emails.join(', ')}`);
      } else {
        this.logger.warn(`[模拟发送] 错误通知将发送至: ${emails.join(', ')}`);
        this.logger.warn(`[模拟发送] 错误类型: ${errorLog.error_type}, 严重程度: ${errorLog.severity}`);
      }
    } catch (error) {
      this.logger.error('发送错误通知邮件失败:', error.message);
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
