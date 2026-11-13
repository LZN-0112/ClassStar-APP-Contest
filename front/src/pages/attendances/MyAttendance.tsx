import PageLayout from '@/components/layout/PageLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type AttendanceStatus = 'present' | 'leave' | 'absent' | 'late' | 'pending' | 'upcoming';

interface AttendanceRecord {
  id: string;
  day: string;
  weekday: string;
  status: AttendanceStatus;
  title: string;
  statusTitle: string;
  time: string;
  color: string;
  bgColor: string;
}

const FILTER_TABS: { label: string; value: 'all' | AttendanceStatus }[] = [
  { label: '全部', value: 'all' },
  { label: '正常', value: 'present' },
  { label: '迟到', value: 'late' },
  { label: '缺勤', value: 'absent' },
  { label: '请假', value: 'leave' },
];

const STATUS_MAP: Record<string, { title: string; color: string; bgColor: string }> = {
  present: { title: '正常', color: 'text-[#22C55E]', bgColor: 'bg-[#22C55E1A]' },
  leave: { title: '请假', color: 'text-[#F59E0B]', bgColor: 'bg-[#F59E0B1A]' },
  absent: { title: '缺勤', color: 'text-[#EF4444]', bgColor: 'bg-[#EF44441A]' },
  late: { title: '迟到', color: 'text-[#F59E0B]', bgColor: 'bg-[#F59E0B1A]' },
  pending: { title: '待签到', color: 'text-[#2563EB]', bgColor: 'bg-[#DBEAFE]' },
  upcoming: { title: '未开始', color: 'text-[#6B7280]', bgColor: 'bg-[#F3F4F6]' },
};

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function formatDate(date: Date): { day: string; weekday: string } {
  const d = new Date(date);
  return {
    day: String(d.getDate()),
    weekday: WEEKDAYS[d.getDay()],
  };
}

