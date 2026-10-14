import { useState } from 'react';
import { FileText, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { toast } from 'sonner';

export default function PublishHomework() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const classId = user?.classId;
  const [form, setForm] = useState({
    title: '',
    subject: '',
    deadline: '',
    content: '',
  });

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
    if (!classId) {
      toast.error('未找到班级信息');
      return;
    }

    try {
      await api.post(`/classes/${classId}/homeworks`, {
        title: form.title,
        subject: form.subject || form.title,
        deadline: new Date(form.deadline).toISOString(),
        content: form.content,
      });
      toast.success('作业发布成功');
      navigate('/homework-list');
    } catch (error: any) {
      console.error('发布作业失败:', error);
      toast.error(error.message || '发布失败，请重试');
    }
  };

  return (
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
            className="w-full bg-transparent font-body text-[14px] font-medium text-[#1A1A1A] placeholder:text-[#94A3B8] outline-none"
          />
        </div>
        <div
          data-pencil-name="Input Field"
          className="box-border flex h-[56px] w-full shrink-0 flex-col justify-center rounded-xl border border-[#E2E8F0] bg-white px-4"
        >
          <input
            type="datetime-local"
            value={form.deadline}
            onChange={(e) => handleChange('deadline', e.target.value)}
            placeholder="请选择截止时间"
            className="w-full bg-transparent font-body text-[14px] font-medium text-[#1A1A1A] placeholder:text-[#94A3B8] outline-none"
          />
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
            className="h-full w-full resize-none bg-transparent font-body text-[14px] font-medium text-[#1A1A1A] placeholder:text-[#94A3B8] outline-none"
          />
        </div>
        <div
          data-pencil-name="Upload Area"
          className="box-border flex h-[120px] w-full shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
        >
          <Upload className="h-[32px] w-[32px] text-[#94A3B8]" strokeWidth={2} />
          <div className="text-[14px]/[normal] box-border text-left font-body font-medium text-[#94A3B8] [white-space:nowrap]">
            点击上传附件
          </div>
        </div>

        <div data-pencil-name="Spacer" className="min-h-[20px] flex-1" />

        <button
          type="button"
          onClick={handleSubmit}
          data-pencil-name="Button Primary"
          className="box-border flex h-[52px] w-full shrink-0 flex-col items-center justify-center rounded-xl bg-[#0062FF] shadow-[0px_4px_16px_0px_#0000001A]"
        >
          <div className="text-[16px]/[normal] box-border text-left font-body font-semibold text-white [white-space:nowrap]">
            发布作业
          </div>
        </button>
      </div>
    </PageLayout>
  );
}
