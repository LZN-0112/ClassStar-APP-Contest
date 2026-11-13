import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, QrCode, Camera, KeyRound, Target, Clock, ChevronRight } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';

interface AttendanceItem {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  method: string;
  location?: string;
  status: string;
  checkInCount: number;
  createdAt: string;
  myRecord?: { id: string; status: string } | null;
  myLeaveApplication?: { id: string; status: string; reason: string } | null;
}

type StatusFilter = 'pending' | 'in-progress' | 'completed';

const methodIcons: Record<string, React.ReactNode> = {
  gps: <MapPin className="w-[20px] h-[20px] text-[#2563EB]" strokeWidth={2} />,
  qr: <QrCode className="w-[20px] h-[20px] text-[#22C55E]" strokeWidth={2} />,
  face: <Camera className="w-[20px] h-[20px] text-[#F97316]" strokeWidth={2} />,
  code: <KeyRound className="w-[20px] h-[20px] text-[#EF4444]" strokeWidth={2} />,
  normal: <MapPin className="w-[20px] h-[20px] text-[#0062FF]" strokeWidth={2} />,
};

function getAttendanceStatus(item: AttendanceItem, nowMs: number): StatusFilter {
  const now = new Date(nowMs);
  const start = new Date(item.startTime);
  const end = new Date(item.endTime);
  if (item.status === 'closed' || now > end) return 'completed';
  if (now >= start && now <= end && item.status === 'open') return 'in-progress';
  return 'pending';
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (date.getTime() === today.getTime()) return `今天 ${hh}:${mm}`;
  if (date.getTime() === yesterday.getTime()) return `昨天 ${hh}:${mm}`;
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${hh}:${mm}`;
}

const statusLabels: Record<StatusFilter, string> = {
  pending: '未开始',
  'in-progress': '进行中',
  completed: '已结束',
};

const sectionDot: Record<StatusFilter, string> = {
  'in-progress': 'bg-[#0062FF]',
  pending: 'bg-[#F59E0B]',
  completed: 'bg-[#94A3B8]',
};

export default function AttendanceList() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [items, setItems] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<StatusFilter | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const classId = user?.classId;

  const fetchList = useCallback(async () => {
    if (!classId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/classes/${classId}/attendances?pageSize=100`);
      const data = res.data.data || res.data;
      setItems(Array.isArray(data?.list) ? data.list : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取考勤列表失败');
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  // 每 30 秒刷新一次基准时间，保证跨越起止时间后状态与统计及时更新
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const statusMap = items.reduce<Record<string, StatusFilter>>((acc, item) => {
    acc[item.id] = getAttendanceStatus(item, now);
    return acc;
  }, {});

  const stats = {
    pending: items.filter((t) => statusMap[t.id] === 'pending').length,
    inProgress: items.filter((t) => statusMap[t.id] === 'in-progress').length,
    completed: items.filter((t) => statusMap[t.id] === 'completed').length,
  };

  const sortedItems = [...items].sort((a, b) => {
    const rank: Record<StatusFilter, number> = { 'in-progress': 0, pending: 1, completed: 2 };
    const diff = rank[statusMap[a.id]] - rank[statusMap[b.id]];
    if (diff !== 0) return diff;
    if (statusMap[a.id] === 'pending') {
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    }
    return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
  });

  const displayItems = (() => {
    if (!filter) return sortedItems;
    return sortedItems.filter((t) => statusMap[t.id] === filter);
  })();

  const statItems: { label: string; value: number; key: StatusFilter }[] = [
    { label: '未开始', value: stats.pending, key: 'pending' },
    { label: '进行中', value: stats.inProgress, key: 'in-progress' },
    { label: '已结束', value: stats.completed, key: 'completed' },
  ];

  const getMyState = (item: AttendanceItem) => {
    if (item.myRecord) {
      return item.myRecord.status === 'late' ? '迟到' : '已签到';
    }
    if (item.myLeaveApplication?.status === 'approved') return '已请假';
    if (item.myLeaveApplication?.status === 'pending') return '请假审核中';
    if (statusMap[item.id] === 'completed') return '缺勤';
    return null;
  };

  const sections = filter
    ? [
        {
          key: filter,
          label: statusLabels[filter],
          dot: sectionDot[filter],
          items: displayItems,
        },
      ]
    : (['in-progress', 'pending', 'completed'] as StatusFilter[])
        .map((key) => ({
          key,
          label: statusLabels[key],
          dot: sectionDot[key],
          items: displayItems.filter((item) => statusMap[item.id] === key),
        }))
        .filter((section) => section.items.length > 0);

  return (
    <PageLayout
      title="考勤"
      variant="a"
      contentClassName="bg-[#F5F7FA]"
      decor={<Target className="h-[112px] w-[112px] text-white" strokeWidth={1.5} />}
      right={
        user?.roleLevel === 'owner' || user?.roleLevel === 'admin' ? (
          <button
            type="button"
            onClick={() => navigate('/publish-attendance')}
            className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-[#0062FF] shadow-[0px_2px_8px_0px_#0000001A]"
          >
            <span className="text-white text-[20px] font-bold leading-none">+</span>
          </button>
        ) : undefined
      }
    >
      <div className="flex w-full min-h-full flex-col gap-4">
        {/* 统计卡片 */}
        <div className="box-border grid w-full grid-cols-3 gap-3">
          {statItems.map((stat) => (
            <button
              key={stat.label}
              type="button"
              onClick={() => setFilter((prev) => (prev === stat.key ? null : stat.key))}
              className={`box-border flex flex-col items-center gap-[6px] rounded-2xl p-4 shadow-soft transition-all ${
                filter === stat.key ? 'bg-[#0062FF]' : 'bg-white'
              }`}
            >
              <div
                className={`font-heading text-[28px] font-bold leading-none ${
                  filter === stat.key ? 'text-white' : 'text-[#0062FF]'
                }`}
              >
                {stat.value}
              </div>
              <div
                className={`font-body text-[11px] font-semibold ${
                  filter === stat.key ? 'text-white/80' : 'text-[#6B7280]'
                }`}
              >
                {stat.label}
              </div>
            </button>
          ))}
        </div>

        {/* 考勤列表 */}
        <div className="box-border flex w-full flex-col gap-[10px]">
          <div className="flex items-center justify-between">
            <div className="text-[11px]/[normal] box-border text-left font-body font-semibold text-[#6B7280] [white-space:nowrap]">
              考勤列表
            </div>
            {(user?.roleLevel === 'owner' || user?.roleLevel === 'admin') && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/leave-approval')}
                  className="-my-2 px-1 py-2 text-[11px] font-body font-semibold text-[#0062FF] active:opacity-80"
                >
                  请假审批
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/attendance-report')}
                  className="-my-2 px-1 py-2 text-[11px] font-body font-semibold text-[#0062FF] active:opacity-80"
                >
                  考勤报表
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="py-10 text-center text-[13px] text-[#94A3B8]">加载中...</div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-white py-10 shadow-soft">
              <span className="px-4 text-center text-[13px] text-[#64748B]">{error}</span>
              <button
                type="button"
                onClick={() => void fetchList()}
                className="flex h-[40px] items-center justify-center rounded-lg bg-[#0062FF] px-5 text-[13px] font-medium text-white active:opacity-80"
              >
                重新加载
              </button>
            </div>
          ) : displayItems.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-[#94A3B8]">
              {filter ? `暂无${statusLabels[filter]}的考勤` : '暂无考勤记录'}
            </div>
          ) : (
            <div className="box-border flex w-full flex-col gap-4">
              {sections.map((section) => (
                <div key={section.key} className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 px-0.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${section.dot}`} />
                    <span className="text-[11px] font-body font-semibold text-[#64748B]">
                      {section.label}
                    </span>
                    <span className="text-[11px] font-body text-[#CBD5E1]">
                      {section.items.length}
                    </span>
                  </div>
                  {section.items.map((item) => {
                    const itemStatus = statusMap[item.id];
                    const ongoing = itemStatus === 'in-progress';
                    const myState = getMyState(item);
                    const canCheckInNow =
                      ongoing && !item.myRecord && item.myLeaveApplication?.status !== 'approved';
                    return (
                      <div
                        key={item.id}
                        className={`relative z-10 box-border flex w-full flex-col gap-2 overflow-hidden rounded-2xl bg-white py-3.5 pl-4 pr-3.5 text-left shadow-soft transition-all active:scale-[0.99] ${
                          ongoing ? 'ring-1 ring-[#0062FF]' : ''
                        }`}
                        onClick={() => navigate(`/check-in-detail/${classId}/${item.id}`)}
                      >
                        {ongoing && (
                          <span className="absolute left-0 top-0 h-full w-[3px] bg-[#0062FF]" />
                        )}

                        <div className="flex w-full flex-row items-center justify-between gap-2">
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            {methodIcons[item.method] || methodIcons.normal}
                            <span className="truncate text-[14px]/[normal] font-body font-semibold text-[#1E293B]">
                              {item.title}
                            </span>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px]/[normal] font-caption font-semibold ${
                              ongoing
                                ? 'bg-[#DBEAFE] text-[#1D4ED8]'
                                : itemStatus === 'pending'
                                  ? 'bg-[#F1F5F9] text-[#64748B]'
                                  : 'bg-[#F3F4F6] text-[#9CA3AF]'
                            }`}
                          >
                            {statusLabels[itemStatus]}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-[11px]/[normal] font-body font-medium text-[#64748B]">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span className="truncate">{formatTime(item.startTime)}</span>
                          {item.location && (
                            <span className="truncate text-[#94A3B8]">· {item.location}</span>
                          )}
                        </div>

                        <div className="flex w-full flex-row items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px]/[normal] font-body font-medium text-[#94A3B8]">
                              已签到 {item.checkInCount} 人
                            </span>
                            {myState && (
                              <span
                                className={`rounded-full px-2 py-0.5 text-[11px]/[normal] font-caption font-semibold ${
                                  myState === '已签到'
                                    ? 'bg-[#DCFCE7] text-[#15803D]'
                                    : myState === '迟到'
                                      ? 'bg-[#FEF3C7] text-[#B45309]'
                                      : myState === '已请假' || myState === '请假审核中'
                                        ? 'bg-[#FEF3C7] text-[#B45309]'
                                        : myState === '缺勤'
                                          ? 'bg-[#FEE2E2] text-[#B91C1C]'
                                          : 'bg-[#F1F5F9] text-[#64748B]'
                                }`}
                              >
                                {myState}
                              </span>
                            )}
                          </div>
                          {canCheckInNow ? (
                            <span className="flex items-center gap-0.5 rounded-full bg-[#0062FF] px-2.5 py-1 text-[11px] font-caption font-semibold text-white">
                              立即签到
                              <ChevronRight className="h-3 w-3" />
                            </span>
                          ) : (
                            <ChevronRight className="h-4 w-4 text-[#CBD5E1]" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
