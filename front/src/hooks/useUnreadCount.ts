import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface UnreadCount {
  total: number;
  notice: number;
  interaction: number;
}

const EMPTY: UnreadCount = { total: 0, notice: 0, interaction: 0 };

/**
 * 轮询当前班级的未读消息数（应用内红点数据源）。
 * 页面不可见时暂停轮询，恢复可见时立即刷新。
 */
export function useUnreadCount(classId?: string) {
  const [counts, setCounts] = useState<UnreadCount>(EMPTY);

  useEffect(() => {
    if (!classId) {
      setCounts(EMPTY);
      return;
    }

    let cancelled = false;
    let timer: number | undefined;

    const load = async () => {
      try {
        const res = await api.get(`/classes/${classId}/messages/unread-count`);
        const data = res.data?.data || res.data || {};
        if (cancelled) return;
        setCounts({
          total: Number(data.total) || 0,
          notice: Number(data.notice) || 0,
          interaction: Number(data.interaction) || 0,
        });
      } catch {
        // 红点数据获取失败时保持上一次结果
      }
    };

    const stop = () => {
      if (timer !== undefined) {
        window.clearInterval(timer);
        timer = undefined;
      }
    };

    const start = () => {
      stop();
      void load();
      timer = window.setInterval(() => {
        void load();
      }, 60000);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    };

    // 阅读消息后主动通知红点刷新
    const handleRefresh = () => {
      void load();
    };

    if (!document.hidden) start();
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