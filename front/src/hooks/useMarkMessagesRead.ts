import { useEffect } from 'react';
import { api } from '@/lib/api';

interface ReadableMessage {
  id: string;
  isRead: boolean;
  requireAck: boolean;
  isAcked?: boolean;
}

/** 列表停留多久后才视为“看过”，避免用户快速划过时被全部清空 */
const READ_DWELL_MS = 1000;
/** 单次批量上报上限，与后端 DTO 的 ArrayMaxSize 对齐 */
const BATCH_LIMIT = 200;

/**
 * 列表“曝光即已读”：停留 READ_DWELL_MS 后批量标记当前可见的普通未读消息。
 * 需要签收且尚未签收的消息不自动已读，红点保留到签收完成。
 */
export function useMarkMessagesRead(
  classId: string | undefined,
  messages: ReadableMessage[],
  onMarked: (ids: string[]) => void,
) {
  useEffect(() => {
    if (!classId || messages.length === 0) return;

    const ids = messages
      .filter((m) => !m.isRead && !(m.requireAck && !m.isAcked))
      .map((m) => m.id)
      .slice(0, BATCH_LIMIT);
    if (ids.length === 0) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        await api.post(`/classes/${classId}/messages/read-batch`, { ids });
        if (cancelled) return;
        onMarked(ids);
        window.dispatchEvent(new Event('unread-refresh'));
      } catch {
        // 上报失败保留未读状态，下次进入列表会重试
      }
    }, READ_DWELL_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [classId, messages, onMarked]);
}