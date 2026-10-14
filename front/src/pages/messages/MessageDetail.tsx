import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, Bell } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface MessageDetailData {
  id: string;
  type: string;
  title: string;
  content: string;
  location?: string;
  eventTime?: string;
  requireAck: boolean;
  ackDeadline?: string;
  isAcked: boolean;
  status: 'published' | 'ended';
  createdAt: string;
  publisher?: { id: string; name: string; avatar?: string };
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
  const { user } = useCurrentUser();

  const [message, setMessage] = useState<MessageDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [acking, setAcking] = useState(false);

  const classId = user?.classId;
  const isAdmin = user?.roleLevel === 'owner' || user?.roleLevel === 'admin';

  useEffect(() => {
    if (!messageId) {
      toast.error('通知ID缺失');
      navigate('/message-list', { replace: true });
      return;
    }

    const fetchMessage = async () => {
      if (!classId || !messageId) return;
      setLoading(true);
      try {
        const res = await api.get(`/classes/${classId}/messages/${messageId}`);
        const data = res.data.data || res.data;
        setMessage(data);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '获取通知详情失败');
      } finally {
        setLoading(false);
      }
    };

    const markAsRead = async () => {
      if (!classId || !messageId) return;
      try {
        await api.post(`/classes/${classId}/messages/${messageId}/read`);
      } catch {
        // 已读标记失败不影响详情展示
      }
    };

    fetchMessage();
    markAsRead();
  }, [messageId, classId, navigate]);

  const handleAck = async () => {
    if (!message || message.isAcked || !classId || !messageId || acking) return;
    setAcking(true);
    try {
      await api.post(`/classes/${classId}/messages/${messageId}/ack`);
      setMessage((prev) => (prev ? { ...prev, isAcked: true } : prev));
      toast.success('签收成功');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('不能重复签收') || msg.includes('已签收')) {
        setMessage((prev) => (prev ? { ...prev, isAcked: true } : prev));
        toast.error('已签收，不能重复签收');
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
          className="text-[20px]/[normal] box-border text-left font-heading font-bold text-[#1A1A1A] [white-space:nowrap]"
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
              ⏰ 签收截止：{formatDateTime(message.ackDeadline) || '不限制'}
            </div>
          )}
        </div>

        <div
          data-pencil-name="Body"
          className="box-border flex w-full flex-col gap-[10px] rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-soft"
        >
          <div className="text-[14px]/[21px] font-body font-normal text-[#4B5563] whitespace-pre-wrap">
            {message.content}
          </div>
        </div>

        {message.requireAck && message.ackDeadline && !message.isAcked && new Date() > new Date(message.ackDeadline) && (
          <div className="box-border rounded-lg bg-[#FEE2E2] p-3">
            <div className="text-[13px]/[normal] font-body font-medium text-[#EF4444]">
              该通知已超过签收截止时间
            </div>
          </div>
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
            onClick={() => navigate(`/message-stats/${message.id}`)}
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
