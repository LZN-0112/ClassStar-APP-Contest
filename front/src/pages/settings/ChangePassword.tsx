import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import PhoneFrame from '@/components/layout/PhoneFrame';
import SettingsHeader from '@/components/layout/SettingsHeader';
import { api } from '@/lib/api';

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,20}$/;

interface PasswordFieldProps {
  label: string;
  value: string;
  placeholder: string;
  autoComplete: string;
  onChange: (value: string) => void;
}

function PasswordField({ label, value, placeholder, autoComplete, onChange }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[11px]/[normal] font-body font-semibold text-[#4B5563]">{label}</label>
      <div className="flex h-[56px] flex-row items-center justify-between gap-2 rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] px-4 [box-shadow:0px_2px_8px_0px_#0000000D]">
        <input
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="box-border h-full flex-1 bg-transparent text-left font-body text-[14px]/[normal] text-[#1A1A1A] outline-none placeholder:text-[#9CA3AF]"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? '隐藏密码' : '显示密码'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#4B5563"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            <path d="M10 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0m11 0q-3.6 6-9 6t-9-6q3.6-6 9-6t9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function ChangePassword() {
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!oldPassword) {
      toast.error('请输入旧密码');
      return false;
    }
    if (!PASSWORD_REGEX.test(newPassword)) {
      toast.error('新密码需 8-20 位且同时包含字母和数字');
      return false;
    }
    if (newPassword !== confirmPassword) {
      toast.error('两次输入的新密码不一致');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (loading || !validate()) return;

    setLoading(true);
    try {
      await api.post('/auth/change-password', { oldPassword, newPassword, confirmPassword });
      toast.success('密码修改成功，请重新登录');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('currentUser');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '修改失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PhoneFrame>
      <SettingsHeader title="修改密码" />
      <div className="box-border flex w-full flex-1 flex-col overflow-y-auto overscroll-y-contain bg-[#FFFFFF]">
        <div className="flex w-full flex-col gap-4 p-[16px_20px_32px]">
        <PasswordField
          label="旧密码"
          value={oldPassword}
          placeholder="请输入旧密码"
          autoComplete="current-password"
          onChange={setOldPassword}
        />
        <PasswordField
          label="新密码"
          value={newPassword}
          placeholder="请输入新密码"
          autoComplete="new-password"
          onChange={setNewPassword}
        />
        <PasswordField
          label="确认新密码"
          value={confirmPassword}
          placeholder="请再次输入新密码"
          autoComplete="new-password"
          onChange={setConfirmPassword}
        />

        <p className="text-[12px]/[normal] font-body text-[#9CA3AF]">
          密码需 8-20 位，且同时包含字母和数字
        </p>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className={`mt-2 h-[52px] w-full rounded-lg font-body text-[16px] font-semibold text-[#FFFFFF] transition-opacity [box-shadow:0px_4px_16px_0px_#0000000D] ${
            loading ? 'bg-[#93C5FD]' : 'bg-[#0062FF] active:opacity-80'
          }`}
        >
          {loading ? '提交中...' : '确认修改'}
        </button>
        </div>
      </div>
    </PhoneFrame>
  );
}