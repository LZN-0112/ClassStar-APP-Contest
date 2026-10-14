import PhoneFrame from '@/components/layout/PhoneFrame';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { GradientWave } from '@/components/ui/gradient-wave';

export default function Login() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const validate = () => {
    if (!phone.trim()) {
      toast.error('请输入手机号');
      return false;
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      toast.error('手机号格式不正确');
      return false;
    }
    if (!password) {
      toast.error('请输入密码');
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    if (!agreed) {
      toast.error('请先勾选同意《用户协议》和《隐私政策》');
      return;
    }
    if (!validate() || loading) return;
    setLoading(true);
    try {
      const res = await api.post('/auth/login', {
        phone,
        loginType: 'password',
        password,
      });
      const { accessToken, refreshToken } = res.data.data || res.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      toast.success('登录成功');
      navigate('/join-class');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '登录失败，请检查信息后重试');
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
      <div data-pencil-name="Login Content" className="relative box-border h-[782px] w-full shrink-0">
        <div
          data-pencil-name="Title"
          className="box-border absolute left-[16px] top-[166.207px] z-0 text-left font-heading text-[36px]/[normal] font-bold text-[#1A1A1A] [white-space:nowrap]"
        >
          欢迎回来
        </div>
        <div
          data-pencil-name="Subtitle"
          className="box-border absolute left-[16px] top-[219.461px] z-[1] text-left font-body text-[14px]/[normal] font-normal text-[#4B5563] [white-space:nowrap]"
        >
          登录后继续管理班级事务
        </div>

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

        <div
          data-pencil-name="Password Input"
          className="box-border absolute left-[16px] right-[16px] top-[340px] z-[3] flex h-[56px] flex-row items-center justify-between gap-2 rounded-lg border-[1px_solid_#E5E7EB] bg-[#FFFFFF] p-[0px_16px] [box-shadow:0px_2px_8px_0px_#0000000D]"
        >
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
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

        <div
          data-pencil-name="Login Button"
          className={`box-border absolute left-[16px] right-[16px] top-[420px] z-[4] flex h-[52px] flex-col items-center justify-center gap-2 rounded-lg p-[0px_16px] [box-shadow:0px_4px_16px_0px_#0000000D] ${
            loading ? 'bg-[#93C5FD]' : 'bg-[#0062FF]'
          }`}
          onClick={handleLogin}
        >
          <div
            data-pencil-name="Label"
            className="box-border text-left font-body text-[16px]/[normal] font-semibold text-[#FFFFFF] [white-space:nowrap]"
          >
            {loading ? '登录中...' : '登录'}
          </div>
        </div>

        <div
          data-pencil-name="Auth Links"
          className="box-border absolute left-[16px] right-[16px] top-[480px] z-[5] flex h-[20px] flex-row items-center justify-between"
        >
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="text-[13px] text-[#4B5563]"
          >
            没有账号？
            <span className="text-[#0062FF]">去注册</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/reset-password')}
            className="text-[13px] text-[#0062FF]"
          >
            忘记密码
          </button>
        </div>

        <div
          data-pencil-name="Or"
          className="box-border absolute left-[16px] right-[16px] top-[532px] z-[6] text-center font-caption text-[14px]/[normal] font-normal text-[#4B5563] [white-space:nowrap]"
        >
          或使用以下方式登录
        </div>
        <div
          data-pencil-name="Social Login"
          className="box-border absolute left-[16px] right-[16px] top-[561px] z-[7] flex h-[80px] flex-row items-center justify-center gap-4"
        >
          <div
            data-pencil-name="WeChat Wrap"
            className="box-border flex h-fit w-fit shrink-0 flex-col items-center justify-start gap-[6px]"
          >
            <div
              data-pencil-name="WeChat"
              className="box-border flex h-[56px] w-[56px] shrink-0 flex-col items-center justify-center gap-0 rounded-full border-[1px_solid_#00000000] bg-[#FFFFFF] [box-shadow:0px_2px_8px_0px_#0000000D]"
            >
              <svg
                data-pencil-name="Icon-WeChat"
                viewBox="0 0 24 24"
                preserveAspectRatio="none"
                xmlns="http://www.w3.org/2000/svg"
                className="box-border h-[24px] w-[24px] shrink-0 overflow-visible"
              >
                <path
                  d="M8.691 2.188c-4.8 0-8.691 3.288-8.691 7.342 0 2.212 1.17 4.203 3.002 5.55a0.59 0.59 0 0 1 0.213 0.665l-0.39 1.48c-0.019 0.07-0.048 0.141-0.048 0.213 0 0.163 0.13 0.295 0.29 0.295a0.33 0.33 0 0 0 0.167-0.054l1.903-1.114a0.86 0.86 0 0 1 0.717-0.098 10.2 10.2 0 0 0 2.837 0.403c0.276 0 0.543-0.027 0.811-0.05-0.857-2.578 0.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-0.576-3.583-4.196-6.348-8.596-6.348m-2.906 3.803c0.642 0 1.162 0.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.179c0-0.651 0.52-1.18 1.162-1.18z m5.813 0c0.642 0 1.162 0.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-0.651 0.52-1.18 1.162-1.18m5.34 2.867c-1.797-0.052-3.746 0.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22 0.942 2.453 3.666 4.229 6.884 4.229 0.826 0 1.622-0.12 2.361-0.336a0.72 0.72 0 0 1 0.598 0.082l1.584 0.926a0.3 0.3 0 0 0 0.14 0.047c0.134 0 0.24-0.111 0.24-0.247 0-0.06-0.023-0.12-0.038-0.177l-0.327-1.233a0.6 0.6 0 0 1-0.023-0.156 0.49 0.49 0 0 1 0.201-0.398c1.526-1.121 2.502-2.781 2.502-4.621 0-3.21-2.931-5.837-6.656-6.088v-0.002c-0.135-0.01-0.27-0.027-0.407-0.03z m-2.53 3.274c0.535 0 0.969 0.44 0.969 0.982a0.976 0.976 0 0 1-0.969 0.983 0.976 0.976 0 0 1-0.969-0.983c0-0.542 0.434-0.982 0.97-0.982z m4.844 0c0.535 0 0.969 0.44 0.969 0.982a0.976 0.976 0 0 1-0.969 0.983 0.976 0.976 0 0 1-0.969-0.983c0-0.542 0.434-0.982 0.969-0.982"
                  fill="#07C160"
                ></path>
              </svg>
            </div>
            <div
              data-pencil-name="WeChat Label"
              className="box-border text-left font-caption text-[11px]/[normal] font-normal text-[#4B5563] [white-space:nowrap]"
            >
              微信
            </div>
          </div>
        </div>
        <div
          data-pencil-name="Agreement"
          className="box-border absolute left-[16px] right-[16px] top-[656px] z-[8] flex flex-row items-center justify-center gap-[8px]"
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
      </div>
    </PhoneFrame>
  );
}
