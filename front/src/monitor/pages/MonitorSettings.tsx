import { useNavigate } from 'react-router-dom';
import { KeyRound, Radio, Server, ShieldCheck } from 'lucide-react';
import MonitorPage from '../MonitorPage';
import AlertConfigPanel from '../components/AlertConfigPanel';
import { API_BASE_URL } from '../api';

const ITEMS = [
  {
    icon: Server,
    title: '后端接口',
    description: '监控台全部请求经由独立实例发往同一后端，不影响 App 端请求链路。',
    value: API_BASE_URL,
  },
  {
    icon: ShieldCheck,
    title: '访问控制',
    description:
      '仅当当前登录账号手机号存在于服务端 MONITOR_ADMIN_PHONES 白名单时才可访问，非管理员返回 403。',
    value: 'JWT + MonitorAdminGuard',
  },
  {
    icon: KeyRound,
    title: '登录态',
    description: '沿用 App 端登录 token（localStorage.accessToken），未登录或 token 失效时跳转登录页。',
    value: 'Bearer Token',
  },
  {
    icon: Radio,
    title: '实时通道',
    description: 'SSE 推送新增错误与反馈事件；连接断开时自动降级为 30 秒轮询。',
    value: `${API_BASE_URL}/monitor/stream`,
  },
];

export default function MonitorSettings() {
  const navigate = useNavigate();

  return (
    <MonitorPage title="监控设置" description="配置错误告警规则与通知渠道，并查看监控台运行信息。">
      <AlertConfigPanel />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {ITEMS.map(({ icon: Icon, title, description, value }) => (
          <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0062FF]/10">
              <Icon className="h-4 w-4 text-[#0062FF]" />
            </div>
            <p className="mt-3 text-[14px] font-semibold text-slate-800">{title}</p>
            <p className="mt-1 text-[12px] leading-6 text-slate-500">{description}</p>
            <p className="mt-3 break-all rounded-lg bg-slate-50 px-3 py-2 font-data text-[11px] text-slate-500">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-[14px] font-semibold text-slate-800">当前阶段</h2>
        <p className="mt-1 text-[13px] leading-6 text-slate-500">
          概览、错误流、错误详情、反馈工单与告警通知已接入真实数据，并通过 SSE
          接收新增错误 / 反馈事件后自动刷新；移动端访问默认展示桌面端提示，可手动选择「仍然进入」查看，数据与桌面端一致。
        </p>
        <button
          type="button"
          onClick={() => navigate('/home')}
          className="mt-4 rounded-lg bg-[#0062FF] px-3 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
        >
          返回 App
        </button>
      </div>
    </MonitorPage>
  );
}