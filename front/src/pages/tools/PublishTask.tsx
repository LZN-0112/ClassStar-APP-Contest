import { useState } from 'react';
import { Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { toast } from 'sonner';

export default function PublishTask() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [form, setForm] = useState({
    title: '',
    deadline: '',
    location: '',
    content: '',
  });

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error('请输入任务名称');
      return;
    }
    if (!user?.classId) {
      toast.error('请先加入班级');
      return;
    }

    try {
      await api.post(`/classes/${user.classId}/tasks`, {
        title: form.title,
        deadline: form.deadline || undefined,
        location: form.location || undefined,
        content: form.content || undefined,
        progress: 0,
      });
      toast.success('任务创建成功');
      navigate('/task-board', { replace: true });
    } catch (error: any) {
      const msg = error.response?.data?.message || '创建任务失败';
      toast.error(msg);
    }
  };

  return (
    <PageLayout
      title="新增任务"
      variant="a"
      decor={<Target className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}
    >
      <div className="flex min-h-full flex-1 flex-col gap-5">
        <div
          data-pencil-name="Input Field 任务名称"
          className="box-border flex h-[56px] w-full shrink-0 flex-col justify-center rounded-xl border border-[#E2E8F0] bg-white px-4"
        >
          <input
            type="text"
            value={form.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="请输入任务名称"
            className="w-full bg-transparent font-body text-[14px] font-medium text-[#1A1A1A] placeholder:text-[#94A3B8] outline-none"
          />
        </div>

        <div
          data-pencil-name="Input Field 截止时间"
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
          data-pencil-name="Input Field 地点"
          className="box-border flex h-[56px] w-full shrink-0 flex-col justify-center rounded-xl border border-[#E2E8F0] bg-white px-4"
        >
          <input
            type="text"
            value={form.location}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder="请输入任务地点"
            className="w-full bg-transparent font-body text-[14px] font-medium text-[#1A1A1A] placeholder:text-[#94A3B8] outline-none"
          />
        </div>

        <div
          data-pencil-name="Textarea 任务内容"
          className="box-border flex h-[140px] w-full shrink-0 flex-col justify-start rounded-xl border border-[#E2E8F0] bg-white p-4"
        >
          <textarea
            value={form.content}
            onChange={(e) => handleChange('content', e.target.value)}
            placeholder="请输入任务内容..."
            rows={4}
            className="h-full w-full resize-none bg-transparent font-body text-[14px] font-medium text-[#1A1A1A] placeholder:text-[#94A3B8] outline-none"
          />
        </div>

        <div data-pencil-name="Spacer" className="min-h-[20px] flex-1" />

        <button
          type="button"
          onClick={handleSubmit}
          data-pencil-name="Button Primary"
          className="box-border flex h-[52px] w-full shrink-0 flex-col items-center justify-center rounded-xl bg-[#0062FF] shadow-[0px_4px_16px_0px_#0000001A]"
        >
          <div className="text-[16px]/[normal] box-border text-left font-body font-semibold text-white [white-space:nowrap]">
            新增任务
          </div>
        </button>
      </div>
    </PageLayout>
  );
}
