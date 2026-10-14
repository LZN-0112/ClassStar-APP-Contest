import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, QrCode, Camera, KeyRound, CheckCircle, XCircle, Clock } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { api } from '@/lib/api';
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
  myLeaveApplication: { id: string; status: string } | null;
  createdAt: string;
}

interface Statistics {
  total: number;
  presentCount: number;
  absentCount: number;
  leaveCount: number;
  presentList: { userId: string; name: string; checkInAt: string; method: string }[];
  absentList: { userId: string; name: string }[];
  leaveList: { userId: string; name: string }[];
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

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function CheckInDetail() {
  const { classId, attendanceId } = useParams<{ classId: string; attendanceId: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<AttendanceDetail | null>(null);
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!classId || !attendanceId) { setLoading(false); return; }
      setLoading(true);
      try {
        const [detailRes, statsRes] = await Promise.all([
          api.get(`/classes/${classId}/attendances/${attendanceId}`),
          api.get(`/classes/${classId}/attendances/${attendanceId}/statistics`),
        ]);
        setDetail(detailRes.data.data || detailRes.data);
        setStats(statsRes.data.data || statsRes.data);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '获取签到详情失败');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [classId, attendanceId]);

  const handleCheckInSuccess = async () => {
    if (!classId || !attendanceId) return;
    try {
      const [detailRes, statsRes] = await Promise.all([
        api.get(`/classes/${classId}/attendances/${attendanceId}`),
        api.get(`/classes/${classId}/attendances/${attendanceId}/statistics`),
      ]);
      setDetail(detailRes.data.data || detailRes.data);
      setStats(statsRes.data.data || statsRes.data);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <PageLayout title="签到详情">
        <div className="flex items-center justify-center h-40 text-[#9CA3AF] text-sm">加载中...</div>
      </PageLayout>
    );
  }

  if (!detail) {
    return (
      <PageLayout title="签到详情">
        <div className="flex items-center justify-center h-40 text-[#9CA3AF] text-sm">签到不存在</div>
      </PageLayout>
    );
  }

  const hasCheckedIn = detail.myRecord != null;
  const isClosed = detail.status !== 'open';

