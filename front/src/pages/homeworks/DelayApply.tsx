import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { toast } from 'sonner';

export default function DelayApply() {
  const navigate = useNavigate();
  const { homeworkId } = useParams();
  const { user } = useCurrentUser();
  const classId = user?.classId;
  const [form, setForm] = useState({
    extend: '',
    reason: '',
  });

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.reason.trim()) {
      toast.error('请输入申请理由');
      return;
    }
    if (!form.extend) {
      toast.error('请选择延长时间');
      return;
    }
    if (!classId || !homeworkId) {
      toast.error('缺少必要信息');
      return;
    }

    // 计算新的截止时间
    const daysMap: Record<string, number> = {
      '1天': 1,
      '2天': 2,
      '3天': 3,
      '1周': 7,
    };
    const days = daysMap[form.extend] || 1;
    const newDeadline = new Date();
    newDeadline.setDate(newDeadline.getDate() + days);

    try {
      await api.post(`/classes/${classId}/homeworks/${homeworkId}/delay`, {
        reason: form.reason,
        requestedDeadline: newDeadline.toISOString(),
      });
      toast.success('延期申请已提交');
      navigate('/my-homework');
    } catch (error: any) {
      console.error('延期申请失败:', error);
      toast.error(error.message || '申请失败，请重试');
    }
  };

  return (
    <PageLayout title="延时申请" variant="a">
      <div
        data-pencil-name="Input Field"
        className="box-border w-full h-[56px] shrink-0 flex flex-col gap-0 p-[0px_16px] justify-center items-start bg-[#FFFFFF] [border:1px_solid_#E5E7EB] rounded-lg"
      >
        <select
          value={form.extend}
          onChange={(e) => handleChange('extend', e.target.value)}
          className="w-full bg-transparent text-[14px] font-body font-medium text-[#1A1A1A] outline-none"
        >
          <option value="">请选择延长时间</option>
          <option value="1天">1天</option>
          <option value="2天">2天</option>
          <option value="3天">3天</option>
          <option value="1周">1周</option>
        </select>
      </div>
      <div
        data-pencil-name="Textarea"
        className="box-border w-full h-[140px] shrink-0 flex flex-col gap-0 p-4 justify-start items-start bg-[#FFFFFF] [border:1px_solid_#E5E7EB] rounded-lg"
      >
        <textarea
          value={form.reason}
          onChange={(e) => handleChange('reason', e.target.value)}
          placeholder="请输入申请理由..."
          rows={4}
          className="w-full h-full resize-none bg-transparent text-[14px] font-body font-medium text-[#1A1A1A] placeholder:text-[#4B5563] outline-none"
        />
      </div>
      <div
        data-pencil-name="Spacer"
        className="box-border w-full h-[20px] shrink-0 flex flex-row gap-0 justify-start items-start bg-[#00000000]"
      ></div>
      <button
        type="button"
        onClick={handleSubmit}
        data-pencil-name="Button Primary"
        className="box-border w-full h-[52px] shrink-0 [box-shadow:0px_4px_16px_0px_#0000001A] flex flex-col gap-0 justify-center items-center bg-[#0062FF] rounded-lg"
      >
        <div className="text-[16px]/[normal] box-border text-[#FFFFFF] font-body font-semibold text-left [white-space:nowrap]">
          提交申请
        </div>
      </button>
    </PageLayout>
  );
}
