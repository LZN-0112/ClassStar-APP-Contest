import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Hourglass,
  MapPin,
  Timer,
  Users,
  CheckCircle2,
  XCircle,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api, resolveFileUrl } from '@/lib/api';
import { toast } from 'sonner';
import {
  ActivityRegisterButton,
  RegisterButtonState,
} from '@/components/activities/ActivityRegisterButton';

interface ActivityDetailData {
  id: string;
  title: string;
  category?: string | null;
  eventDate: string;
  eventTime: string | null;
  location?: string;
  description?: string | null;
  capacity?: number;
  deadline?: string | null;
  coverUrl?: string | null;
  images?: string[];
  registeredCount: number;
  displayStatus: 'registering' | 'ongoing' | 'ended';
  registrationOpen?: boolean;
  registration: {
    id: string;
    status: 'pending' | 'registered' | 'approved' | 'rejected';
    registeredAt: string;
  } | null;
}

const formatEventDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
  return `${date.getMonth() + 1}月${date.getDate()}日 ${week}`;
};

const formatDeadline = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${date.getMonth() + 1}月${date.getDate()}日 ${hh}:${mm}`;
};

/**
 * 报名截止倒计时，用于底部操作栏制造时间紧迫感
 */
function getDeadlineCountdown(deadline?: string | null) {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  if (Number.isNaN(diff) || diff <= 0) return null;
  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `距报名截止 ${days} 天 ${hours} 小时`;
  if (hours > 0) return `距报名截止 ${hours} 小时 ${minutes} 分`;
  return `距报名截止 ${minutes} 分钟`;
}

function computeButtonState(activity: ActivityDetailData): RegisterButtonState {
  if (activity.displayStatus === 'ended') return 'ended';
  if (activity.displayStatus === 'ongoing') return 'inProgress';

  const registrationStatus = activity.registration?.status;
  if (registrationStatus && ['pending', 'registered', 'approved'].includes(registrationStatus)) {
    return 'cancelRegister';
  }
  if (registrationStatus === 'rejected') return 'rejected';
  if (activity.registrationOpen === false) return 'closed';
  if (activity.capacity && activity.registeredCount >= activity.capacity) return 'full';
  return 'register';
}

export default function ActivityDetail() {
  const { classId, activityId } = useParams<{ classId: string; activityId: string }>();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [activity, setActivity] = useState<ActivityDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [buttonState, setButtonState] = useState<RegisterButtonState>('loading');
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const fetchActivity = useCallback(
    async (silent = false) => {
      if (!classId || !activityId) {
        toast.error('缺少活动信息');
        navigate('/activity-list', { replace: true });
        return;
      }

      if (!silent) {
        setLoading(true);
        setError('');
        setButtonState('loading');
      }
      try {
        const res = await api.get(`/classes/${classId}/activities/${activityId}`);
        const data: ActivityDetailData = res.data.data || res.data;
        setActivity(data);
        setButtonState(computeButtonState(data));
        setError('');
      } catch (err) {
        if (silent) return;
        const message = err instanceof Error ? err.message : '获取活动详情失败';
        setError(message);
        toast.error(message);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [classId, activityId, navigate],
  );

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  // 活动阶段会随时间变化（如从报名中变为进行中），每分钟静默刷新一次，避免整页闪烁
  useEffect(() => {
    const timer = setInterval(() => {
      fetchActivity(true);
    }, 60000);
    return () => clearInterval(timer);
  }, [fetchActivity]);

  const handleButtonClick = async () => {
    if (!classId || !activityId) return;

    if (buttonState === 'register') {
      setButtonState('registering');
      try {
        await api.post(`/classes/${classId}/activities/${activityId}/register`);
        toast.success('报名成功');
        await fetchActivity(true);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '报名失败');
        await fetchActivity(true);
      }
    } else if (buttonState === 'cancelRegister') {
      setButtonState('cancelling');
      try {
        await api.post(`/classes/${classId}/activities/${activityId}/cancel`);
        toast.success('取消报名成功');
        await fetchActivity(true);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '取消报名失败');
        await fetchActivity(true);
      }
    }
  };

  if (loading) {
    return (
      <PageLayout title="活动详情" variant="b">
        <div className="flex min-h-[400px] flex-col items-center justify-center text-sm text-gray-500">
          加载中...
        </div>
      </PageLayout>
    );
  }

  if (error || !activity) {
    return (
      <PageLayout title="活动详情" variant="b">
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
          <div className="text-sm text-gray-500">{error || '活动不存在或已被删除'}</div>
          <button
            type="button"
            onClick={() => fetchActivity()}
            className="rounded-lg bg-[#0062FF] px-5 py-2 text-sm font-medium text-white"
          >
            重新加载
          </button>
        </div>
      </PageLayout>
    );
  }

  const capacityText = activity.capacity
    ? `${activity.registeredCount}/${activity.capacity}`
    : `${activity.registeredCount}/不限`;
  const countdown =
    activity.displayStatus === 'registering'
      ? getDeadlineCountdown(activity.deadline)
      : null;
  const remaining = activity.capacity
    ? Math.max(activity.capacity - activity.registeredCount, 0)
    : null;
  const progress = activity.capacity
    ? Math.min(100, Math.round((activity.registeredCount / activity.capacity) * 100))
    : 0;
  const galleryImages = activity.images ?? [];

  const badge =
    activity.displayStatus === 'ended'
      ? { label: '已结束', className: 'bg-[#F1F5F9] text-[#64748B]' }
      : activity.displayStatus === 'ongoing'
        ? { label: '进行中', className: 'bg-[#E0F2FE] text-[#0369A1]' }
        : countdown && !countdown.includes('天')
          ? { label: '即将截止', className: 'bg-[#FEF3C7] text-[#B45309]' }
          : { label: '报名中', className: 'bg-[#DBEAFE] text-[#1D4ED8]' };

  const registration = activity.registration;
  const regStatus = registration?.status;
  const registrationMeta =
    regStatus === 'pending'
      ? { label: '待审核', className: 'bg-[#FEF3C7] text-[#B45309]' }
      : regStatus === 'registered' || regStatus === 'approved'
        ? { label: '已报名', className: 'bg-[#DCFCE7] text-[#15803D]' }
        : regStatus === 'rejected'
          ? { label: '未通过', className: 'bg-[#FEE2E2] text-[#B91C1C]' }
          : null;

  type StepState = 'done' | 'current' | 'failed' | 'todo';
  const reviewState: StepState =
    regStatus === 'registered' || regStatus === 'approved'
      ? 'done'
      : regStatus === 'rejected'
        ? 'failed'
        : 'current';
  const steps: { title: string; desc: string; state: StepState }[] = registration
    ? [
        {
          title: '报名已提交',
          desc: `${formatDeadline(registration.registeredAt)} 提交`,
          state: 'done',
        },
        {
          title:
            regStatus === 'rejected'
              ? '报名未通过'
              : regStatus === 'pending'
                ? '等待班委审核'
                : '审核已通过',
          desc:
            regStatus === 'pending'
              ? '审核结果会通过消息通知你，请留意'
              : regStatus === 'rejected'
                ? '如有疑问可联系班委了解原因'
                : '请按时参加活动',
          state: reviewState,
        },
        {
          title: '参加活动',
          desc: `${formatEventDate(activity.eventDate)}${
            activity.eventTime ? ` ${activity.eventTime}` : ''
          } · ${activity.location || '待定'}`,
          state:
            activity.displayStatus === 'ended' || activity.displayStatus === 'ongoing'
              ? 'done'
              : 'todo',
        },
      ]
    : [];

  const stepDot = (state: StepState) =>
    state === 'done'
      ? 'bg-[#22C55E]'
      : state === 'failed'
        ? 'bg-[#EF4444]'
        : state === 'current'
          ? 'bg-[#0062FF]'
          : 'bg-[#F1F5F9]';

  const stepIcon = (state: StepState) =>
    state === 'done' ? (
      <CheckCircle2 className="h-4 w-4 text-white" />
    ) : state === 'failed' ? (
      <XCircle className="h-4 w-4 text-white" />
    ) : (
      <Hourglass
        className={`h-3.5 w-3.5 ${state === 'current' ? 'text-white' : 'text-[#94A3B8]'}`}
      />
    );

  const infoItems = [
    {
      icon: <CalendarDays className="h-4 w-4 text-[#0062FF]" />,
      label: '活动时间',
      value: `${formatEventDate(activity.eventDate)}${
        activity.eventTime ? ` ${activity.eventTime}` : ''
      }`,
    },
    {
      icon: <MapPin className="h-4 w-4 text-[#0062FF]" />,
      label: '活动地点',
      value: activity.location || '待定',
    },
    {
      icon: <Timer className="h-4 w-4 text-[#0062FF]" />,
      label: '报名截止',
      value: activity.deadline ? formatDeadline(activity.deadline) : '活动开始前',
    },
    {
      icon: <Users className="h-4 w-4 text-[#0062FF]" />,
      label: '报名人数',
      value: capacityText,
    },
  ];

  return (
    <PageLayout
      title="活动详情"
      variant="b"
      right={
        user?.roleLevel === 'owner' || user?.roleLevel === 'admin' ? (
          <button
            type="button"
            onClick={() =>
              navigate(`/registration-stats?classId=${classId}&activityId=${activityId}`)
            }
            className="mr-2 flex h-9 items-center rounded-full bg-white/20 px-3 text-sm font-medium text-white backdrop-blur"
          >
            报名统计
          </button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4">
        <div className="relative box-border flex h-[180px] w-full shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-[#DBEAFE]">
          {activity.coverUrl ? (
            <img
              src={resolveFileUrl(activity.coverUrl)}
              alt="活动封面"
              className="h-full w-full object-cover"
            />
          ) : (
            <svg
              data-pencil-name="Icon-image"
              viewBox="0 0 24 24"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
              className="box-border w-[64px] h-[64px] shrink-0 overflow-visible"
            >
              <path
                d="M21 19v-14a2 2 0 0 0-2-2h-14a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2m-12.5-9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m12.5 5l-5-5-11 11"
                fill="none"
              ></path>
              <path
                d="M21 19v-14a2 2 0 0 0-2-2h-14a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2m-12.5-9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m12.5 5l-5-5-11 11"
                fill="none"
                stroke="#4B83FF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              ></path>
            </svg>
          )}
          <div
            className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge.className}`}
          >
            {badge.label}
          </div>
          {countdown && (
            <div
              className={`absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold ${
                countdown.includes('天') ? 'text-[#475569]' : 'text-[#B45309]'
              }`}
            >
              {countdown}
            </div>
          )}
        </div>

        <div
          data-pencil-name="Info"
          className="box-border w-full h-fit shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-3 p-4 justify-start items-start bg-[#FFFFFF] rounded-[16px]"
        >
          <div className="flex w-full items-start justify-between gap-2">
            <div className="text-[18px]/[1.4] box-border break-words text-left font-body font-bold text-[#1A1A1A]">
              {activity.title}
            </div>
            {activity.category && (
              <span className="shrink-0 rounded-full bg-[#EFF6FF] px-2.5 py-1 text-[11px] font-semibold text-[#1D4ED8]">
                {activity.category}
              </span>
            )}
          </div>

          {registrationMeta && (
            <span
              className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold ${registrationMeta.className}`}
            >
              我的报名：{registrationMeta.label}
            </span>
          )}

          <div className="grid w-full grid-cols-2 gap-2">
            {infoItems.map((item) => (
              <div
                key={item.label}
                className="box-border flex w-full flex-col gap-1 rounded-xl bg-[#F8FAFC] p-3"
              >
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-[#94A3B8]">
                  {item.icon}
                  {item.label}
                </div>
                <div className="break-words text-[13px] font-semibold text-[#1E293B]">
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {activity.capacity ? (
            <div className="flex w-full flex-col gap-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
                <div
                  className="h-full rounded-full bg-[#0062FF]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex w-full items-center justify-between text-[11px] font-medium text-[#64748B]">
                <span>已报名 {activity.registeredCount} 人</span>
                <span className={remaining !== null && remaining <= 5 ? 'text-[#B45309]' : ''}>
                  余 {remaining ?? 0} 席
                </span>
              </div>
            </div>
          ) : (
            <div className="text-[11px] font-medium text-[#64748B]">
              已报名 {activity.registeredCount} 人 · 不限名额
            </div>
          )}
        </div>

        {registration && (
          <div
            data-pencil-name="Registration Progress"
            className="box-border w-full h-fit shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-3 p-4 justify-start items-start bg-[#FFFFFF] rounded-[16px]"
          >
            <div className="flex w-full items-center justify-between">
              <div className="text-[11px]/[normal] box-border text-left font-body font-semibold text-[#6B7280]">
                我的报名进度
              </div>
              {registrationMeta && (
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${registrationMeta.className}`}
                >
                  {registrationMeta.label}
                </span>
              )}
            </div>
            <div className="flex w-full flex-col gap-3">
              {steps.map((step) => (
                <div key={step.title} className="flex w-full items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${stepDot(
                      step.state,
                    )}`}
                  >
                    {stepIcon(step.state)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      className={`text-[13px] font-semibold ${
                        step.state === 'todo' ? 'text-[#94A3B8]' : 'text-[#1E293B]'
                      }`}
                    >
                      {step.title}
                    </div>
                    <div className="break-words text-[11px] font-medium text-[#94A3B8]">
                      {step.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {galleryImages.length > 0 && (
          <div
            data-pencil-name="Gallery"
            className="box-border flex w-full shrink-0 flex-col gap-2 rounded-[16px] bg-[#FFFFFF] p-4 shadow-[0px_2px_8px_0px_#0000000D]"
          >
            <div className="flex w-full items-center justify-between">
              <span className="text-[11px] font-semibold text-[#6B7280]">活动照片</span>
              <span className="text-[11px] font-medium text-[#94A3B8]">
                {galleryImages.length} 张
              </span>
            </div>
            <div className="grid w-full grid-cols-3 gap-2">
              {galleryImages.map((url, index) => (
                <button
                  key={`${url}-${index}`}
                  type="button"
                  onClick={() => setPreviewIndex(index)}
                  className="relative aspect-square w-full overflow-hidden rounded-lg bg-[#F1F5F9] active:opacity-80"
                >
                  <img
                    src={resolveFileUrl(url)}
                    alt={`活动照片 ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        <div
          data-pencil-name="Description"
          className="box-border w-full h-fit shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-2 p-4 justify-start items-start bg-[#FFFFFF] rounded-[16px]"
        >
          <div className="text-[11px]/[normal] box-border text-left font-body font-semibold text-[#6B7280]">
            活动介绍
          </div>
          {activity.description ? (
            <p className="m-0 text-[14px]/[1.8] box-border break-words whitespace-pre-wrap text-left font-body font-medium text-[#4B5563]">
              {activity.description}
            </p>
          ) : (
            <p className="m-0 text-[13px] box-border text-left font-body font-medium text-[#94A3B8]">
              班委还没有填写活动介绍
            </p>
          )}
        </div>

        <div className="sticky bottom-0 z-10 -mx-5 -mb-[calc(20px+env(safe-area-inset-bottom))] mt-1 border-t border-[#E2E8F0] bg-white px-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom))]">
          {(countdown || remaining !== null) && (
            <div className="mb-2 flex items-center justify-between text-[12px] font-medium text-[#64748B]">
              <span>
                {remaining !== null ? `剩余 ${remaining} 个名额` : '不限名额'}
              </span>
              {countdown && (
                <span
                  className={
                    remaining !== null && remaining <= 5
                      ? 'text-[#B45309]'
                      : countdown.includes('分钟') || countdown.includes('小时')
                        ? 'text-[#B45309]'
                        : 'text-[#64748B]'
                  }
                >
                  {countdown}
                </span>
              )}
            </div>
          )}
          <ActivityRegisterButton state={buttonState} onClick={handleButtonClick} />
        </div>

        {previewIndex !== null && galleryImages[previewIndex] && (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(15,23,42,0.42)] backdrop-blur-[2px]"
            onClick={() => setPreviewIndex(null)}
            role="presentation"
          >
            <button
              type="button"
              aria-label="关闭预览"
              onClick={() => setPreviewIndex(null)}
              className="absolute right-4 top-[calc(16px+env(safe-area-inset-top))] flex h-9 w-9 items-center justify-center rounded-[14px] bg-white/15 text-white"
            >
              <X className="h-5 w-5" />
            </button>
            {galleryImages.length > 1 && (
              <button
                type="button"
                aria-label="上一张"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewIndex(
                    (previewIndex - 1 + galleryImages.length) % galleryImages.length,
                  );
                }}
                className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-[14px] bg-white/15 text-white"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
            <img
              src={resolveFileUrl(galleryImages[previewIndex])}
              alt={`活动照片 ${previewIndex + 1}`}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[80vh] max-w-[92vw] rounded-lg object-contain"
            />
            {galleryImages.length > 1 && (
              <button
                type="button"
                aria-label="下一张"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewIndex((previewIndex + 1) % galleryImages.length);
                }}
                className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-[14px] bg-white/15 text-white"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
            <span className="absolute bottom-[calc(24px+env(safe-area-inset-bottom))] rounded-full bg-white/15 px-3 py-1 text-[12px] font-medium text-white">
              {previewIndex + 1} / {galleryImages.length}
            </span>
          </div>
        )}
      </div>
    </PageLayout>
  );
}