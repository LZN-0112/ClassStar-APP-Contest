import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';

type ActivityStatus = '全部' | '报名中' | '进行中' | '已结束';

interface ActivityItem {
  id: string;
  title: string;
  date: string;
  eventTime: string | null;
  location: string;
  displayStatus: 'registering' | 'ongoing' | 'ended';
  registrationStatus: 'pending' | 'registered' | 'approved' | 'rejected' | null;
}

const registrationMeta = {
  pending: { label: '待审核', bg: 'bg-[#FEF3C7]', text: 'text-[#B45309]' },
  registered: { label: '已通过', bg: 'bg-[#DCFCE7]', text: 'text-[#15803D]' },
  approved: { label: '已通过', bg: 'bg-[#DCFCE7]', text: 'text-[#15803D]' },
  rejected: { label: '未通过', bg: 'bg-[#FEE2E2]', text: 'text-[#B91C1C]' },
} as const;

const statusMeta: Record<
  ActivityItem['displayStatus'],
  { label: string; bg: string; text: string }
> = {
  registering: { label: '报名中', bg: 'bg-[#22C55E1A]', text: 'text-[#22C55E]' },
  ongoing: { label: '进行中', bg: 'bg-[#0062FF1A]', text: 'text-[#0062FF]' },
  ended: { label: '已结束', bg: 'bg-[#6B72801A]', text: 'text-[#6B7280]' },
};

const tabStatusMap: Record<ActivityStatus, ActivityItem['displayStatus'] | null> = {
  全部: null,
  报名中: 'registering',
  进行中: 'ongoing',
  已结束: 'ended',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
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

  const classId = user?.classId;

  useEffect(() => {
    if (!classId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    api
      .get(`/classes/${classId}/activities/my-registrations`, {
        params: { pageSize: 100 },
      })
      .then((res) => {
        const data = res.data.data || res.data;
        const list = data.list || [];
        const mapped: ActivityItem[] = list.map((item: any) => ({
          id: item.activity.id,
          title: item.activity.title,
          date: formatDate(item.activity.eventDate || item.activity.event_date),
          eventTime: item.activity.eventTime || null,
          location: item.activity.location || '待定',
          displayStatus: item.activity.displayStatus || 'ended',
          registrationStatus: item.status || null,
        }));
        // 同一活动只保留一条记录（避免重复报名数据造成重复卡片）
        const seen = new Set<string>();
        const unique = mapped.filter((a) => {
          if (seen.has(a.id)) return false;
          seen.add(a.id);
          return true;
        });
        setActivities(unique);
      })
      .catch(() => {
        setActivities([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [classId]);

  const tabs: ActivityStatus[] = ['全部', '报名中', '进行中', '已结束'];
  const targetStatus = tabStatusMap[filter];
  const filtered = targetStatus
    ? activities.filter((a) => a.displayStatus === targetStatus)
    : activities;

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
                const meta = statusMeta[item.displayStatus];
                const reg = item.registrationStatus
                  ? registrationMeta[item.registrationStatus]
                  : null;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(`/activity-detail/${classId}/${item.id}`)}
                    data-pencil-name="Card"
                    className="box-border w-full min-h-[96px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-[12px] p-4 justify-start items-center bg-[#FFFFFF] rounded-[16px] text-left"
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
                      className="box-border [flex:1_1_0] min-w-0 h-full flex flex-col gap-[6px] justify-center items-start bg-[#00000000]"
                    >
                      <div
                        data-pencil-name="Text"
                        className="w-full text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left truncate"
                      >
                        {item.title}
                      </div>
                      <div
                        data-pencil-name="Text"
                        className="w-full text-[11px]/[normal] box-border text-[#4B5563] font-body font-medium text-left truncate"
                      >
                        {item.date}
                        {item.eventTime ? ` ${item.eventTime}` : ''} · {item.location}
                      </div>
                      <div className="flex flex-row items-center gap-2">
                        <div
                          data-pencil-name="Tag"
                          className={`box-border w-fit h-[22px] shrink-0 flex flex-col gap-0 p-[4px_8px] justify-center items-center rounded-full ${meta.bg}`}
                        >
                          <div
                            data-pencil-name="Text"
                            className={`text-[11px]/[normal] box-border font-body font-semibold text-left [white-space:nowrap] ${meta.text}`}
                          >
                            {meta.label}
                          </div>
                        </div>
                        {reg && (
                          <div
                            data-pencil-name="Registration Tag"
                            className={`box-border w-fit h-[22px] shrink-0 flex flex-col gap-0 p-[4px_8px] justify-center items-center rounded-full ${reg.bg}`}
                          >
                            <div
                              data-pencil-name="Text"
                              className={`text-[11px]/[normal] box-border font-body font-semibold text-left [white-space:nowrap] ${reg.text}`}
                            >
                              报名{reg.label}
                            </div>
                          </div>
                        )}
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