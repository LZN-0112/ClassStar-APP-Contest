import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Keyboard, ScanLine, FileText, Clock } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface Homework {
  id: string;
  title: string;
  subject?: string;
}

export default function OfflineCheckHome() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [homeworkList, setHomeworkList] = useState<Homework[]>([]);
  const [selectedHomework, setSelectedHomework] = useState('');
  const [, setLoading] = useState(true);

  const classId = user?.classId;

  useEffect(() => {
    if (!classId) {
      setLoading(false);
      return;
    }

    api
      .get(`/classes/${classId}/homeworks`)
      .then((res) => {
        const data = res.data?.data?.list || res.data?.list || res.data?.data || [];
        setHomeworkList(data);
        if (data.length > 0) {
          setSelectedHomework(data[0].id);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch homework list:', err);
        toast.error('获取作业列表失败');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [classId]);

  const selectedTitle = homeworkList.find((h) => h.id === selectedHomework)?.title || '';

  return (
    <PageLayout
      title="作业核对"
      variant="a"
      decor={<ClipboardCheck className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}
    >
      <div className="flex w-full flex-1 flex-col gap-5">
        {/* 作业选择 */}
        <div className="box-border flex w-full flex-col gap-2">
          <div className="text-[11px]/[normal] font-body font-semibold text-[#6B7280]">选择作业</div>
          <div className="box-border flex h-[56px] w-full flex-row items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 shadow-soft">
            <FileText className="h-5 w-5 shrink-0 text-[#0062FF]" />
            <select
              value={selectedHomework}
              onChange={(e) => setSelectedHomework(e.target.value)}
              className="w-full flex-1 bg-transparent text-[14px] font-body font-medium text-[#1A1A1A] outline-none"
            >
              {homeworkList.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 核对方式 */}
        <div className="box-border flex w-full flex-col gap-3">
          <div className="text-[11px]/[normal] font-body font-semibold text-[#6B7280]">选择核对方式</div>
          <button
            type="button"
            onClick={() => navigate('/batch-check', { state: { homeworkId: selectedHomework, homeworkTitle: selectedTitle } })}
            className="box-border flex w-full flex-row items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-soft active:opacity-90"
          >
            <div className="box-border flex h-[48px] w-[48px] shrink-0 flex-col items-center justify-center rounded-xl bg-[#DBEAFE]">
              <Keyboard className="h-[24px] w-[24px] text-[#076CAB]" strokeWidth={2} />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <div className="text-[14px]/[normal] font-body font-semibold text-[#1E293B]">批量输入学号核对</div>
              <div className="text-[11px]/[normal] font-caption font-medium text-[#64748B]">粘贴或输入已交学生学号，自动匹配姓名</div>
            </div>
            <svg
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              className="box-border h-5 w-5 shrink-0 text-[#9CA3AF]"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => navigate('/screenshot-check', { state: { homeworkId: selectedHomework, homeworkTitle: selectedTitle } })}
            className="box-border flex w-full flex-row items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-soft active:opacity-90"
          >
            <div className="box-border flex h-[48px] w-[48px] shrink-0 flex-col items-center justify-center rounded-xl bg-[#DBEAFE]">
              <ScanLine className="h-[24px] w-[24px] text-[#076CAB]" strokeWidth={2} />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <div className="text-[14px]/[normal] font-body font-semibold text-[#1E293B]">上传截图识别核对</div>
              <div className="text-[11px]/[normal] font-caption font-medium text-[#64748B]">上传作业截图，自动识别并支持手动修正</div>
            </div>
            <svg
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              className="box-border h-5 w-5 shrink-0 text-[#9CA3AF]"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        {/* 历史记录 */}
        <div className="box-border flex w-full flex-col gap-3">
          <div className="text-[11px]/[normal] font-body font-semibold text-[#6B7280]">历史核对记录</div>
          <div className="box-border flex w-full flex-col items-center justify-center gap-2 rounded-2xl bg-white p-6 shadow-soft">
            <Clock className="h-8 w-8 text-[#CBD5E1]" strokeWidth={1.5} />
            <div className="text-[13px]/[normal] font-caption font-medium text-[#94A3B8]">暂无历史记录</div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
