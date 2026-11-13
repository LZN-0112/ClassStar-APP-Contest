import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { ErrorMetricsService } from './error-metrics.service';

interface RequestLike {
  method?: string;
  originalUrl?: string;
  route?: { path?: string };
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  user?: { userId?: string; classId?: string };
  traceId?: string;
}

interface ResponseLike {
  statusCode?: number;
  setHeader?: (name: string, value: string) => void;
}

@Injectable()
export class RequestMetricsInterceptor implements NestInterceptor {
  private readonly warnMs: number;
  private readonly timeoutMs: number;

  private static readonly SKIP_PREFIXES = ['/errors/logs', '/monitor', '/health'];

  constructor(
    private readonly metrics: ErrorMetricsService,
    private readonly config: ConfigService,
  ) {
    this.warnMs = this.readPositiveInt('SLOW_REQUEST_WARN_MS', 2000);
    this.timeoutMs = this.readPositiveInt('SLOW_REQUEST_TIMEOUT_MS', 5000);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestLike>();
    const response = context.switchToHttp().getResponse<ResponseLike>();

    if (!request || this.shouldSkip(request)) {
      return next.handle();
    }

    const traceId = this.resolveTraceId(request);
    request.traceId = traceId;
    if (typeof response?.setHeader === 'function') {
      response.setHeader('X-Trace-Id', traceId);
    }

    const startedAt = Date.now();
    const route = this.resolveRoute(request);
    const method = request.method ?? 'GET';

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - startedAt;
        if (durationMs >= this.warnMs) {
          void this.metrics.recordSlowRequest({
            method,
            route,
            statusCode: response?.statusCode ?? 200,
            durationMs,
            thresholdMs: durationMs >= this.timeoutMs ? this.timeoutMs : this.warnMs,
            traceId,
            ip: this.resolveIp(request),
            userId: request.user?.userId,
            classId: request.user?.classId,
          });
        }
      }),
      catchError((error: unknown) => {
        const durationMs = Date.now() - startedAt;
        const statusCode = this.resolveStatus(error);
        if (statusCode >= 500) {
          const normalized = error as { name?: string; message?: string; stack?: string };
          void this.metrics.recordServerError({
            method,
            route,
            statusCode,
            durationMs,
            errorType: normalized?.name || 'UnhandledError',
            message: normalized?.message || String(error),
            stackTrace: normalized?.stack,
            traceId,
            ip: this.resolveIp(request),
            userId: request.user?.userId,
            classId: request.user?.classId,
          });
        }
        return throwError(() => error);
      }),
    );
  }

  private shouldSkip(request: RequestLike): boolean {
    const url = request.originalUrl ?? '';
    return RequestMetricsInterceptor.SKIP_PREFIXES.some((prefix) =>
      url.includes(prefix),
    );
  }

  private resolveTraceId(request: RequestLike): string {
    const header = request.headers?.['x-trace-id'];
    const value = Array.isArray(header) ? header[0] : header;
    if (value && typeof value === 'string' && value.length <= 64) {
      return value;
    }
    return randomUUID();
  }

  private resolveRoute(request: RequestLike): string {
    const raw = request.route?.path ?? request.originalUrl ?? '';
    const pathOnly = raw.split('?')[0];
    return pathOnly
      .replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        ':id',
      )
      .replace(/\/\d+(?=\/|$)/g, '/:id')
      .slice(0, 200);
  }

  private resolveIp(request: RequestLike): string | undefined {
    const forwarded = request.headers?.['x-forwarded-for'];
    const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const ip = value ? value.split(',')[0].trim() : request.ip;
    return ip?.slice(0, 45);
  }

  private resolveStatus(error: unknown): number {
    if (error instanceof HttpException) {
      return error.getStatus();
    }
    return 500;
  }

  private readPositiveInt(key: string, fallback: number): number {
    const raw = this.config.get<string>(key);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }
}
