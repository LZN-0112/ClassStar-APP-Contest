import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FileText,
  Plus,
  ClipboardCheck,
  CheckCircle2,
  Clock3,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Send,
  Timer,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';

type FilterTab = '全部' | '待提交' | '已提交' | '已逾期' | '审核中' | '进行中' | '已截止';
type GroupKey = 'urgent' | 'today' | 'week' | 'later' | 'ongoing' | 'archive';

interface HomeworkItem {
  id: string;
  title: string;
  subject: string;
  deadline: string;
  submitted: boolean;
  mySubmissionStatus: string | null;
  myDelayStatus: string | null;
  myDelayDeadline: string | null;
  pendingDelayCount: number;
  submissionCount: number;
  totalMembers: number;
  publisher: { id: string; name: string } | null;
}

const STATUS_STYLE: Record<string, string> = {
  待提交: 'bg-[#EFF6FF] text-[#0062FF]',
  已提交: 'bg-[#F0FDF4] text-[#16A34A]',
  已逾期: 'bg-[#FEF2F2] text-[#DC2626]',
  审核中: 'bg-[#FFFBEB] text-[#D97706]',
  进行中: 'bg-[#EFF6FF] text-[#0062FF]',
  已截止: 'bg-[#F1F5F9] text-[#64748B]',
};

const SUBJECT_STYLE: Record<string, string> = {
  语文: 'bg-[#FEF2F2] text-[#DC2626]',
  数学: 'bg-[#EFF6FF] text-[#2563EB]',
  英语: 'bg-[#F5F3FF] text-[#7C3AED]',
  物理: 'bg-[#ECFEFF] text-[#0891B2]',
  化学: 'bg-[#F0FDF4] text-[#16A34A]',
  生物: 'bg-[#F0FDFA] text-[#0F766E]',
  历史: 'bg-[#FFFBEB] text-[#D97706]',
  地理: 'bg-[#F0F9FF] text-[#0284C7]',
  政治: 'bg-[#FDF2F8] text-[#DB2777]',
};

const GROUP_META: Record<GroupKey, { title: string; dot: string }> = {
  urgent: { title: '需处理', dot: 'bg-[#EF4444]' },
  today: { title: '今天截止', dot: 'bg-[#F59E0B]' },
  week: { title: '本周内截止', dot: 'bg-[#0062FF]' },
  later: { title: '更晚截止', dot: 'bg-[#94A3B8]' },
  ongoing: { title: '进行中', dot: 'bg-[#0062FF]' },
  archive: { title: '已完成 / 已截止', dot: 'bg-[#CBD5E1]' },
};

