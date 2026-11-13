import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, Clock3, Loader2, Timer } from 'lucide-react';
import { toast } from 'sonner';
import PageLayout from '@/components/layout/PageLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';

interface HomeworkInfo {
  id: string;
  subject: string;
  title: string;
  deadline: string;
  mySubmission: { id: string } | null;
  myDelayApplication: {
    status: string;
    expected_deadline: string;
    reason: string;
  } | null;
}

const delayOptions = [1, 2, 3, 7];

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${month}月${day}日 ${hours}:${minutes}`;
}

const statusText: Record<string, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已驳回',
};

export default function DelayApply() {
  const navigate = useNavigate();
  const { homeworkId } = useParams<{ homeworkId: string }>();
  const { user } = useCurrentUser();
  const [homework, setHomework] = useState<HomeworkInfo | null>(null);
  const [days, setDays] = useState(1);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const classId = user?.classId;

  const load = useCallback(() => {
    if (!classId || !homeworkId) {
      setLoading(false);
      setError('缺少作业信息');
      return;
    }
    setLoading(true);
    setError('');
    api
      .get(`/classes/${classId}/homeworks/${homeworkId}`)
      .then((res) => setHomework(res.data?.data || res.data))
      .catch((e) => setError(e.message || '作业加载失败'))
      .finally(() => setLoading(false));
  }, [classId, homeworkId]);

  useEffect(() => {
    load();
  }, [load]);

  const requestedDeadline = useMemo(() => {
    if (!homework) return null;
    // 已逾期作业从当前时间起算，避免延期后仍早于现在
    const base = Math.max(new Date(homework.deadline).getTime(), Date.now());
    return new Date(base + days * 86400000);
  }, [homework, days]);

  const existingStatus = homework?.myDelayApplication?.status;
  const alreadySubmitted = Boolean(homework?.mySubmission);
  const cannotApply =
    alreadySubmitted ||
    existingStatus === 'pending' ||
    existingStatus === 'approved';

  const handleSubmit = async () => {
    if (!classId || !homeworkId || !requestedDeadline) return;
    if (!reason.trim()) {
      toast.error('请填写延时原因');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/classes/${classId}/homeworks/${homeworkId}/delay`, {
        reason: reason.trim(),
        requestedDeadline: requestedDeadline.toISOString(),
      });
      toast.success('延时申请已提交，等待班委审批');
      navigate(`/homework-detail/${homeworkId}`, { replace: true });
    } catch (e: any) {
      toast.error(e.message || '申请失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout title="申请延时" variant="a">
      {loading ? (
        <div className="flex flex-col gap-3">
          <div className="h-[120px] animate-pulse rounded-2xl bg-[#F1F5F9]" />
          <div className="h-[160px] animate-pulse rounded-2xl bg-[#F1F5F9]" />
        </div>
      ) : error || !homework ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-[#6B7280]">
          <AlertCircle className="h-10 w-10 text-[#EF4444] opacity-70" />
          <span className="text-[14px]">{error || '作业不存在'}</span>
          <button
            type="button"
            onClick={load}
            className="rounded-full bg-[#F1F5F9] px-4 py-2 text-[13px] font-medium text-[#334155]"
          >
            重新加载
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 pb-4">
          <div className="rounded-2xl bg-[#F8FAFC] p-4">
            <div className="text-[11px] font-semibold text-[#0062FF]">{homework.subject}</div>
            <div className="mt-1 text-[15px] font-semibold text-[#1E293B]">{homework.title}</div>
            <div className="mt-2 flex items-center gap-1 text-[11px] text-[#64748B]">
              <Clock3 className="h-3.5 w-3.5" />
              当前截止 {formatDateTime(homework.deadline)}
            </div>
          </div>

          {cannotApply ? (
            <div className="rounded-2xl bg-white p-4 shadow-[0px_2px_8px_0px_#0000000D]">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[#1E293B]">
                <Timer className="h-4 w-4 text-[#F59E0B]" />
                {alreadySubmitted ? '作业已提交' : `已有延时申请（${statusText[existingStatus || ''] || existingStatus}）`}
              </div>
              <div className="mt-1.5 text-[12px] leading-5 text-[#64748B]">
                {alreadySubmitted
                  ? '已提交的作业无需再申请延时'
                  : existingStatus === 'approved'
                    ? `已延至 ${formatDateTime(homework.myDelayApplication?.expected_deadline || '')}`
                    : '请等待班委审批结果，无需重复提交'}
              </div>
              <button
                type="button"
                onClick={() => navigate(`/homework-detail/${homework.id}`, { replace: true })}
                className="mt-3 flex h-[42px] w-full items-center justify-center rounded-xl bg-[#EFF6FF] text-[13px] font-medium text-[#0062FF]"
              >
                返回作业详情
              </button>
            </div>
          ) : (
            <>
              <div className="rounded-2xl bg-white p-4 shadow-[0px_2px_8px_0px_#0000000D]">
                <div className="mb-3 text-[13px] font-semibold text-[#1E293B]">希望延长多久</div>
                <div className="flex flex-row gap-2">
                  {delayOptions.map((option) => {
                    const active = days === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setDays(option)}
                        className={`flex h-[34px] flex-1 items-center justify-center rounded-full text-[12px] font-semibold ${
                          active ? 'bg-[#0062FF] text-white' : 'bg-[#F1F5F9] text-[#64748B]'
                        }`}
                      >
                        {option} 天
                      </button>
                    );
                  })}
                </div>
                {requestedDeadline && (
                  <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-[#EFF6FF] px-3 py-2.5 text-[12px] text-[#0062FF]">
                    <Clock3 className="h-4 w-4" />
                    申请延至 {formatDateTime(requestedDeadline.toISOString())}
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-[0px_2px_8px_0px_#0000000D]">
                <div className="mb-2 text-[13px] font-semibold text-[#1E293B]">延时原因</div>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="请说明需要延时的原因，方便班委审批..."
                  className="h-[120px] w-full resize-none rounded-xl bg-[#F8FAFC] p-3 text-[13px] leading-6 text-[#334155] outline-none placeholder:text-[#CBD5E1]"
                  maxLength={200}
                />
                <div className="mt-1 text-right text-[10px] text-[#CBD5E1]">{reason.length}/200</div>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#0062FF] text-[15px] font-semibold text-white shadow-[0px_4px_12px_0px_#0062FF33] disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Timer className="h-4 w-4" />}
                {submitting ? '提交中...' : '提交申请'}
              </button>
            </>
          )}
        </div>
      )}
    </PageLayout>
  );
}