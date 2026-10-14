import { useState } from 'react';
import { QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface QrCheckInProps {
  classId: string;
  attendanceId: string;
  onSuccess: () => void;
}

export default function QrCheckIn({ classId, attendanceId, onSuccess }: QrCheckInProps) {
  const [loading, setLoading] = useState(false);

  // 生成二维码内容
  const qrValue = `attendance:${classId}:${attendanceId}`;

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      await api.post(`/classes/${classId}/attendances/${attendanceId}/check-in`, {
        method: 'qr',
      });
      toast.success('签到成功！');
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '签到失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 p-4 bg-[#F0FDF4] rounded-lg border border-[#BBF7D0]">
        <div className="flex items-center gap-2 text-[#15803D] text-sm font-medium">
          <QrCode className="w-4 h-4" />
          <span>二维码签到</span>
        </div>
        <div className="text-xs text-[#4B5563]">请扫描下方二维码完成签到</div>
      </div>

      {/* 二维码展示区 */}
      <div className="flex flex-col items-center gap-4 p-6 bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg">
        <div className="p-4 bg-white rounded-lg">
          <QRCodeSVG
            value={qrValue}
            size={220}
            level="H"
            marginSize={4}
            fgColor="#000000"
            bgColor="#FFFFFF"
          />
        </div>
        <div className="text-sm text-[#4B5563] text-center">
          使用手机扫描上方二维码
        </div>
      </div>

      {/* 确认签到按钮 */}
      <button
        onClick={handleCheckIn}
        disabled={loading}
        className="w-full h-[48px] flex items-center justify-center bg-[#0062FF] text-white font-medium rounded-lg disabled:opacity-50 active:opacity-80"
      >
        {loading ? '签到中...' : '确认签到'}
      </button>
    </div>
  );
}
