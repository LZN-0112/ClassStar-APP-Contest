import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, QrCode, Camera, KeyRound, Target } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';
import { toast } from 'sonner';

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
}

type StatusFilter = 'pending' | 'in-progress' | 'completed';

const methodIcons: Record<string, React.ReactNode> = {
  gps: <MapPin className="w-[20px] h-[20px] text-[#2563EB]" strokeWidth={2} />,
  qr: <QrCode className="w-[20px] h-[20px] text-[#22C55E]" strokeWidth={2} />,
  face: <Camera className="w-[20px] h-[20px] text-[#F97316]" strokeWidth={2} />,
  code: <KeyRound className="w-[20px] h-[20px] text-[#EF4444]" strokeWidth={2} />,
  normal: <MapPin className="w-[20px] h-[20px] text-[#0062FF]" strokeWidth={2} />,
};

function getAttendanceStatus(item: AttendanceItem): StatusFilter {
  const now = new Date();
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
  pending: '待完成',
  'in-progress': '进行中',
  completed: '已完成',
};

export default function AttendanceList() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [items, setItems] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter | null>(null);
  const classId = user?.classId;

  useEffect(() => {
    const fetchList = async () => {
      if (!classId) { setLoading(false); return; }
      setLoading(true);
      try {
        const res = await api.get(`/classes/${classId}/attendances?pageSize=100`);
        const data = res.data.data || res.data;
        setItems(data.list || []);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '获取考勤列表失败');
      } finally {
        setLoading(false);
      }
    };
    fetchList();
  }, [classId]);

  const statusMap = items.reduce<Record<string, StatusFilter>>((acc, item) => {
    acc[item.id] = getAttendanceStatus(item);
    return acc;
  }, {});

  const stats = {
    pending: items.filter((t) => statusMap[t.id] === 'pending').length,
    inProgress: items.filter((t) => statusMap[t.id] === 'in-progress').length,
    completed: items.filter((t) => statusMap[t.id] === 'completed').length,
  };

  const displayItems = (() => {
    if (!filter) return items;
    return items.filter((t) => statusMap[t.id] === filter);
  })();

  const statItems: { label: string; value: number; key: StatusFilter }[] = [
    { label: '待完成', value: stats.pending, key: 'pending' },
    { label: '进行中', value: stats.inProgress, key: 'in-progress' },
    { label: '已完成', value: stats.completed, key: 'completed' },
  ];

  return (
    <PageLayout
      title="考勤"
      variant="a"
      decor={<Target className="h-[112px] w-[112px] text-white" strokeWidth={1.5} />}
      right={
        <button
          type="button"
          onClick={() => navigate('/publish-attendance')}
          className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-[#0062FF] shadow-[0px_2px_8px_0px_#0000001A]"
        >
          <span className="text-white text-[20px] font-bold leading-none">+</span>
        </button>
      }
    >
      <div className="flex w-full min-h-full flex-col gap-5">
        {/* 统计卡片 */}
        <div className="box-border grid w-full grid-cols-3 gap-3">
          {statItems.map((stat) => (
            <button
              key={stat.label}
              type="button"
              onClick={() => setFilter((prev) => (prev === stat.key ? null : stat.key))}
              className={`box-border flex flex-col items-center gap-[6px] rounded-2xl p-4 shadow-soft transition-all ${
                filter === stat.key ? 'bg-[#076CAB]' : 'bg-white'
              }`}
            >
              <div
                className={`font-heading text-[28px] font-bold ${
                  filter === stat.key ? 'text-white' : 'text-[#076CAB]'
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
          <div className="text-[11px]/[normal] box-border text-left font-body font-semibold text-[#6B7280] [white-space:nowrap]">
            考勤列表
          </div>

          {loading ? (
            <div className="py-10 text-center text-[13px] text-[#94A3B8]">加载中...</div>
          ) : displayItems.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-[#94A3B8]">
              {filter ? `暂无${statusLabels[filter]}的考勤` : '暂无考勤记录'}
            </div>
          ) : (
            <div className="box-border flex w-full flex-col gap-2">
              {displayItems.map((item) => {
                const itemStatus = statusMap[item.id];
                return (
                  <div
                    key={item.id}
                    className="relative z-10 box-border flex w-full flex-col gap-[10px] rounded-2xl bg-white p-4 text-left shadow-soft cursor-pointer active:opacity-80 transition-all"
                    onClick={() => navigate(`/check-in-detail/${classId}/${item.id}`)}
                  >
                    <div className="box-border flex w-full flex-row items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {methodIcons[item.method] || methodIcons.normal}
                        <div className="text-[14px]/[normal] box-border text-left font-body font-semibold text-[#1E293B] [white-space:nowrap] truncate">
                          {item.title}
                        </div>
                      </div>
                      <div className={`text-[11px]/[normal] box-border px-2 py-0.5 rounded-full shrink-0 font-caption font-semibold ${
                        itemStatus === 'in-progress'
                          ? 'bg-[#DBEAFE] text-[#1D4ED8]'
                          : itemStatus === 'pending'
                          ? 'bg-[#FEF3C7] text-[#D97706]'
                          : 'bg-[#F3F4F6] text-[#6B7280]'
                      }`}>
                        {statusLabels[itemStatus]}
                      </div>
                    </div>
                    <div className="text-[11px]/[normal] box-border text-left font-body font-medium text-[#64748B] [white-space:nowrap]">
                      {formatTime(item.startTime)}
                      {item.location && ` · ${item.location}`}
                    </div>
                    <div className="box-border flex h-[6px] w-full flex-col justify-start rounded-full bg-[#E2E8F0]">
                      <div
                        className={`box-border h-[6px] shrink-0 rounded-full ${
                          itemStatus === 'in-progress'
                            ? 'bg-[#076CAB]'
                            : itemStatus === 'pending'
                            ? 'bg-[#F59E0B]'
                            : 'bg-[#9CA3AF]'
                        }`}
                        style={{
                          width: itemStatus === 'completed'
                            ? '100%'
                            : itemStatus === 'in-progress'
                            ? '60%'
                            : '0%',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
