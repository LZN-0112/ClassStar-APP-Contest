import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';

type ActivityStatus = '全部' | '进行中' | '已结束';

interface ActivityItem {
  id: string;
  title: string;
  date: string;
  location: string;
  status: string;
  displayStatus: string;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  报名中: { bg: 'bg-[#22C55E1A]', text: 'text-[#22C55E]' },
  进行中: { bg: 'bg-[#0062FF1A]', text: 'text-[#0062FF]' },
  已结束: { bg: 'bg-[#6B72801A]', text: 'text-[#6B7280]' },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${month}月${day}日`;
}

export default function MyActivities() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [filter, setFilter] = useState<ActivityStatus>('全部');
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.classId) {
      setLoading(false);
      return;
    }

    api
      .get(`/classes/${user.classId}/activities`, { params: { pageSize: 100 } })
      .then((res) => {
        const data = res.data.data || res.data;
        const list = data.list || [];
        const mapped: ActivityItem[] = list.map((item: any) => ({
          id: item.id,
          title: item.title,
          date: formatDate(item.eventDate || item.event_date),
          location: item.location || '待定',
          status: item.displayStatus || item.status,
          displayStatus: item.displayStatus || item.status,
        }));
        setActivities(mapped);
      })
      .catch(() => {
        setActivities([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user?.classId]);

  const tabs: ActivityStatus[] = ['全部', '进行中', '已结束'];

  const filtered =
    filter === '全部'
      ? activities
      : activities.filter((a) => {
          if (filter === '进行中') return a.displayStatus === '报名中' || a.displayStatus === '进行中';
          return a.displayStatus === '已结束';
        });

  return (
    <PageLayout title="我的活动" variant="b">
      <div className="flex flex-col gap-[20px]">
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
          data-pencil-name="Group 活动记录"
          className="box-border w-full h-fit shrink-0 flex flex-col gap-[10px] justify-start items-start bg-[#00000000]"
        >
          <div
          data-pencil-name="Text"
          className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-semibold text-left [white-space:nowrap]"
        >
          活动记录
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
                暂无活动
              </div>
            ) : (
              filtered.map((item) => {
                const colors = statusColors[item.displayStatus] || statusColors['已结束'];
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate('/activity-detail')}
                    data-pencil-name="Card"
                    className="box-border w-full h-[96px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-[12px] p-4 justify-start items-center bg-[#FFFFFF] rounded-[16px] text-left"
                  >
                    <div
                      data-pencil-name="Thumb"
                      className="box-border w-[64px] shrink-0 h-[64px] flex flex-col gap-0 justify-center items-center bg-[#DBEAFE] rounded-lg"
                    >
                      <svg
                        data-pencil-name="Icon-calendar"
                        viewBox="0 0 24 24"
                        preserveAspectRatio="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="box-border w-[32px] h-[32px] shrink-0 overflow-visible"
                      >
                        <path
                          d="M8 2v4m8-4v4m-13 4h18m-14 4h0.01m3.99 0h0.01m3.99 0h0.01m-8.01 4h0.01m3.99 0h0.01m3.99 0h0.01m-10.01-12h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2"
                          fill="none"
                        ></path>
                        <path
                          d="M8 2v4m8-4v4m-13 4h18m-14 4h0.01m3.99 0h0.01m3.99 0h0.01m-8.01 4h0.01m3.99 0h0.01m3.99 0h0.01m-10.01-12h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2"
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
                        {item.date} · {item.location}
                      </div>
                      <div
                        data-pencil-name="Tag"
                        className={`box-border w-fit h-[22px] shrink-0 flex flex-col gap-0 p-[4px_8px] justify-center items-center rounded-full ${colors.bg}`}
                      >
                        <div
                          data-pencil-name="Text"
                          className={`text-[11px]/[normal] box-border font-body font-semibold text-left [white-space:nowrap] ${colors.text}`}
                        >
                          {item.displayStatus}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