function formatTime(date: Date): string {
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function MyAttendance() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [activeFilter, setActiveFilter] = useState<'all' | AttendanceStatus>('all');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRecords = useCallback(() => {
    if (!user?.classId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    api
      .get(`/classes/${user.classId}/attendances`, { params: { pageSize: 100 } })
      .then((res) => {
        const data = res.data.data || res.data;
        const list = Array.isArray(data?.list) ? data.list : [];
        const mapped: AttendanceRecord[] = list.filter(Boolean).map((item: any) => {
          const { day, weekday } = formatDate(item.startTime);
          const now = Date.now();
          const ended = item.status === 'closed' || now > new Date(item.endTime).getTime();
          const started = now >= new Date(item.startTime).getTime();
          let status: AttendanceStatus;
          if (item.myRecord) {
            status = item.myRecord.status === 'late' ? 'late' : 'present';
          } else if (item.myLeaveApplication?.status === 'approved') {
            status = 'leave';
          } else if (ended) {
            status = 'absent';
          } else {
            status = started ? 'pending' : 'upcoming';
          }
          const statusInfo = STATUS_MAP[status] || STATUS_MAP.absent;
          const location = item.location ? ` · ${item.location}` : '';
          return {
            id: item.id,
            day,
            weekday,
            status,
            title: item.title,
            statusTitle: statusInfo.title,
            time: `${formatTime(item.startTime)}${location}`,
            color: statusInfo.color,
            bgColor: statusInfo.bgColor,
          };
        });
        setRecords(mapped);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '获取考勤记录失败');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user?.classId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const filteredRecords =
    activeFilter === 'all'
      ? records
      : records.filter((record) => record.status === activeFilter);

  return (
    <PageLayout
      title="我的考勤"
      variant="a"
      contentClassName="px-0 pb-0 pt-0"
      decor={
          <svg
            data-pencil-name="Icon-clock"
            viewBox="0 0 24 24"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
            className="box-border h-[120px] w-[120px] shrink-0 overflow-visible"
          >
            <path
              d="M12 22c5.523 0 10-4.477 10-10s-4.477-10-10-10-10 4.477-10 10 4.477 10 10 10m0-16v6l4 2"
              fill="none"
            ></path>
            <path
              d="M12 22c5.523 0 10-4.477 10-10s-4.477-10-10-10-10 4.477-10 10 4.477 10 10 10m0-16v6l4 2"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            ></path>
          </svg>
        }
      >
      <div
        data-pencil-name="Content"
        className="box-border w-full flex flex-col gap-0 justify-start items-start bg-[#FFFFFF]"
      >
        <div
          data-pencil-name="Body"
          className="box-border w-full min-h-full flex flex-col gap-[20px] p-[16px_20px_96px_20px] justify-start items-start bg-[#FFFFFF]"
        >
          <div
            data-pencil-name="Filter Tabs"
            className="box-border w-full h-fit shrink-0 flex flex-row flex-wrap gap-2 justify-start items-start bg-[#00000000]"
          >
            {FILTER_TABS.map((tab) => {
              const isActive = activeFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  data-pencil-name={`Tab ${tab.label}`}
                  onClick={() => setActiveFilter(tab.value)}
                  className={`box-border w-fit shrink-0 h-[32px] flex flex-col gap-0 p-[8px_16px] justify-center items-center rounded-full transition-colors active:opacity-80 ${
                    isActive ? 'bg-[#0062FF]' : 'bg-[#F3F4F6]'
                  }`}
                >
                  <div
                    data-pencil-name="Text"
                    className={`text-[11px]/[normal] box-border font-body font-semibold text-left [white-space:nowrap] ${
                      isActive ? 'text-[#FFFFFF]' : 'text-[#4B5563]'
                    }`}
                  >
                    {tab.label}
                  </div>
                </button>
              );
            })}
          </div>
          <div
            data-pencil-name="Group 考勤记录"
            className="box-border w-full h-fit shrink-0 flex flex-col gap-[10px] justify-start items-start bg-[#00000000]"
          >
            <div
              data-pencil-name="Text"
              className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-semibold text-left [white-space:nowrap]"
            >
              考勤记录
            </div>
            <div
              data-pencil-name="Group Content"
              className="box-border w-full h-fit shrink-0 flex flex-col gap-2 justify-start items-start bg-[#00000000]"
            >
              {loading ? (
                <div className="box-border flex h-[120px] w-full flex-col items-center justify-center rounded-[16px] bg-[#F9FAFB] text-[14px] text-[#6B7280]">
                  加载中...
                </div>
              ) : error ? (
                <div className="box-border flex w-full flex-col items-center justify-center gap-3 rounded-[16px] bg-[#F9FAFB] px-4 py-8">
                  <div className="text-center text-[14px] text-[#6B7280]">{error}</div>
                  <button
                    type="button"
                    onClick={fetchRecords}
                    className="flex h-[40px] items-center justify-center rounded-lg bg-[#0062FF] px-5 text-[13px] font-medium text-white active:opacity-80"
                  >
                    重新加载
                  </button>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="box-border flex h-[120px] w-full flex-col items-center justify-center rounded-[16px] bg-[#F9FAFB] text-[14px] text-[#6B7280]">
                  暂无该状态考勤记录
                </div>
              ) : (
                filteredRecords.map((record) => (
                  <div
                    key={record.id}
                    data-pencil-name="Card"
                    className="box-border w-full min-h-[80px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-[12px] p-4 justify-start items-center bg-[#FFFFFF] rounded-[16px] cursor-pointer active:opacity-80"
                    onClick={() => navigate(`/check-in-detail/${user?.classId}/${record.id}`)}
                  >
                    <div
                      data-pencil-name="Date"
                      className="box-border w-[56px] shrink-0 h-full flex flex-col gap-[2px] justify-center items-center bg-[#00000000]"
                    >
                      <div
                        data-pencil-name="Text"
                        className="text-[20px]/[normal] box-border text-[#1A1A1A] font-heading font-bold text-left [white-space:nowrap]"
                      >
                        {record.day}
                      </div>
                      <div
                        data-pencil-name="Text"
                        className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                      >
                        {record.weekday}
                      </div>
                    </div>
                    <div
                      data-pencil-name="Info"
                      className="box-border [flex:1_1_0] min-w-0 h-full flex flex-col gap-[6px] justify-center items-start bg-[#00000000]"
                    >
                      <div
                        data-pencil-name="Text"
                        className={`text-[16px]/[normal] box-border max-w-full truncate font-body font-bold text-left ${record.color}`}
                      >
                        {record.title}
                      </div>
                      <div
                        data-pencil-name="Text"
                        className="text-[11px]/[normal] box-border max-w-full truncate text-[#4B5563] font-body font-medium text-left"
                      >
                        {record.time}
                      </div>
                      <div
                        data-pencil-name="Tag"
                        className={`box-border w-fit h-[22px] shrink-0 flex flex-col gap-0 p-[4px_8px] justify-center items-center rounded-full ${record.bgColor}`}
                      >
                        <div
                          data-pencil-name="Text"
                          className={`text-[11px]/[normal] box-border font-body font-semibold text-left [white-space:nowrap] ${record.color}`}
                        >
                          {record.statusTitle}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
