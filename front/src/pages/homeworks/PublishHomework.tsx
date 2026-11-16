import { useState } from 'react';
import { ChevronRight, FileText, Loader2, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import DateTimePickerSheet, { formatDateTimeLabel } from '@/components/ui/DateTimePickerSheet';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { toast } from 'sonner';

export default function PublishHomework() {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useCurrentUser();
  const classId = user?.classId;
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    subject: '',
    deadline: '',
    content: '',
  });
  const [pickerOpen, setPickerOpen] = useState(false);

  const isManager = Boolean(
    user?.isCommittee || user?.roleLevel === 'owner' || user?.roleLevel === 'admin',
  );

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error('请输入作业名称');
      return;
    }
    if (!form.deadline) {
      toast.error('请选择截止时间');
      return;
    }
    if (new Date(form.deadline).getTime() <= Date.now()) {
      toast.error('截止时间需晚于当前时间');
      return;
    }
    if (!classId) {
      toast.error('未找到班级信息');
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    try {
      await api.post(`/classes/${classId}/homeworks`, {
        title: form.title.trim(),
        subject: form.subject.trim() || '作业',
        deadline: new Date(form.deadline).toISOString(),
        content: form.content.trim(),
      });
      toast.success('作业发布成功');
      navigate('/homework-list');
    } catch (error: any) {
      console.error('发布作业失败:', error);
      toast.error(error.message || '发布失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (!userLoading && !isManager) {
    return (
      <PageLayout title="发布作业" variant="a">
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-[#64748B]">
          <ShieldAlert className="h-12 w-12 text-[#F59E0B] opacity-70" />
          <span className="text-[14px]">仅班委可发布作业</span>
          <button
            type="button"
            onClick={() => navigate('/homework-list', { replace: true })}
            className="rounded-full bg-[#EFF6FF] px-5 py-2 text-[13px] font-medium text-[#0062FF]"
          >
            返回作业列表
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <>
    <PageLayout
      title="发布作业"
      variant="a"
      decor={<FileText className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}
    >
      <div className="flex min-h-full flex-1 flex-col gap-5">
        <div
          data-pencil-name="Input Field"
          className="box-border flex h-[56px] w-full shrink-0 flex-col justify-center rounded-xl border border-[#E2E8F0] bg-white px-4"
        >
          <input
            type="text"
            value={form.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="请输入作业名称"
            maxLength={50}
            className="w-full bg-transparent font-body text-[14px] font-medium text-[#1A1A1A] placeholder:text-[#94A3B8] outline-none"
          />
        </div>
        {/* 班级信息已自动获取，无需手动输入 */}
        <div
          data-pencil-name="Input Field"
          className="box-border flex h-[56px] w-full shrink-0 flex-col justify-center rounded-xl border border-[#E2E8F0] bg-white px-4"
        >
          <input
            type="text"
            value={form.subject}
            onChange={(e) => handleChange('subject', e.target.value)}
            placeholder="请输入科目（选填）"
            maxLength={20}
            className="w-full bg-transparent font-body text-[14px] font-medium text-[#1A1A1A] placeholder:text-[#94A3B8] outline-none"
          />
        </div>
        <div
          data-pencil-name="Input Field"
          className="box-border flex h-[56px] w-full shrink-0 flex-col justify-center rounded-xl border border-[#E2E8F0] bg-white px-4"
        >
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex w-full items-center justify-between text-left active:opacity-70"
          >
            <span
              className={`font-body text-[14px] font-medium ${
                form.deadline ? 'text-[#1A1A1A]' : 'text-[#94A3B8]'
              }`}
            >
              {form.deadline ? formatDateTimeLabel(form.deadline) : '请选择截止时间'}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-[#CBD5E1]" strokeWidth={2} />
          </button>
        </div>
        <div
          data-pencil-name="Textarea"
          className="box-border flex h-[140px] w-full shrink-0 flex-col justify-start rounded-xl border border-[#E2E8F0] bg-white p-4"
        >
          <textarea
            value={form.content}
            onChange={(e) => handleChange('content', e.target.value)}
            placeholder="请输入作业要求..."
            rows={4}
            maxLength={2000}
            className="h-full w-full resize-none bg-transparent font-body text-[14px] font-medium text-[#1A1A1A] placeholder:text-[#94A3B8] outline-none"
          />
        </div>

        <div data-pencil-name="Spacer" className="min-h-[20px] flex-1" />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          data-pencil-name="Button Primary"
          className="box-border flex h-[52px] w-full shrink-0 flex-col items-center justify-center rounded-xl bg-[#0062FF] shadow-[0px_4px_16px_0px_#0000001A] disabled:opacity-60"
        >
          <div className="flex items-center gap-2 text-[16px]/[normal] box-border text-left font-body font-semibold text-white [white-space:nowrap]">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? '发布中...' : '发布作业'}
          </div>
        </button>
      </div>
    </PageLayout>

    {/* 截止时间选择 */}
    <DateTimePickerSheet
      open={pickerOpen}
      value={form.deadline}
      onClose={() => setPickerOpen(false)}
      onConfirm={(next) => {
        handleChange('deadline', next);
        setPickerOpen(false);
      }}
    />
    </>
  );
}
