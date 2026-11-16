import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  Loader2,
  RefreshCw,
  Users,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import PageLayout from '@/components/layout/PageLayout';
import BottomSheet from '@/components/ui/BottomSheet';
import AttachmentView, {
  parseAttachments,
  type HomeworkAttachment,
} from '@/components/homeworks/AttachmentView';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';

type FilterKey = 'all' | 'submitted' | 'approved' | 'rejected' | 'unsubmitted';

interface SubmissionListItem {
  studentId: string;
  studentNo: string;
  studentName: string;
  avatar: string | null;
  submissionId: string | null;
  status: string;
  submittedAt: string | null;
  isLate: boolean;
  score: string | null;
  reviewComment: string | null;
  reviewedAt: string | null;
  contentPreview: string;
  attachmentCount: number;
  attachmentTypes: string[];
}

interface SubmissionsData {
  homework: { id: string; title: string; deadline: string };
  stats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    unsubmitted: number;
  };
  list: SubmissionListItem[];
}

interface SubmissionDetailData {
  id: string;
  homeworkId: string;
  homeworkTitle: string;
  student: { id: string; name: string; studentNo: string; avatar: string | null };
  content: string;
  attachments: HomeworkAttachment[];
  status: string;
  score: string | null;
  reviewComment: string | null;
  reviewedAt: string | null;
  submittedAt: string;
  isLate: boolean;
}

const SCORE_OPTIONS = ['优秀', '良好', '合格', '待改进'];

