import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageLayout from '@/components/layout/PageLayout';
import BottomSheet from '@/components/ui/BottomSheet';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { BarChart3, Clock, Users, Trophy, Check, CheckCircle2 } from 'lucide-react';

interface VoteOption {
  id: string;
  label: string;
  sortOrder: number;
  voteCount?: number;
  percentage?: number;
}

interface VoteDetail {
  id: string;
  title: string;
  voteType: 'single' | 'multiple';
  deadline: string;
  status: 'published' | 'closed';
  isOpen: boolean;
  hasVoted: boolean;
  myOptionIds?: string[];
  participantCount: number;
  options: VoteOption[];
}

interface ResultOption {
  id: string;
  label: string;
  count: number;
  rate: number;
}

interface ResultSummary {
  totalParticipants: number;
  participationRate: number;
}

const ACCENT = '#3D6BE5';

function formatRemaining(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now();
  if (isNaN(diff)) return '时间待定';
  if (diff <= 0) return '已截止';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `剩余 ${days} 天 ${hours} 小时`;
  if (hours > 0) return `剩余 ${hours} 小时 ${minutes} 分`;
  return `剩余 ${Math.max(1, minutes)} 分钟`;
}

export default function VoteOptions() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useCurrentUser();
  const state = location.state as { voteId?: string; readOnly?: boolean } | null;
  const voteId = state?.voteId;
  const readOnly = state?.readOnly || false;

  const [vote, setVote] = useState<VoteDetail | null>(null);
  const [results, setResults] = useState<ResultOption[]>([]);
  const [summary, setSummary] = useState<ResultSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  const classId = user?.classId;

  const loadVote = useCallback(async () => {
    if (!classId || !voteId) return;
    try {
      const [voteRes, resultRes] = await Promise.all([
        api.get(`/classes/${classId}/votes/${voteId}`),
        api.get(`/classes/${classId}/votes/${voteId}/results`),
      ]);
      const detail: VoteDetail = voteRes.data?.data || voteRes.data;
      setVote(detail);
      if (detail?.myOptionIds?.length) {
        setSelected(new Set(detail.myOptionIds));
      }

      const resultData = resultRes.data?.data || resultRes.data;
      if (resultData?.options) {
        setResults(resultData.options);
        setSummary({
          totalParticipants: Number(resultData.totalParticipants) || 0,
          participationRate: Number(resultData.participationRate) || 0,
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '获取投票信息失败');
    } finally {
      setLoading(false);
    }
  }, [classId, voteId]);

  useEffect(() => {
    void loadVote();
  }, [loadVote]);

  // 每 30 秒刷新剩余时间文案
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  const handleSelect = (optionId: string) => {
    if (!vote || vote.hasVoted || !vote.isOpen || readOnly) return;

    if (vote.voteType === 'single') {
      setSelected(new Set([optionId]));
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(optionId)) {
          next.delete(optionId);
        } else {
          next.add(optionId);
        }
        return next;
      });
    }
  };

  const handleSubmit = async () => {
    if (!vote || !classId || submitting) return;
    if (selected.size === 0) {
      toast.error('请至少选择一个选项');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/classes/${classId}/votes/${voteId}/submit`, {
        optionIds: Array.from(selected),
      });
      setConfirmOpen(false);
      toast.success('投票成功，可在此查看实时结果');
      // 留在当前页并刷新为结果视图，避免投完就看不到统计
      await loadVote();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '投票失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="投票详情" variant="b">
        <div className="flex flex-col gap-3">
          <div className="h-[150px] animate-pulse rounded-2xl bg-[#F1F5F9]" />
          <div className="h-[210px] animate-pulse rounded-2xl bg-[#F1F5F9]" />
        </div>
      </PageLayout>
    );
  }

  if (!vote) {
    return (
      <PageLayout title="投票详情" variant="b">
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <div className="font-body text-[14px] text-[#4B5563]">未找到投票信息</div>
          <button
            type="button"
            onClick={() => navigate('/vote-list', { replace: true })}
            className="h-[40px] rounded-lg px-4 font-body text-[14px] font-semibold text-white"
            style={{ backgroundColor: ACCENT }}
          >
            返回列表
          </button>
        </div>
      </PageLayout>
    );
  }

  const isEnded = vote.status === 'closed' || new Date(vote.deadline).getTime() <= Date.now();
  const showResults = readOnly || vote.hasVoted || isEnded;
  const selectable = !vote.hasVoted && vote.isOpen && !readOnly;
  const canSubmit = selected.size > 0 && selectable && !submitting;
  const myOptionIds = new Set(vote.myOptionIds || []);
  const isMultiple = vote.voteType === 'multiple';
  const participation = summary?.participationRate ?? 0;
  const totalParticipants = summary?.totalParticipants ?? vote.participantCount;

  const leaderId = results.reduce<ResultOption | null>((best, item) => {
    if (!best || item.count > best.count) return item.count > 0 ? item : best;
    return best;
  }, null)?.id;

  const selectedLabels = vote.options
    .filter((option) => selected.has(option.id))
    .map((option) => option.label);

  return (
    <PageLayout
      title={showResults ? '投票结果' : '参与投票'}
      variant="b"
      decor={<BarChart3 className="h-[112px] w-[112px] text-white" strokeWidth={1.5} />}
    >
      <div className="flex min-h-full w-full flex-col gap-4">
        {/* 标题卡：状态、类型、倒计时、参与率一次看清 */}
        <div className="rounded-2xl border border-[#E4EBFA] bg-gradient-to-br from-[#F3F7FF] to-[#FAF8FF] p-4">
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-[#EDF1FD] px-2 py-[3px] font-body text-[10px] font-semibold text-[#3D6BE5]">
              {isMultiple ? '多选' : '单选'}
            </span>
            <span
              className={`rounded-full px-2 py-[3px] font-body text-[10px] font-semibold ${
                isEnded
                  ? 'bg-[#F1F5F9] text-[#64748B]'
                  : vote.hasVoted
                    ? 'bg-[#E8F6F1] text-[#2F9E86]'
                    : 'bg-[#EDF1FD] text-[#3D6BE5]'
              }`}
            >
              {isEnded ? '已结束' : vote.hasVoted ? '已投票' : '进行中'}
            </span>
          </div>

          <h2 className="mt-2 break-words font-heading text-[19px] font-bold leading-[1.35] text-[#1A1A1A]">
            {vote.title}
          </h2>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-[11px] text-[#64748B]">
            <span className="flex items-center gap-1">
              <Clock className="h-[13px] w-[13px] text-[#94A3B8]" strokeWidth={1.8} />
              {formatRemaining(vote.deadline)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-[13px] w-[13px] text-[#94A3B8]" strokeWidth={1.8} />
              <span className="font-data">{totalParticipants}</span> 人参与
            </span>
            <span>
              参与率 <span className="font-data">{participation}%</span>
            </span>
          </div>

          <div className="mt-2.5 h-[5px] w-full overflow-hidden rounded-full bg-[#E3EAF7]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(participation, 100)}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-[#3D6BE5] to-[#7A6BE0]"
            />
          </div>
        </div>

        {/* 选项 / 结果 */}
        <div className="rounded-2xl border border-[#EEF2F8] bg-white p-4 shadow-[0_6px_18px_-12px_rgba(15,23,42,0.25)]">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-body text-[12px] font-semibold text-[#64748B]">
              {showResults
                ? '投票结果'
                : isMultiple
                  ? '请选择多项（可多选）'
                  : '请选择一项'}
            </span>
            <span className="font-body text-[11px] text-[#94A3B8]">
              {showResults
                ? `${totalParticipants} 人已投票`
                : isMultiple
                  ? `已选 ${selected.size} 项`
                  : selected.size > 0
                    ? '已选 1 项'
                    : '未选择'}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {vote.options.map((option) => {
              const isSelected = selected.has(option.id);
              const result = results.find((item) => item.id === option.id);
              const rate = result?.rate ?? 0;
              const isMine = myOptionIds.has(option.id);

              return (
                <motion.button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(option.id)}
                  disabled={!selectable}
                  whileTap={selectable ? { scale: 0.985 } : undefined}
                  className={`relative w-full rounded-xl border p-3 text-left transition-colors duration-150 ${
                    isSelected
                      ? 'border-[#3D6BE5] bg-[#F1F5FF]'
                      : 'border-[#E7ECF5] bg-white'
                  } ${selectable ? 'active:bg-[#F6F9FF]' : 'cursor-default'}`}
                >
                  <div className="flex items-center gap-2.5">
                    {!showResults && (
                      <span
                        className={`flex h-[20px] w-[20px] shrink-0 items-center justify-center border ${
                          isMultiple ? 'rounded-md' : 'rounded-full'
                        } ${
                          isSelected
                            ? 'border-[#3D6BE5] bg-[#3D6BE5]'
                            : 'border-[#D6DEEB] bg-white'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                      </span>
                    )}

                    <span className="min-w-0 flex-1 break-words font-body text-[14px] font-medium leading-snug text-[#1E293B]">
                      {option.label}
                    </span>

                    {isMine && showResults && (
                      <span className="shrink-0 rounded-full bg-[#E8F6F1] px-2 py-[2px] font-body text-[10px] font-semibold text-[#2F9E86]">
                        你的选择
                      </span>
                    )}
                    {showResults && result && leaderId === option.id && result.count > 0 && (
                      <Trophy className="h-3.5 w-3.5 shrink-0 text-[#F59E0B]" strokeWidth={2} />
                    )}
                    {showResults && (
                      <span className="shrink-0 font-data text-[12px] text-[#64748B]">
                        {result?.count ?? 0}票
                      </span>
                    )}
                  </div>

                  {showResults && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-[#EEF2F8]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(rate, 100)}%` }}
                          transition={{ duration: 0.55, ease: 'easeOut' }}
                          className={`h-full rounded-full ${
                            isMine
                              ? 'bg-[#2F9E86]'
                              : 'bg-gradient-to-r from-[#3D6BE5] to-[#7A6BE0]'
                          }`}
                        />
                      </div>
                      <span className="w-[38px] shrink-0 text-right font-data text-[11px] text-[#94A3B8]">
                        {rate}%
                      </span>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* 底部操作 */}
        {showResults ? (
          <>
            {vote.hasVoted && (
              <div className="flex items-center justify-center gap-1.5 rounded-xl bg-[#E8F6F1] py-2.5 font-body text-[12px] text-[#2F9E86]">
                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
                你已参与该投票，结果实时更新
              </div>
            )}
            {!vote.hasVoted && isEnded && (
              <div className="rounded-xl bg-[#F8FAFC] py-2.5 text-center font-body text-[12px] text-[#94A3B8]">
                投票已截止，以上为最终结果
              </div>
            )}
            <button
              type="button"
              onClick={() => navigate('/vote-list', { replace: true })}
              className="w-full rounded-xl bg-[#F1F5F9] py-3 font-body text-[14px] font-semibold text-[#4B5563] active:opacity-80"
            >
              返回列表
            </button>
          </>
        ) : (
          <>
            <div className="text-center font-body text-[11px] leading-relaxed text-[#94A3B8]">
              每个账号仅可投票一次，提交后不可修改
            </div>
            <button
              type="button"
              onClick={() => {
                if (selected.size === 0) {
                  toast.error('请至少选择一个选项');
                  return;
                }
                setConfirmOpen(true);
              }}
              disabled={!canSubmit}
              className={`w-full rounded-xl py-3 font-body text-[15px] font-semibold transition-opacity ${
                canSubmit
                  ? 'text-white shadow-[0_6px_16px_-8px_rgba(61,107,229,0.8)] active:opacity-80'
                  : 'cursor-not-allowed bg-[#E5E7EB] text-[#94A3B8]'
              }`}
              style={canSubmit ? { backgroundColor: ACCENT } : undefined}
            >
              提交投票{selected.size > 0 ? `（已选 ${selected.size} 项）` : ''}
            </button>
          </>
        )}
      </div>

      {/* 提交前二次确认，避免误点后无法修改 */}
      <BottomSheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="确认提交投票？"
        subtitle="提交后不可修改，请确认你的选择："
        maxHeight="72vh"
        locked={submitting}
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              disabled={submitting}
              className="h-[46px] flex-1 rounded-[14px] bg-[#F1F5F9] font-body text-[13px] font-semibold text-[#4B5563] active:opacity-80 disabled:opacity-60"
            >
              再想想
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting}
              className="h-[46px] flex-1 rounded-[14px] font-body text-[13px] font-semibold text-white active:opacity-80 disabled:opacity-70"
              style={{ backgroundColor: ACCENT }}
            >
              {submitting ? '提交中...' : '确认提交'}
            </button>
          </div>
        }
      >
        <div className="px-5 pb-2">
          <div className="max-h-[132px] overflow-y-auto rounded-[14px] bg-[#F7F9FD] p-3 font-body text-[13px] leading-relaxed text-[#1E293B]">
            {selectedLabels.join('、')}
          </div>
        </div>
      </BottomSheet>
    </PageLayout>
  );
}
