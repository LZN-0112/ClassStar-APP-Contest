import PhoneFrame from '@/components/layout/PhoneFrame';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { GradientWave } from '@/components/ui/gradient-wave';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      toast.error('请输入正确的 11 位手机号');
      return false;
    }
    if (!oldPassword) {
      toast.error('请输入旧密码');
      return false;
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,20}$/.test(newPassword)) {
      toast.error('新密码需 8-20 位且同时包含字母和数字');
      return false;
    }
    if (newPassword !== confirmPassword) {
      toast.error('两次输入的新密码不一致');
      return false;
    }
    return true;
  };

  const handleReset = async () => {
    if (!validate() || loading) return;
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        phone,
        oldPassword,
        newPassword,
        confirmPassword,
      });
      toast.success('密码重置成功，请重新登录');
      navigate('/login');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '重置失败，请检查信息后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PhoneFrame className="bg-white">
      {/* 动态波浪背景层：铺满整个手机壳/全屏 */}
      <GradientWave colors={['#7dd3fc', '#ffffff', '#bfdbfe', '#ffffff', '#93c5fd', '#ffffff']} />
      <div
        data-pencil-name="Status Bar"
        className="box-border relative z-[1] flex h-[62px] w-full shrink-0 flex-row items-center justify-between gap-0 bg-[#FFFFFF] p-[12px_24px_0px_24px]"
      >
        <div
          data-pencil-name="Time"
          className="box-border text-left font-data text-[14px]/[normal] font-semibold text-[#1A1A1A] [white-space:nowrap]"
        >
          9:41
        </div>
        <div
          data-pencil-name="Status Icons"
          className="box-border flex h-fit w-fit shrink-0 flex-row items-center justify-start gap-[6px]"
        >
          <div
            data-pencil-name="Signal"
            className="box-border text-left font-caption text-[14px]/[normal] font-normal text-[#1A1A1A] [white-space:nowrap]"
          >
            ◉◉◉◉
          </div>
          <div
            data-pencil-name="Battery"
            className="box-border text-left font-data text-[14px]/[normal] font-normal text-[#1A1A1A] [white-space:nowrap]"
          >
            100%
          </div>
        </div>
      </div>
      <div data-pencil-name="Reset Content" className="relative z-[1] box-border h-[782px] w-full shrink-0">
        {/* 返回按钮 */}
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="box-border absolute left-[16px] top-[12px] z-[10] flex h-10 w-10 items-center justify-center text-[#1A1A1A] transition-opacity active:opacity-70"
          aria-label="返回"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div
          data-pencil-name="Title"
          className="box-border absolute left-[16px] top-[166.207px] z-0 text-left font-heading text-[36px]/[normal] font-bold text-[#1A1A1A] [white-space:nowrap]"
        >
          重置密码
        </div>
        <div
          data-pencil-name="Subtitle"
          className="box-border absolute left-[16px] top-[219.461px] z-[1] text-left font-body text-[14px]/[normal] font-normal text-[#4B5563] [white-space:nowrap]"
        >
          验证手机号后设置新密码
        </div>

        {/* 手机号 */}
        <div
          data-pencil-name="Phone Input"
          className="box-border absolute left-[16px] right-[16px] top-[280px] z-[2] flex h-[56px] flex-col items-start justify-center gap-2 rounded-lg border-[1px_solid_#E5E7EB] bg-[#FFFFFF] p-[0px_16px] [box-shadow:0px_2px_8px_0px_#0000000D]"
        >
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="请输入手机号"
            className="box-border h-full w-full bg-transparent text-left font-body text-[14px]/[normal] font-normal text-[#1A1A1A] placeholder:text-[#9CA3AF] outline-none"
          />
        </div>

        {/* 旧密码 */}
        <div
          data-pencil-name="Old Password Input"
          className="box-border absolute left-[16px] right-[16px] top-[348px] z-[4] flex h-[56px] flex-row items-center justify-between gap-2 rounded-lg border-[1px_solid_#E5E7EB] bg-[#FFFFFF] p-[0px_16px] [box-shadow:0px_2px_8px_0px_#0000000D]"
        >
          <input
            type={showOldPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            placeholder="请输入旧密码"
            className="box-border h-full flex-1 bg-transparent text-left font-body text-[14px]/[normal] font-normal text-[#1A1A1A] placeholder:text-[#9CA3AF] outline-none"
          />
          <div
            data-pencil-name="Eye Button"
            onClick={() => setShowOldPassword((v) => !v)}
            className="box-border flex h-[44px] w-[44px] shrink-0 cursor-pointer flex-row items-center justify-center rounded-full bg-[#00000000]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4B5563"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-[24px] w-[24px]"
            >
              <path d="M10 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0m11 0q-3.6 6-9 6t-9-6q3.6-6 9-6t9 6" />
            </svg>
          </div>
        </div>

        {/* 新密码 */}
        <div
          data-pencil-name="New Password Input"
          className="box-border absolute left-[16px] right-[16px] top-[416px] z-[5] flex h-[56px] flex-row items-center justify-between gap-2 rounded-lg border-[1px_solid_#E5E7EB] bg-[#FFFFFF] p-[0px_16px] [box-shadow:0px_2px_8px_0px_#0000000D]"
        >
          <input
            type={showNewPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="请输入新密码"
            className="box-border h-full flex-1 bg-transparent text-left font-body text-[14px]/[normal] font-normal text-[#1A1A1A] placeholder:text-[#9CA3AF] outline-none"
          />
          <div
            data-pencil-name="Eye Button"
            onClick={() => setShowNewPassword((v) => !v)}
            className="box-border flex h-[44px] w-[44px] shrink-0 cursor-pointer flex-row items-center justify-center rounded-full bg-[#00000000]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4B5563"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-[24px] w-[24px]"
            >
              <path d="M10 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0m11 0q-3.6 6-9 6t-9-6q3.6-6 9-6t9 6" />
            </svg>
          </div>
        </div>

        {/* 确认新密码 */}
        <div
          data-pencil-name="Confirm Password Input"
          className="box-border absolute left-[16px] right-[16px] top-[484px] z-[6] flex h-[56px] flex-row items-center justify-between gap-2 rounded-lg border-[1px_solid_#E5E7EB] bg-[#FFFFFF] p-[0px_16px] [box-shadow:0px_2px_8px_0px_#0000000D]"
        >
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="请确认新密码"
            className="box-border h-full flex-1 bg-transparent text-left font-body text-[14px]/[normal] font-normal text-[#1A1A1A] placeholder:text-[#9CA3AF] outline-none"
          />
          <div
            data-pencil-name="Eye Button"
            onClick={() => setShowConfirmPassword((v) => !v)}
            className="box-border flex h-[44px] w-[44px] shrink-0 cursor-pointer flex-row items-center justify-center rounded-full bg-[#00000000]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4B5563"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-[24px] w-[24px]"
            >
              <path d="M10 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0m11 0q-3.6 6-9 6t-9-6q3.6-6 9-6t9 6" />
            </svg>
          </div>
        </div>

        {/* 确认重置 */}
        <div
          data-pencil-name="Reset Button"
          className={`box-border absolute left-[16px] right-[16px] top-[566px] z-[7] flex h-[52px] flex-col items-center justify-center gap-2 rounded-lg p-[0px_16px] [box-shadow:0px_4px_16px_0px_#0000000D] ${
            loading ? 'bg-[#93C5FD]' : 'bg-[#0062FF]'
          }`}
          onClick={handleReset}
        >
          <div
            data-pencil-name="Label"
            className="box-border text-left font-body text-[16px]/[normal] font-semibold text-[#FFFFFF] [white-space:nowrap]"
          >
            {loading ? '处理中...' : '确认重置'}
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}
