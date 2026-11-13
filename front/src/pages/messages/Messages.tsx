import PhoneFrame from '@/components/layout/PhoneFrame';
import StatusBar from '@/components/layout/StatusBar';
import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  BellRing,
  CalendarCheck,
  ChevronLeft,
  CircleCheck,
  FileText,
  Inbox,
  Search,
  Ticket,
  UserCheck,
  Wallet,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useStatusBarStyle } from '@/hooks/useStatusBarStyle';
import { api } from '@/lib/api';
import { isNative } from '@/lib/capacitor';
import { toast } from 'sonner';

/** 封面高度：滚动此距离后顶栏完全落下 */
const COVER_H = 200;

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

interface MessageItem {
  id: string;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  requireAck: boolean;
  status: string;
  createdAt: string;
  publisher?: { id: string; name: string; avatar?: string };
  ackDeadline?: string | null;
  isAcked?: boolean;
  ackCount?: number;
}

type FilterKey = 'all' | 'unread' | 'todo';

interface TypeStyle {
  label: string;
  icon: LucideIcon;
  bg: string;
  color: string;
}

const typeStyles: Record<string, TypeStyle> = {
  notice: { label: '通知', icon: Bell, bg: 'bg-[#DBEAFE]', color: 'text-[#2563EB]' },
  reminder: { label: '催办', icon: BellRing, bg: 'bg-[#FFEDD5]', color: 'text-[#EA580C]' },
  important: { label: '重要', icon: Bell, bg: 'bg-[#FEE2E2]', color: 'text-[#DC2626]' },
  homework: { label: '作业', icon: FileText, bg: 'bg-[#DBEAFE]', color: 'text-[#1986E6]' },
  activity: { label: '活动', icon: CalendarCheck, bg: 'bg-[#DCFCE7]', color: 'text-[#16A34A]' },
  activity_result: { label: '报名结果', icon: CalendarCheck, bg: 'bg-[#DCFCE7]', color: 'text-[#16A34A]' },
  activity_start: { label: '活动提醒', icon: BellRing, bg: 'bg-[#FFEDD5]', color: 'text-[#EA580C]' },
  deadline_reminder: { label: '截止提醒', icon: BellRing, bg: 'bg-[#FFEDD5]', color: 'text-[#EA580C]' },
  homework_urge: { label: '作业催交', icon: BellRing, bg: 'bg-[#FFEDD5]', color: 'text-[#EA580C]' },
  vote: { label: '投票', icon: CircleCheck, bg: 'bg-[#FEF3C7]', color: 'text-[#D97706]' },
  attendance: { label: '考勤', icon: UserCheck, bg: 'bg-[#E0F2FE]', color: 'text-[#0284C7]' },
  random_draw: { label: '抽签', icon: Ticket, bg: 'bg-[#F3E8FF]', color: 'text-[#9333EA]' },
  fee: { label: '班费', icon: Wallet, bg: 'bg-[#DCFCE7]', color: 'text-[#16A34A]' },
};

const fallbackStyle: TypeStyle = {
  label: '消息',
  icon: Inbox,
  bg: 'bg-[#F3F4F6]',
  color: 'text-[#4B5563]',
};

function formatTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return minutes + '分钟前';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + '小时前';
  const days = Math.floor(hours / 24);
  if (days < 7) return days + '天前';
  return date.getMonth() + 1 + '月' + date.getDate() + '日';
}

/** 列表按“今天 / 昨天 / 更早”分组，保持接口返回的时间倒序 */
function dayLabel(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const time = date.getTime();
  if (time >= startOfToday) return '今天';
  if (time >= startOfToday - 24 * 60 * 60 * 1000) return '昨天';
  return '更早';
}

/** 签收倒计时，仅对设置了截止时间的签收通知展示 */
function deadlineText(deadline?: string | null) {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return '已截止';
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return `${Math.max(1, Math.floor(diff / 60000))} 分钟后截止`;
  if (hours < 24) return `${hours} 小时后截止`;
  return `${Math.floor(hours / 24)} 天后截止`;
}

