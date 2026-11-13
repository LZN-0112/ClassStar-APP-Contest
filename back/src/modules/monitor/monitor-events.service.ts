import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject, interval, map, merge } from 'rxjs';

/** SSE 心跳间隔，避免代理层因空闲断开连接 */
const HEARTBEAT_INTERVAL_MS = 15_000;

export interface MonitorErrorEventPayload {
  id: string;
  errorType: string;
  severity: string;
  message: string;
  source: string | null;
  route: string | null;
  pagePath: string | null;
  statusCode: number | null;
  durationMs: number | null;
  createdAt: string;
}

export interface MonitorFeedbackCreatedPayload {
  id: string;
  content: string;
  contact: string | null;
  status: string;
  createdAt: string;
}

export interface MonitorFeedbackUpdatedPayload {
  id: string;
  status: string;
  updatedAt: string;
}

/**
 * 监控台实时事件总线（只读推送）。
 * 通过进程内 Subject 转发新增错误 / 反馈事件；多实例部署时仅推送本实例产生的事件，
 * 不影响任何既有业务链路。
 */
@Injectable()
export class MonitorEventsService {
  private readonly events$ = new Subject<MessageEvent>();

  stream(): Observable<MessageEvent> {
    const heartbeat$ = interval(HEARTBEAT_INTERVAL_MS).pipe(
      map(
        () =>
          ({
            type: 'heartbeat',
            data: { ts: new Date().toISOString() },
          }) as MessageEvent,
      ),
    );

    return merge(this.events$, heartbeat$);
  }

  emitErrorCreated(payload: MonitorErrorEventPayload): void {
    this.events$.next({ type: 'error.created', data: payload });
  }

  emitFeedbackCreated(payload: MonitorFeedbackCreatedPayload): void {
    this.events$.next({ type: 'feedback.created', data: payload });
  }

  emitFeedbackUpdated(payload: MonitorFeedbackUpdatedPayload): void {
    this.events$.next({ type: 'feedback.updated', data: payload });
  }
}