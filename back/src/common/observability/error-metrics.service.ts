import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../database/prisma.service';
import { MonitorEventsService } from '@/modules/monitor/monitor-events.service';
import { MonitorAlertService } from '@/modules/monitor/monitor-alert.service';

export interface RequestIssueInput {
  errorType: string;
  severity: 'critical' | 'major' | 'minor';
  message: string;
  stackTrace?: string;
  source?: string;
  pagePath?: string;
  route?: string;
  statusCode?: number;
  durationMs?: number;
  traceId?: string;
  ip?: string;
  userId?: string;
  classId?: string;
}

/**
 * 服务端可观测性落库：只写入 error_logs 与 error_groups，
 * 不读取、不修改任何既有业务数据，写库失败时静默降级，不影响请求。
 */
@Injectable()
export class ErrorMetricsService {
  private readonly logger = new Logger(ErrorMetricsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly monitorEvents: MonitorEventsService,
    private readonly monitorAlert: MonitorAlertService,
  ) {}

  recordSlowRequest(input: {
    method: string;
    route: string;
    statusCode: number;
    durationMs: number;
    thresholdMs: number;
    traceId: string;
    ip?: string;
    userId?: string;
    classId?: string;
  }): Promise<void> {
    const isTimeout = input.durationMs >= input.thresholdMs;
    return this.persist({
      errorType: isTimeout ? 'RequestTimeout' : 'SlowRequest',
      severity: isTimeout ? 'major' : 'minor',
      message: `${input.method} ${input.route} 耗时 ${input.durationMs}ms，超过阈值 ${input.thresholdMs}ms`,
      source: 'server',
      route: input.route,
      statusCode: input.statusCode,
      durationMs: input.durationMs,
      traceId: input.traceId,
      ip: input.ip,
      userId: input.userId,
      classId: input.classId,
    });
  }

  recordServerError(input: {
    method: string;
    route: string;
    statusCode: number;
    durationMs: number;
    errorType?: string;
    message: string;
    stackTrace?: string;
    traceId: string;
    ip?: string;
    userId?: string;
    classId?: string;
  }): Promise<void> {
    return this.persist({
      errorType: input.errorType || 'UnhandledError',
      severity: 'critical',
      message: `${input.method} ${input.route} 返回 ${input.statusCode}：${input.message}`,
      stackTrace: input.stackTrace,
      source: 'server',
      route: input.route,
      statusCode: input.statusCode,
      durationMs: input.durationMs,
      traceId: input.traceId,
      ip: input.ip,
      userId: input.userId,
      classId: input.classId,
    });
  }

  private async persist(input: RequestIssueInput): Promise<void> {
    try {
      const now = new Date();
      const route = this.clamp(input.route, 200);
      const source = this.clamp(input.source, 20);
      const pagePath = this.clamp(input.pagePath, 500);
      const message = input.message;
      const fingerprint = this.buildFingerprint(
        input.errorType,
        source,
        route,
        message,
      );
      const logId = uuidv4();

      await this.prisma.error_logs.create({
        data: {
          id: logId,
          error_type: this.clamp(input.errorType, 100) || 'UnknownError',
          severity: input.severity,
          message,
          stack_trace: input.stackTrace ?? null,
          source,
          page_path: pagePath,
          route,
          status_code: input.statusCode ?? null,
          duration_ms: input.durationMs ?? null,
          trace_id: this.clamp(input.traceId, 64),
          fingerprint,
          ip_address: this.clamp(input.ip, 45),
          user_id: input.userId ?? null,
          class_id: input.classId ?? null,
          status: 'new',
          created_at: now,
          updated_at: now,
        },
      });

      await this.upsertGroup({
        errorType: input.errorType,
        severity: input.severity,
        message,
        source,
        pagePath,
        route,
        now,
      });

      this.monitorEvents.emitErrorCreated({
        id: logId,
        errorType: input.errorType,
        severity: input.severity,
        message,
        source,
        route,
        pagePath,
        statusCode: input.statusCode ?? null,
        durationMs: input.durationMs ?? null,
        createdAt: now.toISOString(),
      });

      this.monitorAlert
        .evaluateError({
          fingerprint,
          errorType: input.errorType,
          severity: input.severity,
          message,
          source,
          route,
          pagePath,
        })
        .catch((error) => {
          this.logger.warn(
            `告警评估失败: ${(error as Error)?.message ?? error}`,
          );
        });
    } catch (error) {
      // 可观测性自身故障不能影响业务请求
      this.logger.warn(`写入错误日志失败: ${(error as Error)?.message ?? error}`);
    }
  }

  /**
   * 供客户端上报通道复用：只做指纹聚合，error_logs 由调用方负责落库。
   * 失败静默降级，不影响上报结果。
   */
  async recordReportedGroup(input: {
    errorType: string;
    severity: string;
    message: string;
    source?: string;
    pagePath?: string;
    route?: string;
  }): Promise<void> {
    try {
      await this.upsertGroup({
        errorType: input.errorType,
        severity: input.severity,
        message: input.message,
        source: this.clamp(input.source, 20),
        pagePath: this.clamp(input.pagePath, 500),
        route: this.clamp(input.route, 200),
        now: new Date(),
      });
    } catch (error) {
      this.logger.warn(
        `写入错误分组失败: ${(error as Error)?.message ?? error}`,
      );
    }
  }

  private async upsertGroup(input: {
    errorType: string;
    severity: string;
    message: string;
    source: string | null;
    pagePath?: string | null;
    route: string | null;
    now: Date;
  }): Promise<void> {
    const fingerprint = this.buildFingerprint(
      input.errorType,
      input.source,
      input.route,
      input.message,
    );

    const where = { fingerprint };
    const update = {
      occurrence_count: { increment: 1 },
      last_seen_at: input.now,
      updated_at: input.now,
      ...(input.pagePath ? { page_path: input.pagePath } : {}),
    };

    try {
      await this.prisma.error_groups.upsert({
        where,
        update,
        create: {
          id: uuidv4(),
          fingerprint,
          error_type: this.clamp(input.errorType, 100) || 'UnknownError',
          message: input.message,
          source: input.source,
          page_path: input.pagePath ?? null,
          route: input.route,
          severity: input.severity,
          occurrence_count: 1,
          first_seen_at: input.now,
          last_seen_at: input.now,
          created_at: input.now,
          updated_at: input.now,
        },
      });
    } catch {
      // 并发首次写入可能触发唯一键冲突，退化为累计更新
      try {
        await this.prisma.error_groups.update({ where, data: update });
      } catch (updateError) {
        this.logger.warn(
          `更新错误分组失败: ${(updateError as Error)?.message ?? updateError}`,
        );
      }
    }
  }

  buildFingerprint(
    errorType: string,
    source: string | null | undefined,
    route: string | null | undefined,
    message: string,
  ): string {
    const normalized = message
      .replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        ':x',
      )
      .replace(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?/g, ':x')
      .replace(/\d+/g, ':x')
      .slice(0, 300);

    return createHash('md5')
      .update(`${errorType}|${source ?? '-'}|${route ?? '-'}|${normalized}`)
      .digest('hex');
  }

  private clamp(value: string | undefined | null, max: number): string | null {
    if (!value) return null;
    return value.length > max ? value.slice(0, max) : value;
  }
}
