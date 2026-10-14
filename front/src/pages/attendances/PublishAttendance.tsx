import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, QrCode, Camera, KeyRound, Navigation } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';
import { toast } from 'sonner';

type Method = 'gps' | 'qr' | 'face' | 'code';

const methods: { key: Method; icon: React.ReactNode; label: string; color: string }[] = [
  { key: 'gps', icon: <MapPin className="w-6 h-6 text-white" strokeWidth={2} />, label: '定位', color: 'bg-[#2563EB]' },
  { key: 'qr', icon: <QrCode className="w-6 h-6 text-white" strokeWidth={2} />, label: '二维码', color: 'bg-[#22C55E]' },
  { key: 'face', icon: <Camera className="w-6 h-6 text-white" strokeWidth={2} />, label: '拍照', color: 'bg-[#F97316]' },
  { key: 'code', icon: <KeyRound className="w-6 h-6 text-white" strokeWidth={2} />, label: '口令', color: 'bg-[#EF4444]' },
];

export default function PublishAttendance() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [title, setTitle] = useState('');
  const [method, setMethod] = useState<Method>('gps');
  const [location, setLocation] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [code, setCode] = useState('');
  const [checkRadius, setCheckRadius] = useState('500');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);

  const classId = user?.classId;

  const handleLocate = () => {
    if (!navigator.geolocation) {
      toast.error('您的浏览器不支持定位功能');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLat(pos.coords.latitude);
        setGpsLng(pos.coords.longitude);
        setLocating(false);
        toast.success('定位成功');
      },
      () => {
        setLocating(false);
        toast.error('定位失败，请允许浏览器定位权限');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handlePublish = async () => {
    if (!title.trim()) { toast.error('请输入签到标题'); return; }
    if (!startTime) { toast.error('请选择开始时间'); return; }
    if (!endTime) { toast.error('请选择结束时间'); return; }
    if (method === 'code' && !code.trim()) { toast.error('请输入签到口令'); return; }
    if (method === 'gps' && (gpsLat == null || gpsLng == null)) {
      toast.error('请先获取定位');
      return;
    }
    if (!classId) { toast.error('未找到班级信息'); return; }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        method,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      };
      if (location) body.location = location;
      if (method === 'gps') {
        body.latitude = gpsLat;
        body.longitude = gpsLng;
        body.checkRadius = parseInt(checkRadius) || 500;
      }
      if (method === 'code') body.code = code;

      await api.post(`/classes/${classId}/attendances`, body);
      toast.success('签到发布成功！');
      navigate('/attendance-list', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '发布失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout title="发起签到" onBack={() => navigate(-1)}>
      <div className="flex flex-col gap-4">
        {/* 标题输入 */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[#6B7280]">签到标题</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：班会签到"
            className="w-full h-[44px] px-4 text-sm bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#0062FF]"
          />
        </div>

        {/* 签到方式 */}
        <div className="flex flex-col gap-2 p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
          <div className="text-sm font-medium text-[#1A1A1A]">签到方式</div>
          <div className="grid grid-cols-4 gap-2">
            {methods.map((m) => (
              <button
                key={m.key}
                onClick={() => setMethod(m.key)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${
                  method === m.key
                    ? 'border-[#0062FF] bg-[#EFF6FF]'
                    : 'border-[#E5E7EB] bg-white'
                }`}
              >
                <div className={`w-10 h-10 flex items-center justify-center rounded-lg ${m.color}`}>
                  {m.icon}
                </div>
                <span className="text-xs text-[#1A1A1A]">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 签到地点 */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[#6B7280]">签到地点</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="例如：教学楼A301"
            className="w-full h-[44px] px-4 text-sm bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#0062FF]"
          />
        </div>

        {/* GPS 定位设置 */}
        {method === 'gps' && (
          <div className="flex flex-col gap-2 p-4 bg-[#F0F9FF] rounded-lg border border-[#BAE6FD]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#0369A1]">签到定位中心</span>
              <button
                onClick={handleLocate}
                disabled={locating}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#0062FF] text-white text-xs rounded-lg disabled:opacity-50"
              >
                <Navigation className="w-3 h-3" />
                {locating ? '定位中...' : gpsLat != null ? '重新定位' : '获取定位'}
              </button>
            </div>
            {gpsLat != null ? (
              <div className="text-xs text-[#4B5563]">
                纬度：{gpsLat.toFixed(6)}，经度：{gpsLng!.toFixed(6)}
              </div>
            ) : (
              <div className="text-xs text-[#9CA3AF]">点击上方按钮获取当前定位作为签到中心</div>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#6B7280]">有效范围（米）</label>
              <input
                type="number"
                value={checkRadius}
                onChange={(e) => setCheckRadius(e.target.value)}
                placeholder="500"
                min={10}
                className="w-full h-[44px] px-4 text-sm bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#0062FF]"
              />
            </div>
          </div>
        )}

        {/* 签到口令（仅口令模式） */}
        {method === 'code' && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#6B7280]">签到口令（4位数字）</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="例如：1234"
              maxLength={4}
              className="w-full h-[44px] px-4 text-sm bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#0062FF]"
            />
          </div>
        )}

        {/* 时间选择 */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[#6B7280]">开始时间</label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full h-[44px] px-4 text-sm bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#0062FF]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[#6B7280]">结束时间</label>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full h-[44px] px-4 text-sm bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#0062FF]"
          />
        </div>

        {/* 发布按钮 */}
        <button
          onClick={handlePublish}
          disabled={loading}
          className="w-full h-[48px] flex items-center justify-center bg-[#0062FF] text-white font-medium rounded-lg disabled:opacity-50 active:opacity-80 mt-2"
        >
          {loading ? '发布中...' : '发布签到'}
        </button>
      </div>
    </PageLayout>
  );
}
