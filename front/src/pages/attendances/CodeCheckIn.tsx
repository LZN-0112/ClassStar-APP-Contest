import { useState, useRef } from 'react';
import { KeyRound } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface CodeCheckInProps {
  classId: string;
  attendanceId: string;
  onSuccess: () => void;
}

export default function CodeCheckIn({ classId, attendanceId, onSuccess }: CodeCheckInProps) {
  const [code, setCode] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    const newCode = [...code];
    for (let i = 0; i < pasted.length && i < 4; i++) {
      newCode[i] = pasted[i];
    }
    setCode(newCode);
    const focusIndex = Math.min(pasted.length, 3);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleCheckIn = async () => {
    const codeStr = code.join('');
    if (codeStr.length !== 4) {
      toast.error('请输入4位签到口令');
      return;
    }
    setLoading(true);
    try {
      await api.post(`/classes/${classId}/attendances/${attendanceId}/check-in`, {
        method: 'code',
        code: codeStr,
      });
      toast.success('签到成功！');
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '签到失败');
      setCode(['', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 p-4 bg-[#FEF2F2] rounded-lg border border-[#FECACA]">
        <div className="flex items-center gap-2 text-[#DC2626] text-sm font-medium">
          <KeyRound className="w-4 h-4" />
          <span>口令签到</span>
        </div>
        <div className="text-xs text-[#4B5563]">请输入发起人公布的4位数字签到口令</div>
      </div>

      <div className="flex flex-col items-center gap-6 p-6 bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg">
        <KeyRound className="w-12 h-12 text-[#0062FF]" />
        <div className="text-sm text-[#4B5563]">请输入4位签到口令</div>
        <div className="flex gap-3" onPaste={handlePaste}>
          {code.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-12 h-14 text-center text-xl font-bold border-2 border-[#E5E7EB] rounded-lg focus:border-[#0062FF] focus:outline-none bg-[#F9FAFB]"
            />
          ))}
        </div>
      </div>

      <button
        onClick={handleCheckIn}
        disabled={loading || code.join('').length !== 4}
        className="w-full h-[48px] flex items-center justify-center bg-[#0062FF] text-white font-medium rounded-lg disabled:opacity-50 active:opacity-80"
      >
        {loading ? '签到中...' : '确认签到'}
      </button>
    </div>
  );
}
