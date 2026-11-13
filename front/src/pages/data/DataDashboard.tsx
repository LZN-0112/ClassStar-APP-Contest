import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  Info,
  RefreshCw,
  School,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import PhoneFrame from '@/components/layout/PhoneFrame';
import StatusBar from '@/components/layout/StatusBar';
import BottomSheet from '@/components/ui/BottomSheet';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useStatusBarStyle } from '@/hooks/useStatusBarStyle';
import { api } from '@/lib/api';
import { isNative } from '@/lib/capacitor';
import { cn } from '@/lib/utils';

type RangeDays = 7 | 14 | 30;
type TrendKey = 'attendance' | 'homework' | 'activity' | 'fee';

interface RatePoint {
  date: string;
  value: number | null;
}

interface FeePoint {
  date: string;
  value: { income: number; expense: number };
}

interface RankingItem {
  userId: string;
  name: string;
  role: string;
  rank: number;
  score: number | null;
  attendanceRate: number | null;
  homeworkRate: number | null;
  activityRate: number | null;
  attendanceCount: number;
  homeworkCount: number;
  activityCount: number;
}

interface DashboardData {
  range: number;
  period: { startTime: string; endTime: string };
  memberCount: number;
  metrics: {
    attendance: { rate: number; present: number; expected: number; sessions: number };
    homework: { rate: number; submitted: number; expected: number; totalHomeworks: number };
    activity: { rate: number; participated: number; expected: number; totalActivities: number };
    fee: { income: number; expense: number; balance: number };
  };
  previous: {
    attendanceRate: number | null;
    homeworkSubmitRate: number | null;
    activityParticipationRate: number | null;
  };
  trends: {
    attendance: RatePoint[];
    homework: RatePoint[];
    activity: RatePoint[];
    fee: FeePoint[];
  };
  memberRanking: {
    total: number;
    items: RankingItem[];
    me: RankingItem | null;
  };
}

interface StatusChip {
  text: string;
  color: string;
  bg: string;
}

const ACCENT = '#0062FF';

/** 封面高度：滚动此距离后顶栏完全落下 */
const COVER_H = 200;

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

const RANGE_OPTIONS: { value: RangeDays; label: string }[] = [
  { value: 7, label: '近7天' },
  { value: 14, label: '近14天' },
  { value: 30, label: '近30天' },
];

const TREND_TABS: { key: TrendKey; label: string }[] = [
  { key: 'attendance', label: '出勤率' },
  { key: 'homework', label: '作业提交' },
  { key: 'activity', label: '活动参与' },
  { key: 'fee', label: '班费收支' },
];

const RATE_TREND_META: Record<
  'attendance' | 'homework' | 'activity',
  { color: string; name: string; empty: string }
> = {
  attendance: { color: ACCENT, name: '出勤率', empty: '该周期内暂无签到数据' },
  homework: { color: '#F97316', name: '提交率', empty: '该周期内暂无作业数据' },
  activity: { color: '#7C3AED', name: '参与率', empty: '该周期内暂无活动数据' },
};

const HELP_ROWS: { title: string; desc: string }[] = [
  {
    title: '考勤签到率',
    desc: '统计周期内实到人次 ÷ 应到人次（每次签到 × 班级人数），迟到计入实到。',
  },
  {
    title: '作业提交率',
    desc: '统计周期内已提交份数 ÷ 应交份数（每份作业 × 班级人数），支持补交。',
  },
  {
    title: '活动参与率',
    desc: '统计周期内活动报名人数 ÷ 应报名人数（活动场次 × 班级人数）。',
  },
  {
    title: '班费结余',
    desc: '全部收入减去全部支出，为累计值，不受统计周期影响。',
  },
  {
    title: '综合评分',
    desc: '考勤 40% + 作业 35% + 活动 25%；没有数据的指标不计入权重。',
  },
  {
    title: '成员排行',
    desc: '按成员个人的考勤 40% + 作业 35% + 活动 25% 计算综合分并排序，仅统计当前周期。',
  },
];

