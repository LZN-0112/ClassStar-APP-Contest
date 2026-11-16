import { useState, useEffect, useRef, useCallback } from 'react';
import PhoneFrame from '@/components/layout/PhoneFrame';
import FeatureDrawer from '@/components/layout/FeatureDrawer';
import { useNavigate } from 'react-router-dom';
import { isNative } from '@/lib/capacitor';
import { useStatusBarStyle } from '@/hooks/useStatusBarStyle';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import OrgSwitcher from '@/components/org/OrgSwitcher';
import PomodoroMiniCard from '@/components/pomodoro/PomodoroMiniCard';
import { api, ApiResponse } from '@/lib/api';
import {
  Bell,
  CheckCircle,
  FileText,
  Flag,
  Folder,
  User,
  ChevronRight,
  Clock,
  ScanLine,
  School,
  LayoutGrid,
  Vote,
  Dices,
  Timer,
  BarChart3,
  ListTodo,
  CalendarCheck,
  Trophy,
  ClipboardCheck,
  Users,
  Archive,
} from 'lucide-react';

interface TaskStats {
  todo: number;
  inProgress: number;
  done: number;
  completionRate?: number;
}

interface MessageItem {
  id: string;
  type: string;
  title: string;
  publisher?: { name: string };
  createdAt: string;
}

// 格式化时间为相对时间
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay < 7) return `${diffDay}天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

// 获取日期字符串（如 "9月3日 周三"）
function getTodayDateStr(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${month}月${day}日 ${weekDays[now.getDay()]}`;
}

// 获取问候语（根据时间）
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return '凌晨好';
  if (hour < 12) return '早上好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

// 通知类型映射：图标、主色与标签
const TYPE_META: Record<string, { icon: typeof Bell; color: string; label: string }> = {
  notice: { icon: Bell, color: '#2563EB', label: '通知' },
  attendance: { icon: CheckCircle, color: '#16A34A', label: '签到' },
  homework: { icon: FileText, color: '#F97316', label: '作业' },
  activity: { icon: Flag, color: '#EF4444', label: '活动' },
  deadline_reminder: { icon: Bell, color: '#EA580C', label: '提醒' },
  homework_urge: { icon: FileText, color: '#F97316', label: '催交' },
  activity_start: { icon: Flag, color: '#3B82F6', label: '活动' },
  activity_result: { icon: Flag, color: '#6366F1', label: '结果' },
  default: { icon: Bell, color: '#64748B', label: '动态' },
};

interface PendingTask {
  id: string;
  title: string;
  deadline: string | null;
  priority?: number;
  status?: string;
}

interface HomeworkRaw {
  submitted?: boolean;
  deadline: string;
  myDelayStatus?: string | null;
  myDelayDeadline?: string | null;
}

interface HomeAttendanceRaw {
  id: string;
  title: string;
  method: string;
  startTime: string;
  endTime: string;
  status: string;
  myRecord?: { id: string; status: string; checkInAt?: string } | null;
  myLeaveApplication?: { id: string; status: string } | null;
}

interface HomeAttendanceCard {
  state: 'ongoing' | 'upcoming' | 'done' | 'leave';
  id: string;
  title: string;
  method: string;
  startTime: string;
  endTime: string;
  checkedAt?: string;
}

