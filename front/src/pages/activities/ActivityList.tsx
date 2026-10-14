import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Image, Plus } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface ActivityItem {
  id: string;
  title: string;
  eventDate: string;
  eventTime: string | null;
  location?: string;
  capacity?: number;
  registeredCount?: number;
  coverUrl?: string | null;
  displayStatus: 'registering' | 'ongoing' | 'ended';
}

type ActivityStatus = '全部' | '报名中' | '进行中' | '已结束';

const statusMap: Record<ActivityStatus, string> = {
  全部: '',
  报名中: 'registering',
  进行中: 'ongoing',
  已结束: 'ended',
};

const displayStatusLabel: Record<string, ActivityStatus> = {
  registering: '报名中',
  ongoing: '进行中',
  ended: '已结束',
};

export default function ActivityList() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [filter, setFilter] = useState<ActivityStatus>('全部');
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const tabs: ActivityStatus[] = ['全部', '报名中', '进行中', '已结束'];

  const classId = user?.classId;

  useEffect(() => {
    const fetchActivities = async () => {
      if (!classId) return;
      setLoading(true);
      try {
        const status = statusMap[filter];
        const params = new URLSearchParams({ pageSize: '100' });
        if (status) params.append('status', status);
        const res = await api.get(`/classes/${classId}/activities?${params.toString()}`);
        const data = res.data.data || res.data;
        setActivities(data.list || []);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '获取活动列表失败');
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [classId, filter]);

  const filtered = filter === '全部'
    ? activities
    : activities.filter((a) => displayStatusLabel[a.displayStatus] === filter);

  return (
    <>
      <PageLayout
        title="活动列表"
        variant="b"
        decor={<Calendar className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}
        right={
          <button
              type="button"
              onClick={() => navigate('/publish-activity')}
              className="mr-2 flex h-9 items-center gap-1 rounded-full bg-white/20 px-3 text-sm font-medium text-white backdrop-blur"
            >
              <Plus className="h-4 w-4" />
              发布
            </button>
          }
      >
        <div className="flex min-h-full w-full flex-col gap-5">
          <div
            data-pencil-name="Filter Tabs"
            className="box-border flex w-full flex-row items-start justify-start gap-2"
          >
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

          <div
            data-pencil-name="Group 活动列表"
            className="box-border flex w-full flex-col gap-[10px]"
          >
            <div
              data-pencil-name="Text"
              className="text-[11px]/[normal] box-border text-left font-body font-semibold text-[#6B7280] [white-space:nowrap]"
            >
              活动列表
            </div>
            {loading ? (
              <div className="py-10 text-center text-sm text-gray-500">加载中...</div>
            ) : (
              <div
                data-pencil-name="Group Content"
                className="box-border flex w-full flex-col gap-2"
              >
                {filtered.map((item) => {
                  const isEnded = item.displayStatus === 'ended';
                  const isFull = item.capacity ? (item.registeredCount || 0) >= item.capacity : false;
                  const statusLabel = displayStatusLabel[item.displayStatus] || '已结束';
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(`/activity-detail/${classId}/${item.id}`)}
                      data-pencil-name="Activity Card"
                      className="box-border flex w-full shrink-0 flex-col items-start justify-start gap-3 rounded-[20px] bg-white text-left shadow-soft"
                    >
                      <div
                        data-pencil-name="Cover"
                        className="box-border flex h-[140px] w-full shrink-0 flex-col items-center justify-center rounded-t-[20px] bg-[#DBEAFE] overflow-hidden"
                      >
                        {item.coverUrl ? (
                          <img
                            src={item.coverUrl}
                            alt={item.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Image className="h-[48px] w-[48px] text-[#8ACAE5]" strokeWidth={2} />
                        )}
                      </div>
                      <div
                        data-pencil-name="Info"
                        className="box-border flex w-full flex-col gap-[6px] px-4 pb-4"
                      >
                        <div
                          data-pencil-name="Text"
                          className="text-[16px]/[normal] box-border text-left font-body font-bold text-[#1E293B] [white-space:nowrap]"
                        >
                          {item.title}
                        </div>
                        <div
                          data-pencil-name="Text"
                          className="text-[11px]/[normal] box-border text-left font-body font-medium text-[#64748B] [white-space:nowrap]"
                        >
                          {item.eventDate} {item.eventTime ?? ''} · {item.location || '待定'}
                        </div>
                        <div
                          data-pencil-name="Footer"
                          className="box-border flex w-full flex-row items-center justify-between"
                        >
                          <div
                            data-pencil-name="Text"
                            className="text-[11px]/[normal] box-border text-left font-body font-medium text-[#64748B] [white-space:nowrap]"
                          >
                            报名 {isFull ? '已满' : `${item.registeredCount || 0}/${item.capacity ?? '不限'}`}
                          </div>
                          <div
                            data-pencil-name="Button"
                            className={`box-border flex h-[28px] w-fit shrink-0 flex-col items-center justify-center rounded-lg px-3 ${
                              isEnded ? 'bg-[#E2E8F0]' : 'bg-[#0062FF]'
                            }`}
                          >
                            <div
                              data-pencil-name="Text"
                              className={`text-[11px]/[normal] box-border font-body font-semibold text-left [white-space:nowrap] ${
                                isEnded ? 'text-[#64748B]' : 'text-white'
                              }`}
                            >
                              {statusLabel === '报名中' ? '报名' : statusLabel}
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="py-10 text-center text-sm text-gray-500">暂无活动</div>
                )}
              </div>
            )}
          </div>
        </div>
      </PageLayout>
    </>
  );
}
