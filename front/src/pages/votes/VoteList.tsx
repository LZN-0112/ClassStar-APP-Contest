import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import {
  Plus,
  BarChart3,
  Clock,
  Users,
  ChevronRight,
  Vote as VoteIcon,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';
import { toast } from 'sonner';

type FilterKey = 'all' | 'pending' | 'open' | 'ended';

interface Vote {
  id: string;
  title: string;
  voteType: 'single' | 'multiple';
  deadline: string;
  status: 'published' | 'closed';
  participantCount: number;
  participationRate: number;
  options: { id: string; label: string; sortOrder: number }[];
  hasVoted?: boolean;
}

const ACCENT = '#3D6BE5';
const PAGE_SIZE = 20;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待我投' },
  { key: 'open', label: '进行中' },
  { key: 'ended', label: '已结束' },
];

function isEnded(vote: Vote) {
  return vote.status === 'closed' || new Date(vote.deadline).getTime() <= Date.now();
}

function formatDeadline(deadline: string) {
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return '时间待定';
  const diff = d.getTime() - Date.now();
  if (diff <= 0) return '已截止';
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}天后截止`;
  const hours = Math.floor(diff / 3600000);
  if (hours > 0) return `${hours}小时后截止`;
  const minutes = Math.max(1, Math.floor(diff / 60000));
  return `${minutes}分钟后截止`;
}

export default function VoteList() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const classId = user?.classId;

  const [votes, setVotes] = useState<Vote[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');

  // 仅班委可发布投票，普通同学不展示入口，避免点进去才报错
  const canPublish =
    user?.roleLevel === 'owner' || user?.roleLevel === 'admin' || user?.isCommittee === true;

  const loadVotes = useCallback(
    async (nextPage: number, append = false) => {
      if (!classId) {
        setLoading(false);
        return;
      }
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setFailed(false);
      }
      try {
        const res = await api.get(`/classes/${classId}/votes`, {
          params: { page: nextPage, pageSize: PAGE_SIZE },
        });
        const data = res.data?.data || res.data;
        const list: Vote[] = data?.list || [];
        setVotes((prev) => (append ? [...prev, ...list] : list));
        setTotal(Number(data?.total) || list.length);
        setPage(nextPage);
      } catch (err) {
        if (append) {
          toast.error('加载更多失败，请稍后重试');
        } else {
          setFailed(true);
          toast.error(err instanceof Error ? err.message : '获取投票列表失败');
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [classId]
  );

  useEffect(() => {
    setVotes([]);
    void loadVotes(1);
  }, [loadVotes]);

  const counts = useMemo(() => {
    const ended = votes.filter(isEnded).length;
    return {
      all: votes.length,
      pending: votes.filter((v) => !isEnded(v) && !v.hasVoted).length,
      open: votes.filter((v) => !isEnded(v)).length,
      ended,
    } as Record<FilterKey, number>;
  }, [votes]);

  const filtered = useMemo(() => {
    if (filter === 'pending') return votes.filter((v) => !isEnded(v) && !v.hasVoted);
    if (filter === 'open') return votes.filter((v) => !isEnded(v));
    if (filter === 'ended') return votes.filter(isEnded);
    return votes;
  }, [votes, filter]);

  const openVote = (vote: Vote) => {
    const ended = isEnded(vote);
    navigate('/vote-options', {
      state: { voteId: vote.id, readOnly: ended || vote.hasVoted },
    });
  };

  const emptyCopy =
    filter === 'pending'
      ? { title: '没有待参与的投票', desc: '新的投票发起后会出现在这里' }
      : filter === 'open'
        ? { title: '暂无进行中的投票', desc: '投票截止后会归类到「已结束」' }
        : filter === 'ended'
          ? { title: '暂无已结束的投票', desc: '投票截止后会自动归档到这里' }
          : { title: '还没有人发起投票', desc: '班委发起投票后，全班同学都会收到' };

  return (
    <PageLayout
      title="投票列表"
      variant="b"
      showBack={true}
      onBack={() => navigate('/home', { replace: true })}
      decor={<BarChart3 className="h-[112px] w-[112px] text-white" strokeWidth={1.5} />}
      right={
        canPublish ? (
          <button
            type="button"
            onClick={() => navigate('/publish-vote')}
            className="flex h-[32px] items-center justify-center gap-1 rounded-lg border border-[#FFFFFF33] bg-[#FFFFFF33] px-3 transition-opacity active:opacity-70"
          >
            <Plus className="h-4 w-4 text-white" strokeWidth={2} />
            <span className="whitespace-nowrap font-body text-[13px] font-medium text-white">
              发布投票
            </span>
          </button>
        ) : null
      }
    >
      <div className="flex min-h-full w-full flex-col gap-4">
        {/* 状态筛选：一眼看清有多少投票等你参与 */}
        <div className="flex w-full items-center gap-1 rounded-xl bg-[#F1F5F9] p-1">
          {FILTERS.map((item) => {
            const active = filter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-2 transition-colors ${
                  active ? 'bg-white shadow-[0_1px_4px_rgba(15,23,42,0.08)]' : ''
                }`}
              >
                <span
                  className={`font-body text-[11px] ${
                    active ? 'font-semibold text-[#1E293B]' : 'text-[#64748B]'
                  }`}
                >
                  {item.label}
                </span>
                <span
                  className={`font-data text-[10px] ${active ? 'text-[#3D6BE5]' : 'text-[#94A3B8]'}`}
                >
                  {counts[item.key]}
                </span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[142px] animate-pulse rounded-2xl border border-[#EDF1F7] bg-white"
              />
            ))}
          </div>
        ) : failed ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#EEF2F8] bg-white px-6 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F1F5F9]">
              <RefreshCw className="h-6 w-6 text-[#94A3B8]" strokeWidth={1.8} />
            </div>
            <div className="font-body text-[14px] font-semibold text-[#1E293B]">列表加载失败</div>
            <div className="font-body text-[12px] text-[#94A3B8]">请检查网络后重试</div>
            <button
              type="button"
              onClick={() => void loadVotes(1)}
              className="mt-1 rounded-lg px-4 py-2 font-body text-[13px] font-semibold text-white"
              style={{ backgroundColor: ACCENT }}
            >
              重新加载
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#EEF2F8] bg-white px-6 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EDF1FD]">
              <VoteIcon className="h-6 w-6" style={{ color: ACCENT }} strokeWidth={1.8} />
            </div>
            <div className="font-body text-[14px] font-semibold text-[#1E293B]">
              {emptyCopy.title}
            </div>
            <div className="font-body text-[12px] leading-relaxed text-[#94A3B8]">
              {emptyCopy.desc}
            </div>
            {canPublish && filter === 'all' && (
              <button
                type="button"
                onClick={() => navigate('/publish-vote')}
                className="mt-1 flex items-center gap-1 rounded-lg px-4 py-2 font-body text-[13px] font-semibold text-white"
                style={{ backgroundColor: ACCENT }}
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
                发起第一个投票
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((vote) => {
              const ended = isEnded(vote);
              const hasVoted = vote.hasVoted === true;
              const pending = !ended && !hasVoted;
              const percent = Math.min(Math.max(vote.participationRate || 0, 0), 100);

              const statusChip = ended
                ? { text: '已结束', color: '#64748B', bg: '#F1F5F9', dot: '#CBD5E1' }
                : hasVoted
                  ? { text: '已投票', color: '#2F9E86', bg: '#E8F6F1', dot: '#2F9E86' }
                  : { text: '待投票', color: ACCENT, bg: '#EDF1FD', dot: ACCENT };

              const cta = ended ? '查看结果' : hasVoted ? '已投票' : '去投票';

              return (
                <button
                  key={vote.id}
                  type="button"
                  onClick={() => openVote(vote)}
                  className="relative w-full overflow-hidden rounded-2xl border border-[#EDF1F7] bg-white p-4 text-left shadow-[0_6px_18px_-10px_rgba(15,23,42,0.25)] transition-transform active:scale-[0.99]"
                >
                  {pending && (
                    <span className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-[#3D6BE5] to-[#7A6BE0]" />
                  )}

                  <div className="flex items-center gap-1.5">
                    <span
                      className="flex items-center gap-1 rounded-full px-2 py-[3px] font-body text-[10px] font-semibold"
                      style={{ color: statusChip.color, backgroundColor: statusChip.bg }}
                    >
                      <span
                        className="h-1 w-1 rounded-full"
                        style={{ backgroundColor: statusChip.dot }}
                      />
                      {statusChip.text}
                    </span>
                    <span className="rounded-full bg-[#F8FAFC] px-2 py-[3px] font-body text-[10px] font-medium text-[#64748B]">
                      {vote.voteType === 'single' ? '单选' : '多选'}
                    </span>
                    <span className="ml-auto flex items-center gap-1 font-body text-[11px] text-[#94A3B8]">
                      <Clock className="h-3 w-3" strokeWidth={1.8} />
                      {formatDeadline(vote.deadline)}
                    </span>
                  </div>

                  <h3 className="mt-2 line-clamp-2 font-body text-[15px] font-semibold leading-[1.35] text-[#1E293B]">
                    {vote.title}
                  </h3>

                  <div className="mt-3 flex items-end justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 font-body text-[11px] text-[#64748B]">
                        <Users className="h-[13px] w-[13px] text-[#94A3B8]" strokeWidth={1.8} />
                        <span className="font-data">{vote.participantCount || 0}</span>
                        <span>人参与</span>
                        <span className="mx-1 text-[#CBD5E1]">·</span>
                        <span>
                          参与率 <span className="font-data">{percent}%</span>
                        </span>
                      </div>
                    </div>
                    <span
                      className="flex items-center gap-1 rounded-full px-3 py-[6px] font-body text-[12px] font-semibold"
                      style={
                        pending
                          ? { color: ACCENT, backgroundColor: '#EDF1FD' }
                          : hasVoted
                            ? { color: '#2F9E86', backgroundColor: '#E8F6F1' }
                            : { color: '#64748B', backgroundColor: '#F1F5F9' }
                      }
                    >
                      {hasVoted && !ended ? (
                        <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
                      ) : null}
                      {cta}
                      <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
                    </span>
                  </div>

                  <div className="mt-2.5 h-[5px] w-full overflow-hidden rounded-full bg-[#EEF2F8]">
                    <div
                      className={`h-full rounded-full transition-[width] duration-700 ease-out ${
                        ended ? 'bg-[#CBD5E1]' : 'bg-gradient-to-r from-[#3D6BE5] to-[#7A6BE0]'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </button>
              );
            })}

            {votes.length < total && (
              <button
                type="button"
                onClick={() => void loadVotes(page + 1, true)}
                disabled={loadingMore}
                className="w-full rounded-xl border border-[#E7ECF5] bg-white py-2.5 font-body text-[12px] text-[#64748B] active:bg-[#F8FAFC] disabled:opacity-60"
              >
                {loadingMore ? '加载中...' : `加载更多（${votes.length}/${total}）`}
              </button>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
