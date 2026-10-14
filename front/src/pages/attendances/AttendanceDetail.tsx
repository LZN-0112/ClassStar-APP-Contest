import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface Statistics {
  total: number;
  presentCount: number;
  absentCount: number;
  leaveCount: number;
  presentList: { userId: string; name: string; studentId: string; avatar: string; checkInAt: string; method: string }[];
  absentList: { userId: string; name: string; studentId: string; avatar: string }[];
  leaveList: { userId: string; name: string; studentId: string; avatar: string }[];
}

export default function AttendanceDetail() {
  const { classId, attendanceId } = useParams<{ classId: string; attendanceId: string }>();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('班会签到');
  const [status, setStatus] = useState('进行中');

  useEffect(() => {
    const fetchData = async () => {
      if (!classId || !attendanceId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [detailRes, statsRes] = await Promise.all([
          api.get(`/classes/${classId}/attendances/${attendanceId}`),
          api.get(`/classes/${classId}/attendances/${attendanceId}/statistics`),
        ]);
        const detail = detailRes.data.data || detailRes.data;
        const statsData = statsRes.data.data || statsRes.data;
        setTitle(detail.title || '班会签到');
        setStatus(detail.status === 'open' ? '进行中' : '已结束');
        setStats(statsData);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '获取签到详情失败');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [classId, attendanceId]);

  const handleRemind = async () => {
    if (!stats || stats.absentList.length === 0) {
      toast.info('没有未签到人员');
      return;
    }
    try {
      // 一键催签：给未签到人员发送通知
      await api.post(`/classes/${classId}/attendances/${attendanceId}/remind`);
      toast.success(`已向 ${stats.absentList.length} 位未签到人员发送催签通知`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '催签失败');
    }
  };

  if (loading) {
    return (
      <PageLayout title="签到详情">
        <div className="flex items-center justify-center h-40 text-[#9CA3AF] text-sm">加载中...</div>
      </PageLayout>
    );
  }

  if (!stats) {
    return (
      <PageLayout title="签到详情">
        <div className="flex items-center justify-center h-40 text-[#9CA3AF] text-sm">暂无数据</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={title} onBack={() => navigate(-1)}>
      <div className="flex flex-col gap-4">
        {/* 状态信息 */}
        <div className="text-sm text-[#4B5563]">
          {status} · 2024-09-10 19:00
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center justify-center h-[80px] bg-white rounded-lg shadow-soft">
            <div className="text-[20px] font-bold text-[#1A1A1A]">{stats.total}</div>
            <div className="text-[11px] text-[#4B5563]">应到</div>
          </div>
          <div className="flex flex-col items-center justify-center h-[80px] bg-white rounded-lg shadow-soft">
            <div className="text-[20px] font-bold text-[#1A1A1A]">{stats.presentCount}</div>
            <div className="text-[11px] text-[#4B5563]">已签</div>
          </div>
          <div className="flex flex-col items-center justify-center h-[80px] bg-white rounded-lg shadow-soft">
            <div className="text-[20px] font-bold text-[#1A1A1A]">{stats.absentCount}</div>
            <div className="text-[11px] text-[#4B5563]">未签</div>
          </div>
        </div>

        {/* 未签人员列表 */}
        {stats.absentList.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="text-[16px] font-semibold text-[#1A1A1A]">未签人员</div>
            {stats.absentList.map((member) => (
              <div
                key={member.userId}
                className="flex items-center justify-between h-[52px] px-4 bg-white rounded-lg shadow-soft"
              >
                <div className="text-[14px] text-[#1A1A1A]">{member.name}</div>
                <div className="text-[11px] text-[#0062FF66]">未签到</div>
              </div>
            ))}
          </div>
        )}

        {/* 请假人员 */}
        {stats.leaveList.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="text-[16px] font-semibold text-[#1A1A1A]">请假人员</div>
            {stats.leaveList.map((member) => (
              <div
                key={member.userId}
                className="flex items-center justify-between h-[52px] px-4 bg-white rounded-lg shadow-soft"
              >
                <div className="text-[14px] text-[#1A1A1A]">{member.name}</div>
                <div className="text-[11px] text-[#D97706]">请假</div>
              </div>
            ))}
          </div>
        )}

        {/* 已签人员（可折叠） */}
        {stats.presentList.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="text-[16px] font-semibold text-[#1A1A1A]">已签人员 ({stats.presentCount})</div>
            <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
              {stats.presentList.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center gap-2 p-2 bg-[#F9FAFB] rounded text-xs"
                >
                  <div className="w-2 h-2 rounded-full bg-[#16A34A]"></div>
                  <span className="text-[#1A1A1A]">{member.name}</span>
                  <span className="text-[#9CA3AF] ml-auto">
                    {new Date(member.checkInAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 一键催签按钮 */}
        {status === '进行中' && stats.absentList.length > 0 && (
          <button
            onClick={handleRemind}
            className="w-full h-[52px] flex items-center justify-center bg-[#0062FF] text-white font-semibold rounded-lg shadow-soft active:opacity-80"
          >
            一键催签
          </button>
        )}
      </div>
    </PageLayout>
  );
}
