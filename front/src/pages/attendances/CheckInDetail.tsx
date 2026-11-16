import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin,
  QrCode,
  Camera,
  KeyRound,
  CheckCircle,
  XCircle,
  Clock,
  Bell,
  StopCircle,
  CalendarClock,
  Users,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import PageLayout from '@/components/layout/PageLayout';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';
import { saveImageToGallery } from '@/lib/save-file';
import { toast } from 'sonner';
import GpsCheckIn from './GpsCheckIn';
import QrCheckIn from './QrCheckIn';
import FaceCheckIn from './FaceCheckIn';
import CodeCheckIn from './CodeCheckIn';

interface AttendanceDetail {
  id: string;
  title: string;
  type?: string;
  startTime: string;
  endTime: string;
  method: string;
  location?: string;
  latitude: number | null;
  longitude: number | null;
  checkRadius?: number;
  status: string;
  publisher: { id: string; name: string };
  myRecord: { id: string; status: string; checkInAt: string } | null;
  myLeaveApplication: {
    id: string;
    status: string;
    reason?: string;
    createdAt: string;
    reviewedAt?: string | null;
  } | null;
  createdAt: string;
}

interface Statistics {
  total: number;
  presentCount: number;
  absentCount: number;
  leaveCount: number;
  hiddenCount?: number;
  presentList: { userId: string; name: string; checkInAt: string; method: string }[];
  absentList: { userId: string; name: string }[];
  leaveList: { userId: string; name: string }[];
}

interface LeaveApplication {
  id: string;
  student: { id: string; name: string; studentId?: string; avatar?: string };
  reason: string;
  status: string;
  createdAt: string;
  reviewedAt?: string | null;
}

const methodIcons: Record<string, React.ReactNode> = {
  gps: <MapPin className="w-5 h-5 text-[#2563EB]" />,
  qr: <QrCode className="w-5 h-5 text-[#22C55E]" />,
  face: <Camera className="w-5 h-5 text-[#F97316]" />,
  code: <KeyRound className="w-5 h-5 text-[#EF4444]" />,
  normal: <MapPin className="w-5 h-5 text-[#0062FF]" />,
};

const methodLabels: Record<string, string> = {
  gps: '定位签到',
  qr: '二维码签到',
  face: '拍照签到',
  code: '口令签到',
  normal: '普通签到',
};

