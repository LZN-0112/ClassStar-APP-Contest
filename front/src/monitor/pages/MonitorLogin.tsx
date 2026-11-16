import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, LockKeyhole, ShieldCheck, Smartphone } from 'lucide-react';
import {
  getApiErrorMessage,
  getApiErrorStatus,
  monitorGet,
  monitorPost,
} from '../api';

interface LoginResult {
  accessToken: string;
  refreshToken: string;
}

const INPUT_CLASS =
  'h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[13px] text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-[#0062FF]';

/** 监控台独立登录页：桌面样式，登录后直接进入概览，不再经过 App 的手机登录流程 */
export default function MonitorLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    setError('');
    if (!/^1[3-9]\d{9}$/.test(phone.trim())) {
      setError('请输入正确的 11 位手机号');
      return;
    }
    if (!password) {
      setError('请输入登录密码');
      return;
    }

    setLoading(true);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    try {
      const result = await monitorPost<LoginResult>('/auth/login', {
        account: phone.trim(),
        password,
        loginType: 'password',
      });
      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);

      // 立即校验监控台权限：非管理员账号不在登录页留下无效登录态
      try {
        await monitorGet('/monitor/filters');
      } catch (probeError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setError(
          getApiErrorStatus(probeError) === 403
            ? '该账号没有监控台访问权限，请使用管理员账号登录'
            : getApiErrorMessage(probeError),
        );
        return;
      }

      // 概览是监控台的 index 路由，对应 #/monitor
      navigate('/monitor', { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-[400px] rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0062FF] text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-[16px] font-semibold text-slate-800">班务星 · 监控台</h1>
            <p className="mt-0.5 text-[12px] text-slate-400">只读运营监控，仅限管理员账号</p>
          </div>
        </div>

        <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-[12px] text-slate-500">手机号</span>
            <div className="relative mt-1">
              <Smartphone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                inputMode="numeric"
                maxLength={11}
                autoComplete="username"
                placeholder="请输入管理员手机号"
                className={INPUT_CLASS}
              />
            </div>
          </label>

          <label className="block">
            <span className="text-[12px] text-slate-500">密码</span>
            <div className="relative mt-1">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="请输入登录密码"
                className={INPUT_CLASS}
              />
            </div>
          </label>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] leading-5 text-red-500">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-[#0062FF] text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? '登录中…' : '登录监控台'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => navigate('/login')}
          className="mt-4 w-full text-center text-[12px] text-slate-400 transition-colors hover:text-slate-600"
        >
          返回班务星 App 登录
        </button>
      </div>
    </div>
  );
}