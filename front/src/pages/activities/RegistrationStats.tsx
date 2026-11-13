import { useCallback, useEffect, useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { toast } from 'sonner';

type RegistrationStatus = 'pending' | 'registered' | 'approved' | 'rejected';
type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

interface RegistrationItem {
  id: string;
  studentName: string;
  status: RegistrationStatus;
  registeredAt: string;
}

interface StatsData {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  participationRate: number;
}

const statusMeta: Record<string, { label: string; className: string }> = {
  pending: { label: '待审核', className: 'text-[#F59E0B]' },
  registered: { label: '已通过', className: 'text-[#22C55E]' },
  approved: { label: '已通过', className: 'text-[#22C55E]' },
  rejected: { label: '未通过', className: 'text-[#EF4444]' },
};

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${month}月${day}日 ${hh}:${mm}`;
};

export default function RegistrationStats() {
  const [searchParams] = useSearchParams();
  const { user } = useCurrentUser();
  const classId = searchParams.get('classId') || user?.classId;
  const activityId = searchParams.get('activityId');

  const [items, setItems] = useState<RegistrationItem[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [activityTitle, setActivityTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [reviewingId, setReviewingId] = useState('');

  const fetchStats = useCallback(async () => {
    if (!classId || !activityId) {
      setError('缺少活动信息');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const [statsRes, activityRes] = await Promise.all([
        api.get(`/classes/${classId}/activities/${activityId}/registrations`),
        api.get(`/classes/${classId}/activities/${activityId}`).catch(() => null),
      ]);

      const data = statsRes.data.data || statsRes.data;
      setItems(
        (data.list || []).map((item: any) => ({
          id: item.id,
          studentName: item.studentName || '未知同学',
          status: item.status,
          registeredAt: item.registeredAt,
        })),
      );
      setStats({
        total: data.total || 0,
        pending: data.pending || 0,
        approved: data.approved || 0,
        rejected: data.rejected || 0,
        participationRate: data.participationRate || 0,
      });
      if (activityRes) {
        const activity = activityRes.data.data || activityRes.data;
        setActivityTitle(activity?.title || '');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取报名数据失败';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [classId, activityId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const updateStatus = async (id: string, status: 'registered' | 'rejected') => {
    if (!classId || !activityId || reviewingId) return;

    setReviewingId(id);
    try {
      await api.post(
        `/classes/${classId}/activities/${activityId}/registrations/${id}/review`,
        { status },
      );
      toast.success(status === 'registered' ? '已通过报名' : '已驳回报名');
      await fetchStats();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '审核失败，请重试');
    } finally {
      setReviewingId('');
    }
  };

  const filtered = items.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'approved') {
      return item.status === 'registered' || item.status === 'approved';
    }
    return item.status === filter;
  });

  const tabs: Array<{ key: FilterStatus; label: string; count: number }> = [
    { key: 'all', label: '全部', count: stats?.total || 0 },
    { key: 'pending', label: '待审核', count: stats?.pending || 0 },
    { key: 'approved', label: '已通过', count: stats?.approved || 0 },
    { key: 'rejected', label: '未通过', count: stats?.rejected || 0 },
  ];

  return (
    <PageLayout title="报名统计" variant="b">
      <div className="flex flex-col gap-[20px]">
        {activityTitle && (
          <div className="text-[13px]/[normal] box-border text-[#4B5563] font-body font-medium text-left truncate">
            {activityTitle}
          </div>
        )}

        <div
          data-pencil-name="Stats Row"
          className="box-border w-full h-fit shrink-0 flex flex-row gap-[12px] justify-start items-start bg-[#00000000]"
        >
          {[
            { value: stats?.total ?? 0, label: '总报名' },
            { value: stats?.pending ?? 0, label: '待审核' },
            { value: `${stats?.participationRate ?? 0}%`, label: '参与率' },
          ].map((item) => (
            <div
              key={item.label}
              data-pencil-name="Stat Card"
              className="box-border [flex:1_1_0] h-fit [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-[6px] p-4 justify-start items-center bg-[#FFFFFF] rounded-[16px]"
            >
              <div
                data-pencil-name="Text"
                className="text-[28px]/[normal] box-border text-[#004ECC] font-heading font-bold text-left [white-space:nowrap]"
              >
                {item.value}
              </div>
              <div
                data-pencil-name="Text"
                className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-semibold text-left [white-space:nowrap]"
              >
                {item.label}
              </div>
            </div>
          ))}
        </div>

        <div
          data-pencil-name="Filter Tabs"
          className="box-border w-full h-fit shrink-0 flex flex-row gap-2 justify-start items-start bg-[#00000000]"
        >
          {tabs.map((tab) => {
            const active = filter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={`box-border w-fit shrink-0 h-[32px] flex flex-col gap-0 p-[8px_16px] justify-center items-center rounded-full ${
                  active ? 'bg-[#0062FF]' : 'bg-[#F3F4F6]'
                }`}
              >
                <div
                  className={`text-[11px]/[normal] box-border font-body font-semibold text-left [white-space:nowrap] ${
                    active ? 'text-[#FFFFFF]' : 'text-[#4B5563]'
                  }`}
                >
                  {tab.label} {tab.count}
                </div>
              </button>
            );
          })}
        </div>

        <div
          data-pencil-name="Group 报名人员"
          className="box-border w-full h-fit shrink-0 flex flex-col gap-[10px] justify-start items-start bg-[#00000000]"
        >
          <div
            data-pencil-name="Text"
            className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-semibold text-left [white-space:nowrap]"
          >
            报名人员
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
              <div className="box-border flex h-[160px] w-full flex-col items-center justify-center gap-3 rounded-[16px] bg-[#F9FAFB] text-[14px] text-[#6B7280]">
                <div>{error}</div>
                <button
                  type="button"
                  onClick={fetchStats}
                  className="rounded-lg bg-[#0062FF] px-4 py-2 text-[13px] font-medium text-white"
                >
                  重新加载
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="box-border flex h-[120px] w-full flex-col items-center justify-center rounded-[16px] bg-[#F9FAFB] text-[14px] text-[#6B7280]">
                暂无报名记录
              </div>
            ) : (
              filtered.map((item) => {
                const meta = statusMeta[item.status] || statusMeta.pending;
                return (
                  <div
                    key={item.id}
                    data-pencil-name="Card"
                    className="box-border w-full h-fit shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-[10px] p-4 justify-start items-start bg-[#FFFFFF] rounded-[16px]"
                  >
                    <div
                      data-pencil-name="Row"
                      className="box-border w-full h-fit shrink-0 flex flex-row gap-2 justify-between items-center"
                    >
                      <div
                        data-pencil-name="Name"
                        className="text-[16px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left truncate min-w-0"
                      >
                        {item.studentName}
                      </div>
                      <div
                        data-pencil-name="Status"
                        className={`shrink-0 text-[11px]/[normal] box-border font-caption font-medium text-left [white-space:nowrap] ${meta.className}`}
                      >
                        {meta.label}
                      </div>
                    </div>
                    <div
                      data-pencil-name="Info"
                      className="text-[12px]/[normal] box-border text-[#4B5563] font-body font-normal text-left"
                    >
                      报名于 {formatTime(item.registeredAt)}
                    </div>
                    {item.status === 'pending' && (
                      <div
                        data-pencil-name="Actions"
                        className="box-border w-full h-fit shrink-0 flex flex-row gap-[10px] justify-start items-start"
                      >
                        <button
                          type="button"
                          disabled={!!reviewingId}
                          onClick={() => updateStatus(item.id, 'registered')}
                          data-pencil-name="Approve"
                          className="box-border [flex:1_1_0] h-[36px] flex flex-col gap-0 justify-center items-center bg-[#22C55E] rounded-lg disabled:opacity-60"
                        >
                          <div
                            data-pencil-name="Text"
                            className="text-[13px]/[normal] box-border text-[#FFFFFF] font-body font-semibold text-left [white-space:nowrap]"
                          >
                            {reviewingId === item.id ? '处理中...' : '通过'}
                          </div>
                        </button>
                        <button
                          type="button"
                          disabled={!!reviewingId}
                          onClick={() => updateStatus(item.id, 'rejected')}
                          data-pencil-name="Reject"
                          className="box-border [flex:1_1_0] h-[36px] flex flex-col gap-0 justify-center items-center bg-[#EF44441A] rounded-lg disabled:opacity-60"
                        >
                          <div
                            data-pencil-name="Text"
                            className="text-[13px]/[normal] box-border text-[#EF4444] font-body font-semibold text-left [white-space:nowrap]"
                          >
                            驳回
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}