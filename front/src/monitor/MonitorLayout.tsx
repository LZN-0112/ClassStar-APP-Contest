import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Inbox,
  LayoutDashboard,
  School,
  Server,
  Settings,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { API_BASE_URL, monitorGet } from './api';

interface NavItemConfig {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}

const MAIN_NAV: NavItemConfig[] = [
  { to: '/monitor', label: '概览', icon: LayoutDashboard, end: true },
  { to: '/monitor/errors', label: '错误流', icon: AlertTriangle },
  { to: '/monitor/feedback', label: '反馈工单', icon: Inbox },
];

const DATA_NAV: NavItemConfig[] = [
  { to: '/monitor/users', label: '用户', icon: Users },
  { to: '/monitor/classes', label: '班级', icon: School },
];

const SYSTEM_NAV: NavItemConfig[] = [
  { to: '/monitor/settings', label: '监控设置', icon: Settings },
];

function NavItem({ to, label, icon: Icon, end }: NavItemConfig) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors',
          isActive
            ? 'bg-white/10 font-medium text-white'
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

function Section({ title, items }: { title: string; items: NavItemConfig[] }) {
  return (
    <div>
      <p className="px-3 pb-2 font-data text-[10px] uppercase tracking-[0.16em] text-slate-600">
        {title}
      </p>
      <div className="space-y-1">
        {items.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </div>
    </div>
  );
}

function resolveTitle(pathname: string): string {
  if (pathname === '/monitor' || pathname === '/monitor/') return '概览';
  const matched = [...MAIN_NAV, ...DATA_NAV, ...SYSTEM_NAV]
    .filter((item) => item.to !== '/monitor' && pathname.startsWith(item.to))
    .sort((a, b) => b.to.length - a.to.length)[0];
  return matched?.label ?? '概览';
}

type ApiStatus = 'checking' | 'ok' | 'down';

export default function MonitorLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isDev = import.meta.env.DEV;
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking');

  // 真实探测后端连通性，避免底部状态灯变成永远绿色的静态装饰
  useEffect(() => {
    let cancelled = false;

    const probe = async () => {
      try {
        await monitorGet('/monitor/health');
        if (!cancelled) setApiStatus('ok');
      } catch {
        if (!cancelled) setApiStatus('down');
      }
    };

    void probe();
    const timer = window.setInterval(probe, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const statusText =
    apiStatus === 'ok' ? '服务连通' : apiStatus === 'checking' ? '状态检测中' : '连接中断';

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[#F1F5F9]">
      <aside className="flex w-[236px] shrink-0 flex-col bg-[#0B1220]">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0062FF] shadow-[0_6px_16px_rgba(0,98,255,0.35)]">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-[15px] font-semibold leading-none text-white">班务星</p>
            <p className="mt-1.5 font-data text-[10px] uppercase tracking-[0.18em] text-slate-500">
              Monitor Console
            </p>
          </div>
        </div>

        <nav className="mt-2 flex-1 space-y-6 overflow-y-auto px-3 pb-4">
          <Section title="运行监控" items={MAIN_NAV} />
          <Section title="数据看板" items={DATA_NAV} />
          <Section title="系统" items={SYSTEM_NAV} />
        </nav>

        <div className="border-t border-white/10 px-5 py-4">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                apiStatus === 'ok'
                  ? 'bg-emerald-400'
                  : apiStatus === 'checking'
                    ? 'animate-pulse bg-slate-500'
                    : 'bg-red-500',
              )}
            />
            {statusText} · 管理视图
          </div>
          <p className="mt-1.5 truncate font-data text-[10px] text-slate-600">{API_BASE_URL}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-6">
          <div className="flex items-center gap-2 text-[13px]">
            <span className="text-slate-400">监控台</span>
            <span className="text-slate-300">/</span>
            <span className="font-medium text-slate-800">{resolveTitle(location.pathname)}</span>
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-medium',
                isDev ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600',
              )}
            >
              {isDev ? '开发环境' : '生产环境'}
            </span>
            <span className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-data text-[11px] text-slate-500 xl:flex">
              <Server className="h-3.5 w-3.5" />
              {API_BASE_URL}
            </span>
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              返回 App
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}