function statusBadge(message: MessageItem) {
  if (message.requireAck) {
    if (message.isAcked) return { text: '已签收', cls: 'bg-[#ECFDF5] text-[#059669]' };
    if (message.ackDeadline && new Date(message.ackDeadline).getTime() <= Date.now()) {
      return { text: '已截止', cls: 'bg-[#F3F4F6] text-[#6B7280]' };
    }
    return { text: '待签收', cls: 'bg-[#FFF7ED] text-[#EA580C]' };
  }
  if (message.status === 'ended') return { text: '已结束', cls: 'bg-[#F3F4F6] text-[#6B7280]' };
  if (
    message.type !== 'notice' &&
    message.type !== 'reminder' &&
    message.type !== 'deadline_reminder'
  ) {
    return { text: '动态', cls: 'bg-[#EFF6FF] text-[#2563EB]' };
  }
  return null;
}

function SkeletonCard() {
  return (
    <div className="w-full animate-pulse rounded-[16px] border border-[#EEF0F3] bg-white p-3.5">
      <div className="flex gap-3">
        <div className="h-10 w-10 shrink-0 rounded-xl bg-[#EEF1F5]" />
        <div className="flex-1">
          <div className="h-4 w-2/3 rounded bg-[#EEF1F5]" />
          <div className="mt-2 h-3 w-full rounded bg-[#F3F5F8]" />
          <div className="mt-2 h-2.5 w-1/3 rounded bg-[#F3F5F8]" />
        </div>
      </div>
    </div>
  );
}

