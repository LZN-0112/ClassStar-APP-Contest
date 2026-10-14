import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';
import { toast } from 'sonner';

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
  participantCount: number;
  options: VoteOption[];
}

interface ResultOption {
  id: string;
  label: string;
  count: number;
  rate: number;
}

export default function VoteOptions() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useCurrentUser();
  const state = (location.state as { voteId?: string; readOnly?: boolean } | null);
  const voteId = state?.voteId;
  const readOnly = state?.readOnly || false;

  const [vote, setVote] = useState<VoteDetail | null>(null);
  const [results, setResults] = useState<ResultOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const classId = user?.classId;

  useEffect(() => {
    if (!classId || !voteId) return;

    const fetchVote = api
      .get(`/classes/${classId}/votes/${voteId}`)
      .then((res) => {
        const data = res.data.data || res.data;
        setVote(data);
      });

    const fetchResults = api
      .get(`/classes/${classId}/votes/${voteId}/results`)
      .then((res) => {
        const data = res.data.data || res.data;
        if (data.options) {
          setResults(data.options);
        }
      });

    Promise.allSettled([fetchVote, fetchResults])
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  }, [classId, voteId]);

  const handleSelect = (optionId: string) => {
    if (!vote || vote.hasVoted || readOnly) return;

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
      toast.success('投票成功');
      navigate('/vote-list', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '投票失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="参与投票">
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <div className="text-[14px] text-[#4B5563] font-body">加载中...</div>
        </div>
      </PageLayout>
    );
  }

  if (!vote) {
    return (
      <PageLayout title="参与投票">
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <div className="text-[14px] text-[#4B5563] font-body">
            未找到投票信息
          </div>
          <button
            type="button"
            onClick={() => navigate('/vote-list', { replace: true })}
            className="box-border h-[40px] flex flex-row gap-0 p-[0px_16px] justify-center items-center bg-[#0062FF] rounded-lg text-[14px] text-[#FFFFFF] font-body font-semibold"
          >
            返回列表
          </button>
        </div>
      </PageLayout>
    );
  }

  const isEnded = vote.status === 'closed' || new Date(vote.deadline) <= new Date();
  const showResults = readOnly || vote.hasVoted || isEnded;
  const canSubmit = selected.size > 0 && !vote.hasVoted && vote.isOpen && !submitting && !readOnly;

  const getResultForOption = (optionId: string) => {
    return results.find((r) => r.id === optionId);
  };

  return (
    <PageLayout title={showResults ? '投票结果' : '参与投票'}>
      <div className="flex flex-col gap-4">
        <div
          data-pencil-name="Vote Title Card"
          className="box-border w-full h-fit shrink-0 flex flex-col gap-2 p-4 justify-start items-start bg-[#FFFFFF] [border:1px_solid_#E5E7EB] rounded-lg"
        >
          <div
            data-pencil-name="Label"
            className="text-[11px]/[normal] box-border text-[#4B5563] font-caption font-normal text-left [white-space:nowrap]"
          >
            投票标题
          </div>
          <div
            data-pencil-name="Title"
            className="text-[16px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left"
          >
            {vote.title}
          </div>
          <div className="text-[11px]/[normal] box-border text-[#94A3B8] font-body font-medium text-left [white-space:nowrap]">
            {vote.voteType === 'single' ? '单选' : '多选'} · {vote.participantCount}人参与
          </div>
        </div>

        <div
          data-pencil-name="Options Card"
          className="box-border w-full h-fit shrink-0 flex flex-col gap-[10px] p-4 justify-start items-start bg-[#FFFFFF] [border:1px_solid_#E5E7EB] rounded-lg"
        >
          <div
            data-pencil-name="Label"
            className="text-[11px]/[normal] box-border text-[#4B5563] font-caption font-normal text-left [white-space:nowrap]"
          >
            {showResults ? '投票结果' : vote.voteType === 'single' ? '请选择一项' : '请选择多项'}
          </div>
          {vote.options.map((option) => {
            const isSelected = selected.has(option.id);
            const result = getResultForOption(option.id);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelect(option.id)}
                disabled={vote.hasVoted || !vote.isOpen || readOnly}
                data-pencil-name={option.label}
                className={`box-border w-full h-fit shrink-0 flex flex-col gap-[8px] p-[12px] justify-start items-start rounded-lg border transition-colors duration-150 ${
                  isSelected
                    ? 'bg-[#EBF4FF] border-[#0062FF]'
                    : 'bg-[#FFFFFF] border-[#E5E7EB]'
                } ${vote.hasVoted || !vote.isOpen || readOnly ? 'cursor-default' : ''}`}
              >
                <div className="flex w-full flex-row items-center justify-between">
                  <div className="flex flex-row items-center gap-[8px]">
                    {!showResults && (
                      <div
                        className={`box-border w-[18px] shrink-0 h-[18px] flex flex-row gap-0 justify-center items-center rounded-full border ${
                          isSelected ? 'border-[#0062FF] bg-[#0062FF]' : 'border-[#E5E7EB] bg-[#FFFFFF]'
                        }`}
                      >
                        {isSelected && (
                          <div className="box-border w-[8px] h-[8px] bg-[#FFFFFF] rounded-full" />
                        )}
                      </div>
                    )}
                    <div
                      data-pencil-name="Option Label"
                      className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-normal text-left"
                    >
                      {option.label}
                    </div>
                  </div>
                  {showResults && result && (
                    <div className="text-[12px] text-[#64748B] font-body">
                      {result.count}票 ({result.rate}%)
                    </div>
                  )}
                </div>
                {showResults && result && (
                  <div className="box-border w-full h-[4px] bg-[#E2E8F0] rounded-full overflow-hidden">
                    <div
                      className="h-[4px] bg-[#0062FF] rounded-full"
                      style={{ width: `${Math.min(result.rate, 100)}%` }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {vote.hasVoted && !showResults && (
          <div className="w-full py-2 text-center text-[13px] text-[#64748B]">
            您已参与该投票
          </div>
        )}

        {!vote.isOpen && !vote.hasVoted && (
          <div className="w-full py-2 text-center text-[13px] text-[#94A3B8]">
            投票已截止
          </div>
        )}

        {!showResults && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            data-pencil-name="Submit Button"
            className={`box-border w-full h-[48px] shrink-0 flex flex-row gap-0 justify-center items-center rounded-lg text-[14px] font-body font-semibold transition-colors duration-150 ${
              canSubmit
                ? 'bg-[#0062FF] text-[#FFFFFF] active:opacity-80'
                : 'bg-[#E5E7EB] text-[#4B5563] cursor-not-allowed'
            }`}
          >
            {submitting ? '提交中...' : '提交投票'}
          </button>
        )}

        {showResults && (
          <button
            type="button"
            onClick={() => navigate('/vote-list', { replace: true })}
            className="box-border w-full h-[48px] shrink-0 flex flex-row gap-0 justify-center items-center rounded-lg bg-[#F3F4F6] text-[14px] font-body font-semibold text-[#4B5563]"
          >
            返回列表
          </button>
        )}
      </div>
    </PageLayout>
  );
}
