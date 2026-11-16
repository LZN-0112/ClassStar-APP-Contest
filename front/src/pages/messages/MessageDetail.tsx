import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Check, Bell, Paperclip } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api, resolveFileUrl } from '@/lib/api';
import { toast } from 'sonner';

interface MessageDetailData {
  id: string;
  type: string;
  title: string;
  content: string;
  location?: string;
  eventTime?: string;
  classId?: string;
  sourceType?: string | null;
  sourceId?: string | null;
  requireAck: boolean;
  ackDeadline?: string;
  isAcked: boolean;
  status: 'published' | 'ended';
  createdAt: string;
  publisher?: { id: string; name: string; avatar?: string };
  attachments?: Array<{
    id: string;
    file_name: string;
    file_url: string;
    file_size?: number | null;
  }>;
}

function formatFileSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDateTime(iso?: string) {
  if (!iso) return '-';
  const date = new Date(iso);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}`;
}

export default function MessageDetail() {
  const navigate = useNavigate();
  const { messageId } = useParams<{ messageId: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useCurrentUser();

  const [message, setMessage] = useState<MessageDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [acking, setAcking] = useState(false);

  // 从推送点击进入时，消息可能属于用户当前未选中的组织，优先使用链接携带的 classId
  const classId = searchParams.get('classId') || user?.classId;
  const isAdmin = user?.roleLevel === 'owner' || user?.roleLevel === 'admin';

  const markRead = useCallback(async () => {
    if (!classId || !messageId) return;
    try {
      await api.post(`/classes/${classId}/messages/${messageId}/read`);
      window.dispatchEvent(new Event('unread-refresh'));
    } catch {
      // 已读标记失败不影响详情展示
    }
  }, [classId, messageId]);

  useEffect(() => {
    if (!messageId) {
      toast.error('通知ID缺失');
      navigate('/messages', { replace: true });
      return;
    }

    const fetchMessage = async () => {
      if (!classId || !messageId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setLoadError(false);
      try {
        const res = await api.get(`/classes/${classId}/messages/${messageId}`);
        const data = res.data.data || res.data;
        setMessage(data);
        // 普通通知打开即已读；签收类要等签收完成才算处理完，红点保留
        if (!data.requireAck || data.isAcked) {
          void markRead();
        }
      } catch (err) {
        setLoadError(true);
        toast.error(err instanceof Error ? err.message : '获取通知详情失败');
      } finally {
        setLoading(false);
      }
    };

    void fetchMessage();
  }, [messageId, classId, navigate, reloadKey, markRead]);

  const handleAck = async () => {
    if (!message || message.isAcked || !classId || !messageId || acking) return;
    setAcking(true);
    try {
      await api.post(`/classes/${classId}/messages/${messageId}/ack`);
      setMessage((prev) => (prev ? { ...prev, isAcked: true } : prev));
      toast.success('签收成功');
      // 签收即完成事项，此时再清除未读红点
      void markRead();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('不能重复签收') || msg.includes('已签收')) {
        setMessage((prev) => (prev ? { ...prev, isAcked: true } : prev));
        toast.error('已签收，不能重复签收');
        void markRead();
      } else {
        toast.error(err instanceof Error ? err.message : '签收失败，请稍后重试');
      }
    } finally {
      setAcking(false);
    }
  };

  const handleAckClick = () => {
    if (message?.isAcked) {
      toast.error('已签收，不能重复签收');
      return;
    }
    handleAck();
  };

  if (loading) {
    return (
      <PageLayout title="通知详情" variant="a" decor={<Bell className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}>
        <div className="flex w-full flex-1 items-center justify-center text-[14px] text-[#4B5563]">
          加载中...
        </div>
      </PageLayout>
    );
  }

  if (loadError) {
    return (
      <PageLayout title="通知详情" variant="a" decor={<Bell className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="flex w-full flex-1 items-center justify-center text-[14px] text-[#0062FF]"
        >
          加载失败，点击重试
        </button>
      </PageLayout>
    );
  }

  if (!message) {
    return (
      <PageLayout title="通知详情" variant="a" decor={<Bell className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}>
        <div className="flex w-full flex-1 items-center justify-center text-[14px] text-[#4B5563]">
          通知不存在
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="通知详情" variant="a" decor={<Bell className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}>
      <div className="flex w-full flex-1 flex-col gap-4">
        <div
          data-pencil-name="Title"
          className="text-[20px]/[normal] box-border text-left font-heading font-bold text-[#1A1A1A] break-words"
        >
          {message.title}
        </div>
        <div
          data-pencil-name="Time"
          className="text-[11px]/[normal] box-border text-left font-caption font-normal text-[#4B5563] [white-space:nowrap]"
        >
          发布时间：{formatDateTime(message.createdAt)}
        </div>
        <div className="flex flex-row items-center gap-2">
          <span
            className={`box-border rounded-full px-2 py-0.5 text-[11px]/[normal] font-body font-semibold ${
              message.status === 'ended'
                ? 'bg-[#E5E7EB] text-[#6B7280]'
                : 'bg-[#DBEAFE] text-[#0062FF]'
            }`}
          >
            {message.status === 'ended' ? '已结束' : '进行中'}
          </span>
        </div>

        {!message.type?.startsWith('homework') && (
          <div
            data-pencil-name="Info Card"
            className="box-border flex w-full flex-col gap-2 rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-soft"
          >
            <div className="text-[14px]/[normal] font-body font-medium text-[#1A1A1A]">
              📅 时间：{formatDateTime(message.eventTime)}
            </div>
            <div className="text-[14px]/[normal] font-body font-medium text-[#1A1A1A]">
              📍 地点：{message.location || '-'}
            </div>
            {message.requireAck && (
              <div className="text-[14px]/[normal] font-body font-medium text-[#1A1A1A]">
                ⏰ 签收截止：{message.ackDeadline ? formatDateTime(message.ackDeadline) : '不限制'}
              </div>
            )}
          </div>
        )}

        <div
          data-pencil-name="Body"
          className="box-border flex w-full flex-col gap-[10px] rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-soft"
        >
          <div className="text-[14px]/[21px] font-body font-normal text-[#4B5563] whitespace-pre-wrap break-words">
            {message.content}
          </div>
        </div>

        {message.attachments && message.attachments.length > 0 && (
          <div className="box-border flex w-full flex-col gap-2 rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-soft">
            <div className="text-[13px]/[normal] font-body font-semibold text-[#1A1A1A]">
              附件（{message.attachments.length}）
            </div>
            {message.attachments.map((file) => (
              <a
                key={file.id}
                href={resolveFileUrl(file.file_url)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center gap-2 rounded-md bg-[#F8FAFC] px-3 py-2 active:opacity-80"
              >
                <Paperclip className="h-4 w-4 shrink-0 text-[#0062FF]" strokeWidth={2} />
                <span className="min-w-0 flex-1 truncate text-[13px] text-[#1A1A1A]">
                  {file.file_name}
                </span>
                <span className="shrink-0 text-[11px] text-[#94A3B8]">
                  {formatFileSize(file.file_size)}
                </span>
              </a>
            ))}
          </div>
        )}

        {message.requireAck && message.ackDeadline && !message.isAcked && new Date() > new Date(message.ackDeadline) && (
          <div className="box-border rounded-lg bg-[#FEE2E2] p-3">
            <div className="text-[13px]/[normal] font-body font-medium text-[#EF4444]">
              该通知已超过签收截止时间
            </div>
          </div>
        )}

        {message.sourceType === 'homework' && message.sourceId && (
          <button
            type="button"
            onClick={() => navigate(`/homework-detail/${message.sourceId}`)}
            data-pencil-name="Homework Button"
            className="box-border flex h-[52px] w-full shrink-0 flex-col items-center justify-center gap-2 rounded-lg bg-[#0062FF] px-4 shadow-soft active:opacity-90"
          >
            <div className="text-[16px]/[normal] font-body font-semibold text-white [white-space:nowrap]">
              查看作业并重新提交
            </div>
          </button>
        )}

        {message.sourceType === 'attendance' && message.sourceId && (
          <button
            type="button"
            onClick={() =>
              navigate(
                `/check-in-detail/${message.classId || classId}/${message.sourceId}`,
              )
            }
            data-pencil-name="CheckIn Button"
            className="box-border flex h-[52px] w-full shrink-0 flex-col items-center justify-center gap-2 rounded-lg bg-[#0062FF] px-4 shadow-soft active:opacity-90"
          >
            <div className="text-[16px]/[normal] font-body font-semibold text-white [white-space:nowrap]">
              去签到
            </div>
          </button>
        )}

        {message.sourceType === 'random_draw' && message.sourceId && (
          <button
            type="button"
            onClick={() => navigate(`/draw-record/${message.sourceId}`)}
            data-pencil-name="Draw Button"
            className="box-border flex h-[52px] w-full shrink-0 flex-col items-center justify-center gap-2 rounded-lg bg-[#0062FF] px-4 shadow-soft active:opacity-90"
          >
            <div className="text-[16px]/[normal] font-body font-semibold text-white [whitespace-nowrap]">
              查看抽签结果
            </div>
          </button>
        )}

        {message.requireAck && (
          <button
            type="button"
            onClick={handleAckClick}
            disabled={message.isAcked || acking}
            data-pencil-name="Ack Button"
            className={`box-border flex h-[52px] w-full shrink-0 flex-col items-center justify-center gap-2 rounded-lg px-4 shadow-soft transition-opacity active:opacity-90 disabled:opacity-100 ${
              message.isAcked ? 'bg-[#9CA3AF]' : 'bg-[#0062FF]'
            }`}
          >
            <div className="flex items-center gap-2 text-[16px]/[normal] font-body font-semibold text-white [white-space:nowrap]">
              {message.isAcked && <Check className="h-5 w-5" strokeWidth={2} />}
              {message.isAcked ? '已签收' : acking ? '签收中...' : '确认签收'}
            </div>
          </button>
        )}

        {isAdmin && (
          <button
            type="button"
            onClick={() => navigate(`/message-stats/${message.id}?classId=${classId}`)}
            data-pencil-name="Stats Link"
            className="box-border flex h-[52px] w-full shrink-0 flex-col items-center justify-center gap-2 rounded-lg border border-[#0062FF] bg-[#0062FF0D] px-4 active:opacity-90"
          >
            <div className="text-[16px]/[normal] font-body font-semibold text-[#0062FF] [white-space:nowrap]">
              查看签收统计
            </div>
          </button>
        )}
      </div>
    </PageLayout>
  );
}
