import { useEffect, useState } from 'react';
import PhoneFrame from '@/components/layout/PhoneFrame';
import { useNavigate } from 'react-router-dom';
import { GradientWave } from '@/components/ui/gradient-wave';
import { useAppVersion } from '@/hooks/useAppVersion';
import { api } from '@/lib/api';

/** 解析 JWT 过期时间；无法解析时按已过期处理 */
function isTokenExpired(token: string): boolean {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64)) as { exp?: number };
    if (typeof payload.exp !== 'number') return true;
    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

function clearSession() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('currentUser');
}

/** 冷启动恢复登录态：accessToken 过期时先续期，再验证登录态是否有效 */
async function restoreSession(): Promise<void> {
  const token = localStorage.getItem('accessToken');
  if (!token) throw new Error('未登录');

  if (isTokenExpired(token)) {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('登录已过期');
    const res = await api.post('/auth/refresh', { refreshToken }, { timeout: 8000 });
    const data = res.data?.data || res.data;
    if (!data?.accessToken) throw new Error('登录已过期');
    localStorage.setItem('accessToken', data.accessToken);
  }

  try {
    await api.get('/auth/me', { timeout: 8000 });
  } catch (err) {
    // 只有登录态失效才清理；网络异常时保留登录态，用缓存信息进入首页
    if ((err as { status?: number }).status === 401) throw err;
  }
}

export default function Launch() {
  const navigate = useNavigate();
  const appVersion = useAppVersion();
  const [restoring, setRestoring] = useState(() => Boolean(localStorage.getItem('accessToken')));

  useEffect(() => {
    let cancelled = false;
    if (!localStorage.getItem('accessToken')) {
      // 无本地登录态：直接进入登录页，避免冷启动停留在启动页等待点击
      navigate('/login', { replace: true });
      return;
    }

    restoreSession()
      .then(() => {
        if (!cancelled) navigate('/home', { replace: true });
      })
      .catch(() => {
        clearSession();
        if (!cancelled) navigate('/login', { replace: true });
      })
      .finally(() => {
        if (!cancelled) setRestoring(false);
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <PhoneFrame className="bg-white">
      <div
        className="box-border w-full flex-1 flex flex-col gap-8 justify-center items-center bg-[#FFFFFF] relative"
        onClick={() => {
          if (!restoring) navigate('/login');
        }}
      >
        {/* 动态波浪背景层 */}
        <div className="absolute inset-0 overflow-hidden">
          <GradientWave colors={['#7dd3fc', '#ffffff', '#bfdbfe', '#ffffff', '#93c5fd', '#ffffff']} />
        </div>
      <div
        data-pencil-name="Logo BG"
        className="box-border w-[120px] h-[120px] shrink-0 flex flex-col gap-0 justify-center items-center bg-[url('/images/app-icon.png')] bg-no-repeat bg-cover bg-center rounded-[28px] relative [z-index:1]"
      ></div>
      <div
        data-pencil-name="App Name"
        className="text-[36px]/[normal] box-border text-[#1A1A1A] font-heading font-bold text-left [white-space:nowrap] relative [z-index:2]"
      >
        班务星
      </div>
      <div
        data-pencil-name="Tagline"
        className="text-[14px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap] relative [z-index:3]"
      >
        智能管理班级事务
      </div>
      <div
        data-pencil-name="Version"
        className="text-[11px]/[normal] box-border text-[#4B5563] font-caption font-normal text-left [white-space:nowrap] relative [z-index:4]"
      >
        {restoring ? '正在恢复登录状态…' : `v${appVersion}`}
      </div></div>
    </PhoneFrame>
  );
}