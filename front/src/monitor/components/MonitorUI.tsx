import type { ReactNode } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Inbox, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MonitorStreamStatus } from '../hooks/useMonitorStream';

const SEVERITY_TONES: Record<string, string> = {
  critical: 'border-red-100 bg-red-50 text-red-600',
  major: 'border-orange-100 bg-orange-50 text-orange-600',
  minor: 'border-amber-100 bg-amber-50 text-amber-600',
  info: 'border-slate-200 bg-slate-50 text-slate-500',
};

const SEVERITY_LABELS: Record<string, string> = {
  critical: '致命',
  major: '严重',
  minor: '轻微',
  info: '信息',
};

export function severityLabel(severity: string): string {
  return SEVERITY_LABELS[severity] ?? severity ?? '未知';
}

export function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
        SEVERITY_TONES[severity] ?? 'border-slate-200 bg-slate-50 text-slate-500',
      )}
    >
      {severityLabel(severity)}
    </span>
  );
}

const FEEDBACK_STATUS_TONES: Record<string, string> = {
  pending: 'border-amber-100 bg-amber-50 text-amber-600',
  processing: 'border-blue-100 bg-blue-50 text-blue-600',
  resolved: 'border-emerald-100 bg-emerald-50 text-emerald-600',
  closed: 'border-slate-200 bg-slate-100 text-slate-500',
};

const FEEDBACK_STATUS_LABELS: Record<string, string> = {
  pending: '待处理',
  processing: '处理中',
  resolved: '已解决',
  closed: '已关闭',
};

export function feedbackStatusLabel(status: string): string {
  return FEEDBACK_STATUS_LABELS[status] ?? status ?? '未知';
}

export function FeedbackStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
        FEEDBACK_STATUS_TONES[status] ?? 'border-slate-200 bg-slate-50 text-slate-500',
      )}
    >
      {feedbackStatusLabel(status)}
    </span>
  );
}

const GROUP_STATUS_TONES: Record<string, string> = {
  pending: 'border-amber-100 bg-amber-50 text-amber-600',
  processing: 'border-blue-100 bg-blue-50 text-blue-600',
  resolved: 'border-emerald-100 bg-emerald-50 text-emerald-600',
  ignored: 'border-slate-200 bg-slate-100 text-slate-500',
};

const GROUP_STATUS_LABELS: Record<string, string> = {
  pending: '待处理',
  processing: '处理中',
  resolved: '已解决',
  ignored: '已忽略',
};

export const GROUP_STATUS_OPTIONS = [
  { value: 'pending', label: '待处理' },
  { value: 'processing', label: '处理中' },
  { value: 'resolved', label: '已解决' },
  { value: 'ignored', label: '已忽略' },
];

export function groupStatusLabel(status: string): string {
  return GROUP_STATUS_LABELS[status] ?? status ?? '未知';
}

export function GroupStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
        GROUP_STATUS_TONES[status] ?? 'border-slate-200 bg-slate-50 text-slate-500',
      )}
    >
      {groupStatusLabel(status)}
    </span>
  );
}

const SOURCE_LABELS: Record<string, string> = {
  app: 'App',
  miniprogram: '小程序',
  web: 'Web',
  server: '服务端',
};

export function sourceLabel(source?: string | null): string {
  if (!source) return '未知来源';
  return SOURCE_LABELS[source] ?? source;
}

const STREAM_STATUS_MAP: Record<
  MonitorStreamStatus,
  { label: string; dot: string; className: string }
> = {
  connected: {
    label: '实时已连接',
    dot: 'bg-emerald-500',
    className: 'bg-emerald-50 text-emerald-600',
  },
  connecting: {
    label: '实时连接中',
    dot: 'bg-amber-400',
    className: 'bg-amber-50 text-amber-600',
  },
  disconnected: {
    label: '实时断开 · 轮询中',
    dot: 'bg-slate-400',
    className: 'bg-slate-100 text-slate-500',
  },
};

export function StreamBadge({ status }: { status: MonitorStreamStatus }) {
  const tone = STREAM_STATUS_MAP[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium',
        tone.className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} />
      {tone.label}
    </span>
  );
}

export function MonitorEmpty({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50">
        <Inbox className="h-5 w-5 text-slate-300" />
      </div>
      <p className="text-[13px] font-medium text-slate-600">{title}</p>
      {description && <p className="max-w-md text-[12px] leading-5 text-slate-400">{description}</p>}
    </div>
  );
}

export function MonitorErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
      <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
      <p className="min-w-0 flex-1 text-[12px] leading-5 text-red-600">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[12px] font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          重试
        </button>
      )}
    </div>
  );
}

export function MonitorPagination({
  page,
  pageSize,
  total,
  onChange,
  disabled,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  disabled?: boolean;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
      <span className="font-data text-[11px] text-slate-400">
        第 {page} / {totalPages} 页 · 共 {formatNumber(total)} 条
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled || page <= 1}
          onClick={() => onChange(page - 1)}
          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px] text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          上一页
        </button>
        <button
          type="button"
          disabled={disabled || page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px] text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          下一页
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function SectionCard({
  title,
  extra,
  children,
  className,
}: {
  title: string;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-slate-200 bg-white', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <h2 className="text-[14px] font-semibold text-slate-800">{title}</h2>
        {extra}
      </div>
      {children}
    </div>
  );
}

const pad = (value: number) => String(value).padStart(2, '0');

export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function formatTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function formatDuration(value?: number | null): string {
  if (value === null || value === undefined) return '—';
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(2)} s`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value);
}