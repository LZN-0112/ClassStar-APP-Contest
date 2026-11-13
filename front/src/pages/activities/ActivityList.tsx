import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Image, Plus } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api, resolveFileUrl } from '@/lib/api';
import { toast } from 'sonner';

type MyRegistrationStatus = 'pending' | 'registered' | 'approved' | 'rejected' | null;

interface ActivityItem {
  id: string;
  title: string;
  category?: string | null;
  eventDate: string;
  eventTime: string | null;
  deadline?: string | null;
  location?: string;
  capacity?: number;
  registeredCount?: number;
  coverUrl?: string | null;
  displayStatus: 'registering' | 'ongoing' | 'ended';
  registrationOpen?: boolean;
  myRegistrationStatus?: MyRegistrationStatus;
}

type ActivityStatus = '全部' | '报名中' | '进行中' | '已结束';

const statusMap: Record<ActivityStatus, string> = {
  全部: '',
  报名中: 'registering',
  进行中: 'ongoing',
  已结束: 'ended',
};

const formatEventDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
  return `${date.getMonth() + 1}月${date.getDate()}日 ${week}`;
};

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * 报名截止倒计时：返回展示文案与是否进入 24 小时紧迫区间
 */
function getCountdown(deadline?: string | null) {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  if (Number.isNaN(diff)) return null;
  if (diff <= 0) return { text: '已截止', urgent: true };
  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) {
    return { text: `${days}天${hours}小时后截止`, urgent: days < 1 };
  }
  if (hours > 0) {
    return { text: `${hours}小时${pad(minutes)}分后截止`, urgent: true };
  }
  return { text: `${minutes}分钟后截止`, urgent: true };
}

function getStatusBadge(item: ActivityItem) {
  if (item.displayStatus === 'ended') {
    return { label: '已结束', className: 'bg-[#F1F5F9] text-[#64748B]' };
  }
  if (item.displayStatus === 'ongoing') {
    return { label: '进行中', className: 'bg-[#E0F2FE] text-[#0369A1]' };
  }
  const countdown = getCountdown(item.deadline);
  if (countdown?.urgent) {
    return { label: '即将截止', className: 'bg-[#FEF3C7] text-[#B45309]' };
  }
  return { label: '报名中', className: 'bg-[#DBEAFE] text-[#1D4ED8]' };
}

