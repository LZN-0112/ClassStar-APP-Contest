import { useState } from 'react';
import { Bell, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import DateTimePickerSheet, { formatDateTimeLabel } from '@/components/ui/DateTimePickerSheet';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function PublishMessage() {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    eventTime: '',
    location: '',
    content: '',
    ackDeadline: '',
  });
  const [requireAck, setRequireAck] = useState(true);
  const [status, setStatus] = useState<'published' | 'ended'>('published');
  const [picker, setPicker] = useState<'eventTime' | 'ackDeadline' | null>(null);

  const classId = user?.classId;

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    if (!form.title.trim()) {
      toast.error('请输入通知标题');
      return false;
    }
    if (!form.eventTime) {
      toast.error('请选择发布时间');
      return false;
    }
    if (!form.location.trim()) {
      toast.error('请输入地点');
      return false;
    }
    if (!form.content.trim()) {
      toast.error('请输入通知内容');
      return false;
    }
    return true;
  };

  const handlePublish = async () => {
    if (!validate() || loading || !classId) return;
    setLoading(true);
    try {
      await api.post(`/classes/${classId}/messages`, {
        type: 'notice',
        title: form.title.trim(),
        content: form.content.trim(),
        location: form.location.trim(),
        eventTime: new Date(form.eventTime).toISOString(),
        requireAck,
        status,
        ackDeadline: requireAck && form.ackDeadline ? new Date(form.ackDeadline).toISOString() : undefined,
      });
      toast.success('发布成功');
      navigate('/messages', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '发布失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const canPublish = user?.roleLevel === 'owner' || user?.roleLevel === 'admin';

  // 前端入口兜底：非管理员直接提示，避免填写完表单后提交才被后端拒绝
  if (!userLoading && user && !canPublish) {
    return (
      <PageLayout
        title="发布通知"
        variant="a"
        decor={<Bell className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="font-body text-[14px] text-[#4B5563]">仅班级管理员可发布通知</div>
          <button
            type="button"
            onClick={() => navigate('/messages', { replace: true })}
            className="h-[40px] rounded-lg bg-[#0062FF] px-4 font-body text-[14px] font-semibold text-white active:opacity-80"
          >
            返回消息中心
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <>
    <PageLayout
      title="发布通知"
      variant="a"
      decor={<Bell className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}
    >
      <div className="flex min-h-full flex-1 flex-col gap-5">
        <div
          data-pencil-name="Title Input"
          className="box-border flex h-[56px] w-full shrink-0 flex-col justify-center rounded-xl border border-[#E2E8F0] bg-white px-4"
        >
          <input
            type="text"
            value={form.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="请输入通知标题"
            maxLength={200}
            className="w-full bg-transparent font-body text-[14px] font-medium text-[#1A1A1A] placeholder:text-[#94A3B8] outline-none"
          />
        </div>

        <div
          data-pencil-name="Time Input"
          className="box-border flex h-[56px] w-full shrink-0 flex-col justify-center rounded-xl border border-[#E2E8F0] bg-white px-4"
        >
          <button
            type="button"
            onClick={() => setPicker('eventTime')}
            className="flex w-full items-center justify-between text-left active:opacity-70"
          >
            <span
              className={`font-body text-[14px] font-medium ${
                form.eventTime ? 'text-[#1A1A1A]' : 'text-[#94A3B8]'
              }`}
            >
              {form.eventTime ? formatDateTimeLabel(form.eventTime) : '请选择发布时间'}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-[#CBD5E1]" strokeWidth={2} />
          </button>
        </div>

        <div
          data-pencil-name="Location Input"
          className="box-border flex h-[56px] w-full shrink-0 flex-col justify-center rounded-xl border border-[#E2E8F0] bg-white px-4"
        >
          <input
            type="text"
            value={form.location}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder="请输入地点"
            maxLength={200}
            className="w-full bg-transparent font-body text-[14px] font-medium text-[#1A1A1A] placeholder:text-[#94A3B8] outline-none"
          />
        </div>

        <div
          data-pencil-name="Content Input"
          className="box-border flex h-[160px] w-full shrink-0 flex-col justify-start rounded-xl border border-[#E2E8F0] bg-white p-4"
        >
          <textarea
            value={form.content}
            onChange={(e) => handleChange('content', e.target.value)}
            placeholder="请输入通知内容..."
            rows={5}
            maxLength={5000}
            className="h-full w-full resize-none bg-transparent font-body text-[14px] font-medium text-[#1A1A1A] placeholder:text-[#94A3B8] outline-none"
          />
        </div>

        <div
          data-pencil-name="Options"
          className="box-border flex w-full flex-col gap-3 rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-soft"
        >
          <div className="flex h-[40px] w-full flex-row items-center justify-between">
            <div className="text-[14px]/[normal] font-body font-normal text-[#1A1A1A] [white-space:nowrap]">
              开启签收确认
            </div>
            <button
              type="button"
              onClick={() => setRequireAck((v) => !v)}
              className={`relative box-border h-[24px] w-[44px] shrink-0 rounded-full transition-colors ${
                requireAck ? 'bg-[#0062FF]' : 'bg-[#E5E7EB]'
              }`}
              aria-label="开启签收确认"
            >
              <span
                className={`absolute top-[2px] h-[20px] w-[20px] rounded-full bg-white shadow-sm transition-all ${
                  requireAck ? 'left-[22px]' : 'left-[2px]'
                }`}
              />
            </button>
          </div>

          {requireAck && (
            <div className="flex h-[40px] w-full flex-row items-center justify-between">
              <div className="text-[14px]/[normal] font-body font-normal text-[#1A1A1A] [white-space:nowrap]">
                签收截止时间（可选）
              </div>
              <input
                type="text"
                readOnly
                value={form.ackDeadline ? formatDateTimeLabel(form.ackDeadline) : '选择时间'}
                onClick={() => setPicker('ackDeadline')}
                className="box-border h-[32px] w-[150px] rounded-lg border border-[#E5E7EB] bg-white px-2 text-right text-[12px] text-[#1A1A1A] outline-none active:opacity-70"
              />
            </div>
          )}

          <div className="flex h-[40px] w-full flex-row items-center justify-between">
            <div className="text-[14px]/[normal] font-body font-normal text-[#1A1A1A] [white-space:nowrap]">
              通知状态
            </div>
            <div className="box-border flex h-[32px] shrink-0 flex-row items-center overflow-hidden rounded-full bg-[#F3F4F6] p-0.5">
              <button
                type="button"
                onClick={() => setStatus('published')}
                className={`box-border flex h-full items-center justify-center rounded-full px-4 text-[12px]/[normal] font-body font-medium transition-colors ${
                  status === 'published'
                    ? 'bg-[#0062FF] text-white shadow-sm'
                    : 'text-[#6B7280]'
                }`}
              >
                进行中
              </button>
              <button
                type="button"
                onClick={() => setStatus('ended')}
                className={`box-border flex h-full items-center justify-center rounded-full px-4 text-[12px]/[normal] font-body font-medium transition-colors ${
                  status === 'ended'
                    ? 'bg-[#0062FF] text-white shadow-sm'
                    : 'text-[#6B7280]'
                }`}
              >
                已结束
              </button>
            </div>
          </div>
        </div>

        <div data-pencil-name="Spacer" className="min-h-[20px] flex-1" />

        <button
          type="button"
          onClick={handlePublish}
          disabled={loading}
          data-pencil-name="Publish Button"
          className={`box-border flex h-[52px] w-full shrink-0 flex-col items-center justify-center rounded-xl shadow-[0px_4px_16px_0px_#0000001A] ${
            loading ? 'bg-[#93C5FD]' : 'bg-[#0062FF]'
          }`}
        >
          <div className="text-[16px]/[normal] box-border text-left font-body font-semibold text-white [white-space:nowrap]">
            {loading ? '发布中...' : '发布'}
          </div>
        </button>
      </div>
    </PageLayout>

    {/* 发布时间 / 签收截止时间选择 */}
    <DateTimePickerSheet
      open={picker !== null}
      value={picker === 'ackDeadline' ? form.ackDeadline : form.eventTime}
      title={picker === 'ackDeadline' ? '选择签收截止时间' : '选择发布时间'}
      allowPast
      onClose={() => setPicker(null)}
      onConfirm={(next) => {
        handleChange(picker === 'ackDeadline' ? 'ackDeadline' : 'eventTime', next);
        setPicker(null);
      }}
    />
    </>
  );
}
