import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  MonitorSmartphone,
  RefreshCw,
  ShieldX,
} from 'lucide-react';

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#F1F5F9] px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
        {children}
      </div>
    </div>
  );
}

function BackToAppButton() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate('/home')}
      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
    >
      <ArrowLeft className="h-4 w-4" />
      返回 App
    </button>
  );
}

export function MonitorLoading() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-[#F1F5F9]">
      <Loader2 className="h-7 w-7 animate-spin text-[#0062FF]" />
      <p className="text-[13px] text-slate-500">正在校验监控台权限…</p>
    </div>
  );
}

export function MonitorMobileNotice({ onContinue }: { onContinue?: () => void }) {
  return (
    <div className="min-h-[100dvh] bg-[#F1F5F9]">
      <Shell>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0062FF]/10">
          <MonitorSmartphone className="h-5 w-5 text-[#0062FF]" />
        </div>
        <h1 className="mt-4 text-[17px] font-semibold text-slate-900">监控台需要桌面端浏览器</h1>
        <p className="mt-2 text-[13px] leading-6 text-slate-500">
          监控台用于查看 App 与小程序端的错误、超时和用户反馈，建议使用宽度不低于
          1024px 的桌面浏览器访问本页面。
        </p>
        <p className="mt-1 text-[12px] leading-5 text-slate-400">
          当前窗口偏窄，强制进入后部分表格可能需要横向滚动。
        </p>
        <div className="mt-6 flex items-center gap-2">
          {onContinue && (
            <button
              type="button"
              onClick={onContinue}
              className="flex items-center gap-1.5 rounded-lg bg-[#0062FF] px-3 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
            >
              仍然进入
            </button>
          )}
          <BackToAppButton />
        </div>
      </Shell>
    </div>
  );
}

export function MonitorForbidden({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="min-h-[100dvh] bg-[#F1F5F9]">
      <Shell>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50">
          <ShieldX className="h-5 w-5 text-red-500" />
        </div>
        <h1 className="mt-4 text-[17px] font-semibold text-slate-900">无权访问监控台</h1>
        <p className="mt-2 text-[13px] leading-6 text-slate-500">
          {message || '当前账号不在监控台管理员白名单内。'}
        </p>
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 font-data text-[11px] text-slate-500">
          如需开通，请在服务端 MONITOR_ADMIN_PHONES 中追加当前账号手机号后重试。
        </p>
        <div className="mt-6 flex items-center gap-2">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center gap-1.5 rounded-lg bg-[#0062FF] px-3 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
            >
              <RefreshCw className="h-4 w-4" />
              重新检测
            </button>
          )}
          <BackToAppButton />
        </div>
      </Shell>
    </div>
  );
}

export function MonitorUnavailable({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="min-h-[100dvh] bg-[#F1F5F9]">
      <Shell>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
        </div>
        <h1 className="mt-4 text-[17px] font-semibold text-slate-900">无法连接监控后端</h1>
        <p className="mt-2 text-[13px] leading-6 text-slate-500">
          {message || '请确认后端服务已启动，且当前网络可访问 API。'}
        </p>
        <div className="mt-6 flex items-center gap-2">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center gap-1.5 rounded-lg bg-[#0062FF] px-3 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
            >
              <RefreshCw className="h-4 w-4" />
              重新检测
            </button>
          )}
          <BackToAppButton />
        </div>
      </Shell>
    </div>
  );
}

export function MonitorNotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <p className="font-data text-[32px] font-semibold text-slate-300">404</p>
      <p className="text-[14px] text-slate-500">监控台页面不存在</p>
      <button
        type="button"
        onClick={() => navigate('/monitor')}
        className="rounded-lg bg-[#0062FF] px-3 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
      >
        返回概览
      </button>
    </div>
  );
}