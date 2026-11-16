import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface UnreadCount {
  total: number;
  notice: number;
  interaction: number;
  /** 最近一次拉取失败，当前数字可能已过期（仅用于弱化展示，不参与计算） */
  stale: boolean;
}

const EMPTY: UnreadCount = { total: 0, notice: 0, interaction: 0, stale: false };

/** 正常轮询间隔 */
const POLL_MS = 60_000;
/** 连续失败后的重试节奏，避免故障期间每 60 秒才重试一次，也避免持续打后端 */
const RETRY_MS = [5_000, 15_000, 30_000];

/**
 * 轮询当前班级的未读消息数（应用内红点数据源）。
 * 页面不可见时暂停轮询，恢复可见时立即刷新。
 * 拉取失败时保留旧值并标记 stale，同时按退避策略尽快重试。
 */
export function useUnreadCount(classId?: string) {
  const [counts, setCounts] = useState<UnreadCount>(EMPTY);

  useEffect(() => {
    if (!classId) {
      setCounts(EMPTY);
      return;
    }

    // 切换班级时先清空，避免短暂展示上一个班级的数字
    setCounts(EMPTY);

    let cancelled = false;
    let timer: number | undefined;
    let failures = 0;
    let seq = 0;

    const stop = () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
        timer = undefined;
      }
    };

    const schedule = (delay: number) => {
      stop();
      // 页面不可见时不排下一次，恢复可见时会立即刷新，避免后台空转
      if (document.hidden) return;
      timer = window.setTimeout(() => void load(), delay);
    };

    const load = async () => {
      stop();
      const current = ++seq;
      try {
        const res = await api.get(`/classes/${classId}/messages/unread-count`);
        // 序号不是最新说明已有更新的请求，丢弃这次旧响应
        if (cancelled || current !== seq) return;
        const data = res.data?.data || res.data || {};
        failures = 0;
        setCounts({
          total: Number(data.total) || 0,
          notice: Number(data.notice) || 0,
          interaction: Number(data.interaction) || 0,
          stale: false,
        });
        schedule(POLL_MS);
      } catch {
        if (cancelled || current !== seq) return;
        failures += 1;
        // 保留旧值但标记过期，避免把旧数字当成实时结果
        setCounts((prev) => ({ ...prev, stale: true }));
        schedule(RETRY_MS[Math.min(failures - 1, RETRY_MS.length - 1)] ?? POLL_MS);
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        failures = 0;
        void load();
      }
    };

    // 阅读消息后主动通知红点刷新，立即重试并重置退避
    const handleRefresh = () => {
      failures = 0;
      void load();
    };

    if (!document.hidden) void load();
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('unread-refresh', handleRefresh);

    return () => {
      cancelled = true;
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('unread-refresh', handleRefresh);
    };
  }, [classId]);

  return counts;
}