function startOfDay(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** 今天 23:59 / 明天 08:00 / 11月20日 18:00 */
function formatDeadline(dateStr: string, now: number): string {
  const t = new Date(dateStr).getTime();
  const d = new Date(t);
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const diffDay = Math.round((startOfDay(t) - startOfDay(now)) / 86400000);
  if (diffDay === 0) return `今天 ${hm}`;
  if (diffDay === 1) return `明天 ${hm}`;
  if (diffDay === 2) return `后天 ${hm}`;
  if (diffDay === -1) return `昨天 ${hm}`;
  return `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`;
}

/** 剩余/逾期时间 */
function remainingText(dateStr: string, now: number): string {
  const diff = new Date(dateStr).getTime() - now;
  if (diff <= 0) {
    const days = Math.ceil(-diff / 86400000);
    return days <= 1 ? '已逾期' : `已逾期 ${days} 天`;
  }
  const hours = diff / 3600000;
  if (hours < 1) return `剩 ${Math.max(1, Math.ceil(diff / 60000))} 分钟`;
  if (hours < 24) return `剩 ${Math.floor(hours)} 小时`;
  return `剩 ${Math.ceil(hours / 24)} 天`;
}

function remainingTone(dateStr: string, now: number): string {
  const diff = new Date(dateStr).getTime() - now;
  if (diff <= 0) return 'text-[#DC2626]';
  if (diff <= 86400000) return 'text-[#D97706]';
  return 'text-[#64748B]';
}

export default function HomeworkList() {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useCurrentUser();
  const [filter, setFilter] = useState<FilterTab>('全部');
  const [homeworks, setHomeworks] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showArchive, setShowArchive] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const isManager = Boolean(
    user?.isCommittee || user?.roleLevel === 'owner' || user?.roleLevel === 'admin',
  );
  const classId = user?.classId;

  const tabs: FilterTab[] = isManager
    ? ['全部', '进行中', '已截止']
    : ['全部', '待提交', '已提交', '已逾期', '审核中'];

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const load = useCallback(() => {
    if (!classId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    api
      .get(`/classes/${classId}/homeworks`, { params: { pageSize: 100 } })
      .then((res) => {
        const data = res.data?.data || res.data;
        setHomeworks(data?.list || []);
      })
      .catch((e) => setError(e.message || '作业加载失败'))
      .finally(() => setLoading(false));
  }, [classId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!tabs.includes(filter)) setFilter('全部');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isManager]);

  /** 延时已通过时，以新的截止时间计算状态 */
  const effectiveDeadline = useCallback((item: HomeworkItem): string => {
    return item.myDelayStatus === 'approved' && item.myDelayDeadline
      ? item.myDelayDeadline
      : item.deadline;
  }, []);

  const getStatus = useCallback(
    (item: HomeworkItem): string => {
      if (isManager) {
        return new Date(item.deadline).getTime() > now ? '进行中' : '已截止';
      }
      if (item.submitted) return '已提交';
      if (item.myDelayStatus === 'pending') return '审核中';
      return new Date(effectiveDeadline(item)).getTime() > now ? '待提交' : '已逾期';
    },
    [isManager, now, effectiveDeadline],
  );

  const counts = useMemo(() => {
    const result: Record<string, number> = {
      待提交: 0,
      已提交: 0,
      已逾期: 0,
      审核中: 0,
      进行中: 0,
      已截止: 0,
    };
    homeworks.forEach((item) => {
      const status = getStatus(item);
      result[status] = (result[status] || 0) + 1;
    });
    return result;
  }, [homeworks, getStatus]);

  const overview = useMemo(() => {
    if (isManager) {
      const pending = homeworks.reduce((sum, item) => sum + (item.pendingDelayCount || 0), 0);
      return [
        { label: '进行中', value: counts['进行中'] || 0, color: '#0062FF', bg: '#EFF6FF' },
        { label: '待审批延时', value: pending, color: '#D97706', bg: '#FFFBEB' },
        { label: '已截止', value: counts['已截止'] || 0, color: '#475569', bg: '#F1F5F9' },
      ];
    }
    let pending = 0;
    let today = 0;
    let overdue = 0;
    homeworks.forEach((item) => {
      if (item.submitted) return;
      const status = getStatus(item);
      // 概览与 Tab 使用同一套状态口径：待提交、已逾期各自独立统计
      if (status === '已逾期') {
        overdue += 1;
        return;
      }
      if (status !== '待提交') return;
      pending += 1;
      if (startOfDay(new Date(effectiveDeadline(item)).getTime()) === startOfDay(now)) {
        today += 1;
      }
    });
    return [
      { label: '待提交', value: pending, color: '#0062FF', bg: '#EFF6FF' },
      { label: '今天截止', value: today, color: '#D97706', bg: '#FFFBEB' },
      { label: '已逾期', value: overdue, color: '#DC2626', bg: '#FEF2F2' },
    ];
  }, [homeworks, isManager, counts, getStatus, effectiveDeadline, now]);

  /** “全部”下的时间分组 */
  const groups = useMemo(() => {
    const buckets: Record<GroupKey, HomeworkItem[]> = {
      urgent: [],
      today: [],
      week: [],
      later: [],
      ongoing: [],
      archive: [],
    };

    homeworks.forEach((item) => {
      const status = getStatus(item);
      if (isManager) {
        if ((item.pendingDelayCount || 0) > 0) {
          buckets.urgent.push(item);
        } else if (status === '进行中') {
          buckets.ongoing.push(item);
        } else {
          buckets.archive.push(item);
        }
        return;
      }
      if (status === '已提交') {
        buckets.archive.push(item);
        return;
      }
      if (status === '已逾期' || status === '审核中') {
        buckets.urgent.push(item);
        return;
      }
      const dayDiff = Math.round(
        (startOfDay(new Date(effectiveDeadline(item)).getTime()) - startOfDay(now)) / 86400000,
      );
      if (dayDiff <= 0) buckets.today.push(item);
      else if (dayDiff <= 6) buckets.week.push(item);
      else buckets.later.push(item);
    });

    const byDeadlineAsc = (a: HomeworkItem, b: HomeworkItem) =>
      new Date(effectiveDeadline(a)).getTime() - new Date(effectiveDeadline(b)).getTime();
    const byDeadlineDesc = (a: HomeworkItem, b: HomeworkItem) =>
      new Date(b.deadline).getTime() - new Date(a.deadline).getTime();

    (['urgent', 'today', 'week', 'later', 'ongoing'] as GroupKey[]).forEach((key) => {
      buckets[key].sort(byDeadlineAsc);
    });
    buckets.archive.sort(byDeadlineDesc);

    const order: GroupKey[] = isManager
      ? ['urgent', 'ongoing', 'archive']
      : ['urgent', 'today', 'week', 'later', 'archive'];

    return order
      .map((key) => ({
        key,
        ...GROUP_META[key],
        title: key === 'archive' && isManager ? '已截止' : GROUP_META[key].title,
        items: buckets[key],
      }))
      .filter((group) => group.items.length > 0);
  }, [homeworks, isManager, getStatus, effectiveDeadline, now]);

  const filtered = useMemo(() => {
    if (filter === '全部') return homeworks;
    const list = homeworks.filter((item) => getStatus(item) === filter);
    const byDeadline = (a: HomeworkItem, b: HomeworkItem) =>
      filter === '已提交' || filter === '已截止'
        ? new Date(b.deadline).getTime() - new Date(a.deadline).getTime()
        : new Date(effectiveDeadline(a)).getTime() - new Date(effectiveDeadline(b)).getTime();
    return [...list].sort(byDeadline);
  }, [filter, homeworks, getStatus, effectiveDeadline]);

  const renderCard = (item: HomeworkItem) => {
    const status = getStatus(item);
    const subjectStyle = SUBJECT_STYLE[item.subject] || 'bg-[#F1F5F9] text-[#475569]';
    const statusStyle = STATUS_STYLE[status] || STATUS_STYLE['待提交'];
    const deadline = effectiveDeadline(item);
    const total = item.totalMembers || 0;
    const submittedCount = item.submissionCount || 0;
    const percent = total > 0 ? Math.min(Math.round((submittedCount / total) * 100), 100) : 0;
    const pendingDelay = item.pendingDelayCount || 0;

    const goDetail = () => navigate(`/homework-detail/${item.id}`);
    const goSubmit = (e: React.MouseEvent) => {
      e.stopPropagation();
      navigate(`/homework-submit/${item.id}`);
    };
    const goDelay = (e: React.MouseEvent) => {
      e.stopPropagation();
      navigate(`/delay-apply/${item.id}`);
    };
    const goReview = (e: React.MouseEvent) => {
      e.stopPropagation();
      navigate(`/homework-detail/${item.id}`);
    };

    return (
      <div
        key={item.id}
        role="button"
        tabIndex={0}
        onClick={goDetail}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') goDetail();
        }}
        className="w-full cursor-pointer rounded-2xl bg-white p-4 text-left shadow-[0px_2px_8px_0px_#0000000D] ring-1 ring-[#F1F5F9] transition-transform active:scale-[0.99]"
      >
        <div className="flex items-center justify-between gap-2">
          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${subjectStyle}`}>
            {item.subject}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusStyle}`}>
            {status === '审核中' ? '延时审核中' : status}
          </span>
        </div>

        <div className="mt-2 flex items-start gap-1.5">
          <h3 className="line-clamp-2 flex-1 text-[15px] font-semibold leading-snug text-[#0F172A]">
            {item.title}
          </h3>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#CBD5E1]" strokeWidth={2} />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-[#64748B]">
          <Clock3 className="h-3.5 w-3.5 shrink-0 text-[#94A3B8]" />
          <span>{formatDeadline(deadline, now)} 截止</span>
          <span className="text-[#CBD5E1]">·</span>
          <span className={`font-semibold ${status === '已提交' ? 'text-[#16A34A]' : remainingTone(deadline, now)}`}>
            {status === '已提交' ? '已完成' : remainingText(deadline, now)}
          </span>
          {item.myDelayStatus === 'approved' && (
            <span className="rounded bg-[#F0FDF4] px-1 text-[10px] font-semibold text-[#16A34A]">
              已延期
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#F1F5F9] pt-2.5">
          <span className="truncate text-[11px] text-[#94A3B8]">
            {item.publisher?.name ? `${item.publisher.name} 发布` : '班级作业'}
          </span>

          {isManager ? (
            pendingDelay > 0 ? (
              <button
                type="button"
                onClick={goReview}
                className="flex h-7 shrink-0 items-center gap-1 rounded-full bg-[#FFFBEB] px-3 text-[11px] font-semibold text-[#D97706] active:opacity-80"
              >
                待审批 {pendingDelay} · 去审批
              </button>
            ) : (
              <span className="shrink-0 text-[11px] text-[#CBD5E1]">查看详情</span>
            )
          ) : status === '已提交' ? (
            <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-[#16A34A]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              查看提交
            </span>
          ) : status === '审核中' ? (
            <span className="flex h-7 shrink-0 items-center gap-1 rounded-full bg-[#F1F5F9] px-3 text-[11px] font-medium text-[#94A3B8]">
              <Clock3 className="h-3.5 w-3.5" />
              审核中
            </span>
          ) : status === '已逾期' ? (
            <button
              type="button"
              onClick={goDelay}
              className="flex h-7 shrink-0 items-center gap-1 rounded-full bg-[#FEF2F2] px-3 text-[11px] font-semibold text-[#DC2626] active:opacity-80"
            >
              <Timer className="h-3.5 w-3.5" />
              申请延时
            </button>
          ) : (
            <button
              type="button"
              onClick={goSubmit}
              className="flex h-7 shrink-0 items-center gap-1 rounded-full bg-[#0062FF] px-3 text-[11px] font-semibold text-white active:opacity-80"
            >
              <Send className="h-3.5 w-3.5" />
              去提交
            </button>
          )}
        </div>

        {isManager && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#64748B]">
                已交 <span className="font-semibold tabular-nums text-[#0F172A]">{submittedCount}</span>
                <span className="text-[#94A3B8]">/{total}</span>
              </span>
              <span className="tabular-nums text-[#94A3B8]">{percent}%</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
              <div
                className={`h-full rounded-full ${percent >= 100 ? 'bg-[#16A34A]' : 'bg-[#0062FF]'}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <PageLayout
      title="作业列表"
      variant="a"
      decor={<FileText className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}
      right={
        isManager ? (
          <div className="mr-2 flex flex-row gap-2">
            <button
              type="button"
              onClick={() => navigate('/offline-check')}
              className="flex h-9 items-center gap-1 rounded-full bg-white/20 px-3 text-sm font-medium text-white backdrop-blur"
            >
              <ClipboardCheck className="h-4 w-4" />
              离线核对
            </button>
            <button
              type="button"
              onClick={() => navigate('/publish-homework')}
              className="flex h-9 items-center gap-1 rounded-full bg-white/20 px-3 text-sm font-medium text-white backdrop-blur"
            >
              <Plus className="h-4 w-4" />
              发布
            </button>
          </div>
        ) : null
      }
    >
      <div className="flex min-h-full flex-1 flex-col gap-4">
        {/* 概览 */}
        <div className="flex items-stretch gap-2">
          {overview.map((item) => (
            <div
              key={item.label}
              className="flex flex-1 flex-col justify-center rounded-2xl px-3 py-2.5"
              style={{ backgroundColor: item.bg }}
            >
              <span
                className="font-data text-[22px] font-bold leading-none tabular-nums"
                style={{ color: item.color }}
              >
                {item.value}
              </span>
              <span className="mt-1.5 text-[11px] font-medium leading-none" style={{ color: item.color }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* 筛选 */}
        <div className="flex w-full flex-row items-start justify-start gap-2 overflow-x-auto">
          {tabs.map((tab) => {
            const active = filter === tab;
            const count = tab === '全部' ? homeworks.length : counts[tab] || 0;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`box-border flex h-[32px] shrink-0 items-center justify-center gap-1 rounded-full px-3.5 transition-colors ${
                  active ? 'bg-[#0062FF]' : 'bg-[#F1F5F9]'
                }`}
              >
                <span
                  className={`text-[12px] font-semibold [white-space:nowrap] ${
                    active ? 'text-white' : 'text-[#64748B]'
                  }`}
                >
                  {tab}
                </span>
                {count > 0 && (
                  <span
                    className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none tabular-nums ${
                      active ? 'bg-white/25 text-white' : 'bg-white text-[#94A3B8]'
                    }`}
                  >
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {loading || userLoading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[118px] w-full animate-pulse rounded-2xl bg-[#F1F5F9]" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-[#FEF2F2] py-12 text-[#B91C1C]">
            <AlertCircle className="h-8 w-8 opacity-60" />
            <span className="text-[13px]">{error}</span>
            <button
              type="button"
              onClick={load}
              className="flex items-center gap-1 rounded-full bg-white px-4 py-1.5 text-[12px] font-medium text-[#B91C1C] shadow-sm"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              重新加载
            </button>
          </div>
        ) : !classId ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-[#9CA3AF]">
            <FileText className="mb-2 h-12 w-12 opacity-30" />
            <span className="text-[14px]">尚未加入班级</span>
            <span className="text-[12px]">加入班级后即可查看和提交作业</span>
          </div>
        ) : homeworks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-[#9CA3AF]">
            <FileText className="mb-2 h-12 w-12 opacity-30" />
            <span className="text-[14px]">暂无作业</span>
            {isManager && (
              <button
                type="button"
                onClick={() => navigate('/publish-homework')}
                className="mt-2 rounded-full bg-[#0062FF] px-5 py-2 text-[13px] font-medium text-white"
              >
                发布第一份作业
              </button>
            )}
          </div>
        ) : filter === '全部' ? (
          <div className="flex w-full flex-col gap-4">
            {groups.map((group) => {
              const collapsible = group.key === 'archive' && groups.length > 1;
              if (collapsible && !showArchive) {
                return (
                  <button
                    key={group.key}
                    type="button"
                    onClick={() => setShowArchive(true)}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#E2E8F0] py-2.5 text-[11px] font-medium text-[#94A3B8]"
                  >
                    {group.title} {group.items.length} 份
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                );
              }
              return (
                <div key={group.key} className="flex w-full flex-col gap-2">
                  <div className="flex items-center gap-1.5 px-0.5">
                    <span className={`h-3 w-[3px] rounded-full ${group.dot}`} />
                    <span className="text-[12px] font-semibold text-[#1E293B]">{group.title}</span>
                    <span className="text-[11px] tabular-nums text-[#94A3B8]">{group.items.length}</span>
                    {collapsible && (
                      <button
                        type="button"
                        onClick={() => setShowArchive(false)}
                        className="ml-auto flex items-center gap-0.5 text-[11px] text-[#94A3B8]"
                      >
                        收起
                        <ChevronDown className="h-3.5 w-3.5 rotate-180" />
                      </button>
                    )}
                  </div>
                  {group.items.map(renderCard)}
                </div>
              );
            })}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-[#9CA3AF]">
            <FileText className="mb-2 h-12 w-12 opacity-30" />
            <span className="text-[14px]">该分类下暂无作业</span>
          </div>
        ) : (
          <div className="flex w-full flex-col gap-2">
            <div className="px-0.5 text-[11px] font-medium text-[#94A3B8]">
              共 {filtered.length} 份
            </div>
            {filtered.map(renderCard)}
          </div>
        )}
      </div>
    </PageLayout>
  );
}