function formatPercent(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}%`;
}

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function shortDate(iso: string) {
  return iso.slice(5);
}

function rateStatus(rate: number, hasData: boolean): StatusChip {
  if (!hasData) return { text: '暂无数据', color: '#94A3B8', bg: '#F1F5F9' };
  if (rate >= 90) return { text: '优秀', color: '#16A34A', bg: '#DCFCE7' };
  if (rate >= 75) return { text: '良好', color: '#1565D8', bg: '#E8F0FF' };
  if (rate >= 60) return { text: '一般', color: '#B45309', bg: '#FEF3C7' };
  return { text: '需关注', color: '#DC2626', bg: '#FEE2E2' };
}

function gradeOf(score: number) {
  if (score >= 90) return { text: '表现优秀', color: '#16A34A' };
  if (score >= 80) return { text: '整体良好', color: ACCENT };
  if (score >= 70) return { text: '基本合格', color: '#B45309' };
  return { text: '需要提升', color: '#DC2626' };
}

function deltaText(delta: number) {
  const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
  return `较上期 ${arrow}${Math.abs(delta).toFixed(1)}%`;
}

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  progress?: number;
  status: StatusChip;
  delta?: number | null;
  accent: string;
  onOpen: () => void;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  progress,
  status,
  delta,
  accent,
  onOpen,
}: MetricCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-col gap-2 rounded-2xl border border-[#EDF1F7] bg-white p-3.5 text-left shadow-[0_6px_18px_-12px_rgba(15,23,42,0.35)] transition-transform active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${accent}14` }}
        >
          <Icon className="h-4 w-4" style={{ color: accent }} strokeWidth={2} />
        </span>
        <span
          className="rounded-full px-2 py-[2px] font-body text-[10px] font-semibold"
          style={{ color: status.color, backgroundColor: status.bg }}
        >
          {status.text}
        </span>
      </div>

      <div>
        <div className="font-body text-[11px] text-[#64748B]">{label}</div>
        <div className="mt-0.5 font-data text-[24px] font-bold leading-tight text-[#0F172A]">
          {value}
        </div>
      </div>

      {typeof progress === 'number' ? (
        <div className="h-[4px] w-full overflow-hidden rounded-full bg-[#EEF2F8]">
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%`, backgroundColor: accent }}
          />
        </div>
      ) : null}

      <div className="font-body text-[10px] leading-relaxed text-[#94A3B8]">{detail}</div>

      <div className="mt-auto flex items-center justify-between border-t border-[#F1F5F9] pt-2">
        {delta === undefined ? (
          <span className="font-body text-[10px] text-[#94A3B8]">累计值</span>
        ) : delta === null ? (
          <span className="font-body text-[10px] text-[#94A3B8]">暂无上期数据</span>
        ) : (
          <span
            className={`flex items-center gap-0.5 font-data text-[10px] font-semibold ${
              delta >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
            }`}
          >
            {delta >= 0 ? (
              <ArrowUpRight className="h-3 w-3" strokeWidth={2} />
            ) : (
              <ArrowDownRight className="h-3 w-3" strokeWidth={2} />
            )}
            {deltaText(delta)}
          </span>
        )}
        <span className="flex items-center gap-0.5 font-body text-[10px] font-medium" style={{ color: accent }}>
          明细
          <ChevronRight className="h-3 w-3" strokeWidth={2} />
        </span>
      </div>
    </button>
  );
}

interface ChartSeries {
  name: string;
  color: string;
  values: (number | null)[];
  suffix: string;
}

interface TrendChartProps {
  labels: string[];
  series: ChartSeries[];
  scaleMax: number;
  axisLabels: [string, string, string];
  hasData: boolean;
  emptyText: string;
}

function TrendChart({ labels, series, scaleMax, axisLabels, hasData, emptyText }: TrendChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const total = labels.length;

  if (total === 0 || !hasData) {
    return (
      <div className="flex h-[170px] w-full flex-col items-center justify-center gap-2 rounded-xl bg-[#F8FAFC]">
        <BarChart3 className="h-7 w-7 text-[#CBD5E1]" strokeWidth={1.6} />
        <span className="font-body text-[11px] text-[#94A3B8]">{emptyText}</span>
      </div>
    );
  }

  const xFor = (index: number) =>
    total > 1 ? 2 + (index / (total - 1)) * 96 : 50;
  const yFor = (value: number) =>
    6 + (1 - Math.min(Math.max(value, 0), scaleMax) / scaleMax) * 88;

  const seriesPaths = series.map((item) => {
    const points = item.values
      .map((value, index) =>
        value === null ? null : { x: xFor(index), y: yFor(value) },
      )
      .filter((point): point is { x: number; y: number } => point !== null);

    let line = '';
    let started = false;
    item.values.forEach((value, index) => {
      if (value === null) {
        started = false;
        return;
      }
      line += `${started ? 'L' : 'M'}${xFor(index)} ${yFor(value)} `;
      started = true;
    });

    const area =
      points.length > 1
        ? `M${points[0].x} 94 L${points.map((p) => `${p.x} ${p.y}`).join(' L')} L${points[points.length - 1].x} 94 Z`
        : '';

    return { ...item, points, line: line.trim(), area };
  });

  const activeLabel = active !== null ? labels[active] : null;
  const activeX = active !== null ? xFor(active) : 0;
  const activeValue =
    active !== null
      ? series.reduce<number | null>((found, item) => {
          if (found !== null) return found;
          return item.values[active] ?? null;
        }, null)
      : null;
  const activeY = activeValue !== null ? yFor(activeValue) : 50;

  return (
    <div className="flex w-full gap-1.5">
      <div className="flex h-[150px] flex-col justify-between py-[8px] font-data text-[9px] text-[#CBD5E1]">
        <span>{axisLabels[0]}</span>
        <span>{axisLabels[1]}</span>
        <span>{axisLabels[2]}</span>
      </div>

      <div className="flex-1">
        <div className="relative h-[150px] w-full">
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between py-[8px]">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-px w-full bg-[#EEF2F8]" />
            ))}
          </div>

          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            {seriesPaths.map((item) => (
              <g key={item.name}>
                {item.area ? (
                  <path d={item.area} fill={item.color} fillOpacity={0.09} />
                ) : null}
                <path
                  d={item.line}
                  fill="none"
                  stroke={item.color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            ))}
          </svg>

          {active !== null && (
            <div
              className="pointer-events-none absolute top-0 h-full w-px bg-[#94A3B8]/40"
              style={{ left: `${activeX}%` }}
            />
          )}

          {seriesPaths.map((item) =>
            item.points.map((point, index) => (
              <span
                key={`${item.name}-${index}`}
                className="pointer-events-none absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white"
                style={{
                  left: `${point.x}%`,
                  top: `${point.y}%`,
                  backgroundColor: item.color,
                }}
              />
            )),
          )}

          <div className="absolute inset-0 flex">
            {labels.map((label, index) => (
              <button
                key={`${label}-${index}`}
                type="button"
                onClick={() => setActive(active === index ? null : index)}
                className="h-full flex-1"
                aria-label={`查看 ${label} 数据`}
              />
            ))}
          </div>

          {active !== null && activeLabel ? (
            <div
              className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg bg-[#0F172A] px-2.5 py-1.5 shadow-lg"
              style={{
                left: `${Math.min(Math.max(activeX, 16), 84)}%`,
                top: `${activeY}%`,
                transform: `translate(-50%, ${activeY > 30 ? 'calc(-100% - 8px)' : '8px'})`,
              }}
            >
              <div className="font-data text-[9px] text-white/60">{shortDate(activeLabel)}</div>
              {series.map((item) => {
                const value = item.values[active];
                return (
                  <div
                    key={item.name}
                    className="flex items-center gap-1 font-data text-[10px] font-semibold text-white"
                  >
                    <span
                      className="h-1 w-1 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    {value === null
                      ? '无数据'
                      : item.suffix === '%'
                        ? formatPercent(value)
                        : `¥${formatMoney(value)}`}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="relative mt-2 h-3 w-full font-data text-[9px] text-[#94A3B8]">
          {labels.map((label, index) => {
            const step = Math.max(1, Math.ceil(total / 4));
            if (index % step !== 0 && index !== total - 1) return null;
            return (
              <span
                key={`${label}-${index}`}
                className="absolute top-0 whitespace-nowrap"
                style={{
                  left: `${xFor(index)}%`,
                  transform:
                    index === 0
                      ? 'translateX(0)'
                      : index === total - 1
                        ? 'translateX(-100%)'
                        : 'translateX(-50%)',
                }}
              >
                {shortDate(label)}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface Insight {
  tone: 'good' | 'warn' | 'info';
  title: string;
  desc: string;
}

const TONE_META: Record<Insight['tone'], { color: string; bg: string; icon: LucideIcon }> = {
  good: { color: '#16A34A', bg: '#DCFCE7', icon: Sparkles },
  warn: { color: '#B45309', bg: '#FEF3C7', icon: AlertTriangle },
  info: { color: ACCENT, bg: '#EDF1FD', icon: Info },
};

const RANK_BADGE = [
  { bg: '#FEF3C7', color: '#B45309' },
  { bg: '#E2E8F0', color: '#475569' },
  { bg: '#FDE68A', color: '#92400E' },
];

const AVATAR_COLORS = ['#0062FF', '#7C3AED', '#F97316', '#2F9E86', '#DB2777', '#0891B2'];

function RankingRow({ item, isMe }: { item: RankingItem; isMe: boolean }) {
  const badge =
    item.rank <= 3 ? RANK_BADGE[item.rank - 1] : { bg: '#F1F5F9', color: '#94A3B8' };
  const avatarColor =
    AVATAR_COLORS[(item.name.charCodeAt(0) + item.name.length) % AVATAR_COLORS.length];

  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl px-2 py-2 ${
        isMe ? 'bg-[#EDF1FD]' : ''
      }`}
    >
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-data text-[10px] font-bold"
        style={{ backgroundColor: badge.bg, color: badge.color }}
      >
        {item.rank}
      </span>
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-body text-[12px] font-semibold text-white"
        style={{ backgroundColor: avatarColor }}
      >
        {item.name.slice(0, 1)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-body text-[12px] font-semibold text-[#0F172A]">
            {item.name}
          </span>
          {isMe ? (
            <span className="rounded bg-white px-1 py-[1px] font-body text-[9px] font-semibold text-[#0062FF]">
              我
            </span>
          ) : null}
          {item.role && item.role !== '学生' ? (
            <span className="shrink-0 rounded bg-[#F1F5F9] px-1 py-[1px] font-body text-[9px] text-[#64748B]">
              {item.role}
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-2 font-data text-[9px] text-[#94A3B8]">
          <span>
            出勤 {item.attendanceRate === null ? '—' : formatPercent(item.attendanceRate)}
          </span>
          <span>
            作业 {item.homeworkRate === null ? '—' : formatPercent(item.homeworkRate)}
          </span>
          <span>
            活动 {item.activityRate === null ? '—' : formatPercent(item.activityRate)}
          </span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-data text-[16px] font-bold leading-tight text-[#0F172A]">
          {item.score ?? '--'}
        </div>
        <div className="font-body text-[9px] text-[#94A3B8]">综合分</div>
      </div>
    </div>
  );
}

export default function DataDashboard() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const classId = user?.classId;

  const [range, setRange] = useState<RangeDays>(30);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [trendKey, setTrendKey] = useState<TrendKey>('attendance');
  const [helpOpen, setHelpOpen] = useState(false);

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

  useEffect(() => {
    if (!classId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    api
      .get('/data/dashboard', { params: { classId, range } })
      .then((res) => {
        if (cancelled) return;
        setData((res.data?.data || res.data) as DashboardData);
      })
      .catch(() => {
        if (cancelled) return;
        // 已有数据时保留旧数据，避免切换周期整块闪白
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [classId, range, reloadKey]);

  const summary = useMemo(() => {
    if (!data) return null;
    const { attendance, homework, activity } = data.metrics;

    const parts: { rate: number; weight: number }[] = [];
    if (attendance.expected > 0) parts.push({ rate: attendance.rate, weight: 0.4 });
    if (homework.expected > 0) parts.push({ rate: homework.rate, weight: 0.35 });
    if (activity.expected > 0) parts.push({ rate: activity.rate, weight: 0.25 });

    const weightSum = parts.reduce((sum, item) => sum + item.weight, 0);
    const score =
      weightSum > 0
        ? Math.round(parts.reduce((sum, item) => sum + item.rate * item.weight, 0) / weightSum)
        : null;

    const prevParts: number[] = [];
    if (attendance.expected > 0 && data.previous.attendanceRate !== null) {
      prevParts.push(data.previous.attendanceRate);
    }
    if (homework.expected > 0 && data.previous.homeworkSubmitRate !== null) {
      prevParts.push(data.previous.homeworkSubmitRate);
    }
    if (activity.expected > 0 && data.previous.activityParticipationRate !== null) {
      prevParts.push(data.previous.activityParticipationRate);
    }
    const prevScore =
      prevParts.length > 0
        ? Math.round(prevParts.reduce((sum, value) => sum + value, 0) / prevParts.length)
        : null;

    return {
      score,
      prevScore,
      grade: score !== null ? gradeOf(score) : { text: '暂无数据', color: '#94A3B8' },
      scoreDelta: score !== null && prevScore !== null ? score - prevScore : null,
    };
  }, [data]);

  const rankingPreview = useMemo(() => {
    if (!data) return { items: [] as RankingItem[], me: null as RankingItem | null };
    const items = data.memberRanking.items.filter((item) => (item.score ?? 0) > 0);
    const me =
      data.memberRanking.me && (data.memberRanking.me.score ?? 0) > 0
        ? data.memberRanking.me
        : null;
    return { items, me };
  }, [data]);

  const insights = useMemo(() => {
    if (!data) return [] as Insight[];
    const list: Insight[] = [];

    const attendanceValues = data.trends.attendance
      .map((point) => point.value)
      .filter((value): value is number => value !== null);
    if (attendanceValues.length > 0) {
      const low = attendanceValues.filter((value) => value < 80);
      if (low.length > 0) {
        list.push({
          tone: 'warn',
          title: `${low.length} 天出勤率低于 80%`,
          desc: `最低 ${formatPercent(Math.min(...low))}，建议在班级群提醒按时签到。`,
        });
      } else {
        const average =
          attendanceValues.reduce((sum, value) => sum + value, 0) / attendanceValues.length;
        list.push({
          tone: 'good',
          title: '出勤表现稳定',
          desc: `近 ${data.range} 天平均出勤率 ${formatPercent(average)}。`,
        });
      }
    }

    const homeworkValues = data.trends.homework
      .map((point) => point.value)
      .filter((value): value is number => value !== null);
    if (homeworkValues.length > 0) {
      const low = homeworkValues.filter((value) => value < 80);
      if (low.length > 0) {
        list.push({
          tone: 'warn',
          title: `${low.length} 天作业提交率不足`,
          desc: `当前周期提交率 ${formatPercent(data.metrics.homework.rate)}，可提醒未交同学补交。`,
        });
      } else {
        list.push({
          tone: 'good',
          title: '作业提交情况良好',
          desc: `当前周期提交率 ${formatPercent(data.metrics.homework.rate)}。`,
        });
      }
    }

    const fee = data.metrics.fee;
    if (fee.balance < 0) {
      list.push({
        tone: 'warn',
        title: '班费已经超支',
        desc: `当前结余 -¥${formatMoney(Math.abs(fee.balance))}，建议暂停非必要支出。`,
      });
    } else {
      list.push({
        tone: fee.expense > fee.income ? 'warn' : 'info',
        title: '班费收支',
        desc: `近 ${data.range} 天收入 ¥${formatMoney(fee.income)}，支出 ¥${formatMoney(fee.expense)}，结余 ¥${formatMoney(fee.balance)}。`,
      });
    }

    if (data.metrics.activity.totalActivities > 0) {
      list.push({
        tone: 'info',
        title: `举办 ${data.metrics.activity.totalActivities} 场活动`,
        desc: `平均参与率 ${formatPercent(data.metrics.activity.rate)}。`,
      });
    } else {
      list.push({
        tone: 'info',
        title: '暂无活动数据',
        desc: '发布并组织活动后，这里会展示参与情况。',
      });
    }

    return list.slice(0, 4);
  }, [data]);

  const trendConfig = useMemo(() => {
    if (!data) return null;
    if (trendKey === 'fee') {
      const points = data.trends.fee;
      const labels = points.map((point) => point.date);
      const income = points.map((point) => Number(point.value?.income || 0));
      const expense = points.map((point) => Number(point.value?.expense || 0));
      const maxValue = Math.max(...income, ...expense, 1);
      const incomeTotal = income.reduce((sum, value) => sum + value, 0);
      const expenseTotal = expense.reduce((sum, value) => sum + value, 0);
      return {
        labels,
        series: [
          { name: '收入', color: '#2F9E86', values: income, suffix: '元' },
          { name: '支出', color: '#EF4444', values: expense, suffix: '元' },
        ] as ChartSeries[],
        scaleMax: maxValue,
        axisLabels: [
          `¥${formatMoney(maxValue)}`,
          `¥${formatMoney(Math.round(maxValue / 2))}`,
          '¥0',
        ] as [string, string, string],
        hasData: incomeTotal > 0 || expenseTotal > 0,
        emptyText: '该周期内暂无班费收支记录',
        summary: `收入 ¥${formatMoney(incomeTotal)} · 支出 ¥${formatMoney(expenseTotal)}`,
      };
    }

    const points = data.trends[trendKey];
    const labels = points.map((point) => point.date);
    const values = points.map((point) => point.value);
    const valid = values.filter((value): value is number => value !== null);
    const average =
      valid.length > 0 ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0;
    const meta = RATE_TREND_META[trendKey];
    return {
      labels,
      series: [
        {
          name: meta.name,
          color: meta.color,
          values,
          suffix: '%',
        },
      ] as ChartSeries[],
      scaleMax: 100,
      axisLabels: ['100%', '50%', '0%'] as [string, string, string],
      hasData: valid.length > 0,
      emptyText: meta.empty,
      summary:
        valid.length > 0
          ? `平均 ${formatPercent(average)} · 最高 ${formatPercent(Math.max(...valid))} · 最低 ${formatPercent(Math.min(...valid))}`
          : '暂无数据',
    };
  }, [data, trendKey]);

  const headerRight = (
    <button
      type="button"
      onClick={() => setHelpOpen(true)}
      className={cn(
        'pointer-events-auto flex h-8 items-center gap-1 rounded-lg border px-2.5 transition-colors active:opacity-70',
        darkInk
          ? 'border-[#E2E8F0] bg-white/70 text-[#334155]'
          : 'border-white/40 bg-white/20 text-white'
      )}
    >
      <CircleHelp className="h-3.5 w-3.5" strokeWidth={2} />
      <span className="whitespace-nowrap font-body text-[11px] font-medium">指标说明</span>
    </button>
  );

  const rangeLabel = RANGE_OPTIONS.find((option) => option.value === range)?.label ?? '';

  return (
    <PhoneFrame scrollerRef={scrollerRef}>
      <div className="relative flex min-h-full w-full flex-col bg-white">
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
                backgroundColor: 'rgba(255, 255, 255, var(--bar-a, 0))',
                maskImage: 'linear-gradient(180deg, #000 0%, #000 76%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(180deg, #000 0%, #000 76%, transparent 100%)',
              }}
            />
            {/* 收尾补实：封面即将滚完时铺满，内容不会从底边透出 */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{ backgroundColor: 'rgba(255, 255, 255, var(--solid-a, 0))' }}
            />
            {/* 封面上方的压暗遮罩：保证状态栏与顶栏按钮的白字始终可读 */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-[160px] transition-opacity duration-300"
              style={{
                opacity: darkInk ? 0 : 1,
                background:
                  'linear-gradient(180deg, rgba(4,24,52,0.46) 0%, rgba(4,24,52,0.20) 52%, rgba(4,24,52,0) 100%)',
              }}
            />
            <StatusBar light={!darkInk} />
            <div className="relative flex h-[56px] items-center justify-end px-5">
              {/* 标题：p > 0.7 后淡入，与滚走的封面大标题交接 */}
              <div
                className="pointer-events-none absolute inset-x-0 text-center text-[17px] font-semibold tracking-[0.5px] text-[#0F172A]"
                style={{ opacity: 'var(--title-a, 0)' }}
              >
                数据看板
              </div>
              {headerRight}
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
          <TrendingUp
            className="pointer-events-none absolute right-[12px] top-[42px] h-[104px] w-[104px] text-white/[0.22]"
            strokeWidth={1.5}
          />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, rgba(3,14,32,0) 52%, rgba(3,14,32,0.40) 100%)',
            }}
          />
          {/* 标题块：底边留出 52px = 首卡上浮 32px + 20px 间距 */}
          <div className="absolute inset-x-0 bottom-[52px] px-5">
            <div className="font-heading text-[28px] font-bold leading-[1.2] tracking-[1px] text-white">
              数据看板
            </div>
            <div className="mt-[5px] text-[12px] tracking-[0.4px] text-white/75">
              {[rangeLabel, user?.className].filter(Boolean).join(' · ') || '班级数据一目了然'}
            </div>
          </div>
        </div>
        {/* 流内占位：让正文从封面下方开始，封面本身由绝对定位层绘制 */}
        <div className="shrink-0" style={{ height: COVER_H }} aria-hidden />

        <main className="relative z-10 flex w-full flex-1 flex-col px-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
          {!classId ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 pt-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EDF1FD]">
            <School className="h-8 w-8 text-[#0062FF]" strokeWidth={1.6} />
          </div>
          <div className="font-body text-[15px] font-semibold text-[#1E293B]">还没有加入班级</div>
          <div className="font-body text-[12px] text-[#94A3B8]">加入班级后即可查看考勤、作业、活动与班费数据</div>
          <button
            type="button"
            onClick={() => navigate('/join-class')}
            className="mt-1 rounded-lg px-5 py-2.5 font-body text-[13px] font-semibold text-white"
            style={{ backgroundColor: ACCENT }}
          >
            去加入班级
          </button>
        </div>
      ) : !data || !summary || !trendConfig ? (
        loading ? (
          <div className="flex flex-col gap-3">
            <div className="-mt-8 h-[178px] animate-pulse rounded-2xl bg-[#F1F5F9]" />
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-[152px] animate-pulse rounded-2xl bg-[#F1F5F9]" />
              ))}
            </div>
            <div className="h-[236px] animate-pulse rounded-2xl bg-[#F1F5F9]" />
          </div>
        ) : (
          <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 pt-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F1F5F9]">
              <RefreshCw className="h-6 w-6 text-[#94A3B8]" strokeWidth={1.8} />
            </div>
            <div className="font-body text-[14px] font-semibold text-[#1E293B]">数据加载失败</div>
            <div className="font-body text-[12px] text-[#94A3B8]">请检查网络后重试</div>
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="mt-1 rounded-lg px-4 py-2 font-body text-[13px] font-semibold text-white"
              style={{ backgroundColor: ACCENT }}
            >
              重新加载
            </button>
          </div>
        )
      ) : (
        <div className="flex w-full flex-col gap-3">
          {/* 综合表现 */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="relative -mt-8 w-full rounded-2xl border border-[#EDF1F7] bg-white p-4 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.45)]"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-body text-[11px] text-[#64748B]">班级综合表现</span>
                  {loading ? (
                    <RefreshCw
                      className="h-3 w-3 animate-spin text-[#94A3B8]"
                      strokeWidth={2}
                      aria-label="正在刷新"
                    />
                  ) : null}
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-data text-[32px] font-bold leading-none text-[#0F172A]">
                    {summary.score ?? '--'}
                  </span>
                  <span className="font-body text-[12px] text-[#94A3B8]">/ 100</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full px-2 py-[3px] font-body text-[10px] font-semibold"
                    style={{
                      color: summary.grade.color,
                      backgroundColor: `${summary.grade.color}14`,
                    }}
                  >
                    {summary.grade.text}
                  </span>
                  <span className="font-body text-[10px] text-[#94A3B8]">
                    {summary.scoreDelta === null
                      ? '暂无上期对比'
                      : `较上期 ${summary.scoreDelta >= 0 ? '+' : ''}${summary.scoreDelta} 分`}
                  </span>
                </div>
              </div>

              <div className="relative flex h-[84px] w-[84px] shrink-0 items-center justify-center">
                <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#EEF2F8" strokeWidth="8" />
                  {summary.score !== null ? (
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke={summary.grade.color}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${Math.min(Math.max(summary.score, 0), 100) * 2.639} 263.9`}
                      transform="rotate(-90 50 50)"
                      className="transition-all duration-700 ease-out"
                    />
                  ) : null}
                </svg>
                <div className="relative flex flex-col items-center">
                  <span className="font-data text-[18px] font-bold leading-none" style={{ color: summary.grade.color }}>
                    {summary.score ?? '--'}
                  </span>
                  <span className="mt-0.5 font-body text-[9px] text-[#94A3B8]">综合分</span>
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-[#F8FAFC] p-1">
              {RANGE_OPTIONS.map((option) => {
                const active = range === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRange(option.value)}
                    className={`rounded-lg py-1.5 font-body text-[11px] transition-colors ${
                      active
                        ? 'bg-white font-semibold text-[#0F172A] shadow-[0_1px_4px_rgba(15,23,42,0.08)]'
                        : 'text-[#64748B]'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-2.5 flex items-center justify-between font-body text-[10px] text-[#94A3B8]">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" strokeWidth={1.8} />
                {data.period.startTime} 至 {data.period.endTime}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" strokeWidth={1.8} />
                {data.memberCount} 名成员
              </span>
            </div>
          </motion.div>

          {/* 核心指标 */}
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              icon={CalendarDays}
              label="考勤签到率"
              value={
                data.metrics.attendance.expected > 0
                  ? formatPercent(data.metrics.attendance.rate)
                  : '—'
              }
              detail={`${data.metrics.attendance.present}/${data.metrics.attendance.expected} 人次 · ${data.metrics.attendance.sessions} 次签到`}
              progress={data.metrics.attendance.rate}
              status={rateStatus(
                data.metrics.attendance.rate,
                data.metrics.attendance.expected > 0,
              )}
              delta={
                data.metrics.attendance.expected > 0
                  ? data.previous.attendanceRate === null
                    ? null
                    : Math.round((data.metrics.attendance.rate - data.previous.attendanceRate) * 10) / 10
                  : null
              }
              accent={ACCENT}
              onOpen={() => navigate('/attendance-report')}
            />
            <MetricCard
              icon={BookOpen}
              label="作业提交率"
              value={
                data.metrics.homework.expected > 0
                  ? formatPercent(data.metrics.homework.rate)
                  : '—'
              }
              detail={`${data.metrics.homework.submitted}/${data.metrics.homework.expected} 份 · ${data.metrics.homework.totalHomeworks} 次作业`}
              progress={data.metrics.homework.rate}
              status={rateStatus(
                data.metrics.homework.rate,
                data.metrics.homework.expected > 0,
              )}
              delta={
                data.metrics.homework.expected > 0
                  ? data.previous.homeworkSubmitRate === null
                    ? null
                    : Math.round((data.metrics.homework.rate - data.previous.homeworkSubmitRate) * 10) / 10
                  : null
              }
              accent="#F97316"
              onOpen={() => navigate('/homework-list')}
            />
            <MetricCard
              icon={Users}
              label="活动参与率"
              value={
                data.metrics.activity.expected > 0
                  ? formatPercent(data.metrics.activity.rate)
                  : '—'
              }
              detail={`${data.metrics.activity.participated}/${data.metrics.activity.expected} 人次 · ${data.metrics.activity.totalActivities} 场活动`}
              progress={data.metrics.activity.rate}
              status={rateStatus(
                data.metrics.activity.rate,
                data.metrics.activity.expected > 0,
              )}
              delta={
                data.metrics.activity.expected > 0
                  ? data.previous.activityParticipationRate === null
                    ? null
                    : Math.round((data.metrics.activity.rate - data.previous.activityParticipationRate) * 10) / 10
                  : null
              }
              accent="#7C3AED"
              onOpen={() => navigate('/activity-list')}
            />
            <MetricCard
              icon={Wallet}
              label="班费结余"
              value={`¥${formatMoney(data.metrics.fee.balance)}`}
              detail={`近 ${data.range} 天收 ¥${formatMoney(data.metrics.fee.income)} · 支 ¥${formatMoney(data.metrics.fee.expense)}`}
              status={
                data.metrics.fee.balance < 0
                  ? { text: '已超支', color: '#DC2626', bg: '#FEE2E2' }
                  : data.metrics.fee.balance < 100
                    ? { text: '偏低', color: '#B45309', bg: '#FEF3C7' }
                    : { text: '正常', color: '#16A34A', bg: '#DCFCE7' }
              }
              accent="#2F9E86"
              onOpen={() => navigate('/finance-report')}
            />
          </div>

          {/* 趋势分析 */}
          <div className="w-full rounded-2xl border border-[#EDF1F7] bg-white p-4 shadow-[0_6px_18px_-12px_rgba(15,23,42,0.25)]">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-heading text-[15px] font-semibold text-[#0F172A]">趋势分析</div>
                <div className="mt-0.5 font-body text-[10px] text-[#94A3B8]">
                  点击图表可查看每日数据
                </div>
              </div>
            </div>

            <div className="mt-2.5 grid grid-cols-4 gap-0.5 rounded-lg bg-[#F8FAFC] p-0.5">
              {TREND_TABS.map((tab) => {
                const active = trendKey === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setTrendKey(tab.key)}
                    className={`rounded-md py-1 font-body text-[10px] transition-colors ${
                      active
                        ? 'bg-white font-semibold text-[#0F172A] shadow-[0_1px_3px_rgba(15,23,42,0.1)]'
                        : 'text-[#64748B]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-3" key={`${trendKey}-${range}`}>
              <TrendChart
                labels={trendConfig.labels}
                series={trendConfig.series}
                scaleMax={trendConfig.scaleMax}
                axisLabels={trendConfig.axisLabels}
                hasData={trendConfig.hasData}
                emptyText={trendConfig.emptyText}
              />
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-[#F1F5F9] pt-2.5">
              <span className="font-body text-[10px] text-[#64748B]">{trendConfig.summary}</span>
              {trendConfig.series.length > 1 ? (
                <div className="flex items-center gap-2">
                  {trendConfig.series.map((item) => (
                    <span key={item.name} className="flex items-center gap-1 font-body text-[9px] text-[#64748B]">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {/* 成员排行 */}
          <div className="w-full rounded-2xl border border-[#EDF1F7] bg-white p-4 shadow-[0_6px_18px_-12px_rgba(15,23,42,0.25)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Trophy className="h-4 w-4" style={{ color: '#F59E0B' }} strokeWidth={2} />
                <span className="font-heading text-[15px] font-semibold text-[#0F172A]">成员排行</span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/member-list')}
                className="flex items-center gap-0.5 font-body text-[10px] text-[#64748B] active:opacity-70"
              >
                全部成员
                <ChevronRight className="h-3 w-3" strokeWidth={2} />
              </button>
            </div>

            {rankingPreview.items.length === 0 ? (
              <div className="mt-3 rounded-xl bg-[#F8FAFC] p-4 text-center font-body text-[11px] text-[#94A3B8]">
                本周期暂无成员参与记录
              </div>
            ) : (
              <div className="mt-1.5 flex flex-col">
                {rankingPreview.items.slice(0, 5).map((item) => (
                  <RankingRow key={item.userId} item={item} isMe={item.userId === user?.id} />
                ))}
                {rankingPreview.me &&
                !rankingPreview.items
                  .slice(0, 5)
                  .some((item) => item.userId === user?.id) ? (
                  <>
                    <div className="my-1 border-t border-dashed border-[#E2E8F0]" />
                    <RankingRow item={rankingPreview.me} isMe />
                  </>
                ) : null}
              </div>
            )}

            <div className="mt-2 rounded-lg bg-[#F8FAFC] px-2.5 py-2 font-body text-[10px] leading-relaxed text-[#94A3B8]">
              仅展示本期有参与记录的成员；综合分 = 考勤 40% + 作业 35% + 活动 25%。
            </div>
          </div>

          {/* 数据洞察 */}
          <div className="w-full rounded-2xl border border-[#EDF1F7] bg-white p-4 shadow-[0_6px_18px_-12px_rgba(15,23,42,0.25)]">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" style={{ color: ACCENT }} strokeWidth={2} />
              <span className="font-heading text-[15px] font-semibold text-[#0F172A]">数据洞察</span>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {insights.map((item) => {
                const meta = TONE_META[item.tone];
                const InsightIcon = meta.icon;
                return (
                  <div key={item.title} className="flex items-start gap-2.5 rounded-xl bg-[#F8FAFC] p-2.5">
                    <span
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: meta.bg }}
                    >
                      <InsightIcon className="h-3.5 w-3.5" style={{ color: meta.color }} strokeWidth={2} />
                    </span>
                    <div className="min-w-0">
                      <div className="font-body text-[12px] font-semibold text-[#0F172A]">{item.title}</div>
                      <div className="mt-0.5 font-body text-[10px] leading-relaxed text-[#64748B]">
                        {item.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 报表入口 */}
          <div className="flex w-full flex-col gap-2 pb-2">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => navigate('/semester-report')}
                className="flex h-[46px] items-center justify-center gap-1.5 rounded-xl font-body text-[13px] font-semibold text-white shadow-[0_8px_20px_-10px_#0062FF99] active:opacity-80"
                style={{ backgroundColor: ACCENT }}
              >
                <BarChart3 className="h-4 w-4" strokeWidth={2} />
                生成学期报表
              </button>
              <button
                type="button"
                onClick={() => navigate('/class-archive')}
                className="flex h-[46px] items-center justify-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white font-body text-[13px] font-semibold text-[#334155] active:bg-[#F8FAFC]"
              >
                班级档案
                <ChevronRight className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            <div className="text-center font-body text-[10px] text-[#94A3B8]">
              报表支持导出 Excel / PDF · 数据每 5 分钟自动刷新
            </div>
          </div>
        </div>
      )}
        </main>
      </div>

      {/* 指标说明 */}
      <BottomSheet
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="指标说明"
        maxHeight="78vh"
      >
        <div className="flex flex-col gap-2.5 px-5 pb-[max(24px,env(safe-area-inset-bottom))]">
          {HELP_ROWS.map((row) => (
            <div key={row.title}>
              <div className="font-body text-[12px] font-semibold text-[#0F172A]">{row.title}</div>
              <div className="mt-0.5 font-body text-[11px] leading-relaxed text-[#64748B]">
                {row.desc}
              </div>
            </div>
          ))}
          <div className="mt-1.5 rounded-xl bg-[#F8FAFC] p-3 font-body text-[10px] leading-relaxed text-[#94A3B8]">
            统计周期为近 {data?.range ?? range} 天（含今天）。数据每 5 分钟自动刷新一次，
            签到、提交作业或记账后稍等片刻即可看到变化。
          </div>
        </div>
      </BottomSheet>
    </PhoneFrame>
  );
}
