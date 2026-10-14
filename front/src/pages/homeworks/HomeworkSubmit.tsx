import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { toast } from 'sonner';

export default function HomeworkSubmit() {
  const navigate = useNavigate();
  const { homeworkId } = useParams();
  const { user } = useCurrentUser();
  const classId = user?.classId;
  const [note, setNote] = useState('');
  const [homework, setHomework] = useState<any>(null);

  useEffect(() => {
    if (classId && homeworkId) {
      api.get(`/classes/${classId}/homeworks/${homeworkId}`)
        .then((res) => setHomework(res.data))
        .catch(console.error);
    }
  }, [classId, homeworkId]);

  // 使用 homework 数据动态显示作业要求
  const requirement = homework?.content || '完成教材第三章习题 1-10，并提交电子版实验报告。';
  const deadline = homework?.deadline ? new Date(homework.deadline).toLocaleDateString('zh-CN') : '';

  const handleSubmit = async () => {
    if (!note.trim()) {
      toast.error('请输入提交说明');
      return;
    }
    if (!classId || !homeworkId) {
      toast.error('缺少必要信息');
      return;
    }

    try {
      await api.post(`/classes/${classId}/homeworks/${homeworkId}/submit`, {
        content: note,
      });
      toast.success('作业提交成功');
      navigate('/my-homework');
    } catch (error: any) {
      console.error('提交作业失败:', error);
      toast.error(error.message || '提交失败，请重试');
    }
  };

  return (
    <PageLayout title="作业提交" variant="a">
      <div
        data-pencil-name="Requirement Card"
        className="box-border w-full h-fit shrink-0 flex flex-col gap-2 p-4 justify-start items-start bg-[#EBF4FF] rounded-[16px]"
      >
        <div
          data-pencil-name="Text"
          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-bold text-left [white-space:nowrap]"
        >
          作业要求
        </div>
        <div className="text-[14px]/[normal] box-border text-[#4B5563] font-body font-medium text-left">
          {requirement}
        </div>
        {deadline && (
          <div
            data-pencil-name="Text"
            className="text-[11px]/[normal] box-border text-[#0062FF] font-body font-semibold text-left [white-space:nowrap]"
          >
            截止时间：{deadline}
          </div>
        )}
      </div>

      <div
        data-pencil-name="Upload Area"
        className="box-border w-full h-[140px] shrink-0 flex flex-col gap-2 justify-center items-center bg-[#FFFFFF] [border:1px_solid_#E5E7EB] rounded-lg"
      >
        <svg
          data-pencil-name="Icon-upload"
          viewBox="0 0 24 24"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
          className="box-border w-[40px] h-[40px] shrink-0 overflow-visible"
        >
          <path
            d="M21 15v4a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2v-4m14-7l-5-5-5 5m5-5v12"
            fill="none"
          ></path>
          <path
            d="M21 15v4a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2v-4m14-7l-5-5-5 5m5-5v12"
            fill="none"
            stroke="#6B7280"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          ></path>
        </svg>
        <div className="text-[14px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]">
          点击上传作业文件
        </div>
      </div>

      <div
        data-pencil-name="Textarea"
        className="box-border w-full h-[100px] shrink-0 flex flex-col gap-0 p-4 justify-start items-start bg-[#FFFFFF] [border:1px_solid_#E5E7EB] rounded-lg"
      >
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="请输入补充说明..."
          rows={3}
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
          提交作业
        </div>
      </button>
    </PageLayout>
  );
}