const STATUS_META: Record<string, { label: string; className: string }> = {
  submitted: { label: '待批改', className: 'bg-[#FFFBEB] text-[#B45309]' },
  approved: { label: '已通过', className: 'bg-[#F0FDF4] text-[#16A34A]' },
  rejected: { label: '已驳回', className: 'bg-[#FEF2F2] text-[#DC2626]' },
  unsubmitted: { label: '未交', className: 'bg-[#F1F5F9] text-[#64748B]' },
};

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${month}月${day}日 ${hours}:${minutes}`;
}

export default function HomeworkSubmissions() {
  const { id } = useParams<{ id: string }>();
  const { user } = useCurrentUser();
  const classId = user?.classId;

  const [data, setData] = useState<SubmissionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');

  const [selected, setSelected] = useState<SubmissionListItem | null>(null);
  const [detail, setDetail] = useState<SubmissionDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [score, setScore] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    if (!classId || !id) {
      setLoading(false);
      setError('缺少作业信息');
      return;
    }
    setLoading(true);
    setError('');
    api
      .get(`/classes/${classId}/homeworks/${id}/submissions`)
      .then((res) => setData(res.data?.data || res.data))
      .catch((e) => setError(e.message || '加载失败'))
      .finally(() => setLoading(false));
  }, [classId, id]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === 'all') return data.list;
    return data.list.filter((item) => item.status === filter);
  }, [data, filter]);

  const openDetail = (item: SubmissionListItem) => {
    if (!item.submissionId || !classId || !id) return;
    setSelected(item);
    setDetail(null);
    setDetailLoading(true);
    setScore(item.score || '');
    setComment(item.reviewComment || '');
    api
      .get(`/classes/${classId}/homeworks/${id}/submissions/${item.submissionId}`)
      .then((res) => {
        const result: SubmissionDetailData = res.data?.data || res.data;
        setDetail(result);
        setScore(result.score || '');
        setComment(result.reviewComment || '');
      })
      .catch((e) => toast.error(e.message || '加载提交详情失败'))
      .finally(() => setDetailLoading(false));
  };

  const closeDetail = () => {
    if (submitting) return;
    setSelected(null);
    setDetail(null);
    setScore('');
    setComment('');
  };

  const submitReview = async (action: 'approve' | 'reject') => {
    if (!classId || !id || !selected?.submissionId || submitting) return;
    const trimmed = comment.trim();
    if (action === 'approve' && !score) {
      toast.warning('请先选择批改等级');
      return;
    }
    if (action === 'reject' && !trimmed) {
      toast.warning('驳回时请填写原因');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(
        `/classes/${classId}/homeworks/${id}/submissions/${selected.submissionId}/review`,
        {
          action,
          score: score || undefined,
          comment: trimmed || undefined,
        },
      );
      toast.success(action === 'approve' ? '已通过并记录批改结果' : '已驳回并通知学生');
      setSelected(null);
      setDetail(null);
      setScore('');
      setComment('');
      load();
    } catch (e: any) {
      toast.error(e.message || '批改失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const stats = data?.stats;
  const filterOptions: { key: FilterKey; label: string; count: number }[] = stats
    ? [
        { key: 'all', label: '全部', count: stats.total },
        { key: 'submitted', label: '待批改', count: stats.pending },
        { key: 'approved', label: '已通过', count: stats.approved },
        { key: 'rejected', label: '已驳回', count: stats.rejected },
        { key: 'unsubmitted', label: '未交', count: stats.unsubmitted },
      ]
    : [];

  const attachments = detail ? parseAttachments(detail.attachments) : [];

  return (
    <PageLayout title="提交与批改" variant="a">
      {loading ? (
        <div className="flex flex-col gap-3">
          <div className="h-[120px] animate-pulse rounded-2xl bg-[#F1F5F9]" />
          <div className="h-[320px] animate-pulse rounded-2xl bg-[#F1F5F9]" />
        </div>
      ) : error || !data ? (
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
      ) : (
        <div className="flex flex-col gap-3 pb-4">
          <div className="rounded-2xl bg-white p-4 shadow-[0px_2px_8px_0px_#0000000D] ring-1 ring-[#F1F5F9]">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#1E293B]">
              <ClipboardList className="h-4 w-4 text-[#0062FF]" />
              {data.homework.title}
            </div>
            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-[#94A3B8]">
              <Clock3 className="h-3.5 w-3.5" />
              截止 {formatDateTime(data.homework.deadline)}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {[
                { label: '已交', value: stats ? stats.total - stats.unsubmitted : 0, className: 'text-[#0062FF]' },
                { label: '待批改', value: stats?.pending || 0, className: 'text-[#B45309]' },
                { label: '已通过', value: stats?.approved || 0, className: 'text-[#16A34A]' },
                { label: '已驳回', value: stats?.rejected || 0, className: 'text-[#DC2626]' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-[#F8FAFC] py-2 text-center">
                  <div className={`text-[17px] font-semibold tabular-nums ${item.className}`}>
                    {item.value}
                  </div>
                  <div className="mt-0.5 text-[10px] text-[#94A3B8]">{item.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-[#94A3B8]">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                班级共 {stats?.total || 0} 人
              </span>
              <span>未交 {stats?.unsubmitted || 0} 人</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => {
              const active = filter === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setFilter(option.key)}
                  className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                    active ? 'bg-[#0062FF] text-white' : 'bg-white text-[#64748B] ring-1 ring-[#E2E8F0]'
                  }`}
                >
                  {option.label}
                  <span className={`ml-1 tabular-nums ${active ? 'text-white/80' : 'text-[#94A3B8]'}`}>
                    {option.count}
                  </span>
                </button>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center text-[12px] text-[#94A3B8] ring-1 ring-[#F1F5F9]">
              当前筛选下暂无学生
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((item) => {
                const meta = STATUS_META[item.status] || STATUS_META.unsubmitted;
                const clickable = Boolean(item.submissionId);
                return (
                  <button
                    key={item.studentId}
                    type="button"
                    onClick={() => openDetail(item)}
                    disabled={!clickable}
                    className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-[0px_2px_8px_0px_#0000000D] ring-1 ring-[#F1F5F9] disabled:opacity-70"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EFF6FF] text-[13px] font-semibold text-[#0062FF]">
                      {item.avatar ? (
                        <img src={item.avatar} alt={item.studentName} className="h-full w-full object-cover" />
                      ) : (
                        item.studentName.slice(0, 1)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-medium text-[#1E293B]">
                          {item.studentName}
                        </span>
                        {item.studentNo && (
                          <span className="shrink-0 text-[10px] text-[#94A3B8]">{item.studentNo}</span>
                        )}
                        {item.isLate && (
                          <span className="shrink-0 rounded bg-[#FEF2F2] px-1 py-0.5 text-[9px] font-semibold text-[#DC2626]">
                            迟交
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[#94A3B8]">
                        {item.submittedAt ? (
                          <span>提交于 {formatDateTime(item.submittedAt)}</span>
                        ) : (
                          <span>尚未提交</span>
                        )}
                        {item.attachmentCount > 0 && <span>· 附件 {item.attachmentCount} 个</span>}
                        {item.score && <span>· {item.score}</span>}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.className}`}
                    >
                      {meta.label}
                    </span>
                    {clickable && <ChevronRight className="h-4 w-4 shrink-0 text-[#CBD5E1]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <BottomSheet
        open={Boolean(selected)}
        onClose={closeDetail}
        title={selected ? `${selected.studentName} 的提交` : '提交详情'}
        subtitle={
          selected?.submittedAt
            ? `提交于 ${formatDateTime(selected.submittedAt)}${selected.isLate ? ' · 迟交' : ''}`
            : undefined
        }
        locked={submitting}
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => submitReview('reject')}
              disabled={submitting || detailLoading}
              className="flex h-[46px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-white text-[14px] font-semibold text-[#DC2626] ring-1 ring-[#FECACA] disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              驳回
            </button>
            <button
              type="button"
              onClick={() => submitReview('approve')}
              disabled={submitting || detailLoading}
              className="flex h-[46px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#0062FF] text-[14px] font-semibold text-white disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              通过
            </button>
          </div>
        }
      >
        <div className="px-5 pb-4">
          {detailLoading ? (
            <div className="flex flex-col gap-2">
              <div className="h-[60px] animate-pulse rounded-xl bg-[#F1F5F9]" />
              <div className="h-[140px] animate-pulse rounded-xl bg-[#F1F5F9]" />
            </div>
          ) : !detail ? (
            <div className="py-8 text-center text-[12px] text-[#94A3B8]">提交详情加载失败</div>
          ) : (
            <div className="flex flex-col gap-3">
              {detail.status !== 'submitted' && (
                <div
                  className={`flex items-start gap-2 rounded-xl p-3 text-[12px] leading-5 ${
                    detail.status === 'rejected'
                      ? 'bg-[#FEF2F2] text-[#B91C1C]'
                      : 'bg-[#F0FDF4] text-[#15803D]'
                  }`}
                >
                  {detail.status === 'rejected' ? (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <span>
                    上次批改：{detail.status === 'rejected' ? '已驳回' : '已通过'}
                    {detail.score ? ` · ${detail.score}` : ''}
                    {detail.reviewComment ? `，${detail.reviewComment}` : ''}
                  </span>
                </div>
              )}

              <div>
                <div className="mb-1.5 text-[12px] font-semibold text-[#1E293B]">提交内容</div>
                {detail.content ? (
                  <div className="whitespace-pre-wrap rounded-xl bg-[#F8FAFC] p-3 text-[12px] leading-5 text-[#475569]">
                    {detail.content}
                  </div>
                ) : (
                  <div className="rounded-xl bg-[#F8FAFC] p-3 text-[12px] text-[#94A3B8]">
                    仅上传了附件
                  </div>
                )}
              </div>

              {attachments.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[12px] font-semibold text-[#1E293B]">
                    附件（{attachments.length}）
                  </div>
                  <AttachmentView attachments={attachments} />
                </div>
              )}

              <div>
                <div className="mb-1.5 text-[12px] font-semibold text-[#1E293B]">批改等级</div>
                <div className="flex flex-wrap gap-2">
                  {SCORE_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setScore(option)}
                      className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${
                        score === option
                          ? 'bg-[#0062FF] text-white'
                          : 'bg-[#F8FAFC] text-[#64748B] ring-1 ring-[#E2E8F0]'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-[#1E293B]">
                    评语
                    <span className="ml-1 text-[10px] font-normal text-[#94A3B8]">
                      驳回时必填，将作为驳回原因
                    </span>
                  </span>
                  <span className="text-[10px] text-[#CBD5E1]">{comment.length}/200</span>
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, 200))}
                  placeholder="给学生的反馈，或说明驳回原因..."
                  className="h-[96px] w-full resize-none rounded-xl bg-[#F8FAFC] p-3 text-[12px] leading-5 text-[#334155] outline-none ring-1 ring-[#E2E8F0] placeholder:text-[#CBD5E1] focus:ring-[#0062FF]"
                />
              </div>
            </div>
          )}
        </div>
      </BottomSheet>
    </PageLayout>
  );
}