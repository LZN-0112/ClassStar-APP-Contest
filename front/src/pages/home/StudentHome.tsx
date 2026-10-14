import { useState, useEffect, useRef, useCallback } from 'react';
import PhoneFrame from '@/components/layout/PhoneFrame';
import { useNavigate } from 'react-router-dom';
import { isNative } from '@/lib/capacitor';
import { useStatusBarStyle } from '@/hooks/useStatusBarStyle';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import OrgSwitcher from '@/components/org/OrgSwitcher';
import { api, ApiResponse } from '@/lib/api';
import {
  Bell,
  CheckCircle,
  FileText,
  Flag,
  Folder,
  User,
  ChevronRight,
  Wallet,
  Dices,
  Vote,
  Clock,
  ScanLine,
  School,
  Sparkles,
} from 'lucide-react';

interface TaskStats {
  todo: number;
  inProgress: number;
  done: number;
}

interface TaskItem {
  id: string;
  title: string;
  progress: number;
  status: string;
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

// 通知类型映射图标和颜色
const TYPE_ICON_MAP: Record<string, { icon: typeof Bell; color: string }> = {
  notice: { icon: Bell, color: '#EF4444' },
  attendance: { icon: CheckCircle, color: '#22C55E' },
  homework: { icon: FileText, color: '#F97316' },
  activity: { icon: Flag, color: '#3B82F6' },
  default: { icon: Bell, color: '#6B7280' },
};

export default function StudentHome() {
  useStatusBarStyle(false); // 首页浅色背景 → 系统状态栏深色(黑)图标
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [pendingCount, setPendingCount] = useState(0);
  const [avgProgress, setAvgProgress] = useState(0);
  const [feedItems, setFeedItems] = useState<MessageItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [greeting, setGreeting] = useState(getGreeting());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const greetingTimerRef = useRef<number | null>(null);

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
    if (!user?.classId) return;

    api
      .get(`/classes/${user.classId}/tasks`)
      .then((res) => {
        const body = res.data.data || res.data;
        const { stats, list } = body as { stats: TaskStats; list: TaskItem[] };
        const pending = stats.todo + stats.inProgress;
        setPendingCount(pending);

        // 计算平均进度
        if (list.length > 0) {
          const totalProgress = list.reduce((sum, t) => sum + (t.progress || 0), 0);
          setAvgProgress(Math.round(totalProgress / list.length));
        } else {
          setAvgProgress(0);
        }
      })
      .catch(() => {
        // 静默失败，保持默认值
      });
  }, [user?.classId]);

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
  }, [user?.classId]);

  const quickItems = [
    { label: '通知', icon: Bell, color: '#2563EB', path: '/messages' },
    { label: '签到', icon: CheckCircle, color: '#22C55E', path: '/attendance-list' },
    { label: '作业', icon: FileText, color: '#F97316', path: '/homework-list' },
    { label: '活动', icon: Flag, color: '#EF4444', path: '/activity-list' },
    { label: '资料', icon: Folder, color: '#A855F7', path: '/material-library' },
    { label: '班费记账', icon: Wallet, color: '#10B981', path: '/fee-ledger' },
    { label: '抽签', icon: Dices, color: '#8B5CF6', path: '/random-draw' },
    { label: '投票', icon: Vote, color: '#3B82F6', path: '/vote-list' },
  ];

  const moreItem = { label: '番茄钟', icon: Clock, color: '#F59E0B', path: '/pomodoro' };

  return (
    <PhoneFrame className="bg-[#F5F5F5]">
      <div className="flex w-full flex-col items-center">
        {/* Status Bar（真机 App 不渲染，由系统真实状态栏展示） */}
        {!isNative && (
          <div
            data-pencil-name="Status Bar"
            className="box-border w-full h-[62px] shrink-0 flex flex-row gap-[40px] p-[12px_24px_0px_24px] justify-between items-center bg-[#F5F5F5]"
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

        {/* Header */}
        <div
          data-pencil-name="Header"
          className="box-border w-full flex flex-col gap-0 justify-start items-center bg-[#F5F5F5]"
          style={{
            padding: isNative
              ? 'calc(var(--safe-top, env(safe-area-inset-top, 0px)) + 12px) 20px 16px'
              : '12px 20px 16px',
          }}
        >
          <div
            data-pencil-name="Header Content"
            className="box-border w-full [flex:1_1_0] flex flex-row gap-0 justify-between items-center"
          >
            <div
              data-pencil-name="Header Text"
              className="box-border w-fit shrink-0 h-fit flex flex-col gap-[4px] justify-start items-start"
            >
              <div
                data-pencil-name="Greeting"
                className={`text-[20px]/[normal] box-border text-[#1A1A1A] font-heading font-bold text-left [white-space:nowrap] transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
              >
                {greeting}，{user?.name || '同学'}
              </div>
              {user?.classId ? (
                <OrgSwitcher />
              ) : (
                <div
                  data-pencil-name="Subtitle"
                  className="text-[13px]/[normal] box-border opacity-[0.9] text-[#1A1A1A] font-body font-normal text-left [white-space:nowrap]"
                >
                  未加入班级
                </div>
              )}
            </div>
            <div className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-center items-center">
              <div
                className="box-border w-[40px] shrink-0 h-[40px] flex flex-row gap-0 justify-center items-center bg-[#FFFFFF] rounded-full cursor-pointer active:scale-95 transition-transform duration-150 hover:bg-[#F8FAFC]"
                onClick={() => navigate('/scan')}
              >
                <ScanLine className="w-[20px] h-[20px] text-[#0062FF]" strokeWidth={2} />
              </div>
              <div
                data-pencil-name="Avatar"
                className="box-border w-[48px] shrink-0 h-[48px] rounded-full overflow-hidden bg-[#FFFFFF] cursor-pointer active:scale-95 transition-transform duration-150 hover:bg-[#F8FAFC] flex items-center justify-center"
                onClick={() => navigate('/personal-center')}
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt="头像" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-[24px] h-[24px] text-[#0062FF]" strokeWidth={2} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 内容卡片区 */}
        <div className="flex w-full flex-col items-center gap-4 px-[15px] pb-4">
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
          {/* 今日待办卡片 */}
          <div
            data-pencil-name="今日待办卡片"
            className="box-border w-full flex flex-col gap-5 p-5 justify-center items-start [background-image:linear-gradient(-133.249deg,_#0062FF_25.619%,_#004ECC_74.381%)] bg-no-repeat bg-[length:100%_100%] rounded-xl shadow-lift"
          >
            <div
              data-pencil-name="Top Row"
              className="box-border w-full h-fit shrink-0 flex flex-row gap-0 justify-between items-center"
            >
              <div
                data-pencil-name="Left Text"
                className="box-border w-fit shrink-0 h-fit flex flex-col gap-[6px] justify-start items-start"
              >
                <div className="flex items-center gap-2">
                  <div
                    data-pencil-name="Title"
                    className="text-[20px]/[normal] box-border text-[#FFFFFF] font-heading font-bold text-left [white-space:nowrap]"
                  >
                    今日待办
                  </div>
                  <Sparkles className="w-4 h-4 text-[#FFFFFFCC]" strokeWidth={2} />
                </div>
                <div
                  data-pencil-name="Date"
                  className="text-[12px]/[normal] box-border opacity-[0.75] text-[#FFFFFF] font-caption font-normal text-left [white-space:nowrap]"
                >
                  {getTodayDateStr()} · {pendingCount} 个待办事项
                </div>
              </div>
              <div
                data-pencil-name="Progress"
                className="box-border w-fit shrink-0 h-fit flex flex-col gap-[6px] justify-start items-end"
              >
                <div
                  data-pencil-name="Label"
                  className="text-[12px]/[normal] box-border opacity-[0.9] text-[#FFFFFF] font-body font-normal text-left [white-space:nowrap]"
                >
                  完成进度 {avgProgress}%
                </div>
                <div
                  data-pencil-name="Track"
                  className="box-border w-[120px] h-[6px] shrink-0 flex flex-row gap-0 justify-start items-start bg-[#FFFFFF33] rounded-full"
                >
                  <div
                    data-pencil-name="Fill"
                    className="box-border shrink-0 h-[6px] bg-[#FFFFFF] rounded-full transition-[width] duration-500 ease-out"
                    style={{ width: `${Math.min(avgProgress, 100) * 1.2}px` }}
                  ></div>
                </div>
              </div>
            </div>
            <div
              data-pencil-name="Button Row"
              className="box-border w-full h-fit shrink-0 flex flex-row gap-0 justify-start items-start"
            >
              <div
                data-pencil-name="View Button"
                className="box-border w-fit shrink-0 h-fit flex flex-row gap-[4px] p-[8px_14px] justify-center items-center bg-[#FFFFFF] rounded-full cursor-pointer active:scale-95 transition-transform duration-150"
                onClick={() => navigate('/task-board')}
              >
                <div
                  data-pencil-name="Label"
                  className="text-[13px]/[normal] box-border text-[#0062FF] font-body font-bold text-left [white-space:nowrap]"
                >
                  查看待办
                </div>
                <ChevronRight className="w-[16px] h-[16px] text-[#0062FF]" strokeWidth={2} />
              </div>
            </div>
          </div>

          {/* Quick Grid */}
          <div
            data-pencil-name="Quick Grid"
            className="box-border w-full flex flex-col gap-4 p-4 justify-start items-center bg-[#FFFFFF] rounded-xl shadow-soft"
          >
            <div className="box-border w-full grid grid-cols-4 gap-3 justify-items-center">
              {quickItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    data-pencil-name={item.label}
                    className="box-border w-[70px] flex flex-col gap-2 p-[6px_0px] justify-center items-center rounded-lg cursor-pointer transition-transform duration-150 active:scale-95 active:bg-[#F8FAFC]"
                    onClick={() => {
                      navigate(item.path);
                    }}
                  >
                    <div
                      data-pencil-name="Icon Container"
                      className="box-border w-[42px] h-[42px] shrink-0 shadow-icon flex flex-row gap-0 justify-center items-center rounded-xl relative overflow-hidden"
                      style={{ backgroundColor: item.color }}
                    >
                      <div className="pointer-events-none absolute left-0 top-0 h-4 w-10 rounded-full bg-white opacity-[0.22]" />
                      <Icon className="w-[22px] h-[22px] text-white relative z-0" strokeWidth={2} />
                    </div>
                    <div
                      data-pencil-name="Label"
                      className="text-[12px]/[normal] box-border text-[#1A1A1A] font-body font-medium text-center [white-space:nowrap]"
                    >
                      {item.label}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* 更多按钮（第9项放最后一行右侧） */}
            <div className="box-border w-full grid grid-cols-4 gap-3 justify-items-center pt-2 border-t border-[#F3F4F6]">
              <div
                data-pencil-name={moreItem.label}
                className="box-border w-[70px] flex flex-col gap-2 p-[6px_0px] justify-center items-center rounded-lg cursor-pointer transition-transform duration-150 active:scale-95 active:bg-[#F8FAFC]"
                onClick={() => navigate(moreItem.path)}
              >
                <div
                  data-pencil-name="Icon Container"
                  className="box-border w-[42px] h-[42px] shrink-0 shadow-icon flex flex-row gap-0 justify-center items-center rounded-xl relative overflow-hidden"
                  style={{ backgroundColor: moreItem.color }}
                >
                  <div className="pointer-events-none absolute left-0 top-0 h-4 w-10 rounded-full bg-white opacity-[0.22]" />
                  <moreItem.icon className="w-[22px] h-[22px] text-white relative z-0" strokeWidth={2} />
                </div>
                <div
                  data-pencil-name="Label"
                  className="text-[12px]/[normal] box-border text-[#1A1A1A] font-body font-medium text-center [white-space:nowrap]"
                >
                  {moreItem.label}
                </div>
              </div>
            </div>
          </div>

          {/* 班级动态卡片 */}
          <div
            data-pencil-name="班级动态卡片"
            className="box-border w-full flex flex-col gap-[15px] p-4 justify-start items-center bg-[#FFFFFF] rounded-xl shadow-soft"
          >
            <div
              data-pencil-name="Feed Header"
              className="box-border w-full h-fit shrink-0 flex flex-row gap-0 justify-between items-center"
            >
              <div
                data-pencil-name="Title"
                className="text-[16px]/[normal] box-border text-[#1A1A1A] font-heading font-semibold text-left [white-space:nowrap]"
              >
                班级动态
              </div>
              <div
                data-pencil-name="More"
                className="text-[12px]/[normal] box-border text-[#0062FF] font-caption font-normal text-left [white-space:nowrap] cursor-pointer active:opacity-70 transition-opacity"
                onClick={() => navigate('/class-home')}
              >
                查看全部
              </div>
            </div>
            <div
              data-pencil-name="Feed"
              className="box-border w-full flex flex-col gap-[10px] justify-start items-start bg-[#00000000]"
            >
              {loadingFeed ? (
                <div className="w-full py-8 flex flex-col items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#F3F4F6] flex items-center justify-center">
                    <School className="w-5 h-5 text-[#9CA3AF]" strokeWidth={2} />
                  </div>
                  <div className="text-[13px] text-[#9CA3AF]">加载中...</div>
                </div>
              ) : feedItems.length === 0 ? (
                <div className="w-full py-8 flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#EBF3FF] flex items-center justify-center">
                    <Bell className="w-6 h-6 text-[#0062FF80]" strokeWidth={1.5} />
                  </div>
                  <div className="text-[13px] text-[#9CA3AF]">暂无班级动态</div>
                </div>
              ) : (
                feedItems.map((item) => {
                  const typeConfig = TYPE_ICON_MAP[item.type] || TYPE_ICON_MAP.default;
                  const Icon = typeConfig.icon;
                  const relativeTime = formatRelativeTime(item.createdAt);
                  const meta = `${relativeTime} · ${item.publisher?.name || '未知'}`;
                  return (
                    <div
                      key={item.id}
                      data-pencil-name={item.title}
                      className="box-border w-full flex flex-row gap-[12px] p-[6px_8px] justify-start items-center rounded-lg cursor-pointer transition-colors duration-150 active:bg-[#F8FAFC]"
                      onClick={() => {
                        navigate(`/message-detail/${item.id}`);
                      }}
                    >
                      <div
                        data-pencil-name="Icon Container"
                        className="box-border w-[40px] shrink-0 h-[40px] shadow-icon flex flex-row gap-0 justify-center items-center rounded-lg relative overflow-hidden"
                        style={{ backgroundColor: typeConfig.color }}
                      >
                        <div className="pointer-events-none absolute left-0 top-0 h-3 w-8 rounded-full bg-white opacity-[0.22]" />
                        <Icon className="w-[20px] h-[20px] text-white relative z-0" strokeWidth={2} />
                      </div>
                      <div
                        data-pencil-name="Text"
                        className="box-border [flex:1_1_0] h-fit flex flex-col gap-[2px] justify-start items-start overflow-hidden"
                      >
                        <div
                          data-pencil-name="Title"
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-medium text-left truncate w-full"
                        >
                          {item.title}
                        </div>
                        <div
                          data-pencil-name="Meta"
                          className="text-[11px]/[normal] box-border text-[#4B5563] font-caption font-normal text-left [white-space:nowrap]"
                        >
                          {meta}
                        </div>
                      </div>
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
  );
}
