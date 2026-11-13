import { useNavigate } from 'react-router-dom';
import { QrCode, ScanLine } from 'lucide-react';

/**
 * 二维码签到入口：由学生打开扫一扫扫描班委展示的二维码完成签到。
 * 扫描成功后的签到逻辑由 ScanPage 统一处理。
 */
export default function QrCheckIn() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-4">
        <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-white">
          <ScanLine className="h-7 w-7 text-[#16A34A]" strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[14px] font-semibold text-[#15803D]">
            <QrCode className="h-4 w-4" />
            二维码签到
          </div>
          <div className="text-[12px] leading-[18px] text-[#4B5563]">
            扫描班委在签到现场展示的二维码即可完成签到
          </div>
        </div>
      </div>

      <button
        onClick={() => navigate('/scan')}
        className="w-full h-[52px] flex items-center justify-center gap-2 bg-[#0062FF] text-white text-[15px] font-semibold rounded-xl shadow-[0_8px_20px_-8px_#0062FFB3] active:opacity-80"
      >
        <ScanLine className="w-5 h-5" />
        打开扫一扫
      </button>
    </div>
  );
}