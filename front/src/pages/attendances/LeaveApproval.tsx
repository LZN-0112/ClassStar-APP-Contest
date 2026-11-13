import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Inbox } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface PendingLeave {
  id: string;
  attendance: { id: string; title: string; startTime: string; endTime: string };
  student: { id: string; name: string; studentId?: string; avatar?: string };
  reason: string;
  createdAt: string;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function LeaveApproval() {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useCurrentUser();
  const [items, setItems] = useState<PendingLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState('');

  const fetchList = useCallback(async () => {
    if (!user?.classId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/classes/${user.classId}/attendances/pending-leaves`);
      const data = res.data.data || res.data;
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取请假申请失败');
    } finally {
      setLoading(false);
    }
  }, [user?.classId]);

  useEffect(() => {
    if (userLoading) return;
    void fetchList();
  }, [userLoading, fetchList]);

  const handleReview = async (item: PendingLeave, status: 'approved' | 'rejected') => {
    if (!user?.classId) return;
    setActionId(item.id);
    try {
      await api.post(
        `/classes/${user.classId}/attendances/${item.attendance.id}/leave/${item.id}/review`,
        { status },
      );
      toast.success(status === 'approved' ? '已同意请假' : '已驳回请假');
      setItems((prev) => prev.filter((p) => p.id !== item.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '审批失败');
    } finally {
      setActionId('');
    }
  };

  return (
    <PageLayout
      title="请假审批"
      onBack={() => navigate(-1)}
      right={
        <button
          onClick={fetchList}
          className="-my-3 px-2 py-3 text-xs font-medium text-[#0062FF] active:opacity-80"
        >
          刷新
        </button>
      }
    >
      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="py-16 text-center text-sm text-[#9CA3AF]">加载中...</div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <XCircle className="w-10 h-10 text-[#CBD5E1]" strokeWidth={1.5} />
            <div className="text-sm text-[#6B7280]">{error}</div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Inbox className="w-12 h-12 text-[#CBD5E1]" strokeWidth={1.5} />
            <div className="text-sm text-[#6B7280]">暂无待审批的请假申请</div>
          </div>
        ) : (
          <>
            <div className="text-xs font-semibold text-[#6B7280]">
              待审批（{items.length}）
            </div>
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-soft border border-[#F1F5F9]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="text-sm font-semibold text-[#1A1A1A]">
                      {item.student?.name || '未知成员'}
                      {item.student?.studentId && (
                        <span className="ml-2 text-[11px] font-normal text-[#9CA3AF]">
                          {item.student.studentId}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#6B7280] truncate">
                      {item.attendance?.title} · {formatTime(item.attendance?.startTime)}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[11px] text-[#B45309]">
                    待审批
                  </span>
                </div>

                <div className="rounded-lg bg-[#F9FAFB] p-3 text-xs leading-relaxed text-[#4B5563]">
                  {item.reason}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleReview(item, 'approved')}
                    disabled={actionId === item.id}
                    className="flex-1 h-[38px] flex items-center justify-center gap-1.5 bg-[#0062FF] text-white text-sm font-medium rounded-lg disabled:opacity-50 active:opacity-80"
                  >
                    <CheckCircle className="w-4 h-4" />
                    同意
                  </button>
                  <button
                    onClick={() => handleReview(item, 'rejected')}
                    disabled={actionId === item.id}
                    className="flex-1 h-[38px] flex items-center justify-center gap-1.5 bg-white text-[#DC2626] text-sm font-medium rounded-lg border border-[#E5E7EB] disabled:opacity-50 active:opacity-80"
                  >
                    <XCircle className="w-4 h-4" />
                    驳回
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </PageLayout>
  );
}