import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FileText,
  Clock3,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  ClipboardCheck,
  Send,
  Timer,
  RefreshCw,
  Users,
  ChevronDown,
} from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api, resolveFileUrl } from '@/lib/api';
import { toast } from 'sonner';

interface Submission {
  id: string;
  content: string | null;
  attachments: unknown;
  status: string;
  submitted_at: string;
}

interface DelayApplication {
  id: string;
  reason: string;
  expected_deadline: string;
  status: string;
  created_at: string;
}

interface HomeworkDetailData {
  id: string;
  subject: string;
  title: string;
  content: string | null;
  deadline: string;
  publisher: { id: string; name: string } | null;
  mySubmission: Submission | null;
  myDelayApplication: DelayApplication | null;
  submissionCount: number;
  totalMembers: number;
  createdAt: string;
}

interface DelayReviewItem {
  id: string;
  studentName: string;
  reason: string;
  expectedDeadline: string;
  status: string;
  createdAt: string;
}

const SUBJECT_STYLE: Record<string, string> = {
  语文: 'bg-[#FEF2F2] text-[#DC2626]',
  数学: 'bg-[#EFF6FF] text-[#2563EB]',
  英语: 'bg-[#F5F3FF] text-[#7C3AED]',
  物理: 'bg-[#ECFEFF] text-[#0891B2]',
  化学: 'bg-[#F0FDF4] text-[#16A34A]',
  生物: 'bg-[#F0FDFA] text-[#0F766E]',
  历史: 'bg-[#FFFBEB] text-[#D97706]',
  地理: 'bg-[#F0F9FF] text-[#0284C7]',
  政治: 'bg-[#FDF2F8] text-[#DB2777]',
};