/** 只取 HH:mm */
function formatClock(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 时间线用：拆出 HH:mm 与「今天 / 明天 / 11-09」 */
function formatScheduleParts(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDay = Math.round((startOfDay(d) - startOfDay(now)) / 86400000);
  const day =
    diffDay === 0
      ? '今天'
      : diffDay === 1
        ? '明天'
        : `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { time: formatClock(iso), day };
}

/** 今天 08:00 / 明天 08:00 / 11-09 08:00 */
function formatSchedule(iso: string) {
  const { time, day } = formatScheduleParts(iso);
  return `${day} ${time}`;
}

/** 从考勤列表里挑一条最该展示在首页的记录 */
function pickHomeAttendance(list: HomeAttendanceRaw[]): HomeAttendanceCard | null {
  const now = Date.now();
  const startOf = (item: HomeAttendanceRaw) => new Date(item.startTime).getTime();
  const endOf = (item: HomeAttendanceRaw) => new Date(item.endTime).getTime();
  const base = (item: HomeAttendanceRaw, state: HomeAttendanceCard['state']): HomeAttendanceCard => ({
    state,
    id: item.id,
    title: item.title,
    method: item.method,
    startTime: item.startTime,
    endTime: item.endTime,
    checkedAt: item.myRecord?.checkInAt,
  });

  // 已批准的请假优先于「去签到」提示
  const onLeave = (item: HomeAttendanceRaw) => item.myLeaveApplication?.status === 'approved';

  const ongoing = list.find(
    (item) => item.status === 'open' && startOf(item) <= now && now <= endOf(item),
  );
  if (ongoing) return base(ongoing, onLeave(ongoing) ? 'leave' : 'ongoing');

  // 24 小时内的下一场
  const upcoming = list
    .filter((item) => item.status === 'open' && startOf(item) > now && startOf(item) - now <= 86400000)
    .sort((a, b) => startOf(a) - startOf(b))[0];
  if (upcoming) return base(upcoming, onLeave(upcoming) ? 'leave' : 'upcoming');

  // 今天最近结束的一场：只展示已签到 / 已请假的回执
  const today = new Date();
  const endedToday = list
    .filter((item) => {
      const start = new Date(item.startTime);
      const sameDay =
        start.getFullYear() === today.getFullYear() &&
        start.getMonth() === today.getMonth() &&
        start.getDate() === today.getDate();
      return sameDay && (item.status === 'closed' || now > endOf(item));
    })
    .sort((a, b) => endOf(b) - endOf(a))[0];

  if (endedToday) {
    if (endedToday.myRecord) return base(endedToday, 'done');
    if (endedToday.myLeaveApplication?.status === 'approved') return base(endedToday, 'leave');
  }
  return null;
}

/** 实时倒计时文本，归零时通知外部刷新 */
function AttendanceCountdown({
  endTime,
  onExpire,
}: {
  endTime: string;
  onExpire?: () => void;
}) {
  const endMs = new Date(endTime).getTime();
  const [remain, setRemain] = useState(() => Math.max(endMs - Date.now(), 0));
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
    const tick = () => {
      const ms = Math.max(endMs - Date.now(), 0);
      setRemain(ms);
      if (ms <= 0 && !firedRef.current) {
        firedRef.current = true;
        onExpire?.();
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [endMs, onExpire]);

  const total = Math.floor(remain / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  const text = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;

  return <span className="font-data font-semibold tabular-nums text-[#0062FF]">{text}</span>;
}

export default function StudentHome() {
  useStatusBarStyle(false); // 首页浅色背景 → 系统状态栏深色(黑)图标
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const unread = useUnreadCount(user?.classId);
  const [pendingCount, setPendingCount] = useState(0);
  const [completionRate, setCompletionRate] = useState(0);
  const [taskStatsState, setTaskStatsState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [feedItems, setFeedItems] = useState<MessageItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [greeting, setGreeting] = useState(getGreeting());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [attendanceCard, setAttendanceCard] = useState<HomeAttendanceCard | null>(null);
  const [pendingHomeworkCount, setPendingHomeworkCount] = useState(0);
  const [pendingActivityCount, setPendingActivityCount] = useState(0);
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quickPage, setQuickPage] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);
  const greetingTimerRef = useRef<number | null>(null);

  // 首页签到卡：进行中 / 即将开始 / 今日回执
  const fetchHomeAttendance = useCallback(async () => {
    if (!user?.classId) {
      setAttendanceCard(null);
      return;
    }
    try {
      const { data } = await api.get<ApiResponse<{ list: HomeAttendanceRaw[] }>>(
        `/classes/${user.classId}/attendances`,
        { params: { page: 1, pageSize: 30 } },
      );
      const body = (data?.data ?? data) as { list?: HomeAttendanceRaw[] };
      const list = body?.list ?? [];
      setAttendanceCard(pickHomeAttendance(list));
    } catch {
      setAttendanceCard(null);
    }
  }, [user?.classId]);

  useEffect(() => {
    fetchHomeAttendance();
  }, [fetchHomeAttendance, refreshToken]);

  // 作业入口角标：统计未提交且未过期的作业
  useEffect(() => {
    if (!user?.classId) {
      setPendingHomeworkCount(0);
      return;
    }
    let cancelled = false;
    api
      .get(`/classes/${user.classId}/homeworks`, { params: { pageSize: 100 } })
      .then((res) => {
        if (cancelled) return;
        const body = res.data?.data || res.data;
        const list = (body?.list || []) as HomeworkRaw[];
        const time = Date.now();
        setPendingHomeworkCount(
          list.filter((h) => {
            if (h.submitted) return false;
            const effective =
              h.myDelayStatus === 'approved' && h.myDelayDeadline ? h.myDelayDeadline : h.deadline;
            return new Date(effective).getTime() > time;
          }).length,
        );
      })
      .catch(() => {
        if (!cancelled) {
          setPendingHomeworkCount(0);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user?.classId, refreshToken]);

  // 活动入口角标：可报名且本人还未报名/未取消的活动数
  useEffect(() => {
    if (!user?.classId) {
      setPendingActivityCount(0);
      return;
    }
    let cancelled = false;
    api
      .get(`/classes/${user.classId}/activities/summary`)
      .then((res) => {
        if (cancelled) return;
        const body = res.data?.data || res.data;
        const count = Number(body?.unregisteredCount);
        setPendingActivityCount(Number.isFinite(count) && count > 0 ? count : 0);
      })
      .catch(() => {
        if (!cancelled) setPendingActivityCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.classId, refreshToken]);

  // 问候语平滑过渡逻辑
  const updateGreeting = useCallback(() => {
    const newGreeting = getGreeting();
    if (newGreeting !== greeting && !isTransitioning) {
      setIsTransitioning(true);
      setTimeout(() => {
        setGreeting(newGreeting);
        setTimeout(() => {
          setIsTransitioning(false);
        }, 300);
      }, 300);
    }
  }, [greeting, isTransitioning]);

  // 问候语定时器：每分钟检查一次，边界时平滑过渡
  useEffect(() => {
    greetingTimerRef.current = window.setInterval(() => {
      updateGreeting();
    }, 60000);

    return () => {
      if (greetingTimerRef.current) {
        window.clearInterval(greetingTimerRef.current);
      }
    };
  }, [updateGreeting]);

  // 获取任务统计
  useEffect(() => {
    if (!user?.classId) {
      setPendingCount(0);
      setCompletionRate(0);
      setTaskStatsState('loading');
      return;
    }

    let cancelled = false;
    setTaskStatsState('loading');

    api
      .get(`/classes/${user.classId}/tasks`)
      .then((res) => {
        if (cancelled) return;
        const body = res.data.data || res.data;
        const { stats } = body as { stats: TaskStats };
        const pending = (stats.todo || 0) + (stats.inProgress || 0);
        setPendingCount(pending);

        // 完成进度 = 已完成任务数 / 任务总数，优先使用后端全量统计值
        const totalCount = (stats.todo || 0) + (stats.inProgress || 0) + (stats.done || 0);
        const fallbackRate = totalCount > 0 ? Math.round(((stats.done || 0) / totalCount) * 100) : 0;
        const rawRate =
          typeof stats.completionRate === 'number' && Number.isFinite(stats.completionRate)
            ? stats.completionRate
            : fallbackRate;
        setCompletionRate(Math.min(Math.max(Math.round(rawRate), 0), 100));
        setTaskStatsState('ready');
      })
      .catch(() => {
        if (!cancelled) setTaskStatsState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [user?.classId, refreshToken]);

  // 今日待办：取最近 3 条未完成任务补齐时间线
  useEffect(() => {
    if (!user?.classId) {
      setPendingTasks([]);
      return;
    }
    let cancelled = false;
    api
      .get(`/classes/${user.classId}/tasks`, {
        params: { status: 'todo,in_progress', page: 1, pageSize: 3 },
      })
      .then((res) => {
        if (cancelled) return;
        const body = res.data?.data || res.data;
        const list = (body?.list || []) as PendingTask[];
        setPendingTasks(list.slice(0, 3));
      })
      .catch(() => {
        if (!cancelled) setPendingTasks([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.classId, refreshToken]);

  // 获取班级动态（最新通知）
  useEffect(() => {
    if (!user?.classId) return;

    setLoadingFeed(true);
    api
      .get<ApiResponse<{ list: MessageItem[] }>>(`/classes/${user.classId}/messages`, {
        params: { pageSize: 3 },
      })
      .then((res) => {
        const feed = (res.data?.data ?? res.data) as { list?: MessageItem[] };
        setFeedItems(feed?.list ?? []);
      })
      .catch(() => {
        setFeedItems([]);
      })
      .finally(() => {
        setLoadingFeed(false);
      });
  }, [user?.classId, refreshToken]);

  // 回到前台时刷新首页数据（避免返回首页后仍是旧数字）
  useEffect(() => {
    const handleVisible = () => {
      if (document.visibilityState === 'visible') {
        setRefreshToken((token) => token + 1);
      }
    };
    document.addEventListener('visibilitychange', handleVisible);
    return () => document.removeEventListener('visibilitychange', handleVisible);
  }, []);

  // 首页「签到」入口统一进考勤首页，由用户自行选择具体签到
  const handleAttendanceEntry = () => {
    navigate('/attendance-list');
  };

  // 班委才能记账，普通同学入口文案改为「班费明细」，避免点进去发现不能操作
  const canManageFee =
    user?.roleLevel === 'owner' ||
    user?.roleLevel === 'admin' ||
    user?.isCommittee === true;

  const isManager = canManageFee;

  const attendanceStatusText = !attendanceCard
    ? '—'
    : attendanceCard.checkedAt
      ? '已签到'
      : attendanceCard.state === 'ongoing'
        ? '进行中'
        : attendanceCard.state === 'upcoming'
          ? '待开始'
          : attendanceCard.state === 'leave'
            ? '已请假'
            : '已结束';

  const quickItems: {
    key: string;
    label: string;
    icon: typeof CheckCircle;
    gradient: string;
    path?: string;
    onClick?: () => void;
    badge?: number;
    /** 红点数据拉取失败、数字可能过期时置灰提示 */
    badgeStale?: boolean;
  }[] = [
    {
      key: 'attendance',
      label: '签到',
      icon: CheckCircle,
      gradient: 'linear-gradient(145deg, #4ADE80, #16A34A)',
      onClick: handleAttendanceEntry,
    },
    {
      key: 'homework',
      label: '作业',
      icon: FileText,
      gradient: 'linear-gradient(145deg, #FDBA74, #F97316)',
      path: '/homework-list',
      badge: pendingHomeworkCount,
    },
    {
      key: 'activity',
      label: '活动',
      icon: Flag,
      gradient: 'linear-gradient(145deg, #FB7185, #E11D48)',
      path: '/activity-list',
      badge: pendingActivityCount,
    },
    {
      key: 'material',
      label: '资料',
      icon: Folder,
      gradient: 'linear-gradient(145deg, #5EEAD4, #0D9488)',
      path: '/material-library',
    },
    {
      key: 'notice',
      label: '通知',
      icon: Bell,
      gradient: 'linear-gradient(145deg, #60A5FA, #2563EB)',
      path: '/messages',
      badge: unread.total,
      badgeStale: unread.stale,
    },
    {
      key: 'vote',
      label: '投票',
      icon: Vote,
      gradient: 'linear-gradient(145deg, #A5B4FC, #6366F1)',
      path: '/vote-list',
    },
    {
      key: 'draw',
      label: '抽签',
      icon: Dices,
      gradient: 'linear-gradient(145deg, #FCD34D, #F59E0B)',
      path: '/random-draw',
    },
    {
      key: 'pomodoro',
      label: '番茄钟',
      icon: Timer,
      gradient: 'linear-gradient(145deg, #FDA4AF, #E11D48)',
      path: '/pomodoro',
    },
    {
      key: 'dashboard',
      label: '数据',
      icon: BarChart3,
      gradient: 'linear-gradient(145deg, #C4B5FD, #7C3AED)',
      path: '/data-dashboard',
    },
    {
      key: 'task-board',
      label: '任务看板',
      icon: ListTodo,
      gradient: 'linear-gradient(145deg, #818CF8, #4F46E5)',
      path: '/task-board',
    },
    {
      key: 'my-attendance',
      label: '我的考勤',
      icon: CalendarCheck,
      gradient: 'linear-gradient(145deg, #6EE7B7, #059669)',
      path: '/my-attendance',
    },
    {
      key: 'my-activities',
      label: '我的活动',
      icon: Trophy,
      gradient: 'linear-gradient(145deg, #FDE68A, #D97706)',
      path: '/my-activities',
    },
    {
      key: 'my-registration',
      label: '我的报名',
      icon: ClipboardCheck,
      gradient: 'linear-gradient(145deg, #67E8F9, #0891B2)',
      path: '/my-registration',
    },
    {
      key: 'member-list',
      label: '班级成员',
      icon: Users,
      gradient: 'linear-gradient(145deg, #7DD3FC, #0284C7)',
      path: '/member-list',
    },
    {
      key: 'class-archive',
      label: '班级档案',
      icon: Archive,
      gradient: 'linear-gradient(145deg, #CBD5E1, #64748B)',
      path: '/class-archive',
    },
    {
      key: 'all',
      label: '全部',
      icon: LayoutGrid,
      gradient: 'linear-gradient(145deg, #94A3B8, #475569)',
      onClick: () => setDrawerOpen(true),
    },
  ];

  // 已签到 / 已请假的签到不再列入今日待办，只保留待签到（进行中 / 即将开始）
  const todoAttendance =
    attendanceCard &&
    !attendanceCard.checkedAt &&
    (attendanceCard.state === 'ongoing' || attendanceCard.state === 'upcoming')
      ? attendanceCard
      : null;

  // 有待办时最多列出 3 条；签到卡占用一行时，任务展示 2 条
  const timelineTasks = pendingTasks.slice(0, todoAttendance ? 2 : 3);
  const hasTodo = Boolean(todoAttendance) || timelineTasks.length > 0;
  const ringCircumference = 2 * Math.PI * 24;
  const ringRate = taskStatsState === 'ready' ? completionRate : 0;

  return (
    <>
      <PhoneFrame className="bg-[#F5F6F8]">
      <div className="flex w-full flex-col items-center">
        {/* Status Bar（真机 App 不渲染，由系统真实状态栏展示） */}
        {!isNative && (
          <div
            data-pencil-name="Status Bar"
            className="box-border w-full h-[62px] shrink-0 flex flex-row gap-[40px] p-[12px_24px_0px_24px] justify-between items-center bg-[#F5F6F8]"
          >
            <div
              data-pencil-name="Time"
              className="text-[14px]/[normal] box-border text-[#1A1A1A] font-data font-semibold text-left [white-space:nowrap]"
            >
              9:41
            </div>
            <div
              data-pencil-name="Status Icons"
              className="box-border w-fit shrink-0 h-fit flex flex-row gap-[6px] justify-start items-center"
            >
              <div
                data-pencil-name="Signal"
                className="text-[14px]/[normal] box-border text-[#1A1A1A] font-caption font-normal text-left [white-space:nowrap]"
              >
                ◉◉◉◉
              </div>
              <div
                data-pencil-name="Battery"
                className="text-[14px]/[normal] box-border text-[#1A1A1A] font-data font-normal text-left [white-space:nowrap]"
              >
                100%
              </div>
            </div>
          </div>
        )}

        {/* Hero */}
        <div
          data-pencil-name="Hero"
          className="relative box-border w-full overflow-hidden rounded-b-[28px] bg-[linear-gradient(152deg,#3D93FF_0%,#0B66FF_52%,#0043BC_100%)] px-[18px]"
          style={{
            paddingTop: isNative
              ? 'calc(var(--safe-top, env(safe-area-inset-top, 0px)) + 16px)'
              : '16px',
            paddingBottom: '48px',
          }}
        >
          <div className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-white/[0.12]" />
          <div className="pointer-events-none absolute -bottom-16 left-6 h-36 w-36 rounded-full bg-white/[0.08]" />

          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div
                data-pencil-name="Greeting"
                className={`text-[20px]/[normal] font-heading font-bold text-white transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
              >
                {greeting}，{user?.name || '同学'}
              </div>
              <div className="mt-2 flex items-center">
                {user?.classId ? (
                  <div className="inline-flex max-w-full items-center rounded-full bg-white/95 px-1.5 py-0.5 shadow-[0_6px_16px_-8px_rgba(2,32,80,0.6)]">
                    <OrgSwitcher />
                  </div>
                ) : (
                  <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px]/[normal] font-body text-white/85">
                    未加入班级
                  </span>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                aria-label="消息通知"
                onClick={() => navigate('/messages')}
                className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/20 transition-transform active:scale-95"
              >
                <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
                {unread.total > 0 ? (
                  <span
                    className={`absolute right-1.5 top-1.5 h-2 w-2 rounded-full ring-2 ring-[#0B66FF] ${
                      unread.stale ? 'bg-[#9CA3AF]' : 'bg-[#FF5A5A]'
                    }`}
                  />
                ) : null}
              </button>
              <button
                type="button"
                aria-label="扫一扫"
                onClick={() => navigate('/scan')}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/20 transition-transform active:scale-95"
              >
                <ScanLine className="h-[18px] w-[18px]" strokeWidth={2} />
              </button>
              <button
                type="button"
                data-pencil-name="Avatar"
                aria-label="个人中心"
                onClick={() => navigate('/personal-center')}
                className="flex h-[42px] w-[42px] items-center justify-center overflow-hidden rounded-full bg-white/20 ring-2 ring-white/40 transition-transform active:scale-95"
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt="头像" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-5 w-5 text-white" strokeWidth={2} />
                )}
              </button>
            </div>
          </div>

          {user?.classId ? (
            <div className="relative mt-4 grid grid-cols-3 rounded-[16px] bg-white/[0.14] py-2.5 backdrop-blur-md">
              <div className="flex flex-col items-center gap-1 border-r border-white/15">
                <div className="flex h-5 items-center">
                  <span className="font-data text-[18px]/[none] font-bold text-white">
                    {taskStatsState === 'ready' ? pendingCount : '--'}
                  </span>
                </div>
                <span className="text-[9.5px]/[normal] font-body text-white/70">今日待办</span>
              </div>
              <div className="flex flex-col items-center gap-1 border-r border-white/15">
                <div className="flex h-5 items-center">
                  <span className="font-data text-[18px]/[none] font-bold text-white">
                    {unread.total > 99 ? '99+' : unread.total}
                  </span>
                </div>
                <span className="text-[9.5px]/[normal] font-body text-white/70">未读消息</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="flex h-5 items-center">
                  <span className="font-data text-[13px]/[none] font-bold text-white">
                    {attendanceStatusText}
                  </span>
                </div>
                <span className="text-[9.5px]/[normal] font-body text-white/70">今日签到</span>
              </div>
            </div>
          ) : null}
        </div>

        {/* 内容卡片区 */}
        <div className="relative z-[2] -mt-9 flex w-full flex-col gap-3 px-[15px] pb-4">
          {!user?.classId ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 w-full">
              <div className="w-20 h-20 rounded-full bg-[#EBF3FF] flex items-center justify-center">
                <School className="w-10 h-10 text-[#0062FF]" strokeWidth={1.5} />
              </div>
              <div className="text-[16px] text-[#4B5563] font-body font-medium">暂无加入班级</div>
              <button
                className="px-6 py-2.5 bg-[#0062FF] text-white rounded-lg text-[14px] font-body font-semibold active:scale-95 transition-transform shadow-lift"
                onClick={() => navigate('/join-class')}
              >
                去加入/创建班级
              </button>
            </div>
          ) : (
          <>
          {/* 今日待办 */}
          <div
            data-pencil-name="今日待办卡片"
            className="box-border w-full rounded-[20px] bg-white px-4 py-3 shadow-soft"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[16px]/[normal] font-heading font-bold text-[#1A1A1A]">
                  今日待办
                </div>
                <div className="mt-1 text-[11px]/[normal] font-caption text-[#94A3B8]">
                  {getTodayDateStr()} ·{' '}
                  {taskStatsState === 'ready' ? `${pendingCount} 项待完成` : '统计中'}
                </div>
              </div>
              <div className="relative flex h-[58px] w-[58px] shrink-0 items-center justify-center">
                <svg viewBox="0 0 60 60" className="h-full w-full -rotate-90">
                  <circle cx="30" cy="30" r="24" fill="none" stroke="#EEF2F7" strokeWidth="6" />
                  <circle
                    cx="30"
                    cy="30"
                    r="24"
                    fill="none"
                    stroke="url(#todoRing)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={
                      ringCircumference * (1 - Math.min(Math.max(ringRate, 0), 100) / 100)
                    }
                    className="transition-[stroke-dashoffset] duration-700 ease-out"
                  />
                  <defs>
                    <linearGradient id="todoRing" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#60A5FA" />
                      <stop offset="100%" stopColor="#0B66FF" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-data text-[15px]/[none] font-bold text-[#0B66FF]">
                    {ringRate}%
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-2.5 flex flex-col gap-1.5">
              {todoAttendance && (
                <div
                  data-pencil-name="待办-签到"
                  className={`flex cursor-pointer items-center gap-2 rounded-[14px] px-3 py-2 transition-colors active:opacity-80 ${
                    todoAttendance.state === 'ongoing' ? 'bg-[#EFF6FF]' : 'bg-[#F8FAFC]'
                  }`}
                  onClick={() =>
                    navigate(`/check-in-detail/${user?.classId}/${todoAttendance.id}`)
                  }
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#DBEAFE]">
                    <Clock className="h-3.5 w-3.5 text-[#2563EB]" strokeWidth={2.5} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="shrink-0 rounded-full bg-[#DBEAFE] px-1.5 py-[1px] text-[9.5px]/[normal] font-body font-semibold text-[#2563EB]">
                        签到
                      </span>
                      <span className="truncate text-[13px]/[normal] font-body font-medium text-[#1A1A1A]">
                        {todoAttendance.title}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-[10.5px]/[normal] font-caption text-[#94A3B8]">
                      {todoAttendance.state === 'ongoing' ? (
                        <>
                          剩余
                          <AttendanceCountdown
                            endTime={todoAttendance.endTime}
                            onExpire={fetchHomeAttendance}
                          />
                        </>
                      ) : (
                        `${formatSchedule(todoAttendance.startTime)} 开始`
                      )}
                    </div>
                  </div>
                  {todoAttendance.state === 'ongoing' ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/check-in-detail/${user?.classId}/${todoAttendance.id}`);
                      }}
                      className="shrink-0 rounded-full bg-[linear-gradient(135deg,#3D93FF,#0B66FF)] px-3 py-1.5 text-[11px]/[normal] font-body font-semibold text-white shadow-[0_6px_14px_-6px_#0B66FF99] transition-transform active:scale-95"
                    >
                      去签到
                    </button>
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#CBD5E1]" />
                  )}
                </div>
              )}

              {timelineTasks.map((task, index) => {
                const parts = task.deadline ? formatScheduleParts(task.deadline) : null;
                const hot = index === 0;
                return (
                  <div
                    key={task.id}
                    data-pencil-name="待办-任务"
                    className="flex cursor-pointer items-center gap-2 rounded-[14px] bg-[#F8FAFC] px-3 py-2 transition-colors active:opacity-80"
                    onClick={() => navigate('/task-board')}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                        hot ? 'bg-[#FFEDD5]' : 'bg-[#EDE9FE]'
                      }`}
                    >
                      <Flag
                        className={`h-3.5 w-3.5 ${hot ? 'text-[#F97316]' : 'text-[#7C3AED]'}`}
                        strokeWidth={2.5}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`shrink-0 rounded-full px-1.5 py-[1px] text-[9.5px]/[normal] font-body font-semibold ${
                            hot ? 'bg-[#FFEDD5] text-[#F97316]' : 'bg-[#EDE9FE] text-[#7C3AED]'
                          }`}
                        >
                          {task.status === 'in_progress' ? '进行中' : '待办'}
                        </span>
                        <span className="truncate text-[13px]/[normal] font-body font-medium text-[#1A1A1A]">
                          {task.title}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[10.5px]/[normal] font-caption text-[#94A3B8]">
                        {parts ? `${parts.day} ${parts.time} 截止` : '无截止时间'}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#CBD5E1]" />
                  </div>
                );
              })}

              {!hasTodo && (
                <div className="flex items-center justify-center gap-1.5 py-2.5">
                  <CheckCircle className="h-4 w-4 text-[#CBD5E1]" strokeWidth={1.5} />
                  <span className="text-[12px]/[normal] font-body text-[#94A3B8]">
                    今天暂无待办，休息一下吧
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigate('/task-board')}
              className="mt-2.5 flex w-full items-center justify-center gap-1 rounded-[12px] bg-[#F5F8FF] py-1.5 text-[12px]/[normal] font-body font-semibold text-[#0B66FF] transition-colors active:bg-[#E8F0FF]"
            >
              查看全部待办
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          </div>

          {/* 常用功能 */}
          <div
            data-pencil-name="常用功能"
            className="box-border w-full rounded-[20px] bg-white p-4 shadow-soft"
          >
            <div className="flex items-center justify-between">
              <div className="text-[15px]/[normal] font-heading font-semibold text-[#1A1A1A]">
                常用功能
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="flex items-center gap-0.5 text-[11px]/[normal] font-caption text-[#94A3B8] active:opacity-70"
              >
                全部
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div
              className="-mx-4 mt-3 flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              onScroll={(event) => {
                const el = event.currentTarget;
                const pageWidth = el.scrollWidth / Math.ceil(quickItems.length / 8);
                setQuickPage(pageWidth > 0 ? Math.round(el.scrollLeft / pageWidth) : 0);
              }}
            >
              {Array.from({ length: Math.ceil(quickItems.length / 8) }).map((_, pageIndex) => (
                <div
                  key={pageIndex}
                  className="grid w-full shrink-0 snap-start grid-cols-4 gap-x-1 gap-y-3 px-4"
                >
                  {quickItems.slice(pageIndex * 8, pageIndex * 8 + 8).map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        data-pencil-name={item.label}
                        onClick={() => {
                          if (item.onClick) {
                            item.onClick();
                          } else if (item.path) {
                            navigate(item.path);
                          }
                        }}
                        className="flex flex-col items-center gap-2 rounded-lg py-1 transition-transform duration-150 active:scale-95"
                      >
                        <span className="relative">
                          <span
                            className="relative flex h-[46px] w-[46px] items-center justify-center overflow-hidden rounded-[15px] shadow-[0_8px_16px_-10px_rgba(15,23,42,0.55)]"
                            style={{ backgroundImage: item.gradient }}
                          >
                            <span className="pointer-events-none absolute left-1 top-0.5 h-3.5 w-8 rounded-full bg-white/25" />
                            <Icon className="relative h-[21px] w-[21px] text-white" strokeWidth={2} />
                          </span>
                          {item.badge && item.badge > 0 ? (
                            <span
                              title={item.badgeStale ? '数据更新延迟，正在重试' : undefined}
                              className={`absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9.5px] font-semibold leading-none text-white ring-2 ring-white ${
                                item.badgeStale ? 'bg-[#9CA3AF]' : 'bg-[#EF4444]'
                              }`}
                            >
                              {item.badge > 99 ? '99+' : item.badge}
                            </span>
                          ) : null}
                        </span>
                        <span className="text-[11px]/[normal] font-body font-medium text-[#334155]">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            {quickItems.length > 8 ? (
              <div className="mt-2.5 flex items-center justify-center gap-1.5">
                {Array.from({ length: Math.ceil(quickItems.length / 8) }).map((_, index) => (
                  <span
                    key={index}
                    className={`h-1 rounded-full transition-all duration-200 ${
                      index === quickPage ? 'w-3.5 bg-[#CBD5E1]' : 'w-1 bg-[#E2E8F0]'
                    }`}
                  />
                ))}
              </div>
            ) : null}
          </div>

          {/* 番茄钟迷你计时卡：仅在计时中/暂停时出现，空闲时不占位 */}
          <PomodoroMiniCard />

          {/* 班级动态 */}
          <div
            data-pencil-name="班级动态卡片"
            className="box-border w-full rounded-[20px] bg-white p-4 shadow-soft"
          >
            <div className="flex items-center justify-between">
              <div className="text-[15px]/[normal] font-heading font-semibold text-[#1A1A1A]">
                班级动态
              </div>
              <button
                type="button"
                onClick={() => navigate('/messages')}
                className="flex items-center gap-0.5 text-[11px]/[normal] font-caption text-[#94A3B8] active:opacity-70"
              >
                查看全部
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className="mt-2 flex w-full flex-col">
              {loadingFeed ? (
                <div className="flex flex-col gap-3 py-2">
                  {[0, 1, 2].map((index) => (
                    <div key={index} className="flex animate-pulse items-center gap-3">
                      <div className="h-11 w-11 shrink-0 rounded-[14px] bg-[#F1F5F9]" />
                      <div className="flex flex-1 flex-col gap-2">
                        <div className="h-3 w-2/3 rounded bg-[#F1F5F9]" />
                        <div className="h-2.5 w-1/3 rounded bg-[#F5F7FA]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : feedItems.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EBF3FF]">
                    <Bell className="h-6 w-6 text-[#0062FF80]" strokeWidth={1.5} />
                  </div>
                  <div className="text-[12px]/[normal] font-body text-[#9CA3AF]">
                    暂无班级动态
                  </div>
                </div>
              ) : (
                feedItems.map((item) => {
                  const meta = TYPE_META[item.type] || TYPE_META.default;
                  const Icon = meta.icon;
                  return (
                    <div
                      key={item.id}
                      data-pencil-name={item.title}
                      role="button"
                      onClick={() => navigate(`/message-detail/${item.id}`)}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-[14px] px-1 py-2 transition-colors duration-150 active:bg-[#F8FAFC]"
                    >
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]"
                        style={{
                          backgroundImage: `linear-gradient(145deg, ${meta.color}F2, ${meta.color}99)`,
                        }}
                      >
                        <Icon className="h-5 w-5 text-white" strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="shrink-0 rounded-full px-1.5 py-[1px] text-[9.5px]/[normal] font-body font-semibold"
                            style={{ backgroundColor: `${meta.color}1A`, color: meta.color }}
                          >
                            {meta.label}
                          </span>
                          <span className="truncate text-[13.5px]/[normal] font-body font-medium text-[#1A1A1A]">
                            {item.title}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[10.5px]/[normal] font-caption text-[#94A3B8]">
                          {formatRelativeTime(item.createdAt)} · {item.publisher?.name || '未知'}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-[#CBD5E1]" />
                    </div>
                  );
                })
              )}
            </div>
          </div>
          </>
          )}
        </div>
      </div>
      </PhoneFrame>

      <FeatureDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onAttendance={handleAttendanceEntry}
        isManager={isManager}
        canManageFee={canManageFee}
        orgName={user?.className}
        counts={{
          unread: unread.total,
          homework: pendingHomeworkCount,
          activity: pendingActivityCount,
        }}
      />
    </>
  );
}
