import { useState, useEffect } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { useNavigate } from 'react-router-dom';
import { Plus, BarChart3 } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';
import { toast } from 'sonner';

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
  isOpen?: boolean;
}

export default function VoteList() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);

  const classId = user?.classId;

  useEffect(() => {
    if (!classId) return;

    api
      .get(`/classes/${classId}/votes`)
      .then((res) => {
        const data = res.data.data || res.data;
        setVotes(data.list || []);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : '获取投票列表失败');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [classId]);

  const formatDeadline = (deadline: string) => {
    const d = new Date(deadline);
    if (isNaN(d.getTime())) return '已截止';
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    if (diff <= 0) return '已截止';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 0) return `${days}天后截止`;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours > 0) return `${hours}小时后截止`;
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes}分钟后截止`;
  };

  return (
    <PageLayout
      title="投票列表"
      variant="b"
      showBack={true}
      onBack={() => navigate('/home', { replace: true })}
      decor={<BarChart3 className="h-[112px] w-[112px] text-white" strokeWidth={1.5} />}
      right={
        <button
          type="button"
          onClick={() => navigate('/publish-vote')}
          className="flex flex-row gap-[4px] items-center justify-center box-border h-[32px] p-[0px_12px] bg-[#FFFFFF33] [border:1px_solid_#FFFFFF33] rounded-lg active:opacity-70 transition-opacity"
        >
          <Plus className="w-[16px] h-[16px] text-[#FFFFFF]" strokeWidth={2} />
          <div className="text-[13px]/[normal] text-[#FFFFFF] font-body font-medium [white-space:nowrap]">
            发布投票
          </div>
        </button>
      }
    >
      <div className="flex min-h-full w-full flex-col gap-[20px]">
        <div
          data-pencil-name="Group 投票列表"
          className="box-border w-full h-fit shrink-0 flex flex-col gap-[10px] justify-start items-start bg-[#00000000]"
        >
          <div
            data-pencil-name="Text"
            className="text-[11px]/[normal] box-border text-[#6B7280] font-body font-semibold text-left [white-space:nowrap]"
          >
            投票列表
          </div>
          <div
            data-pencil-name="Group Content"
            className="box-border w-full h-fit shrink-0 flex flex-col gap-2 justify-start items-start bg-[#00000000]"
          >
            {loading ? (
              <div className="w-full py-8 text-center text-[14px] text-[#94A3B8]">加载中...</div>
            ) : votes.length === 0 ? (
              <div className="w-full py-8 text-center text-[14px] text-[#94A3B8]">暂无投票</div>
            ) : (
              votes.map((vote) => {
                const isEnded = vote.status === 'closed' || new Date(vote.deadline) <= new Date();
                const percent = vote.participationRate || 0;
                const hasVoted = vote.hasVoted || false;
                return (
                  <div
                    key={vote.id}
                    data-pencil-name="Vote Card"
                    className="box-border w-full h-fit shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-[10px] p-4 justify-start items-start bg-[#FFFFFF] rounded-[16px]"
                  >
                    <div
                      data-pencil-name="Row"
                      className="box-border w-full h-fit shrink-0 flex flex-row gap-0 justify-between items-center bg-[#00000000]"
                    >
                      <div
                        data-pencil-name="Text"
                        className="text-[14px]/[normal] box-border text-[#1E293B] font-body font-semibold text-left [white-space:nowrap]"
                      >
                        {vote.title}
                      </div>
                      <div
                        data-pencil-name="Text"
                        className="text-[11px]/[normal] box-border text-[#94A3B8] font-body font-medium text-left [white-space:nowrap]"
                      >
                        {formatDeadline(vote.deadline)}
                      </div>
                    </div>
                    <div
                      data-pencil-name="Text"
                      className="text-[11px]/[normal] box-border text-[#64748B] font-body font-medium text-left [white-space:nowrap]"
                    >
                      {vote.participantCount}人参与
                    </div>
                    <div
                      data-pencil-name="Progress Track"
                      className="box-border w-full h-[6px] shrink-0 flex flex-col gap-0 justify-start items-start bg-[#E2E8F0] rounded-full overflow-hidden"
                    >
                      <div
                        data-pencil-name="Progress Fill"
                        className={`box-border h-[6px] shrink-0 flex flex-col gap-0 justify-start items-start rounded-full ${
                          isEnded ? 'bg-[#94A3B8]' : 'bg-[#0062FF]'
                        }`}
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      ></div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (isEnded) {
                          navigate('/vote-options', { state: { voteId: vote.id, readOnly: true } });
                        } else if (hasVoted) {
                          navigate('/vote-options', { state: { voteId: vote.id, readOnly: true } });
                        } else {
                          navigate('/vote-options', { state: { voteId: vote.id } });
                        }
                      }}
                      data-pencil-name="Action"
                      className="box-border w-fit h-[28px] shrink-0 flex flex-col gap-0 p-[4px_12px] justify-center items-center bg-[#EBF4FF] rounded-lg"
                    >
                      <div
                        data-pencil-name="Text"
                        className="text-[11px]/[normal] box-border text-[#1986E6] font-body font-semibold text-left [white-space:nowrap]"
                      >
                        {isEnded ? '查看结果' : hasVoted ? '已投票' : '去投票'}
                      </div>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
