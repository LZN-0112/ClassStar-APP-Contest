import { useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface GpsCheckInProps {
  classId: string;
  attendanceId: string;
  attendance: {
    location?: string;
    latitude: number | null;
    longitude: number | null;
    checkRadius?: number;
  };
  onSuccess: () => void;
}

export default function GpsCheckIn({ classId, attendanceId, attendance, onSuccess }: GpsCheckInProps) {
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  const calcDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const toRad = (v: number) => (v * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const handleLocate = () => {
    if (!navigator.geolocation) {
      toast.error('您的浏览器不支持定位功能');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLat(lat);
        setUserLng(lng);
        if (attendance.latitude != null && attendance.longitude != null) {
          const dist = calcDistance(
            Number(attendance.latitude),
            Number(attendance.longitude),
            lat,
            lng,
          );
          setDistance(Math.round(dist));
        }
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        toast.error(err.message === 'User denied Geolocation' ? '请允许定位权限' : '定位失败，请重试');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleCheckIn = async () => {
    if (userLat == null || userLng == null) {
      toast.error('请先获取定位');
      return;
    }
    setLoading(true);
    try {
      await api.post(`/classes/${classId}/attendances/${attendanceId}/check-in`, {
        method: 'gps',
        latitude: userLat,
        longitude: userLng,
      });
      toast.success('签到成功！');
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '签到失败');
    } finally {
      setLoading(false);
    }
  };

  const inRange = distance != null && distance <= (attendance.checkRadius || 500);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 p-4 bg-[#F0F9FF] rounded-lg border border-[#BAE6FD]">
        <div className="flex items-center gap-2 text-[#0369A1] text-sm font-medium">
          <MapPin className="w-4 h-4" />
          <span>定位签到</span>
        </div>
        <div className="text-xs text-[#4B5563]">
          {attendance.location ? `签到地点：${attendance.location}` : '请在签到地点范围内完成定位签到'}
        </div>
        {attendance.checkRadius && (
          <div className="text-xs text-[#4B5563]">有效范围：{attendance.checkRadius} 米</div>
        )}
      </div>

      <div className="flex flex-col items-center gap-3 p-6 bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${userLat != null ? 'bg-[#DCFCE7]' : 'bg-[#F3F4F6]'}`}>
          <Navigation className={`w-8 h-8 ${userLat != null ? 'text-[#16A34A]' : 'text-[#9CA3AF]'}`} />
        </div>
        {userLat != null ? (
          <div className="text-center">
            <div className="text-sm font-medium text-[#1A1A1A]">定位成功</div>
            <div className="text-xs text-[#4B5563] mt-1">
              {userLat.toFixed(6)}, {userLng!.toFixed(6)}
            </div>
            {distance != null && (
              <div className={`text-sm font-medium mt-2 ${inRange ? 'text-[#16A34A]' : 'text-[#EF4444]'}`}>
                距签到点 {distance} 米 {inRange ? '✓ 在范围内' : '✗ 超出范围'}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <div className="text-sm text-[#4B5563]">尚未定位</div>
            <div className="text-xs text-[#9CA3AF] mt-1">点击下方按钮获取当前位置</div>
          </div>
        )}
      </div>

      {userLat == null ? (
        <button
          onClick={handleLocate}
          disabled={locating}
          className="w-full h-[48px] flex items-center justify-center gap-2 bg-[#0062FF] text-white font-medium rounded-lg disabled:opacity-50 active:opacity-80"
        >
          <Navigation className="w-4 h-4" />
          {locating ? '定位中...' : '获取定位'}
        </button>
      ) : (
        <button
          onClick={handleCheckIn}
          disabled={loading || !inRange}
          className="w-full h-[48px] flex items-center justify-center bg-[#0062FF] text-white font-medium rounded-lg disabled:opacity-50 active:opacity-80"
        >
          {loading ? '签到中...' : '立即签到'}
        </button>
      )}
    </div>
  );
}
