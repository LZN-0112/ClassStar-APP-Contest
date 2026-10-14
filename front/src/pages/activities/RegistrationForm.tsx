import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { toast } from 'sonner';

export default function RegistrationForm() {
  const navigate = useNavigate();
  const { activityId } = useParams();
  const { user } = useCurrentUser();
  const classId = user?.classId;
  const [activity, setActivity] = useState<any>(null);
  const [form, setForm] = useState({
    name: user?.name || '',
    studentId: '',
    phone: user?.phone || '',
    remark: '',
  });

  useEffect(() => {
    if (classId && activityId) {
      api.get(`/classes/${classId}/activities/${activityId}`)
        .then((res) => setActivity(res.data))
        .catch(console.error);
    }
  }, [classId, activityId]);

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!classId || !activityId) {
      toast.error('缺少必要信息');
      return;
    }

    try {
      await api.post(`/classes/${classId}/activities/${activityId}/register`, {
        name: form.name,
        studentId: form.studentId,
        phone: form.phone,
        remark: form.remark,
      });
      toast.success('报名成功');
      navigate('/my-registration');
    } catch (error: any) {
      console.error('报名失败:', error);
      toast.error(error.message || '报名失败，请重试');
    }
  };

  return (
    <PageLayout title="报名表单" variant="b">
      <div className="flex flex-col gap-[20px]">
        {activity ? (
          <div
            data-pencil-name="Info Card"
            className="box-border w-full h-fit shrink-0 flex flex-col gap-2 p-4 justify-start items-start bg-[#EBF4FF] rounded-[16px]"
          >
            <div
              data-pencil-name="Text"
              className="text-[16px]/[normal] box-border text-[#1A1A1A] font-body font-bold text-left [white-space:nowrap]"
            >
              {activity.title}
            </div>
            <div
              data-pencil-name="Text"
              className="text-[14px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
            >
              {activity.eventDate} · {activity.location}
            </div>
          </div>
        ) : (
          <div className="text-center text-[#94A3B8] py-4">加载活动信息中...</div>
        )}

        <div
          data-pencil-name="Input Field"
          className="box-border w-full h-[56px] shrink-0 flex flex-col gap-0 p-[0px_16px] justify-center items-start bg-[#FFFFFF] [border:1px_solid_#E5E7EB] rounded-lg"
        >
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="请输入姓名"
            className="w-full bg-transparent text-[14px] font-body font-medium text-[#1A1A1A] placeholder:text-[#4B5563] outline-none"
          />
        </div>
        <div
          data-pencil-name="Input Field"
          className="box-border w-full h-[56px] shrink-0 flex flex-col gap-0 p-[0px_16px] justify-center items-start bg-[#FFFFFF] [border:1px_solid_#E5E7EB] rounded-lg"
        >
          <input
            type="text"
            value={form.studentId}
            onChange={(e) => handleChange('studentId', e.target.value)}
            placeholder="请输入学号"
            className="w-full bg-transparent text-[14px] font-body font-medium text-[#1A1A1A] placeholder:text-[#4B5563] outline-none"
          />
        </div>
        <div
          data-pencil-name="Input Field"
          className="box-border w-full h-[56px] shrink-0 flex flex-col gap-0 p-[0px_16px] justify-center items-start bg-[#FFFFFF] [border:1px_solid_#E5E7EB] rounded-lg"
        >
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="请输入手机号"
            className="w-full bg-transparent text-[14px] font-body font-medium text-[#1A1A1A] placeholder:text-[#4B5563] outline-none"
          />
        </div>
        <div
          data-pencil-name="Textarea"
          className="box-border w-full h-[120px] shrink-0 flex flex-col gap-0 p-4 justify-start items-start bg-[#FFFFFF] [border:1px_solid_#E5E7EB] rounded-lg"
        >
          <textarea
            value={form.remark}
            onChange={(e) => handleChange('remark', e.target.value)}
            placeholder="请输入补充信息..."
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
          <div
            data-pencil-name="Text"
            className="text-[16px]/[normal] box-border text-[#FFFFFF] font-body font-semibold text-left [white-space:nowrap]"
          >
            提交报名
          </div>
        </button>
      </div>
    </PageLayout>
  );
}
