import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Keyboard, ArrowRight, Loader2 } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function BatchCheck() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useCurrentUser();
  const { homeworkId, homeworkTitle } = (location.state as { homeworkId?: string; homeworkTitle?: string } | null) || {};

  const classId = user?.classId;

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const parsedIds = input
    .split(/[\s,，\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const handleCheck = async () => {
    if (!classId || !homeworkId) {
      toast.error('班级或作业信息缺失');
      return;
    }

    if (parsedIds.length === 0) {
      toast.warning('请输入至少一个学号');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(`/classes/${classId}/homeworks/offline-check`, {
        homeworkId,
        checkType: 'student_id',
        studentIds: parsedIds,
      });

      const result = res.data?.data || res.data;
      navigate(`/check-result/${homeworkId}?homeworkTitle=${encodeURIComponent(homeworkTitle || '作业核对')}&source=batch`, {
        state: { checkResult: result },
      });
    } catch (err) {
      console.error('核对失败:', err);
      toast.error(err instanceof Error ? err.message : '核对失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout
      title="批量学号核对"
      variant="a"
      decor={<Keyboard className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}
    >
      <div className="flex w-full flex-1 flex-col gap-5">
        <div className="box-border flex w-full flex-col gap-2">
          <div className="text-[11px]/[normal] font-body font-semibold text-[#6B7280]">核对作业</div>
          <div className="text-[14px]/[normal] font-body font-semibold text-[#1E293B]">{homeworkTitle || '未选择作业'}</div>
        </div>

        <div className="box-border flex w-full flex-col gap-2">
          <div className="text-[11px]/[normal] font-body font-semibold text-[#6B7280]">已交学生学号</div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="粘贴/输入已交学生学号，支持空格、换行分隔"
            className="box-border min-h-[240px] w-full resize-none rounded-2xl border border-[#E5E7EB] bg-white p-4 text-[14px] font-body font-medium text-[#1A1A1A] shadow-soft placeholder:text-[#94A3B8] outline-none"
          />
        </div>

        <div className="box-border rounded-xl bg-[#F8FAFC] p-3 text-[11px]/[normal] font-caption font-normal text-[#64748B]">
          提示：支持学号输入，多个学号用空格、逗号或换行分隔。已输入 <span className="font-semibold text-[#0062FF]">{parsedIds.length}</span> 个学号。
        </div>

        <div className="box-border w-full shrink-0 flex-1"></div>

        <button
          type="button"
          onClick={handleCheck}
          disabled={!input.trim() || loading}
          className="box-border flex h-[52px] w-full shrink-0 flex-col items-center justify-center gap-2 rounded-xl bg-[#0062FF] px-4 [box-shadow:0px_4px_16px_0px_#0000001A] disabled:opacity-50 active:opacity-90"
        >
          <div className="flex items-center gap-2 text-[16px]/[normal] font-body font-semibold text-white">
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                核对中...
              </>
            ) : (
              <>
                开始核对
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </div>
        </button>
      </div>
    </PageLayout>
  );
}