const leaveStatusLabels: Record<string, { text: string; className: string }> = {
  pending: { text: '待审批', className: 'bg-[#FEF3C7] text-[#B45309]' },
  approved: { text: '已通过', className: 'bg-[#DCFCE7] text-[#16A34A]' },
  rejected: { text: '已驳回', className: 'bg-[#FEE2E2] text-[#DC2626]' },
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 只取 HH:mm */
function formatClock(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 倒计时：小于 1 小时显示 mm:ss，否则 hh:mm:ss */
function formatCountdown(ms: number) {
  const total = Math.max(Math.floor(ms / 1000), 0);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** 时长描述：2 小时 15 分 */
function formatDuration(ms: number) {
  const total = Math.max(Math.floor(ms / 60000), 1);
  const d = Math.floor(total / 1440);
  const h = Math.floor((total % 1440) / 60);
  const m = total % 60;
  if (d > 0) return `${d} 天 ${h} 小时`;
  if (h > 0) return `${h} 小时 ${m} 分`;
  return `${total} 分钟`;
}

const methodHints: Record<string, string> = {
  gps: '先获取定位，确认在签到范围内后再提交',
  qr: '扫描班委在现场展示的二维码即可完成签到',
  face: '拍摄一张带时间水印的照片，确认后提交',
  code: '输入班委公布的 4 位数字签到口令',
  normal: '点击下方按钮即可完成签到',
};

export default function CheckInDetail() {
  const { classId, attendanceId } = useParams<{ classId: string; attendanceId: string }>();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [detail, setDetail] = useState<AttendanceDetail | null>(null);
  const [stats, setStats] = useState<Statistics | null>(null);
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [boardTab, setBoardTab] = useState<'present' | 'absent' | 'leave'>('absent');
  const [actionLoading, setActionLoading] = useState(false);
  const [normalLoading, setNormalLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [savingQr, setSavingQr] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const [selfieViewer, setSelfieViewer] = useState<{
    userId: string;
    name: string;
    url: string;
  } | null>(null);
  const [selfieLoading, setSelfieLoading] = useState(false);

  // 实时倒计时
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const isManager = Boolean(user?.isCommittee || (detail && user?.id === detail.publisher?.id));
  // 拍照签到的成员（按签到时间倒序），用于照片预览的上一张 / 下一张
  const faceList = (stats?.presentList ?? []).filter((p) => p.method === 'face');

  const fetchDetail = useCallback(async () => {
    if (!classId || !attendanceId) return;
    const res = await api.get(`/classes/${classId}/attendances/${attendanceId}`);
    const data = res.data.data || res.data;
    if (!data?.id || !data?.startTime || !data?.endTime) {
      throw new Error('签到数据异常');
    }
    if (
      Number.isNaN(new Date(data.startTime).getTime()) ||
      Number.isNaN(new Date(data.endTime).getTime())
    ) {
      throw new Error('签到时间数据异常');
    }
    setDetail(data);
  }, [classId, attendanceId]);

  const fetchStats = useCallback(async () => {
    if (!classId || !attendanceId) return;
    try {
      const res = await api.get(`/classes/${classId}/attendances/${attendanceId}/statistics`);
      setStats(res.data.data || res.data);
    } catch {
      setStats(null);
    }
  }, [classId, attendanceId]);

  const fetchLeaves = useCallback(async () => {
    if (!classId || !attendanceId) return;
    try {
      const res = await api.get(`/classes/${classId}/attendances/${attendanceId}/leaves`);
      const data = res.data.data || res.data;
      setLeaves(Array.isArray(data) ? data : []);
    } catch {
      setLeaves([]);
    }
  }, [classId, attendanceId]);

  const loadDetail = useCallback(async () => {
    if (!classId || !attendanceId) {
      setLoading(false);
      setLoadError('签到信息不存在');
      return;
    }
    setLoading(true);
    setLoadError('');
    try {
      await fetchDetail();
      await fetchStats();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : '获取签到详情失败');
    } finally {
      setLoading(false);
    }
  }, [classId, attendanceId, fetchDetail, fetchStats]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (isManager) {
      fetchLeaves();
    }
  }, [isManager, fetchLeaves]);

  const refreshAll = async () => {
    try {
      await Promise.all([fetchDetail(), fetchStats()]);
      if (isManager) await fetchLeaves();
    } catch {
      // ignore
    }
  };

  const handleClose = async () => {
    if (!classId || !attendanceId) return;
    setActionLoading(true);
    try {
      await api.post(`/classes/${classId}/attendances/${attendanceId}/close`);
      toast.success('签到已结束');
      await refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '结束签到失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemind = async () => {
    if (!classId || !attendanceId) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/classes/${classId}/attendances/${attendanceId}/remind`);
      const reminded = res.data.data?.reminded ?? res.data.reminded ?? 0;
      toast.success(reminded > 0 ? `已提醒 ${reminded} 位未签到成员` : '所有成员均已签到或请假');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '催签失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReviewLeave = async (applicationId: string, status: 'approved' | 'rejected') => {
    if (!classId || !attendanceId) return;
    setActionLoading(true);
    try {
      await api.post(
        `/classes/${classId}/attendances/${attendanceId}/leave/${applicationId}/review`,
        { status },
      );
      toast.success(status === 'approved' ? '已同意请假' : '已驳回请假');
      await refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '审批失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveQr = async () => {
    const canvas = qrCanvasRef.current;
    if (!canvas || savingQr) return;
    setSavingQr(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('二维码生成失败');
      const d = new Date();
      const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
      const res = await saveImageToGallery(`签到二维码-${detail?.title || '考勤'}-${stamp}.png`, blob);
      if (!res.ok) {
        toast.error('保存失败，请重试');
      } else if (res.gallery) {
        toast.success('二维码已保存到相册');
      } else {
        toast.success('二维码已保存到下载目录');
      }
    } catch {
      toast.error('保存失败，请重试');
    } finally {
      setSavingQr(false);
    }
  };

  const openSelfie = async (userId: string, name: string) => {
    if (!classId || !attendanceId || selfieLoading) return;
    setSelfieViewer({ userId, name, url: '' });
    setSelfieLoading(true);
    try {
      const res = await api.get(`/classes/${classId}/attendances/${attendanceId}/selfies/${userId}`);
      const data = res.data.data || res.data;
      if (!data?.selfieUrl) throw new Error('该成员没有照片');
      setSelfieViewer({ userId, name, url: data.selfieUrl });
    } catch (err) {
      setSelfieViewer(null);
      toast.error(err instanceof Error ? err.message : '照片加载失败');
    } finally {
      setSelfieLoading(false);
    }
  };

  const stepSelfie = (delta: number) => {
    if (!selfieViewer || faceList.length < 2) return;
    const index = faceList.findIndex((p) => p.userId === selfieViewer.userId);
    if (index < 0) return;
    const next = faceList[(index + delta + faceList.length) % faceList.length];
    if (next && next.userId !== selfieViewer.userId) {
      void openSelfie(next.userId, next.name);
    }
  };

  if (loading) {
    return (
      <PageLayout title="签到详情" onBack={() => navigate(-1)}>
        <div className="flex items-center justify-center h-40 text-[#9CA3AF] text-sm">加载中...</div>
      </PageLayout>
    );
  }

  if (loadError) {
    return (
      <PageLayout title="签到详情" onBack={() => navigate(-1)}>
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <XCircle className="h-10 w-10 text-[#CBD5E1]" strokeWidth={1.5} />
          <div className="px-6 text-center text-[13px] text-[#64748B]">{loadError}</div>
          <button
            type="button"
            onClick={() => void loadDetail()}
            className="flex h-[40px] items-center justify-center rounded-lg bg-[#0062FF] px-5 text-[13px] font-medium text-white active:opacity-80"
          >
            重新加载
          </button>
        </div>
      </PageLayout>
    );
  }

  if (!detail) {
    return (
      <PageLayout title="签到详情" onBack={() => navigate(-1)}>
        <div className="flex items-center justify-center h-40 text-[#9CA3AF] text-sm">签到不存在</div>
      </PageLayout>
    );
  }

  const startMs = new Date(detail.startTime).getTime();
  const endMs = new Date(detail.endTime).getTime();
  const timeState: 'upcoming' | 'ongoing' | 'ended' =
    detail.status === 'closed' || now > endMs
      ? 'ended'
      : now < startMs
        ? 'upcoming'
        : 'ongoing';

  const hasCheckedIn = detail.myRecord != null;
  const leaveStatus = detail.myLeaveApplication?.status;
  const canCheckIn = !hasCheckedIn && timeState === 'ongoing' && leaveStatus !== 'approved';
  const canApplyLeave =
    !hasCheckedIn && timeState !== 'ended' && !detail.myLeaveApplication && leaveStatus !== 'approved';

  const goApplyLeave = () =>
    navigate(`/leave-apply?classId=${classId}&attendanceId=${attendanceId}`);

  const handleNormalCheckIn = async () => {
    if (!classId || !attendanceId) return;
    setNormalLoading(true);
    try {
      await api.post(`/classes/${classId}/attendances/${attendanceId}/check-in`, {
        method: 'normal',
      });
      toast.success('签到成功！');
      await refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '签到失败');
    } finally {
      setNormalLoading(false);
    }
  };

  const remainMs = Math.max(endMs - now, 0);
  const totalMs = Math.max(endMs - startMs, 1);
  const remainPercent = Math.min(Math.max(Math.round((remainMs / totalMs) * 100), 0), 100);
  const isUrgent = timeState === 'ongoing' && remainMs <= 5 * 60 * 1000;

  const methodLabel = methodLabels[detail.method] || '普通签到';
  const methodIcon = methodIcons[detail.method] || methodIcons.normal;

  const total = stats?.total || 0;
  const presentCount = stats?.presentCount || 0;
  const absentCount = stats?.absentCount || 0;
  const leaveCount = stats?.leaveCount || 0;
  const presentPct = total > 0 ? (presentCount / total) * 100 : 0;
  const leavePct = total > 0 ? (leaveCount / total) * 100 : 0;
  const absentPct = total > 0 ? (absentCount / total) * 100 : 0;

  const boardItems =
    boardTab === 'present'
      ? (stats?.presentList ?? []).map((p) => ({
          id: p.userId,
          name: p.name,
          meta: formatClock(p.checkInAt),
          selfie: p.method === 'face',
        }))
      : boardTab === 'absent'
        ? (stats?.absentList ?? []).map((a) => ({ id: a.userId, name: a.name, meta: '未签到', selfie: false }))
        : (stats?.leaveList ?? []).map((l) => ({ id: l.userId, name: l.name, meta: '请假', selfie: false }));

  return (
    <PageLayout
      title={detail.title}
      onBack={() => navigate(-1)}
      contentClassName="bg-[#F5F7FA]"
    >
      <div className="flex flex-col gap-4">
        {/* 状态英雄区 */}
        {hasCheckedIn ? (
          <div className="overflow-hidden rounded-2xl bg-white shadow-soft">
            <div className="flex flex-col items-center gap-2 px-5 pb-5 pt-7">
              <div className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#DCFCE7]">
                <span className="absolute -inset-2 rounded-full border-2 border-[#16A34A1A]" />
                <CheckCircle className="h-9 w-9 text-[#16A34A]" strokeWidth={2.5} />
              </div>
              <div className="mt-1 font-heading text-[20px] font-bold text-[#1A1A1A]">签到成功</div>
              <div className="text-[12px] text-[#94A3B8]">已记录本次考勤，无需其他操作</div>
            </div>
            <div className="grid grid-cols-2 divide-x divide-[#F1F5F9] border-t border-dashed border-[#E5E7EB]">
              <div className="px-4 py-3">
                <div className="text-[11px] text-[#94A3B8]">签到时间</div>
                <div className="mt-0.5 font-data text-[15px] font-semibold text-[#1A1A1A]">
                  {formatClock(detail.myRecord!.checkInAt)}
                </div>
              </div>
              <div className="px-4 py-3">
                <div className="text-[11px] text-[#94A3B8]">签到方式</div>
                <div className="mt-0.5 text-[15px] font-semibold text-[#1A1A1A]">{methodLabel}</div>
              </div>
            </div>
          </div>
        ) : timeState === 'ongoing' ? (
          /* 进行中：倒计时 + 一句话指引 */
          <div
            className="relative overflow-hidden rounded-2xl px-5 pb-5 pt-4 text-white shadow-lift"
            style={{
              backgroundImage: 'linear-gradient(-133.249deg, #0062FF 25.619%, #004ECC 74.381%)',
            }}
          >
            <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[#FFFFFF12]" />
            <div className="relative flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFFFFF26] px-2.5 py-1 text-[11px] font-semibold">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                </span>
                进行中
              </span>
              <span className="rounded-full bg-[#FFFFFF1F] px-2.5 py-1 text-[11px] text-[#FFFFFFE6]">
                {methodLabel}
              </span>
            </div>

            <div className="relative mt-4 flex items-end justify-between">
              <div>
                <div className="text-[12px] text-[#FFFFFFBF]">距离签到结束还有</div>
                <div
                  className={`mt-1 font-data text-[34px] font-bold leading-none tabular-nums ${
                    isUrgent ? 'text-[#FFE08A]' : 'text-white'
                  }`}
                >
                  {formatCountdown(remainMs)}
                </div>
              </div>
              <div className="relative h-[68px] w-[68px] shrink-0">
                <svg viewBox="0 0 68 68" className="h-full w-full -rotate-90">
                  <circle cx="34" cy="34" r="30" fill="none" stroke="#FFFFFF40" strokeWidth="5" />
                  <circle
                    cx="34"
                    cy="34"
                    r="30"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 30}
                    strokeDashoffset={2 * Math.PI * 30 * (1 - remainPercent / 100)}
                    className="transition-[stroke-dashoffset] duration-1000 ease-linear"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-data text-[15px] font-bold leading-none">{remainPercent}%</span>
                  <span className="mt-0.5 text-[9px] text-[#FFFFFFB3]">剩余</span>
                </div>
              </div>
            </div>

            <div className="relative mt-4 rounded-xl bg-[#FFFFFF1F] px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[13px] font-semibold">
                <Clock className="h-3.5 w-3.5" />
                请在 {formatClock(detail.endTime)} 前完成签到
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-[#FFFFFFBF]">
                <span>{formatTime(detail.startTime)} 开始</span>
                {detail.location && <span>· {detail.location}</span>}
                <span>· 发起人 {detail.publisher?.name || '未知'}</span>
              </div>
            </div>
          </div>
        ) : timeState === 'upcoming' ? (
          /* 未开始 */
          <div className="rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] px-5 py-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DBEAFE] px-2.5 py-1 text-[11px] font-semibold text-[#1D4ED8]">
                <Clock className="h-3 w-3" />
                未开始
              </span>
              <span className="text-[11px] text-[#64748B]">{methodLabel}</span>
            </div>
            <div className="mt-3 flex items-end gap-2">
              <span className="font-heading text-[28px] font-bold leading-none text-[#1A1A1A]">
                {formatClock(detail.startTime)}
              </span>
              <span className="pb-0.5 text-[12px] text-[#64748B]">开始签到</span>
            </div>
            <div className="mt-2 text-[13px] font-medium text-[#1D4ED8]">
              {formatDuration(startMs - now)}后开始，请提前到达
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-2 text-[11px] text-[#64748B]">
              <span>
                {formatTime(detail.startTime)} - {formatClock(detail.endTime)}
              </span>
              {detail.location && <span>· {detail.location}</span>}
              <span>· 发起人 {detail.publisher?.name || '未知'}</span>
            </div>
          </div>
        ) : (
          /* 已结束 */
          <div
            className={`rounded-2xl border px-5 py-4 ${
              leaveStatus === 'approved'
                ? 'border-[#BBF7D0] bg-[#F0FDF4]'
                : 'border-[#FECACA] bg-[#FEF2F2]'
            }`}
          >
            <div className="flex items-center gap-2">
              {leaveStatus === 'approved' ? (
                <CheckCircle className="h-6 w-6 text-[#16A34A]" />
              ) : (
                <XCircle className="h-6 w-6 text-[#DC2626]" />
              )}
              <div className="font-heading text-[17px] font-bold text-[#1A1A1A]">
                {leaveStatus === 'approved' ? '已请假，无需签到' : '本次签到已结束'}
              </div>
            </div>
            <div
              className={`mt-1.5 text-[12px] ${
                leaveStatus === 'approved' ? 'text-[#15803D]' : 'text-[#DC2626]'
              }`}
            >
              {leaveStatus === 'approved'
                ? '请假申请已通过，本次不计入缺勤'
                : '未在有效时间内完成签到，已记为缺勤'}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-2 text-[11px] text-[#64748B]">
              <span>
                {formatTime(detail.startTime)} - {formatClock(detail.endTime)}
              </span>
              {detail.location && <span>· {detail.location}</span>}
            </div>
          </div>
        )}

        {!hasCheckedIn &&
          detail.myLeaveApplication &&
          !(leaveStatus === 'approved' && timeState === 'ended') && (
            <div
              className={`flex items-start gap-2.5 rounded-xl border px-3 py-3 ${
                leaveStatus === 'approved'
                  ? 'border-[#BBF7D0] bg-[#F0FDF4]'
                  : leaveStatus === 'rejected'
                    ? 'border-[#FECACA] bg-[#FEF2F2]'
                    : 'border-[#FDE68A] bg-[#FEF3C7]'
              }`}
            >
              <Clock
                className={`mt-0.5 h-4 w-4 shrink-0 ${
                  leaveStatus === 'approved'
                    ? 'text-[#16A34A]'
                    : leaveStatus === 'rejected'
                      ? 'text-[#DC2626]'
                      : 'text-[#B45309]'
                }`}
              />
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-[#1A1A1A]">
                  {leaveStatus === 'approved'
                    ? '请假已通过，本次无需签到'
                    : leaveStatus === 'rejected'
                      ? '请假申请被驳回'
                      : '请假申请审核中'}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-[#64748B]">
                  {detail.myLeaveApplication.reason}
                </div>
              </div>
            </div>
          )}

        {/* 签到操作区 */}
        {canCheckIn && (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2 rounded-xl bg-[#F1F5F9] px-3 py-2.5">
              <span className="mt-0.5 shrink-0">{methodIcon}</span>
              <div className="text-[12px] leading-[18px] text-[#475569]">
                <span className="font-semibold text-[#1A1A1A]">{methodLabel} · </span>
                {methodHints[detail.method] || methodHints.normal}
              </div>
            </div>

            {detail.method === 'gps' && (
              <GpsCheckIn
                classId={classId!}
                attendanceId={attendanceId!}
                attendance={{
                  location: detail.location,
                  latitude: detail.latitude,
                  longitude: detail.longitude,
                  checkRadius: detail.checkRadius,
                }}
                onSuccess={refreshAll}
              />
            )}
            {detail.method === 'qr' && <QrCheckIn />}
            {detail.method === 'face' && (
              <FaceCheckIn classId={classId!} attendanceId={attendanceId!} onSuccess={refreshAll} />
            )}
            {detail.method === 'code' && (
              <CodeCheckIn classId={classId!} attendanceId={attendanceId!} onSuccess={refreshAll} />
            )}
            {detail.method === 'normal' && (
              <button
                onClick={handleNormalCheckIn}
                disabled={normalLoading}
                className="h-[52px] w-full rounded-xl bg-[#0062FF] text-[15px] font-semibold text-white shadow-[0_8px_20px_-8px_#0062FFB3] transition-transform active:scale-[0.99] disabled:opacity-60"
              >
                {normalLoading ? '签到中...' : '立即签到'}
              </button>
            )}
          </div>
        )}

        {/* 申请请假 */}
        {canApplyLeave && (
          <button
            onClick={goApplyLeave}
            className="flex h-[46px] w-full items-center justify-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white text-[13px] font-medium text-[#475569] active:bg-[#F8FAFC]"
          >
            <CalendarClock className="w-4 h-4" />
            无法参加？申请请假
          </button>
        )}

        {/* 班委管理 */}
        {isManager && (
          <div className="rounded-2xl bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[14px] font-semibold text-[#1A1A1A]">
                <Users className="h-4 w-4 text-[#0062FF]" />
                签到管理
              </div>
              <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-medium text-[#64748B]">
                仅班委可见
              </span>
            </div>

            {detail.method === 'qr' && timeState !== 'ended' && (
              <div className="mt-3 rounded-xl bg-[#F8FAFC] p-3">
                <div className="flex items-center gap-3">
                  <div className="shrink-0 rounded-xl bg-white p-2 shadow-soft">
                    <QRCodeSVG
                      value={`attendance:${classId}:${attendanceId}`}
                      size={148}
                      level="H"
                      marginSize={1}
                      fgColor="#000000"
                      bgColor="#FFFFFF"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-semibold text-[#1A1A1A]">扫码签到</div>
                    <div className="mt-1 text-[11px] leading-[16px] text-[#64748B]">
                      同学使用「扫一扫」扫描左侧二维码完成签到
                    </div>
                    <div className="mt-1 text-[10px] leading-[14px] text-[#94A3B8]">
                      保存到相册后可放大展示
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSaveQr()}
                  disabled={savingQr}
                  className="mt-3 flex h-[38px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#0062FF] text-[13px] font-semibold text-white shadow-[0_8px_18px_-10px_#0062FFCC] transition-transform active:scale-[0.99] disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  {savingQr ? '保存中...' : '保存二维码到相册'}
                </button>
                {/* 高清导出用画布，不参与布局 */}
                <QRCodeCanvas
                  ref={qrCanvasRef}
                  value={`attendance:${classId}:${attendanceId}`}
                  size={720}
                  level="H"
                  marginSize={2}
                  fgColor="#000000"
                  bgColor="#FFFFFF"
                  className="hidden"
                />
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <button
                onClick={handleRemind}
                disabled={actionLoading || timeState === 'ended'}
                className="flex h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#EBF3FF] text-[13px] font-medium text-[#0062FF] disabled:opacity-50 active:opacity-80"
              >
                <Bell className="h-4 w-4" />
                一键催签
              </button>
              <button
                onClick={() => setConfirmClose(true)}
                disabled={actionLoading || detail.status !== 'open'}
                className="flex h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#F8FAFC] text-[13px] font-medium text-[#DC2626] disabled:opacity-50 active:opacity-80"
              >
                <StopCircle className="h-4 w-4" />
                {detail.status === 'open' ? '结束签到' : '已结束'}
              </button>
            </div>

            <div className="mt-4 border-t border-[#F1F5F9] pt-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-[#64748B]">请假申请</span>
                <span className="text-[11px] text-[#94A3B8]">{leaves.length} 条</span>
              </div>
              {leaves.length === 0 ? (
                <div className="py-3 text-center text-[11px] text-[#94A3B8]">暂无请假申请</div>
              ) : (
                <div className="mt-2 flex flex-col gap-2">
                  {leaves.map((item) => (
                    <div key={item.id} className="rounded-xl border border-[#F1F5F9] p-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F1F5F9] text-[11px] font-semibold text-[#475569]">
                          {(item.student?.name || '?').slice(0, 1)}
                        </span>
                        <span className="text-[13px] font-medium text-[#1A1A1A]">
                          {item.student?.name || '未知成员'}
                        </span>
                        <span
                          className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            leaveStatusLabels[item.status]?.className || 'bg-[#F3F4F6] text-[#6B7280]'
                          }`}
                        >
                          {leaveStatusLabels[item.status]?.text || item.status}
                        </span>
                      </div>
                      <div className="mt-1.5 text-[12px] leading-[18px] text-[#64748B]">
                        {item.reason}
                      </div>
                      {item.status === 'pending' && (
                        <div className="mt-2.5 flex gap-2">
                          <button
                            onClick={() => handleReviewLeave(item.id, 'approved')}
                            disabled={actionLoading}
                            className="h-[40px] flex-1 rounded-lg bg-[#0062FF] text-[12px] font-medium text-white disabled:opacity-50 active:opacity-80"
                          >
                            同意
                          </button>
                          <button
                            onClick={() => handleReviewLeave(item.id, 'rejected')}
                            disabled={actionLoading}
                            className="h-[40px] flex-1 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-medium text-[#DC2626] disabled:opacity-50 active:opacity-80"
                          >
                            驳回
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 本场考勤看板 */}
        {stats && total > 0 && (
          <div className="rounded-2xl bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[14px] font-semibold text-[#1A1A1A]">
                <Users className="h-4 w-4 text-[#0062FF]" />
                本场考勤
              </div>
              <div className="text-[11px] text-[#64748B]">
                <span className="font-data text-[15px] font-bold text-[#16A34A]">{presentCount}</span>
                <span className="text-[#94A3B8]"> / {total} 人已签到</span>
              </div>
            </div>

            <div className="mt-2.5 flex h-[8px] overflow-hidden rounded-full bg-[#F1F5F9]">
              <div
                className="h-full bg-[#16A34A] transition-all duration-500"
                style={{ width: `${presentPct}%` }}
              />
              <div
                className="h-full bg-[#F59E0B] transition-all duration-500"
                style={{ width: `${leavePct}%` }}
              />
              <div
                className="h-full bg-[#FCA5A5] transition-all duration-500"
                style={{ width: `${absentPct}%` }}
              />
            </div>

            <div className="mt-2 flex items-center gap-3 text-[11px] text-[#64748B]">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
                已签到 {presentCount}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
                请假 {leaveCount}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FCA5A5]" />
                未签 {absentCount}
              </span>
            </div>

            {isManager && (
              <>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {(
                    [
                      { key: 'present', label: '已签到', value: presentCount, color: 'text-[#16A34A]', active: 'border-[#16A34A] bg-[#F0FDF4]' },
                      { key: 'absent', label: '未签到', value: absentCount, color: 'text-[#DC2626]', active: 'border-[#DC2626] bg-[#FEF2F2]' },
                      { key: 'leave', label: '请假', value: leaveCount, color: 'text-[#D97706]', active: 'border-[#D97706] bg-[#FFFBEB]' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setBoardTab(tab.key)}
                      className={`rounded-xl border px-2 py-2 text-center transition-colors ${
                        boardTab === tab.key ? tab.active : 'border-[#F1F5F9] bg-[#F8FAFC]'
                      }`}
                    >
                      <div className={`font-data text-[18px] font-bold leading-none ${tab.color}`}>
                        {tab.value}
                      </div>
                      <div className="mt-1 text-[11px] text-[#64748B]">{tab.label}</div>
                    </button>
                  ))}
                </div>

                <div className="mt-2 flex max-h-[240px] flex-col gap-1.5 overflow-y-auto">
                  {boardItems.length === 0 ? (
                    <div className="py-4 text-center text-[11px] text-[#94A3B8]">
                      {boardTab === 'present' ? '还没有人签到' : boardTab === 'absent' ? '全部已签到' : '暂无请假'}
                    </div>
                  ) : (
                    boardItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 rounded-lg bg-[#F8FAFC] px-2.5 py-2"
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-[#475569]">
                          {item.name.slice(0, 1)}
                        </span>
                        <span className="text-[12px] text-[#1A1A1A]">{item.name}</span>
                        {isManager && item.selfie ? (
                          <button
                            type="button"
                            onClick={() => void openSelfie(item.id, item.name)}
                            className="ml-auto flex items-center gap-1 rounded-full bg-[#ECFDF5] px-2 py-1 text-[10px] font-medium text-[#059669] active:opacity-70"
                          >
                            <ImageIcon className="h-3 w-3" />
                            照片
                          </button>
                        ) : null}
                        <span
                          className={`text-[11px] text-[#94A3B8] ${isManager && item.selfie ? '' : 'ml-auto'}`}
                        >
                          {item.meta}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {(stats.hiddenCount ?? 0) > 0 && (
                  <div className="mt-2 text-[10px] text-[#94A3B8]">
                    另有 {stats.hiddenCount} 位成员设置了考勤隐私，未展示明细
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {selfieViewer && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black">
          <div className="flex items-center gap-3 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+12px)] text-white">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-medium">{selfieViewer.name}</div>
              <div className="text-[11px] text-white/60">拍照签到照片</div>
            </div>
            {faceList.length > 1 && (
              <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/70">
                {Math.max(faceList.findIndex((p) => p.userId === selfieViewer.userId), 0) + 1} /{' '}
                {faceList.length}
              </span>
            )}
            <button
              type="button"
              onClick={() => setSelfieViewer(null)}
              aria-label="关闭"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 active:opacity-70"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="relative flex flex-1 items-center justify-center overflow-hidden px-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
            {selfieViewer.url ? (
              <img
                src={selfieViewer.url}
                alt={`${selfieViewer.name}的签到照片`}
                className="max-h-full max-w-full object-contain"
              />
            ) : null}
            {faceList.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => stepSelfie(-1)}
                  aria-label="上一张"
                  className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white active:opacity-70"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={() => stepSelfie(1)}
                  aria-label="下一张"
                  className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white active:opacity-70"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
            {selfieLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-[12px] text-white">
                加载中...
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmClose}
        title="结束本次签到？"
        description="结束后成员将无法继续签到，未签到成员会被记为缺勤，该操作不可撤销。"
        confirmText="确认结束"
        danger
        onCancel={() => setConfirmClose(false)}
        onConfirm={() => {
          setConfirmClose(false);
          void handleClose();
        }}
      />
    </PageLayout>
  );
}