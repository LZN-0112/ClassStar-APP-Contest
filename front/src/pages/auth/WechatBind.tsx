import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import PhoneFrame from '@/components/layout/PhoneFrame';
import StatusBar from '@/components/layout/StatusBar';
import { api } from '@/lib/api';

const PHONE_REGEX = /^1[3-9]\d{9}$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,20}$/;

export default function WechatBind() {
  const navigate = useNavigate();
  const [bindTicket] = useState(() => sessionStorage.getItem('wechatBindTicket') || '');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!bindTicket) {
      toast.error('微信绑定已失效，请重新发起微信登录');
      navigate('/login', { replace: true });
    }
  }, [bindTicket, navigate]);

  const handleSubmit = async () => {
    if (loading || !bindTicket) return;

    const trimmedPhone = phone.trim();
    const trimmedName = name.trim();
    const trimmedNickname = nickname.trim();

    if (!PHONE_REGEX.test(trimmedPhone)) {
      toast.error('请输入正确的 11 位手机号');
      return;
    }
    if (!password) {
      toast.error('请输入密码');
      return;
    }
    if (trimmedName) {
      if (trimmedName.length < 2) {
        toast.error('真实姓名至少 2 个字');
        return;
      }
      if (!PASSWORD_REGEX.test(password)) {
        toast.error('设置的密码需 8-20 位且同时包含字母和数字');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('两次输入的密码不一致');
        return;
      }
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/wechat/bind-phone', {
        bindTicket,
        phone: trimmedPhone,
        password,
        confirmPassword: confirmPassword || undefined,
        name: trimmedName || undefined,
        nickname: trimmedNickname || undefined,
      });
      const data = res.data?.data || res.data;
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      sessionStorage.removeItem('wechatBindTicket');
      toast.success(data.isNewUser ? '注册成功，微信已绑定' : '微信绑定成功');

      let nextPath = '/home';
      try {
        const orgsRes = await api.get('/classes/my');
        const orgs = orgsRes.data?.data || orgsRes.data || [];
        if (!Array.isArray(orgs) || orgs.length === 0) nextPath = '/join-class';
      } catch {
        // 班级列表获取失败时不阻断登录，首页会展示空班级引导
      }
      navigate(nextPath, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '绑定失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PhoneFrame className="bg-white" reserveSafeAreaTop safeAreaTopClassName="bg-white">
      <StatusBar />
      <div className="flex w-full flex-1 flex-col bg-white">
        <div className="flex h-14 shrink-0 items-center px-4">
          <button
            type="button"
            aria-label="返回登录"
            onClick={() => navigate('/login', { replace: true })}
            className="flex h-10 w-10 items-center justify-center rounded-full active:bg-gray-100"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5">
              <path
                d="M15 18l-6-6 6-6"
                fill="none"
                stroke="#1A1A1A"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <span className="ml-2 text-[17px] font-semibold text-[#1A1A1A]">绑定手机号</span>
        </div>

        <div className="px-6 pb-10 pt-2">
          <div className="rounded-xl bg-[#F0F7FF] p-4">
            <p className="text-[14px] font-medium text-[#1A1A1A]">微信账号尚未绑定班务星账号</p>
            <p className="mt-2 text-[12px] leading-5 text-[#4B5563]">
              已注册用户请填写手机号和原登录密码完成绑定；首次使用请补充真实姓名并设置登录密码。
            </p>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-[13px] text-[#4B5563]">手机号</label>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="请输入手机号"
                className="h-14 w-full rounded-lg border border-[#E5E7EB] px-4 text-[14px] text-[#1A1A1A] outline-none placeholder:text-[#9CA3AF] focus:border-[#0062FF]"
              />
            </div>

            <div>
              <label className="mb-2 block text-[13px] text-[#4B5563]">密码</label>
              <div className="flex h-14 w-full items-center rounded-lg border border-[#E5E7EB] px-4 focus-within:border-[#0062FF]">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="已有账号填写原密码，新用户设置密码"
                  className="h-full flex-1 bg-transparent text-[14px] text-[#1A1A1A] outline-none placeholder:text-[#9CA3AF]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="shrink-0 px-2 text-[13px] text-[#4B5563]"
                >
                  {showPassword ? '隐藏' : '显示'}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[13px] text-[#4B5563]">确认密码</label>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="新用户再次输入密码，已有账号可留空"
                className="h-14 w-full rounded-lg border border-[#E5E7EB] px-4 text-[14px] text-[#1A1A1A] outline-none placeholder:text-[#9CA3AF] focus:border-[#0062FF]"
              />
            </div>

            <div>
              <label className="mb-2 block text-[13px] text-[#4B5563]">真实姓名</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="已有账号可留空，新用户必填"
                className="h-14 w-full rounded-lg border border-[#E5E7EB] px-4 text-[14px] text-[#1A1A1A] outline-none placeholder:text-[#9CA3AF] focus:border-[#0062FF]"
              />
            </div>

            <div>
              <label className="mb-2 block text-[13px] text-[#4B5563]">昵称（选填）</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="班级内展示的昵称"
                className="h-14 w-full rounded-lg border border-[#E5E7EB] px-4 text-[14px] text-[#1A1A1A] outline-none placeholder:text-[#9CA3AF] focus:border-[#0062FF]"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="mt-8 flex h-14 w-full items-center justify-center rounded-lg bg-[#0062FF] text-[16px] font-semibold text-white shadow-[0px_4px_16px_0px_#0000000D] disabled:bg-[#93C5FD]"
          >
            {loading ? '绑定中...' : '完成绑定并登录'}
          </button>
        </div>
      </div>
    </PhoneFrame>
  );
}