export default function ActivityList() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [filter, setFilter] = useState<ActivityStatus>('全部');
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const tabs: ActivityStatus[] = ['全部', '报名中', '进行中', '已结束'];

  const classId = user?.classId;

  useEffect(() => {
    const fetchActivities = async () => {
      if (!classId) {
        setActivities([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const status = statusMap[filter];
        const params = new URLSearchParams({ pageSize: '100' });
        if (status) params.append('status', status);
        const res = await api.get(`/classes/${classId}/activities?${params.toString()}`);
        const data = res.data.data || res.data;
        setActivities(data.list || []);
      } catch (err) {
        // 加载失败时展示可重试的错误态，避免误判为「暂无活动」
        setError(err instanceof Error ? err.message : '获取活动列表失败');
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [classId, filter, reloadKey]);

  const handleRegister = async (e: React.MouseEvent, item: ActivityItem) => {
    e.stopPropagation();
    if (!classId || registeringId) return;
    setRegisteringId(item.id);
    try {
      await api.post(`/classes/${classId}/activities/${item.id}/register`);
      toast.success('报名成功');
      setActivities((prev) =>
        prev.map((a) =>
          a.id === item.id
            ? {
                ...a,
                registeredCount: (a.registeredCount || 0) + 1,
                myRegistrationStatus: 'pending',
              }
            : a,
        ),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '报名失败，请稍后重试');
    } finally {
      setRegisteringId(null);
    }
  };

  const getActionState = (item: ActivityItem) => {
    const isEnded = item.displayStatus === 'ended';
    const isOngoing = item.displayStatus === 'ongoing';
    const isFull = item.capacity
      ? (item.registeredCount || 0) >= item.capacity
      : false;
    const isClosed =
      item.displayStatus === 'registering' && item.registrationOpen === false;
    const mine = item.myRegistrationStatus;

    if (mine === 'pending') return { label: '待审核', disabled: true, primary: false };
    if (mine === 'registered' || mine === 'approved')
      return { label: '已报名', disabled: true, primary: false };
    if (mine === 'rejected') return { label: '未通过', disabled: true, primary: false };
    if (isEnded) return { label: '已结束', disabled: true, primary: false };
    if (isOngoing) return { label: '进行中', disabled: true, primary: false };
    if (isClosed) return { label: '报名截止', disabled: true, primary: false };
    if (isFull) return { label: '名额已满', disabled: true, primary: false };
    return { label: '立即报名', disabled: false, primary: true };
  };

  return (
    <>
      <PageLayout
        title="活动列表"
        variant="b"
        decor={<Calendar className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}
        right={
          user?.roleLevel === 'owner' || user?.roleLevel === 'admin' ? (
            <button
              type="button"
              onClick={() => navigate('/publish-activity')}
              className="mr-2 flex h-9 items-center gap-1 rounded-full bg-white/20 px-3 text-sm font-medium text-white backdrop-blur"
            >
              <Plus className="h-4 w-4" />
              发布
            </button>
          ) : undefined
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
                className="box-border flex w-full flex-col gap-3"
              >
                {activities.map((item) => {
                  const badge = getStatusBadge(item);
                  const countdown = item.displayStatus === 'registering'
                    ? getCountdown(item.deadline)
                    : null;
                  const action = getActionState(item);
                  const isRegistering = registeringId === item.id;
                  const progress = item.capacity
                    ? Math.min(
                        100,
                        Math.round(((item.registeredCount || 0) / item.capacity) * 100),
                      )
                    : 0;

                  return (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/activity-detail/${classId}/${item.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/activity-detail/${classId}/${item.id}`);
                        }
                      }}
                      data-pencil-name="Activity Card"
                      className="box-border flex w-full shrink-0 cursor-pointer flex-col items-start justify-start gap-3 rounded-[20px] bg-white text-left shadow-soft"
                    >
                      <div
                        data-pencil-name="Cover"
                        className="relative box-border flex h-[140px] w-full shrink-0 flex-col items-center justify-center overflow-hidden rounded-t-[20px] bg-[#DBEAFE]"
                      >
                        {item.coverUrl ? (
                          <img
                            src={resolveFileUrl(item.coverUrl)}
                            alt={item.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Image className="h-[48px] w-[48px] text-[#8ACAE5]" strokeWidth={2} />
                        )}
                        <div
                          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge.className}`}
                        >
                          {badge.label}
                        </div>
                        {countdown && (
                          <div
                            className={`absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold ${
                              countdown.urgent ? 'text-[#B45309]' : 'text-[#475569]'
                            }`}
                          >
                            {countdown.text}
                          </div>
                        )}
                      </div>
                      <div
                        data-pencil-name="Info"
                        className="box-border flex w-full flex-col gap-[6px] px-4 pb-4"
                      >
                        <div className="flex w-full items-center gap-2">
                          {item.category && (
                            <span className="shrink-0 rounded-full bg-[#EFF6FF] px-2 py-[3px] text-[10px] font-semibold text-[#1D4ED8]">
                              {item.category}
                            </span>
                          )}
                          <div
                            data-pencil-name="Text"
                            className="min-w-0 flex-1 overflow-hidden text-left font-body text-[16px] font-bold text-[#1E293B] text-ellipsis [white-space:nowrap]"
                          >
                            {item.title}
                          </div>
                        </div>
                        <div
                          data-pencil-name="Text"
                          className="text-[11px]/[normal] box-border text-left font-body font-medium text-[#64748B] [white-space:nowrap]"
                        >
                          {formatEventDate(item.eventDate)}
                          {item.eventTime ? ` ${item.eventTime}` : ''} · {item.location || '待定'}
                        </div>

                        {item.capacity ? (
                          <div className="flex flex-col gap-1 pt-1">
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
                              <div
                                className="h-full rounded-full bg-[#0062FF]"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <div className="text-[11px] font-medium text-[#64748B]">
                              {item.registeredCount || 0} 人已报名 · 余{' '}
                              {Math.max(item.capacity - (item.registeredCount || 0), 0)} 席
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] font-medium text-[#64748B]">
                            {item.registeredCount || 0} 人已报名 · 不限名额
                          </div>
                        )}

                        <div
                          data-pencil-name="Footer"
                          className="box-border flex w-full flex-row items-center justify-between gap-2 pt-1"
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/activity-detail/${classId}/${item.id}`);
                            }}
                            className="h-9 rounded-lg px-3 text-[12px] font-medium text-[#64748B]"
                          >
                            查看详情
                          </button>
                          <button
                            type="button"
                            disabled={action.disabled || isRegistering}
                            onClick={(e) => handleRegister(e, item)}
                            className={`h-9 min-w-[92px] rounded-lg px-4 text-[12px] font-semibold ${
                              action.primary
                                ? 'bg-[#0062FF] text-white active:opacity-90'
                                : 'bg-[#E2E8F0] text-[#64748B] cursor-not-allowed'
                            } ${isRegistering ? 'opacity-70' : ''}`}
                          >
                            {isRegistering ? '报名中...' : action.label}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {error ? (
                  <div className="flex flex-col items-center gap-3 py-10">
                    <div className="text-sm text-gray-500">{error}</div>
                    <button
                      type="button"
                      onClick={() => setReloadKey((k) => k + 1)}
                      className="h-9 rounded-lg border border-[#0062FF] px-4 text-[13px] font-semibold text-[#0062FF] active:opacity-70"
                    >
                      点击重试
                    </button>
                  </div>
                ) : (
                  activities.length === 0 && (
                    <div className="py-10 text-center text-sm text-gray-500">暂无活动</div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </PageLayout>
    </>
  );
}
