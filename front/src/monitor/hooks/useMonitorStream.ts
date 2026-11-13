import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../api';

export type MonitorStreamStatus = 'connecting' | 'connected' | 'disconnected';

interface StreamHandlers {
  onEvent?: (type: string, payload: unknown) => void;
  onPoll?: () => void;
  pollIntervalMs?: number;
}

function parseSseFrame(frame: string): { type: string; data: unknown } | null {
  let type = 'message';
  const dataLines: string[] = [];

  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) {
      type = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }

  if (dataLines.length === 0) return null;
  const raw = dataLines.join('\n');
  try {
    return { type, data: JSON.parse(raw) };
  } catch {
    return { type, data: raw };
  }
}

/**
 * 监控台实时事件流。
 * EventSource 不支持自定义请求头，这里用 fetch + ReadableStream 携带 Bearer Token；
 * 断线后指数退避重连，连接断开期间由调用方通过 onPoll 降级轮询。
 */
export function useMonitorStream({ onEvent, onPoll, pollIntervalMs = 30_000 }: StreamHandlers) {
  const [status, setStatus] = useState<MonitorStreamStatus>('connecting');
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);

  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const onPollRef = useRef(onPoll);
  onPollRef.current = onPoll;

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const controller = new AbortController();
    let stopped = false;
    let retryTimer: number | undefined;
    let attempt = 0;

    const connect = async () => {
      if (stopped) return;
      setStatus('connecting');

      try {
        const response = await fetch(`${API_BASE_URL}/monitor/stream`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'text/event-stream',
          },
          signal: controller.signal,
          cache: 'no-store',
        });

        if (!response.ok || !response.body) {
          throw new Error(`SSE ${response.status}`);
        }

        setStatus('connected');
        attempt = 0;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!stopped) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer = (buffer + decoder.decode(value, { stream: true })).replace(/\r\n/g, '\n');
          const frames = buffer.split('\n\n');
          buffer = frames.pop() ?? '';

          for (const frame of frames) {
            const event = parseSseFrame(frame);
            if (!event) continue;
            if (event.type === 'heartbeat') continue;
            setLastEventAt(new Date().toISOString());
            onEventRef.current?.(event.type, event.data);
          }
        }
      } catch {
        // 网络中断或后端未启用 SSE：交给断线重连与降级轮询
      }

      if (stopped) return;
      setStatus('disconnected');
      attempt += 1;
      retryTimer = window.setTimeout(
        () => void connect(),
        Math.min(30_000, 1_000 * 2 ** Math.min(attempt, 5)),
      );
    };

    void connect();

    return () => {
      stopped = true;
      controller.abort();
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
    };
  }, []);

  useEffect(() => {
    if (status !== 'disconnected') return;
    const timer = window.setInterval(() => onPollRef.current?.(), pollIntervalMs);
    return () => window.clearInterval(timer);
  }, [status, pollIntervalMs]);

  return { status, lastEventAt };
}

/**
 * 页面级实时刷新：收到事件后防抖刷新数据，断线时自动降级为轮询。
 */
export function useLiveRefresh(refresh: () => void, pollIntervalMs = 30_000) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const timerRef = useRef<number | undefined>(undefined);

  const schedule = useCallback(() => {
    // 已有待执行的刷新时不再顺延计时，避免事件密集时一直被推迟
    if (timerRef.current !== undefined) return;
    timerRef.current = window.setTimeout(() => {
      timerRef.current = undefined;
      refreshRef.current();
    }, 600);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current !== undefined) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const { status, lastEventAt } = useMonitorStream({
    onEvent: schedule,
    onPoll: () => refreshRef.current(),
    pollIntervalMs,
  });

  return { status, lastEventAt };
}