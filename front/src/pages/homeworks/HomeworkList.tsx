import { useState, useEffect } from 'react';
import { FileText, Plus, ClipboardCheck, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import {
  getHomeworks,
  getMySubmissions,
  filterHomeworks,
  type HomeworkItem,
  type SubmissionRecord,
} from '@/stores/homeworkStore';

type FilterTab = '全部' | '进行中' | '已完成' | '已截止';

const statusColors: Record<string, { bg: string; text: string }> = {
  待提交: { bg: 'bg-[#EF44441A]', text: 'text-[#EF4444]' },
  已提交: { bg: 'bg-[#22C55E1A]', text: 'text-[#22C55E]' },
  已改正: { bg: 'bg-[#F59E0B1A]', text: 'text-[#F59E0B]' },
  已逾期: { bg: 'bg-[#EF44441A]', text: 'text-[#EF4444]' },
};

export default function HomeworkList() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterTab>('全部');
  const [, setHomeworks] = useState<HomeworkItem[]>([]);
  const [mySubs, setMySubs] = useState<SubmissionRecord[]>([]);

  const tabs: FilterTab[] = ['全部', '进行中', '已完成', '已截止'];

  useEffect(() => {
    setHomeworks(getHomeworks());
    setMySubs(getMySubmissions());
  }, []);

  const filtered = filterHomeworks(filter, mySubs);

  const getMyStatus = (hw: HomeworkItem) => {
    const sub = mySubs.find((s) => s.homeworkId === hw.id);
    if (sub) return '已提交';
    if (hw.status === '已截止') return '已逾期';
    return '待提交';
  };

  return (
    <PageLayout
      title="作业列表"
      variant="a"
      decor={<FileText className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}
      right={
        <div className="mr-2 flex flex-row gap-2">
          <button
            type="button"
            onClick={() => navigate('/offline-check')}
            className="flex h-9 items-center gap-1 rounded-full bg-white/20 px-3 text-sm font-medium text-white backdrop-blur"
          >
            <ClipboardCheck className="h-4 w-4" />
            离线核对
          </button>
          <button
            type="button"
            onClick={() => navigate('/publish-homework')}
            className="flex h-9 items-center gap-1 rounded-full bg-white/20 px-3 text-sm font-medium text-white backdrop-blur"
          >
            <Plus className="h-4 w-4" />
            发布
          </button>
        </div>
      }
    >
      <div className="flex min-h-full flex-1 flex-col gap-5">
        <div className="flex w-full flex-row items-start justify-start gap-2">
          {tabs.map((tab) => {
            const active = filter === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`box-border flex h-[32px] shrink-0 flex-col items-center justify-center rounded-full px-4 ${
                  active ? 'bg-[#0062FF]' : 'bg-[#F1F5F9]'
                }`}
              >
                <div
                  className={`text-[11px]/[normal] box-border font-body font-semibold text-left [white-space:nowrap] ${
                    active ? 'text-white' : 'text-[#64748B]'
                  }`}
                >
                  {tab}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex w-full flex-col gap-[10px]">
          <div className="text-[11px]/[normal] box-border text-left font-body font-semibold text-[#6B7280] [white-space:nowrap]">
            作业管理
          </div>
          <div className="flex w-full flex-col gap-2">
            {filtered.map((item) => {
              const myStatus = getMyStatus(item);
              const colors = statusColors[myStatus] || statusColors['待提交'];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(`/homework-detail/${item.id}`)}
                  className="box-border flex h-[88px] w-full shrink-0 items-center justify-start gap-3 rounded-2xl bg-white p-4 text-left shadow-[0px_2px_8px_0px_#0000000D]"
                >
                  <div className="box-border flex h-[48px] w-[48px] shrink-0 flex-col items-center justify-center rounded-lg bg-[#DBEAFE]">
                    {myStatus === '已提交' ? (
                      <CheckCircle2 className="h-[24px] w-[24px] text-[#22C55E]" strokeWidth={2} />
                    ) : (
                      <FileText className="h-[24px] w-[24px] text-[#076CAB]" strokeWidth={2} />
                    )}
                  </div>
                  <div className="box-border flex h-full flex-1 flex-col justify-center gap-[6px]">
                    <div className="text-[14px]/[normal] box-border text-left font-body font-semibold text-[#1E293B] [white-space:nowrap]">
                      {item.title}
                    </div>
                    <div className="text-[11px]/[normal] box-border text-left font-body font-medium text-[#64748B] [white-space:nowrap]">
                      {item.className} · 提交 {item.submitCount}/{item.totalCount}
                    </div>
                    <div
                      className={`box-border flex h-[22px] w-fit shrink-0 flex-col items-center justify-center rounded-full px-2 ${colors.bg}`}
                    >
                      <div
                        className={`text-[11px]/[normal] box-border font-body font-semibold text-left [white-space:nowrap] ${colors.text}`}
                      >
                        {myStatus}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-[#9CA3AF]">
            <FileText className="h-12 w-12 mb-2 opacity-30" />
            <span className="text-[14px]">暂无作业</span>
          </div>
        )}
      </div>
    </PageLayout>
  );
}