  return (
    <PageLayout title={detail.title} onBack={() => navigate(-1)}>
      <div className="flex flex-col gap-4">
        {/* 签到信息卡片 */}
        <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
          <div className="flex items-center gap-2 mb-2">
            {methodIcons[detail.method] || methodIcons.normal}
            <span className="text-sm font-medium text-[#1A1A1A]">{methodLabels[detail.method] || '普通签到'}</span>
            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${detail.status === 'open' ? 'bg-[#DBEAFE] text-[#1D4ED8]' : 'bg-[#F3F4F6] text-[#6B7280]'}`}>
              {detail.status === 'open' ? '进行中' : '已结束'}
            </span>
          </div>
          <div className="text-xs text-[#4B5563] space-y-1">
            <div>时间：{formatTime(detail.startTime)} ~ {formatTime(detail.endTime)}</div>
            {detail.location && <div>地点：{detail.location}</div>}
            {detail.checkRadius && <div>范围：{detail.checkRadius} 米</div>}
          </div>
        </div>

        {/* 已签到状态 */}
        {hasCheckedIn && (
          <div className="flex items-center gap-2 p-3 bg-[#DCFCE7] rounded-lg border border-[#BBF7D0]">
            <CheckCircle className="w-5 h-5 text-[#16A34A]" />
            <span className="text-sm font-medium text-[#16A34A]">您已完成签到</span>
            <span className="text-xs text-[#4B5563] ml-auto">
              {new Date(detail.myRecord!.checkInAt).toLocaleTimeString()}
            </span>
          </div>
        )}

        {/* 签到操作区 */}
        {!hasCheckedIn && !isClosed && (
          <div className="flex flex-col gap-4">
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
                onSuccess={handleCheckInSuccess}
              />
            )}
            {detail.method === 'qr' && (
              <QrCheckIn
                classId={classId!}
                attendanceId={attendanceId!}
                onSuccess={handleCheckInSuccess}
              />
            )}
            {detail.method === 'face' && (
              <FaceCheckIn
                classId={classId!}
                attendanceId={attendanceId!}
                onSuccess={handleCheckInSuccess}
              />
            )}
            {detail.method === 'code' && (
              <CodeCheckIn
                classId={classId!}
                attendanceId={attendanceId!}
                onSuccess={handleCheckInSuccess}
              />
            )}
            {detail.method === 'normal' && (
              <button
                onClick={async () => {
                  try {
                    await api.post(`/classes/${classId}/attendances/${attendanceId}/check-in`, {
                      method: 'normal',
                    });
                    toast.success('签到成功！');
                    handleCheckInSuccess();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : '签到失败');
                  }
                }}
                className="w-full h-[48px] flex items-center justify-center bg-[#0062FF] text-white font-medium rounded-lg active:opacity-80"
              >
                立即签到
              </button>
            )}
          </div>
        )}

        {/* 已结束提示 */}
        {isClosed && !hasCheckedIn && (
          <div className="flex items-center gap-2 p-3 bg-[#FEF2F2] rounded-lg border border-[#FECACA]">
            <XCircle className="w-5 h-5 text-[#DC2626]" />
            <span className="text-sm font-medium text-[#DC2626]">签到已结束</span>
          </div>
        )}

        {/* 统计信息 */}
        {stats && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowStats(!showStats)}
              className="w-full p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] flex items-center justify-between"
            >
              <span className="text-sm font-medium text-[#1A1A1A]">考勤统计</span>
              <span className="text-xs text-[#6B7280]">{showStats ? '收起' : '展开'}</span>
            </button>

            {showStats && (
              <div className="flex flex-col gap-3">
                {/* 统计卡片 */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-[#DCFCE7] rounded-lg text-center">
                    <div className="text-xl font-bold text-[#16A34A]">{stats.presentCount}</div>
                    <div className="text-xs text-[#4B5563]">已签到</div>
                  </div>
                  <div className="p-3 bg-[#FEF2F2] rounded-lg text-center">
                    <div className="text-xl font-bold text-[#DC2626]">{stats.absentCount}</div>
                    <div className="text-xs text-[#4B5563]">未签到</div>
                  </div>
                  <div className="p-3 bg-[#FEF3C7] rounded-lg text-center">
                    <div className="text-xl font-bold text-[#D97706]">{stats.leaveCount}</div>
                    <div className="text-xs text-[#4B5563]">请假</div>
                  </div>
                </div>

                {/* 已签到列表 */}
                {stats.presentList.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="text-xs font-medium text-[#1A1A1A]">已签到人员</div>
                    <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                      {stats.presentList.map((p) => (
                        <div key={p.userId} className="flex items-center gap-2 p-2 bg-[#F9FAFB] rounded text-xs">
                          <CheckCircle className="w-3 h-3 text-[#16A34A]" />
                          <span className="text-[#1A1A1A]">{p.name}</span>
                          <span className="text-[#9CA3AF] ml-auto">{new Date(p.checkInAt).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 未签到列表 */}
                {stats.absentList.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="text-xs font-medium text-[#1A1A1A]">未签到人员</div>
                    <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                      {stats.absentList.map((a) => (
                        <div key={a.userId} className="flex items-center gap-2 p-2 bg-[#F9FAFB] rounded text-xs">
                          <XCircle className="w-3 h-3 text-[#DC2626]" />
                          <span className="text-[#1A1A1A]">{a.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 请假列表 */}
                {stats.leaveList.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="text-xs font-medium text-[#1A1A1A]">请假人员</div>
                    <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                      {stats.leaveList.map((l) => (
                        <div key={l.userId} className="flex items-center gap-2 p-2 bg-[#F9FAFB] rounded text-xs">
                          <Clock className="w-3 h-3 text-[#D97706]" />
                          <span className="text-[#1A1A1A]">{l.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
