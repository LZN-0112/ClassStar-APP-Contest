import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  ActivityRegisterButton,
  RegisterButtonState,
} from '@/components/activities/ActivityRegisterButton';

interface ActivityDetailData {
  id: string;
  title: string;
  eventDate: string;
  eventTime: string | null;
  location?: string;
  capacity?: number;
  deadline?: string | null;
  coverUrl?: string | null;
  registeredCount: number;
  displayStatus: 'registering' | 'ongoing' | 'ended';
  registration: {
    id: string;
    status: 'pending' | 'registered' | 'rejected';
    registeredAt: string;
  } | null;
}

function computeButtonState(activity: ActivityDetailData): RegisterButtonState {
  switch (activity.displayStatus) {
    case 'ended':
      return 'ended';
    case 'ongoing':
      return 'inProgress';
    case 'registering':
    default:
      if (
        activity.registration &&
        ['pending', 'registered'].includes(activity.registration.status)
      ) {
        return 'cancelRegister';
      }
      return 'register';
  }
}

export default function ActivityDetail() {
  const { classId, activityId } = useParams<{ classId: string; activityId: string }>();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<ActivityDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [buttonState, setButtonState] = useState<RegisterButtonState>('loading');

  const fetchActivity = useCallback(async () => {
    if (!classId || !activityId) {
      toast.error('缺少活动信息');
      navigate('/activity-list', { replace: true });
      return;
    }

    setLoading(true);
    setButtonState('loading');
    try {
      const res = await api.get(`/classes/${classId}/activities/${activityId}`);
      const data: ActivityDetailData = res.data.data || res.data;
      setActivity(data);
      setButtonState(computeButtonState(data));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '获取活动详情失败');
      setButtonState('ended');
    } finally {
      setLoading(false);
    }
  }, [classId, activityId, navigate]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  // 活动阶段会随时间变化（如从报名中变为进行中），每分钟刷新一次保持状态同步
  useEffect(() => {
    const timer = setInterval(() => {
      fetchActivity();
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
        await fetchActivity();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '报名失败');
        await fetchActivity();
      }
    } else if (buttonState === 'cancelRegister') {
      setButtonState('cancelling');
      try {
        await api.post(`/classes/${classId}/activities/${activityId}/cancel`);
        toast.success('取消报名成功');
        await fetchActivity();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '取消报名失败');
        await fetchActivity();
      }
    }
  };

  if (loading || !activity) {
    return (
      <PageLayout title="活动详情" variant="b">
        <div className="flex min-h-[400px] flex-col items-center justify-center text-sm text-gray-500">
          加载中...
        </div>
      </PageLayout>
    );
  }

  const capacityText = activity.capacity
    ? `${activity.registeredCount}/${activity.capacity}`
    : `${activity.registeredCount}/不限`;

  return (
    <PageLayout title="活动详情" variant="b">
      <div className="flex flex-col gap-[20px]">
        <div
          data-pencil-name="Cover"
          className="box-border w-full h-[180px] shrink-0 flex flex-col gap-0 justify-center items-center bg-[#DBEAFE] rounded-[0px_0px_20px_20px] overflow-hidden"
        >
          {activity.coverUrl ? (
            <img
              src={activity.coverUrl}
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
        </div>
        <div
          data-pencil-name="Info"
          className="box-border w-full h-fit shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-[10px] p-4 justify-start items-start bg-[#FFFFFF] rounded-[16px]"
        >
          <div
            data-pencil-name="Text"
            className="text-[16px]/[normal] box-border text-[#1A1A1A] font-body font-bold text-left [white-space:nowrap]"
          >
            {activity.title}
          </div>
          <div
            data-pencil-name="Text"
            className="text-[14px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
          >
            时间：{activity.eventDate} {activity.eventTime ?? ''}
          </div>
          <div
            data-pencil-name="Text"
            className="text-[14px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
          >
            地点：{activity.location || '待定'}
          </div>
          <div
            data-pencil-name="Text"
            className="text-[11px]/[normal] box-border text-[#0062FF] font-body font-semibold text-left [white-space:nowrap]"
          >
            报名人数：{capacityText}
          </div>
        </div>
        <ActivityRegisterButton state={buttonState} onClick={handleButtonClick} />
      </div>
    </PageLayout>
  );
}
