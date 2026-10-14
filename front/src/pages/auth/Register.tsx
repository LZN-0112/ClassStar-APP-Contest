import PhoneFrame from '@/components/layout/PhoneFrame';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { GradientWave } from '@/components/ui/gradient-wave';

export default function Register() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const validate = () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      toast.error('请输入正确的 11 位手机号');
      return false;
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,20}$/.test(password)) {
      toast.error('密码需 8-20 位且同时包含字母和数字');
      return false;
    }
    if (password !== confirmPassword) {
      toast.error('两次输入的密码不一致');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validate() || loading) return;
    setLoading(true);
    try {
      await api.post('/auth/register', {
        phone,
        name: phone,
        password,
        confirmPassword,
      });
      toast.success('注册成功，请登录');
      navigate('/login');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '注册失败，请检查信息后重试');
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
      <div
        data-pencil-name="Register Content"
        className="relative z-[1] box-border w-full flex-1 overflow-y-auto"
      >
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
          data-pencil-name="Subtitle"
          className="box-border absolute left-[16px] top-[219px] z-[7] text-left font-body text-[14px]/[normal] font-normal text-[#4B5563] [white-space:nowrap]"
        >
          创建账号后继续管理班级事务
        </div>
        <div
          data-pencil-name="Title"
          className="box-border absolute left-[16px] top-[166.898px] z-[8] text-left font-heading text-[36px]/[normal] font-bold text-[#1A1A1A] [white-space:nowrap]"
        >
          注册账号
        </div>

        {/* 手机号 */}
        <div
          data-pencil-name="Phone Input"
          className="box-border absolute left-[16px] right-[16px] top-[270px] z-[9] flex h-[56px] flex-col items-start justify-center gap-2 rounded-lg border-[1px_solid_#E5E7EB] bg-[#FFFFFF] p-[0px_16px] [box-shadow:0px_2px_8px_0px_#0000000D]"
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

        {/* 设置密码 */}
        <div
          data-pencil-name="Password Input"
          className="box-border absolute left-[16px] right-[16px] top-[350px] z-[6] flex h-[56px] flex-row items-center justify-between gap-2 rounded-lg border-[1px_solid_#E5E7EB] bg-[#FFFFFF] p-[0px_16px] [box-shadow:0px_2px_8px_0px_#0000000D]"
        >
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入密码"
            className="box-border h-full flex-1 bg-transparent text-left font-body text-[14px]/[normal] font-normal text-[#1A1A1A] placeholder:text-[#9CA3AF] outline-none"
          />
          <div
            data-pencil-name="Eye Button"
            onClick={() => setShowPassword((v) => !v)}
            className="box-border flex h-[44px] w-[44px] shrink-0 cursor-pointer flex-row items-center justify-center rounded-full bg-[#00000000]"
          >
            <svg
              data-pencil-name="Eye Icon"
              viewBox="0 0 24 24"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
              className="box-border h-[24px] w-[24px] shrink-0 overflow-visible"
            >
              <path
                d="M10 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0m11 0q-3.6 6-9 6t-9-6q3.6-6 9-6t9 6"
                fill="#00000000"
              ></path>
              <path
                d="M10 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0m11 0q-3.6 6-9 6t-9-6q3.6-6 9-6t9 6"
                fill="none"
                stroke="#4B5563"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              ></path>
            </svg>
          </div>
        </div>

        {/* 确认密码 */}
        <div
          data-pencil-name="Confirm Password Input"
          className="box-border absolute left-[16px] right-[16px] top-[418px] z-[5] flex h-[56px] flex-row items-center justify-between gap-2 rounded-lg border-[1px_solid_#E5E7EB] bg-[#FFFFFF] p-[0px_16px] [box-shadow:0px_2px_8px_0px_#0000000D]"
        >
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="请再次输入密码"
            className="box-border h-full flex-1 bg-transparent text-left font-body text-[14px]/[normal] font-normal text-[#1A1A1A] placeholder:text-[#9CA3AF] outline-none"
          />
          <div
            data-pencil-name="Eye Button"
            onClick={() => setShowConfirmPassword((v) => !v)}
            className="box-border flex h-[44px] w-[44px] shrink-0 cursor-pointer flex-row items-center justify-center rounded-full bg-[#00000000]"
          >
            <svg
              data-pencil-name="Eye Icon"
              viewBox="0 0 24 24"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
              className="box-border h-[24px] w-[24px] shrink-0 overflow-visible"
            >
              <path
                d="M10 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0m11 0q-3.6 6-9 6t-9-6q3.6-6 9-6t9 6"
                fill="#00000000"
              ></path>
              <path
                d="M10 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0m11 0q-3.6 6-9 6t-9-6q3.6-6 9-6t9 6"
                fill="none"
                stroke="#4B5563"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              ></path>
            </svg>
          </div>
        </div>

        {/* 注册按钮 */}
        <div
          data-pencil-name="Register Button"
          className={`box-border absolute left-[16px] right-[16px] top-[488px] z-[4] flex h-[52px] flex-col items-center justify-center gap-2 rounded-lg p-[0px_16px] [box-shadow:0px_4px_16px_0px_#0000000D] ${
            loading ? 'bg-[#93C5FD]' : 'bg-[#0062FF]'
          }`}
          onClick={handleRegister}
        >
          <div
            data-pencil-name="Label"
            className="box-border text-left font-body text-[16px]/[normal] font-semibold text-[#FFFFFF] [white-space:nowrap]"
          >
            {loading ? '注册中...' : '注册'}
          </div>
        </div>

        {/* 已有账号登录 */}
        <div
          data-pencil-name="Login Link"
          className="box-border absolute left-[16px] right-[16px] top-[548px] z-[11] flex h-[20px] flex-row items-center justify-center"
        >
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-[13px] text-[#4B5563]"
          >
            已有账号？
            <span className="text-[#0062FF]">登录</span>
          </button>
        </div>

        <div
          data-pencil-name="Agreement"
          className="box-border absolute left-[16px] right-[16px] top-[604px] z-[3] flex flex-row items-center justify-center gap-[8px]"
        >
          <div
            onClick={() => setAgreed((v) => !v)}
            className="box-border flex h-[16px] w-[16px] shrink-0 cursor-pointer items-center justify-center rounded-[3px]"
            style={{
              backgroundColor: agreed ? '#0062FF' : '#FFFFFF',
              border: '1px solid #1A1A1A',
            }}
          >
            {agreed && (
              <svg viewBox="0 0 12 12" className="h-[10px] w-[10px]">
                <path
                  d="M2 6l3 3 5-5"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
          <span className="font-caption text-[11px]/[normal] font-normal text-[#4B5563]">
            已阅读并同意
            <span
              onClick={() => navigate('/user-agreement')}
              className="cursor-pointer text-[#0062FF] underline"
            >
              《用户协议》
            </span>
            和
            <span
              onClick={() => navigate('/privacy-policy')}
              className="cursor-pointer text-[#0062FF] underline"
            >
              《隐私政策》
            </span>
          </span>
        </div>
        <div
          data-pencil-name="Bottom Spacer"
          className="box-border absolute left-0 top-[760px] h-[40px] w-full"
        ></div>
      </div>
    </PhoneFrame>
  );
}