const delayStatusText: Record<string, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已驳回',
};

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${month}月${day}日 ${hours}:${minutes}`;
}

/** 剩余/逾期时间 */
function formatRemaining(dateStr: string, now: number): string {
  const diff = new Date(dateStr).getTime() - now;
  if (diff <= 0) {
    const days = Math.ceil(-diff / 86400000);
    return days <= 1 ? '已逾期' : `已逾期 ${days} 天`;
  }
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `剩 ${days} 天 ${hours} 小时`;
  if (hours > 0) return `剩 ${hours} 小时 ${minutes} 分`;
  return `剩 ${Math.max(1, minutes)} 分钟`;
}

function parseAttachments(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((item): item is string => typeof item === 'string');
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string');
      }
      return [raw];
    } catch {
      return [raw];
    }
  }
  return [];
}

export default function HomeworkDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useCurrentUser();
  const [data, setData] = useState<HomeworkDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const classId = user?.classId;
  const isManager = Boolean(
    user?.isCommittee || user?.roleLevel === 'owner' || user?.roleLevel === 'admin',
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const load = useCallback(() => {
    if (!classId || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    api
      .get(`/classes/${classId}/homeworks/${id}`)
      .then((res) => setData(res.data?.data || res.data))
      .catch((e) => setError(e.message || '作业加载失败'))
      .finally(() => setLoading(false));
  }, [classId, id]);

  useEffect(() => {
    load();
  }, [load]);

  const attachments = useMemo(
    () => parseAttachments(data?.mySubmission?.attachments),
    [data?.mySubmission?.attachments],
  );

  const [delayList, setDelayList] = useState<DelayReviewItem[]>([]);
  const [reviewingId, setReviewingId] = useState('');
  const [showProcessed, setShowProcessed] = useState(false);

  const loadDelays = useCallback(() => {
    if (!classId || !id) return;
    api
      .get(`/classes/${classId}/homeworks/${id}/delays`)
      .then((res) => setDelayList(res.data?.data || res.data || []))
      .catch(() => setDelayList([]));
  }, [classId, id]);

  useEffect(() => {
    if (isManager) loadDelays();
  }, [isManager, loadDelays]);

  const handleReview = async (applicationId: string, status: 'approved' | 'rejected') => {
    if (!classId || !id || reviewingId) return;
    setReviewingId(applicationId);
    try {
      await api.post(`/classes/${classId}/homeworks/${id}/delay/${applicationId}/review`, {
        status,
      });
      toast.success(status === 'approved' ? '已通过延时申请' : '已驳回延时申请');
      loadDelays();
    } catch (e: any) {
      toast.error(e.message || '操作失败，请重试');
    } finally {
      setReviewingId('');
    }
  };

  const pendingDelays = delayList.filter((item) => item.status === 'pending');
  const processedDelays = delayList.filter((item) => item.status !== 'pending');

  const delayStatus = data?.myDelayApplication?.status;
  /** 延时通过后以新截止时间为准 */
  const effectiveDeadline =
    delayStatus === 'approved' && data?.myDelayApplication
      ? data.myDelayApplication.expected_deadline
      : data?.deadline || '';

  const overdue = data ? now > new Date(effectiveDeadline).getTime() : false;
  const canSubmit = Boolean(data) && !overdue;
  const canApplyDelay =
    Boolean(data) &&
    !data?.mySubmission &&
    delayStatus !== 'pending' &&
    !(delayStatus === 'approved' && !overdue);

  const myStatus = (() => {
    if (!data) return '';
    if (isManager) return overdue ? '已截止' : '进行中';
    if (data.mySubmission) return '已提交';
    if (delayStatus === 'pending') return '延时审核中';
    return overdue ? '已逾期' : '待提交';
  })();

  const statusStyle: Record<string, string> = {
    已提交: 'bg-[#F0FDF4] text-[#16A34A]',
    延时审核中: 'bg-[#FFFBEB] text-[#D97706]',
    已逾期: 'bg-[#FEF2F2] text-[#DC2626]',
    待提交: 'bg-[#EFF6FF] text-[#0062FF]',
    进行中: 'bg-[#EFF6FF] text-[#0062FF]',
    已截止: 'bg-[#F1F5F9] text-[#64748B]',
  };

  const timeProgress = (() => {
    if (!data) return { ratio: 0, color: '#0062FF' };
    const start = new Date(data.createdAt).getTime();
    const end = new Date(effectiveDeadline).getTime();
    const total = end - start;
    const ratio = total > 0 ? Math.min(1, Math.max(0, (end - now) / total)) : 0;
    const color = ratio > 0.5 ? '#0062FF' : ratio > 0.2 ? '#F59E0B' : '#EF4444';
    return { ratio, color };
  })();

  const submitPercent = data?.totalMembers
    ? Math.min(100, Math.round((data.submissionCount / data.totalMembers) * 100))
    : 0;

  if (loading) {
    return (
      <PageLayout title="作业详情" variant="a">
        <div className="flex flex-col gap-3">
          <div className="h-[196px] animate-pulse rounded-2xl bg-[#F1F5F9]" />
          <div className="h-[180px] animate-pulse rounded-2xl bg-[#F1F5F9]" />
        </div>
      </PageLayout>
    );
  }

  if (error || !data) {
    return (
      <PageLayout title="作业详情" variant="a">
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-[#6B7280]">
          <AlertCircle className="h-10 w-10 text-[#EF4444] opacity-70" />
          <span className="text-[14px]">{error || '作业不存在'}</span>
          <button
            type="button"
            onClick={load}
            className="flex items-center gap-1 rounded-full bg-[#F1F5F9] px-4 py-2 text-[13px] font-medium text-[#334155]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            重新加载
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="作业详情" variant="a">
      <div className="flex min-h-full flex-col gap-3">
        {/* 头部信息卡 */}
        <div className="rounded-2xl bg-white p-4 shadow-[0px_2px_8px_0px_#0000000D] ring-1 ring-[#F1F5F9]">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                SUBJECT_STYLE[data.subject] || 'bg-[#F1F5F9] text-[#475569]'
              }`}
            >
              {data.subject}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                statusStyle[myStatus] || statusStyle['待提交']
              }`}
            >
              {myStatus}
            </span>
          </div>

          <h1 className="mt-2.5 text-[19px] font-semibold leading-snug text-[#0F172A]">
            {data.title}
          </h1>
          <div className="mt-1.5 text-[11px] text-[#94A3B8]">
            {data.publisher?.name || '班委'} 发布 · {formatDateTime(data.createdAt)}
          </div>

          <div className="mt-3 rounded-xl bg-[#F8FAFC] p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1 text-[11px] text-[#64748B]">
                <Clock3 className="h-3.5 w-3.5 shrink-0 text-[#94A3B8]" />
                <span className="truncate">
                  {delayStatus === 'approved' ? '已延时至 ' : '截止 '}
                  {formatDateTime(effectiveDeadline)}
                </span>
              </span>
              <span
                className="shrink-0 text-[11px] font-semibold"
                style={{ color: overdue ? '#DC2626' : timeProgress.color }}
              >
                {myStatus === '已提交'
                  ? '已完成'
                  : myStatus === '延时审核中' && !overdue
                    ? '审核中'
                    : formatRemaining(effectiveDeadline, now)}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.round(timeProgress.ratio * 100)}%`,
                  backgroundColor: overdue ? '#DC2626' : timeProgress.color,
                }}
              />
            </div>
          </div>
        </div>

        {/* 作业内容 */}
        <div className="rounded-2xl bg-white p-4 shadow-[0px_2px_8px_0px_#0000000D] ring-1 ring-[#F1F5F9]">
          <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-[#1E293B]">
            <FileText className="h-4 w-4 text-[#0062FF]" />
            作业内容
          </div>
          <div className="whitespace-pre-wrap text-[13px] leading-6 text-[#475569]">
            {data.content?.trim() || '暂无详细说明'}
          </div>
        </div>

        {/* 班委：完成情况 + 延时审批 */}
        {isManager && (
          <div className="rounded-2xl bg-white p-4 shadow-[0px_2px_8px_0px_#0000000D] ring-1 ring-[#F1F5F9]">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[13px] font-semibold text-[#1E293B]">
                <Users className="h-4 w-4 text-[#0062FF]" />
                班级完成情况
              </span>
              <span className="text-[12px] font-semibold tabular-nums text-[#0062FF]">
                {data.submissionCount}/{data.totalMembers}
              </span>
            </div>
            <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-[#EFF6FF]">
              <div
                className={`h-full rounded-full transition-all ${
                  submitPercent >= 100 ? 'bg-[#16A34A]' : 'bg-[#0062FF]'
                }`}
                style={{ width: `${submitPercent}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#94A3B8]">
              <span>未交 {Math.max(0, data.totalMembers - data.submissionCount)} 人</span>
              <span className="tabular-nums">{submitPercent}%</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/offline-check')}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#EFF6FF] py-2.5 text-[13px] font-medium text-[#0062FF]"
            >
              <ClipboardCheck className="h-4 w-4" />
              离线核对提交情况
            </button>

            <div className="my-3 h-px bg-[#F1F5F9]" />

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[13px] font-semibold text-[#1E293B]">
                <Timer className="h-4 w-4 text-[#F59E0B]" />
                延时申请
              </span>
              {pendingDelays.length > 0 ? (
                <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-semibold text-[#B45309]">
                  待审批 {pendingDelays.length}
                </span>
              ) : (
                <span className="text-[11px] text-[#94A3B8]">共 {delayList.length} 条</span>
              )}
            </div>

            {delayList.length === 0 && (
              <div className="mt-2 text-[12px] text-[#94A3B8]">暂无延时申请</div>
            )}

            <div className="mt-2 flex flex-col gap-2">
              {pendingDelays.map((item) => (
                <div key={item.id} className="rounded-xl bg-[#F8FAFC] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold text-[#1E293B]">
                      {item.studentName}
                    </span>
                    <span className="text-[11px] text-[#64748B]">
                      申请延至 {formatDateTime(item.expectedDeadline)}
                    </span>
                  </div>
                  <div className="mt-1.5 text-[12px] leading-5 text-[#64748B]">{item.reason}</div>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleReview(item.id, 'rejected')}
                      disabled={Boolean(reviewingId)}
                      className="h-[32px] flex-1 rounded-lg bg-white text-[12px] font-medium text-[#64748B] ring-1 ring-[#E2E8F0] disabled:opacity-60"
                    >
                      驳回
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReview(item.id, 'approved')}
                      disabled={Boolean(reviewingId)}
                      className="h-[32px] flex-1 rounded-lg bg-[#0062FF] text-[12px] font-semibold text-white disabled:opacity-60"
                    >
                      通过
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {processedDelays.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setShowProcessed((v) => !v)}
                  className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] text-[#94A3B8]"
                >
                  已处理 {processedDelays.length} 条
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${showProcessed ? 'rotate-180' : ''}`}
                  />
                </button>
                {showProcessed && (
                  <div className="mt-1 flex flex-col gap-1.5">
                    {processedDelays.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 rounded-xl bg-[#F8FAFC] px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-[12px] font-medium text-[#334155]">
                            {item.studentName}
                          </div>
                          <div className="text-[11px] text-[#94A3B8]">
                            延至 {formatDateTime(item.expectedDeadline)}
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            item.status === 'approved'
                              ? 'bg-[#F0FDF4] text-[#16A34A]'
                              : 'bg-[#F1F5F9] text-[#64748B]'
                          }`}
                        >
                          {delayStatusText[item.status] || item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 我的提交 */}
        {data.mySubmission ? (
          <div className="rounded-2xl bg-white p-4 shadow-[0px_2px_8px_0px_#0000000D] ring-1 ring-[#F1F5F9]">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-[13px] font-semibold text-[#1E293B]">
                <CheckCircle2 className="h-4 w-4 text-[#22C55E]" />
                我的提交
              </span>
              <span className="rounded-full bg-[#F0FDF4] px-2 py-0.5 text-[10px] font-semibold text-[#16A34A]">
                已提交
              </span>
            </div>
            {data.mySubmission.content && (
              <div className="mb-3 whitespace-pre-wrap rounded-xl bg-[#F8FAFC] p-3 text-[13px] leading-6 text-[#475569]">
                {data.mySubmission.content}
              </div>
            )}
            {attachments.length > 0 && (
              <div className="mb-3 grid grid-cols-3 gap-2">
                {attachments.map((url, index) => (
                  <a
                    key={`${url}-${index}`}
                    href={resolveFileUrl(url)}
                    target="_blank"
                    rel="noreferrer"
                    className="aspect-square overflow-hidden rounded-lg bg-[#F1F5F9]"
                  >
                    <img
                      src={resolveFileUrl(url)}
                      alt={`附件${index + 1}`}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </a>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1 text-[11px] text-[#94A3B8]">
              <Clock3 className="h-3.5 w-3.5" />
              提交于 {formatDateTime(data.mySubmission.submitted_at)}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-4 shadow-[0px_2px_8px_0px_#0000000D] ring-1 ring-[#F1F5F9]">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#1E293B]">
              <Paperclip className="h-4 w-4 text-[#94A3B8]" />
              尚未提交
            </div>
            <div className="mt-1.5 text-[12px] leading-5 text-[#94A3B8]">
              {overdue ? '作业已截止，可申请延时后补交' : '请在截止时间前完成提交'}
            </div>
          </div>
        )}

        {/* 我的延时申请 */}
        {data.myDelayApplication && (
          <div className="rounded-2xl bg-white p-4 shadow-[0px_2px_8px_0px_#0000000D] ring-1 ring-[#F1F5F9]">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2 text-[13px] font-semibold text-[#1E293B]">
                <Timer className="h-4 w-4 text-[#F59E0B]" />
                我的延时申请
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  data.myDelayApplication.status === 'approved'
                    ? 'bg-[#F0FDF4] text-[#16A34A]'
                    : data.myDelayApplication.status === 'rejected'
                      ? 'bg-[#F1F5F9] text-[#64748B]'
                      : 'bg-[#FFFBEB] text-[#D97706]'
                }`}
              >
                {delayStatusText[data.myDelayApplication.status] ||
                  data.myDelayApplication.status}
              </span>
            </div>
            <div className="text-[12px] leading-5 text-[#475569]">
              申请延至 {formatDateTime(data.myDelayApplication.expected_deadline)}
            </div>
            {data.myDelayApplication.reason && (
              <div className="mt-1 text-[12px] text-[#94A3B8]">
                原因：{data.myDelayApplication.reason}
              </div>
            )}
            {data.myDelayApplication.status === 'pending' && (
              <div className="mt-2 rounded-lg bg-[#FFFBEB] px-2.5 py-2 text-[11px] text-[#B45309]">
                等待班委审批，审批通过后将按新的截止时间提交
              </div>
            )}
            {data.myDelayApplication.status === 'rejected' && (
              <div className="mt-2 rounded-lg bg-[#F8FAFC] px-2.5 py-2 text-[11px] text-[#64748B]">
                申请未通过，可在下方重新申请
              </div>
            )}
          </div>
        )}

        {/* 学生操作栏（吸底） */}
        {!isManager && (
          <div className="sticky bottom-0 z-10 -mx-5 -mb-[calc(20px+env(safe-area-inset-bottom))] mt-auto bg-white/95 px-5 pt-3 pb-[calc(8px+env(safe-area-inset-bottom))] backdrop-blur">
            {canSubmit ? (
              <button
                type="button"
                onClick={() => navigate(`/homework-submit/${data.id}`)}
                className="flex h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#0062FF] text-[15px] font-semibold text-white shadow-[0px_4px_12px_0px_#0062FF33] active:opacity-90"
              >
                <Send className="h-4 w-4" />
                {data.mySubmission ? '重新提交' : '去提交作业'}
              </button>
            ) : (
              <div className="flex h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#F1F5F9] text-[14px] font-medium text-[#94A3B8]">
                <Clock3 className="h-4 w-4" />
                作业已截止
              </div>
            )}
            {canApplyDelay && (
              <button
                type="button"
                onClick={() => navigate(`/delay-apply/${data.id}`)}
                className="mt-2 flex h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-white text-[13px] font-medium text-[#475569] ring-1 ring-[#E2E8F0]"
              >
                <Timer className="h-4 w-4" />
                {overdue ? '申请延时补交' : '需要更多时间？申请延时'}
              </button>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}