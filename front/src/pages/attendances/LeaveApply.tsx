import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarClock, Send } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface AttendanceBrief {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function LeaveApply() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const classId = searchParams.get('classId') || '';
  const attendanceId = searchParams.get('attendanceId') || '';

  const [attendance, setAttendance] = useState<AttendanceBrief | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(Boolean(classId && attendanceId));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!classId || !attendanceId) {
      setLoading(false);
      return;
    }
    api
      .get(`/classes/${classId}/attendances/${attendanceId}`)
      .then((res) => {
        const data = res.data.data || res.data;
        if (!data?.id || !data?.startTime || !data?.endTime) {
          throw new Error('签到信息不存在或已删除');
        }
        setAttendance({
          id: data.id,
          title: data.title || '签到',
          startTime: data.startTime,
          endTime: data.endTime,
          location: data.location,
        });
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : '获取签到信息失败');
      })
      .finally(() => setLoading(false));
  }, [classId, attendanceId]);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('请填写请假原因');
      return;
    }
    if (!classId || !attendanceId) return;
    setSubmitting(true);
    try {
      await api.post(`/classes/${classId}/attendances/${attendanceId}/leave`, {
        reason: reason.trim(),
      });
      toast.success('请假申请已提交，等待班委审批');
      navigate(`/check-in-detail/${classId}/${attendanceId}`, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '提交请假申请失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (!classId || !attendanceId) {
    return (
      <PageLayout title="请假申请" onBack={() => navigate(-1)}>
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <CalendarClock className="w-12 h-12 text-[#CBD5E1]" strokeWidth={1.5} />
          <div className="text-sm text-[#6B7280]">请从签到详情页发起请假申请</div>
          <button
            onClick={() => navigate('/attendance-list')}
            className="h-[40px] px-6 rounded-lg bg-[#0062FF] text-white text-sm font-medium active:opacity-80"
          >
            前往考勤列表
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="请假申请" onBack={() => navigate(-1)}>
      <div className="flex flex-col gap-4">
        {/* 签到任务 */}
        <div className="flex flex-col gap-2 p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
          <div className="text-xs font-medium text-[#6B7280]">签到任务</div>
          {loading ? (
            <div className="text-sm text-[#9CA3AF]">加载中...</div>
          ) : attendance ? (
            <>
              <div className="text-sm font-semibold text-[#1A1A1A]">{attendance.title}</div>
              <div className="text-xs text-[#4B5563]">
                时间：{formatTime(attendance.startTime)} ~ {formatTime(attendance.endTime)}
              </div>
              {attendance.location && (
                <div className="text-xs text-[#4B5563]">地点：{attendance.location}</div>
              )}
            </>
          ) : (
            <div className="text-sm text-[#9CA3AF]">签到信息获取失败</div>
          )}
        </div>

        {/* 请假原因 */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-[#6B7280]" htmlFor="leave-reason">
            请假原因
          </label>
          <textarea
            id="leave-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 200))}
            placeholder="请说明请假原因，便于班委审批"
            rows={5}
            className="w-full resize-none rounded-lg border border-[#E5E7EB] bg-white p-3 text-sm text-[#1A1A1A] outline-none focus:border-[#0062FF]"
          />
          <div className="text-right text-[11px] text-[#9CA3AF]">{reason.length}/200</div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting || loading || !attendance}
          className="w-full h-[48px] flex items-center justify-center gap-2 bg-[#0062FF] text-white font-medium rounded-lg disabled:opacity-50 active:opacity-80"
        >
          <Send className="w-4 h-4" />
          {submitting ? '提交中...' : '提交申请'}
        </button>
      </div>
    </PageLayout>
  );
}