export default function Messages() {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useCurrentUser();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [keyword, setKeyword] = useState('');

  /** 顶栏图标/文字是否已切到深色（相对浅色顶栏底） */
  const [darkInk, setDarkInk] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const barBgRef = useRef<HTMLDivElement>(null);
  const darkInkRef = useRef(false);
  const blurRef = useRef(false);

  useStatusBarStyle(!darkInk);

  /** 滚动驱动顶部折叠：p=0 封面铺满，p=1 顶栏完全落下 */
  useEffect(() => {
    const scroller = scrollerRef.current;
    const header = headerRef.current;
    const bar = barRef.current;
    const cover = coverRef.current;
    if (!scroller || !header || !bar || !cover) return;

    let raf = 0;
    const apply = () => {
      raf = 0;
      // D = 封面高度 − 顶栏高度：p 从 0 到 1 刚好让封面完全退出顶栏
      const distance = Math.max(cover.offsetHeight - bar.offsetHeight, 1);
      const p = clamp01(scroller.scrollTop / distance);
      header.style.setProperty('--bar-a', p.toFixed(3));
      header.style.setProperty('--title-a', clamp01((p - 0.7) / 0.3).toFixed(3));
      // 封面快要滚出时把底色补实，避免滚到底后内容从底边渐隐区透出
      header.style.setProperty('--solid-a', clamp01((p - 0.86) / 0.14).toFixed(3));
      // 底色出现后叠加磨砂，让半透明白压在封面上时是玻璃质感而不是一块灰板
      const nextBlur = p > 0.2;
      if (nextBlur !== blurRef.current) {
        blurRef.current = nextBlur;
        const bg = barBgRef.current;
        if (bg) {
          const value = nextBlur ? 'saturate(160%) blur(14px)' : '';
          bg.style.backdropFilter = value;
          bg.style.setProperty('-webkit-backdrop-filter', value);
        }
      }
      // 明暗切换加滞回，避免在临界点来回抖动
      const nextDark = darkInkRef.current ? p > 0.5 : p > 0.62;
      if (nextDark !== darkInkRef.current) {
        darkInkRef.current = nextDark;
        setDarkInk(nextDark);
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };

    apply();
    scroller.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      scroller.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  const classId = user?.classId;

  useEffect(() => {
    // 等待用户数据加载完成
    if (userLoading) return;

    const fetchMessages = async () => {
      if (!classId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setLoadError(false);
      try {
        const res = await api.get(`/classes/${classId}/messages?pageSize=100`);
        const data = res.data.data || res.data;
        setMessages(data.list || []);
        setMemberCount(Number(data.memberCount) || 0);
      } catch (err) {
        setLoadError(true);
        toast.error(err instanceof Error ? err.message : '获取消息列表失败');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [classId, userLoading, reloadKey]);

  /** 待我处理：要求签收且我还没签收的消息 */
  const todoCount = useMemo(
    () => messages.filter((m) => m.requireAck && !m.isAcked).length,
    [messages],
  );
  const unreadCount = useMemo(() => messages.filter((m) => !m.isRead).length, [messages]);

  const filteredMessages = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return messages.filter((m) => {
      if (filter === 'unread' && m.isRead) return false;
      if (filter === 'todo' && !(m.requireAck && !m.isAcked)) return false;
      if (!kw) return true;
      const publisher = m.publisher?.name || '';
      return `${m.title} ${m.content} ${publisher}`.toLowerCase().includes(kw);
    });
  }, [messages, filter, keyword]);

  const groups = useMemo(() => {
    const order = ['今天', '昨天', '更早'];
    const map = new Map<string, MessageItem[]>();
    filteredMessages.forEach((m) => {
      const label = dayLabel(m.createdAt);
      const list = map.get(label);
      if (list) list.push(m);
      else map.set(label, [m]);
    });
    return order
      .filter((label) => map.has(label))
      .map((label) => ({ label, items: map.get(label) as MessageItem[] }));
  }, [filteredMessages]);

  const filters: Array<{ key: FilterKey; label: string; count: number }> = [
    { key: 'all', label: '全部', count: messages.length },
    { key: 'unread', label: '未读', count: unreadCount },
    { key: 'todo', label: '待我处理', count: todoCount },
  ];

  const emptyText = keyword.trim()
    ? '没有找到相关消息'
    : filter === 'todo'
      ? '所有事项都处理完了'
      : filter === 'unread'
        ? '没有未读消息'
        : '暂无消息';

  const coverSubtitle =
    loading || !classId
      ? '班级通知与动态'
      : `${messages.length} 条消息${unreadCount > 0 ? ` · ${unreadCount} 条未读` : ''}`;

  return (
    <PhoneFrame className="bg-[#F5F7FA]" scrollerRef={scrollerRef}>
      <div className="relative flex min-h-full w-full flex-col bg-[#F5F7FA]">
        {/* 固定顶栏：sticky + h-0 不占内容空间，内部向下溢出显示 */}
        <header ref={headerRef} className="pointer-events-none sticky top-0 z-30 h-0">
          <div
            ref={barRef}
            className="relative w-full"
            style={{
              paddingTop: isNative ? 'var(--safe-top, env(safe-area-inset-top, 0px))' : undefined,
            }}
          >
            {/* 顶栏底色：alpha 由滚动进度驱动；底部一段渐隐，磨砂随之淡出，避免与封面形成硬边 */}
            <div
              ref={barBgRef}
              className="absolute inset-0"
              style={{
                backgroundColor: 'rgba(245, 247, 250, var(--bar-a, 0))',
                maskImage: 'linear-gradient(180deg, #000 0%, #000 76%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(180deg, #000 0%, #000 76%, transparent 100%)',
              }}
            />
            {/* 收尾补实：封面即将滚完时铺满，内容不会从底边透出 */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{ backgroundColor: 'rgba(245, 247, 250, var(--solid-a, 0))' }}
            />
            {/* 封面上方的压暗遮罩：保证状态栏白字始终可读 */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-[160px] transition-opacity duration-300"
              style={{
                opacity: darkInk ? 0 : 1,
                background:
                  'linear-gradient(180deg, rgba(4,24,52,0.46) 0%, rgba(4,24,52,0.20) 52%, rgba(4,24,52,0) 100%)',
              }}
            />
            <StatusBar light={!darkInk} />
            <div className="relative flex h-[56px] items-center justify-center px-5">
              <button
                type="button"
                aria-label="返回"
                onClick={() => navigate('/home')}
                className="absolute left-3.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-[#0B66FF] shadow-[0_6px_16px_-10px_rgba(15,40,90,0.6)] backdrop-blur active:scale-95"
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={2.2} />
              </button>
              {/* 标题：p > 0.7 后淡入，与滚走的封面大标题交接 */}
              <div
                className="text-[17px] font-semibold tracking-[0.5px] text-[#0F172A]"
                style={{ opacity: 'var(--title-a, 0)' }}
              >
                消息中心
              </div>
            </div>
          </div>
        </header>

        {/* 封面：随内容自然滚出（不接管滚动，纯 CSS 位移） */}
        <div
          ref={coverRef}
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 z-0 w-full overflow-hidden rounded-b-[22px] shadow-[0_10px_24px_-12px_rgba(15,110,200,0.55)]"
          style={{
            height: COVER_H,
            backgroundImage:
              'linear-gradient(152deg, #3D93FF 0%, #0B66FF 52%, #0043BC 100%)',
          }}
        >
          <div className="pointer-events-none absolute -right-[40px] -top-[48px] h-[150px] w-[150px] rounded-full bg-white/[0.14]" />
          <BellRing
            className="pointer-events-none absolute right-[12px] top-[42px] h-[104px] w-[104px] text-white/[0.22]"
            strokeWidth={1.5}
          />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, rgba(3,14,32,0) 52%, rgba(3,14,32,0.40) 100%)',
            }}
          />
          {/* 标题块：底边留出 52px = 搜索卡上浮 32px + 20px 间距 */}
          <div className="absolute inset-x-0 bottom-[52px] px-5">
            <div className="font-heading text-[28px] font-bold leading-[1.2] tracking-[1px] text-white">
              消息中心
            </div>
            <div className="mt-[5px] text-[12px] tracking-[0.4px] text-white/75">{coverSubtitle}</div>
          </div>
        </div>
        {/* 流内占位：让正文从封面下方开始，封面本身由绝对定位层绘制 */}
        <div className="shrink-0" style={{ height: COVER_H }} aria-hidden />

        <main className="relative z-10 flex w-full flex-1 flex-col px-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
          {/* 搜索 / 筛选：浮在封面上的一层白卡 */}
          <div className="-mt-8 w-full rounded-2xl border border-[#EDF1F7] bg-white p-3.5 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.45)]">
            <div className="flex h-10 w-full items-center gap-2 rounded-xl bg-[#F3F4F6] px-3">
              <Search className="h-4 w-4 shrink-0 text-[#9CA3AF]" strokeWidth={2} />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索标题、内容或发布人"
                className="min-w-0 flex-1 bg-transparent font-body text-[13px] text-[#1A1A1A] outline-none placeholder:text-[#9CA3AF]"
              />
              {keyword && (
                <button
                  type="button"
                  aria-label="清空搜索"
                  className="shrink-0 text-[#9CA3AF] active:opacity-70"
                  onClick={() => setKeyword('')}
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              )}
            </div>

            <div className="mt-3 flex flex-row gap-2">
              {filters.map((item) => {
                const active = filter === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilter(item.key)}
                    className={`box-border h-8 shrink-0 flex flex-row items-center gap-1 rounded-full px-3 font-body text-[12px] font-medium transition-colors active:opacity-80 ${
                      active
                        ? 'bg-[#0062FF] text-[#FFFFFF]'
                        : 'border border-[#E5E7EB] bg-[#FFFFFF] text-[#4B5563]'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.count > 0 && (
                      <span
                        className={`font-data text-[11px] ${active ? 'text-[#FFFFFF]' : 'text-[#9CA3AF]'}`}
                      >
                        {item.count > 99 ? '99+' : item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 消息列表：跟随整页滚动 */}
          <div className="mt-3 flex w-full flex-1 flex-col">
          {loading ? (
            <div className="flex w-full flex-col gap-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : loadError ? (
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="w-full py-10 text-center font-body text-[14px] text-[#0062FF]"
            >
              加载失败，点击重试
            </button>
          ) : groups.length === 0 ? (
            <div className="flex w-full flex-col items-center gap-2 py-16">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EEF2F7]">
                <Inbox className="h-7 w-7 text-[#9CA3AF]" strokeWidth={1.6} />
              </div>
              <div className="font-body text-[14px] font-medium text-[#4B5563]">{emptyText}</div>
              {(keyword.trim() || filter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setKeyword('');
                    setFilter('all');
                  }}
                  className="mt-1 rounded-full bg-[#EFF4FF] px-4 py-1.5 font-body text-[12px] font-medium text-[#0062FF] active:opacity-80"
                >
                  查看全部消息
                </button>
              )}
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.label} className="mb-4 flex w-full flex-col gap-2">
                <div className="px-1 font-body text-[12px] font-semibold text-[#6B7280]">
                  {group.label}
                </div>
                {group.items.map((message) => {
                  const style = typeStyles[message.type] || fallbackStyle;
                  const Icon = style.icon;
                  const badge = statusBadge(message);
                  const deadline = deadlineText(message.ackDeadline);
                  const progress =
                    message.requireAck && memberCount > 0
                      ? Math.min(100, Math.round(((message.ackCount || 0) / memberCount) * 100))
                      : null;
                  return (
                    <div
                      key={message.id}
                      onClick={() => navigate(`/message-detail/${message.id}`)}
                      className={`relative box-border w-full cursor-pointer rounded-[16px] border p-3.5 shadow-[0px_2px_10px_0px_rgba(15,23,42,0.04)] transition-opacity active:opacity-80 ${
                        message.isRead
                          ? 'border-[#EEF0F3] bg-[#FFFFFF]'
                          : 'border-[#DBEAFE] bg-[#F5F9FF]'
                      }`}
                    >
                      <div className="flex flex-row gap-3">
                        <div
                          className={`box-border flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.bg}`}
                        >
                          <Icon className={`h-[20px] w-[20px] ${style.color}`} strokeWidth={2} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-row items-start gap-2">
                            <span
                              className={`mt-[5px] h-2 w-2 shrink-0 rounded-full ${
                                message.isRead ? 'bg-transparent' : 'bg-[#EF4444]'
                              }`}
                            />
                            <div
                              className={`min-w-0 flex-1 truncate font-body text-[14px] ${
                                message.isRead
                                  ? 'font-medium text-[#374151]'
                                  : 'font-semibold text-[#111827]'
                              }`}
                            >
                              {message.title}
                            </div>
                            {badge && (
                              <span
                                className={`shrink-0 rounded-full px-2 py-[3px] font-body text-[10px] font-medium ${badge.cls}`}
                              >
                                {badge.text}
                              </span>
                            )}
                          </div>

                          <div className="mt-1 truncate font-body text-[12px] text-[#6B7280]">
                            {message.content}
                          </div>

                          <div className="mt-2 flex min-w-0 flex-row items-center gap-1.5 font-body text-[11px] text-[#9CA3AF]">
                            <span className="shrink-0 text-[#6B7280]">{style.label}</span>
                            <span>·</span>
                            <span className="truncate">{message.publisher?.name || '未知'}</span>
                            <span>·</span>
                            <span className="shrink-0">{formatTime(message.createdAt)}</span>
                            {deadline && (
                              <>
                                <span>·</span>
                                <span className="shrink-0 text-[#EA580C]">{deadline}</span>
                              </>
                            )}
                          </div>

                          {progress !== null && (
                            <div className="mt-2 flex flex-row items-center gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E5E7EB]">
                                <div
                                  className="h-full rounded-full bg-[#0062FF]"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="shrink-0 font-data text-[10px] text-[#6B7280]">
                                已签 {message.ackCount || 0}/{memberCount}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          </div>
        </main>
      </div>
    </PhoneFrame>
  );
}