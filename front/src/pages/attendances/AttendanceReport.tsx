import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, TrendingUp } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import PageLayout from '@/components/layout/PageLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';
import { toast } from 'sonner';

type MyStatus = 'present' | 'late' | 'leave' | 'absent' | 'pending' | 'upcoming';

interface ReportSession {
  id: string;
  title: string;
  method: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'in-progress' | 'completed';
  presentCount: number;
  leaveCount: number;
  absentCount: number;
  total: number;
  myStatus: MyStatus;
}

interface ReportData {
  totalSessions: number;
  memberCount: number;
  myPresent: number;
  myLeave: number;
  myAbsent: number;
  attendanceRate: number;
  sessions: ReportSession[];
}

const MY_STATUS: Record<MyStatus, { text: string; className: string }> = {
  present: { text: '正常', className: 'bg-[#DCFCE7] text-[#16A34A]' },
  late: { text: '迟到', className: 'bg-[#FEF3C7] text-[#B45309]' },
  leave: { text: '请假', className: 'bg-[#FEF3C7] text-[#B45309]' },
  absent: { text: '缺勤', className: 'bg-[#FEE2E2] text-[#DC2626]' },
  pending: { text: '待签到', className: 'bg-[#DBEAFE] text-[#1D4ED8]' },
  upcoming: { text: '未开始', className: 'bg-[#F3F4F6] text-[#6B7280]' },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function AttendanceReport() {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useCurrentUser();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const fetchReport = useCallback(async () => {
    if (!user?.classId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/classes/${user.classId}/attendances/report`);
      const raw = res.data.data || res.data;
      if (!raw || typeof raw !== 'object') throw new Error('考勤报表数据异常');
      setReport({
        totalSessions: Number(raw.totalSessions) || 0,
        memberCount: Number(raw.memberCount) || 0,
        myPresent: Number(raw.myPresent) || 0,
        myLeave: Number(raw.myLeave) || 0,
        myAbsent: Number(raw.myAbsent) || 0,
        attendanceRate: Number(raw.attendanceRate) || 0,
        sessions: Array.isArray(raw.sessions) ? raw.sessions : [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取考勤报表失败');
    } finally {
      setLoading(false);
    }
  }, [user?.classId]);

  useEffect(() => {
    if (userLoading) return;
    void fetchReport();
  }, [userLoading, fetchReport]);

  const handleExport = async () => {
    if (!report || exporting) return;
    setExporting(true);
    const header = ['日期', '签到标题', '我的状态', '已签到', '请假', '缺勤', '应到'];
    const rows = report.sessions.map((s) => [
      formatDate(s.startTime),
      s.title,
      MY_STATUS[s.myStatus]?.text || s.myStatus,
      String(s.presentCount),
      String(s.leaveCount),
      String(s.absentCount),
      String(s.total),
    ]);
    const content = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const fileName = `考勤报表-${new Date().toISOString().slice(0, 10)}.csv`;

    if (Capacitor.isNativePlatform()) {
      try {
        const { uri } = await Filesystem.writeFile({
          path: fileName,
          data: `\uFEFF${content}`,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });
        await Share.share({
          title: '考勤报表',
          text: '考勤报表',
          url: uri,
          dialogTitle: '导出考勤报表',
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!/cancel/i.test(msg)) toast.error('导出失败，请重试');
      } finally {
        setExporting(false);
      }
      return;
    }

    try {
      const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('考勤报表已导出');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="考勤报表" onBack={() => navigate(-1)}>
        <div className="py-16 text-center text-sm text-[#9CA3AF]">加载中...</div>
      </PageLayout>
    );
  }

  if (error || !report) {
    return (
      <PageLayout title="考勤报表" onBack={() => navigate(-1)}>
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <TrendingUp className="w-10 h-10 text-[#CBD5E1]" strokeWidth={1.5} />
          <div className="text-sm text-[#6B7280]">{error || '暂无考勤数据'}</div>
          <button
            onClick={fetchReport}
            className="h-[36px] px-5 rounded-lg bg-[#0062FF] text-white text-sm font-medium active:opacity-80"
          >
            重新加载
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="考勤报表" onBack={() => navigate(-1)}>
      <div className="flex flex-col gap-4">
        <div className="text-xs text-[#6B7280]">
          已结束 {report.totalSessions} 场 · 明细 {report.sessions.length} 条 · 班级成员 {report.memberCount} 人
        </div>

        {/* 我的考勤概览 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center gap-1 rounded-2xl bg-white p-4 shadow-soft">
            <div className="font-heading text-[24px] font-bold text-[#0062FF]">
              {report.attendanceRate}%
            </div>
            <div className="text-[11px] text-[#6B7280]">我的出勤率</div>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-2xl bg-white p-4 shadow-soft">
            <div className="font-heading text-[24px] font-bold text-[#B45309]">{report.myLeave}</div>
            <div className="text-[11px] text-[#6B7280]">请假</div>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-2xl bg-white p-4 shadow-soft">
            <div className="font-heading text-[24px] font-bold text-[#DC2626]">{report.myAbsent}</div>
            <div className="text-[11px] text-[#6B7280]">缺勤</div>
          </div>
        </div>

        {/* 场次明细 */}
        <div className="flex flex-col gap-2">
          <div className="text-xs font-semibold text-[#6B7280]">场次明细</div>
          {report.sessions.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#9CA3AF]">暂无签到记录</div>
          ) : (
            report.sessions.map((session) => (
              <div
                key={session.id}
                className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-soft"
                onClick={() => navigate(`/check-in-detail/${user?.classId}/${session.id}`)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="text-sm font-semibold text-[#1A1A1A] truncate">
                      {session.title}
                    </span>
                    <span className="shrink-0 text-[11px] text-[#9CA3AF]">
                      {formatDate(session.startTime)} {formatTime(session.startTime)}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${
                      MY_STATUS[session.myStatus]?.className || 'bg-[#F3F4F6] text-[#6B7280]'
                    }`}
                  >
                    {MY_STATUS[session.myStatus]?.text || session.myStatus}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-[#6B7280]">
                  <span>已签到 {session.presentCount}</span>
                  <span>请假 {session.leaveCount}</span>
                  <span>缺勤 {session.absentCount}</span>
                  <span className="ml-auto">应到 {session.total}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <button
          onClick={handleExport}
          disabled={report.sessions.length === 0 || exporting}
          className="w-full h-[48px] flex items-center justify-center gap-2 bg-[#0062FF] text-white font-medium rounded-lg disabled:opacity-50 active:opacity-80"
        >
          <Download className="w-4 h-4" />
          {exporting ? '导出中...' : '导出 CSV'}
        </button>
      </div>
    </PageLayout>
  );
}