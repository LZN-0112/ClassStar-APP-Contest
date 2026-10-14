import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';

type FilterStatus = '全部' | '待提交' | '已提交' | '已批改';

interface HomeworkItem {
  id: string;
  title: string;
  subject: string;
  deadline: string;
  status: string;
  submitted: boolean;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  待提交: { bg: 'bg-[#EF44441A]', text: 'text-[#EF4444]' },
  已提交: { bg: 'bg-[#22C55E1A]', text: 'text-[#22C55E]' },
  已批改: { bg: 'bg-[#0062FF1A]', text: 'text-[#0062FF]' },
  已逾期: { bg: 'bg-[#EF44441A]', text: 'text-[#EF4444]' },
};

function getHomeworkStatus(item: any): string {
  if (item.submitted) return '已提交';
  const now = new Date();
  const deadline = new Date(item.deadline);
  if (now > deadline) return '已逾期';
  return '待提交';
}

function formatDeadline(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${month}月${day}日 ${hours}:${minutes}`;
}

export default function MyHomework() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [filter, setFilter] = useState<FilterStatus>('全部');
  const [homeworks, setHomeworks] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.classId) {
      setLoading(false);
      return;
    }

    api
      .get(`/classes/${user.classId}/homeworks`, { params: { pageSize: 100 } })
      .then((res) => {
        const data = res.data.data || res.data;
        const list = data.list || [];
        const mapped: HomeworkItem[] = list.map((item: any) => ({
          id: item.id,
          title: item.title,
          subject: item.subject || '未分类',
          deadline: formatDeadline(item.deadline),
          status: getHomeworkStatus(item),
          submitted: item.submitted,
        }));
        setHomeworks(mapped);
      })
      .catch(() => {
        setHomeworks([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user?.classId]);

  const tabs: FilterStatus[] = ['全部', '待提交', '已提交', '已批改'];

  const filtered =
    filter === '全部'
      ? homeworks
      : homeworks.filter((h) => {
          if (filter === '待提交') return h.status === '待提交' || h.status === '已逾期';
          return h.status === filter;
        });

  return (
    <PageLayout title="我的作业" variant="a">
      <div
        data-pencil-name="Filter Tabs"
        className="box-border w-full h-fit shrink-0 flex flex-row gap-2 justify-start items-start bg-[#00000000]"
      >
        {tabs.map((tab) => {
          const active = filter === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`box-border w-fit shrink-0 h-[32px] flex flex-col gap-0 p-[8px_16px] justify-center items-center rounded-full ${
                active ? 'bg-[#0062FF]' : 'bg-[#F3F4F6]'
              }`}
            >
              <div
                className={`text-[11px]/[normal] box-border font-body font-semibold text-left [white-space:nowrap] ${
                  active ? 'text-[#FFFFFF]' : 'text-[#4B5563]'
                }`}
              >
                {tab}
              </div>
            </button>
          );
        })}
      </div>

      <div
        data-pencil-name="Group 作业列表"
        className="box-border w-full h-fit shrink-0 flex flex-col gap-[10px] justify-start items-start bg-[#00000000] mt-4"
      >
        <div
          data-pencil-name="Text"
          className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-semibold text-left [white-space:nowrap]"
        >
          作业列表
        </div>
        <div
          data-pencil-name="Group Content"
          className="box-border w-full h-fit shrink-0 flex flex-col gap-2 justify-start items-start bg-[#00000000]"
        >
          {loading ? (
            <div className="box-border flex h-[120px] w-full flex-col items-center justify-center rounded-[16px] bg-[#F9FAFB] text-[14px] text-[#6B7280]">
              加载中...
            </div>
          ) : filtered.length === 0 ? (
            <div className="box-border flex h-[120px] w-full flex-col items-center justify-center rounded-[16px] bg-[#F9FAFB] text-[14px] text-[#6B7280]">
              暂无作业
            </div>
          ) : (
            filtered.map((item) => {
              const colors = statusColors[item.status] || statusColors['待提交'];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate('/homework-detail')}
                  data-pencil-name="Card"
                  className="box-border w-full h-[88px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-[12px] p-4 justify-start items-center bg-[#FFFFFF] rounded-[16px] text-left"
                >
                  <div
                    data-pencil-name="Icon Box"
                    className="box-border w-[48px] shrink-0 h-[48px] flex flex-col gap-0 justify-center items-center bg-[#DBEAFE] rounded-lg"
                  >
                    <svg
                      data-pencil-name="Icon-file-text"
                      viewBox="0 0 24 24"
                      preserveAspectRatio="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="box-border w-[28px] h-[28px] shrink-0 overflow-visible"
                    >
                      <path
                        d="M14 2h-8a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-12m-6-6v6h6m-4 5h-8m8 4h-8m2-8h-2"
                        fill="none"
                      ></path>
                      <path
                        d="M14 2h-8a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-12m-6-6v6h6m-4 5h-8m8 4h-8m2-8h-2"
                        fill="none"
                        stroke="#0062FF"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      ></path>
                    </svg>
                  </div>
                  <div
                    data-pencil-name="Info"
                    className="box-border [flex:1_1_0] h-full flex flex-col gap-[6px] justify-center items-start bg-[#00000000]"
                  >
                    <div
                      data-pencil-name="Text"
                      className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                    >
                      {item.title}
                    </div>
                    <div
                      data-pencil-name="Text"
                      className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                    >
                      {item.subject} · {item.deadline}截止
                    </div>
                    <div
                      data-pencil-name="Tag"
                      className={`box-border w-fit h-[22px] shrink-0 flex flex-col gap-0 p-[4px_8px] justify-center items-center rounded-full ${colors.bg}`}
                    >
                      <div
                        data-pencil-name="Text"
                        className={`text-[11px]/[normal] box-border font-body font-semibold text-left [white-space:nowrap] ${colors.text}`}
                      >
                        {item.status}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </PageLayout>
  );
}
