import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Gauge,
  MessageSquare,
  RefreshCw,
  School,
  UserCheck,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import MonitorPage, { MonitorSkeletonRows } from '../MonitorPage';
import TrendChart from '../components/TrendChart';
import {
  MonitorEmpty,
  MonitorErrorBanner,
  SectionCard,
  SeverityBadge,
  StreamBadge,
  formatDateTime,
  formatDuration,
  formatNumber,
  severityLabel,
  sourceLabel,
} from '../components/MonitorUI';
import { useMonitorQuery } from '../hooks/useMonitorQuery';
import { useLiveRefresh } from '../hooks/useMonitorStream';
import { monitorGet } from '../api';
import type {
  CountItem,
  MonitorOverview,
  MonitorRange,
  PlatformStats,
} from '../types';
import { cn } from '@/lib/utils';

const RANGE_OPTIONS: Array<{ value: MonitorRange; label: string }> = [
  { value: '1h', label: '1 小时' },
  { value: '24h', label: '24 小时' },
  { value: '7d', label: '7 天' },
  { value: '30d', label: '30 天' },
];

const RANGE_LABELS: Record<MonitorRange, string> = {
  '1h': '近 1 小时',
  '24h': '近 24 小时',
  '7d': '近 7 天',
  '30d': '近 30 天',
};

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-slate-500">{label}</span>
        <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', tone)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 font-data text-[28px] font-semibold leading-none text-slate-900">
        {formatNumber(value)}
      </p>
      <p className="mt-2 font-data text-[11px] text-slate-400">{hint}</p>
    </div>
  );
}

function PlatformStat({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | null;
  hint: string;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-slate-500">{label}</span>
        <span className={cn('flex h-6 w-6 items-center justify-center rounded-md', tone)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="mt-2 font-data text-[22px] font-semibold leading-none text-slate-900">
        {value === null ? '—' : formatNumber(value)}
      </p>
      <p className="mt-1.5 font-data text-[11px] text-slate-400">{hint}</p>
    </div>
  );
}

function CountBars({
  rows,
  formatKey,
}: {
  rows: CountItem[];
  formatKey?: (key: string) => string;
}) {
  if (rows.length === 0) {
    return <p className="px-5 py-8 text-center text-[12px] text-slate-400">暂无数据</p>;
  }

  const max = Math.max(1, ...rows.map((row) => row.count));

  return (
    <div className="space-y-3 px-5 py-4">
      {rows.map((row) => (
        <div key={row.key}>
          <div className="flex items-center justify-between gap-3 text-[12px]">
            <span className="truncate text-slate-600">
              {formatKey ? formatKey(row.key) : row.key}
            </span>
            <span className="shrink-0 font-data text-slate-500">{formatNumber(row.count)}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#0062FF]"
              style={{ width: `${Math.max(4, (row.count / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
            <div className="mt-4 h-7 w-16 animate-pulse rounded bg-slate-100" />
            <div className="mt-3 h-2.5 w-24 animate-pulse rounded bg-slate-50" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="h-[300px] rounded-2xl border border-slate-200 bg-white xl:col-span-2" />
        <div className="h-[300px] rounded-2xl border border-slate-200 bg-white" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <MonitorSkeletonRows rows={5} />
      </div>
    </>
  );
}

export default function Overview() {
  const [range, setRange] = useState<MonitorRange>('24h');

  const { data, loading, refreshing, error, reload, refresh } = useMonitorQuery(
    () => monitorGet<MonitorOverview>('/monitor/overview', { range }),
    [range],
  );
  const {
    data: platform,
    loading: platformLoading,
    refreshing: platformRefreshing,
    error: platformError,
    reload: reloadPlatform,
    refresh: refreshPlatform,
  } = useMonitorQuery(
    () => monitorGet<PlatformStats>('/monitor/stats/platform', { range }),
    [range],
  );
  const { status } = useLiveRefresh(() => {
    refresh();
    refreshPlatform();
  });

  const refreshAll = () => {
    refresh();
    refreshPlatform();
  };

  const platformHint = platformError
    ? '平台数据加载失败'
    : platform
      ? `消息 ${formatNumber(platform.activity.messages)} 条 · 作业 ${formatNumber(
          platform.activity.homeworks,
        )} 份`
      : '加载中…';

  return (
    <MonitorPage
      title="概览"
      description="App、小程序与服务端的错误、超时和用户反馈总览，数据来自实时错误日志。"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <StreamBadge status={status} />
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRange(option.value)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-[12px] transition-colors',
                  range === option.value
                    ? 'bg-[#0062FF] text-white'
                    : 'text-slate-500 hover:bg-slate-50',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={refreshAll}
            disabled={refreshing || platformRefreshing}
            title="刷新"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              className={cn(
                'h-3.5 w-3.5',
                (refreshing || platformRefreshing) && 'animate-spin',
              )}
            />
          </button>
        </div>
      }
    >
      {error && <MonitorErrorBanner message={error} onRetry={reload} />}
      {platformError && (
        <MonitorErrorBanner message={`平台数据：${platformError}`} onRetry={reloadPlatform} />
      )}

      {loading ? (
        <OverviewSkeleton />
      ) : data ? (
        <>
          <SectionCard title="平台数据" extra={
            <span className="font-data text-[11px] text-slate-400">
              {RANGE_LABELS[range]} · {platformHint}
            </span>
          }>
            <div className="grid grid-cols-2 gap-3 p-4 xl:grid-cols-4">
              <PlatformStat
                label="用户总数"
                value={platformLoading ? null : platform?.users.total ?? null}
                hint={`${RANGE_LABELS[range]}新增 ${
                  platform && !platformLoading ? formatNumber(platform.users.new) : '—'
                } 人`}
                icon={Users}
                tone="bg-indigo-50 text-indigo-500"
              />
              <PlatformStat
                label="活跃用户"
                value={platformLoading ? null : platform?.users.active ?? null}
                hint={`${RANGE_LABELS[range]}有登录记录`}
                icon={UserCheck}
                tone="bg-emerald-50 text-emerald-500"
              />
              <PlatformStat
                label="班级总数"
                value={platformLoading ? null : platform?.classes.total ?? null}
                hint={`${RANGE_LABELS[range]}新增 ${
                  platform && !platformLoading ? formatNumber(platform.classes.new) : '—'
                } 个`}
                icon={School}
                tone="bg-blue-50 text-[#0062FF]"
              />
              <PlatformStat
                label="活跃班级"
                value={platformLoading ? null : platform?.classes.active ?? null}
                hint={`${RANGE_LABELS[range]}有消息产生`}
                icon={MessageSquare}
                tone="bg-amber-50 text-amber-500"
              />
            </div>
          </SectionCard>

          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard
              label="错误总数"
              value={data.totals.errors}
              hint={`${RANGE_LABELS[range]} 全部上报`}
              icon={Activity}
              tone="bg-blue-50 text-[#0062FF]"
            />
            <StatCard
              label="致命错误"
              value={data.totals.critical}
              hint={`严重 ${formatNumber(data.totals.major)} 条`}
              icon={AlertTriangle}
              tone="bg-red-50 text-red-500"
            />
            <StatCard
              label="超时请求"
              value={data.totals.timeouts}
              hint={`慢请求 ${formatNumber(data.totals.slowRequests)} 条`}
              icon={Clock}
              tone="bg-amber-50 text-amber-500"
            />
            <StatCard
              label="待处理反馈"
              value={data.totals.feedback.pending}
              hint={`累计 ${formatNumber(data.totals.feedback.total)} 条`}
              icon={MessageSquare}
              tone="bg-emerald-50 text-emerald-500"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <SectionCard
              title="错误趋势"
              className="xl:col-span-2"
              extra={
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-data text-[11px] text-slate-500">
                  {range}
                </span>
              }
            >
              <div className="px-1 pb-1 pt-3">
                <TrendChart points={data.trend} range={range} />
              </div>
            </SectionCard>

            <SectionCard
              title="严重程度分布"
              extra={
                <span className="font-data text-[11px] text-slate-400">
                  共 {formatNumber(data.totals.errors)} 条
                </span>
              }
            >
              <CountBars rows={data.bySeverity} formatKey={severityLabel} />
            </SectionCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <SectionCard
              title="高频错误分组"
              className="xl:col-span-2"
              extra={
                <Link
                  to="/monitor/errors"
                  className="flex items-center gap-1 text-[12px] text-[#0062FF] hover:underline"
                >
                  全部错误
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              }
            >
              {data.topGroups.length === 0 ? (
                <MonitorEmpty title="当前区间暂无错误分组" description="App 与小程序上报错误后会自动聚合到这里。" />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.topGroups.map((group) => (
                    <li key={group.id}>
                      <Link
                        to={`/monitor/errors/${group.id}`}
                        className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50"
                      >
                        <SeverityBadge severity={group.severity} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] text-slate-800">{group.message}</p>
                          <p className="mt-0.5 truncate font-data text-[11px] text-slate-400">
                            {group.error_type} ·{' '}
                            {group.route || group.page_path || sourceLabel(group.source)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-data text-[13px] font-medium text-slate-700">
                            {formatNumber(group.occurrence_count)}
                          </p>
                          <p className="font-data text-[11px] text-slate-400">
                            {formatDateTime(group.last_seen_at)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <div className="space-y-4">
              <SectionCard
                title="性能表现"
                extra={
                  <span className="font-data text-[11px] text-slate-400">
                    采样 {formatNumber(data.performance.sampled)}
                  </span>
                }
              >
                <div className="grid grid-cols-2 gap-3 px-5 py-4">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Gauge className="h-3 w-3" />
                      平均耗时
                    </div>
                    <p className="mt-1.5 font-data text-[18px] font-semibold text-slate-800">
                      {formatDuration(data.performance.avgDurationMs)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Gauge className="h-3 w-3" />
                      P95 耗时
                    </div>
                    <p className="mt-1.5 font-data text-[18px] font-semibold text-slate-800">
                      {formatDuration(data.performance.p95DurationMs)}
                    </p>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="来源分布">
                <CountBars rows={data.bySource} formatKey={sourceLabel} />
              </SectionCard>
            </div>
          </div>

          <SectionCard
            title="最近上报"
            extra={
              <span className="font-data text-[11px] text-slate-400">
                最近 {data.recentErrors.length} 条
              </span>
            }
          >
            {data.recentErrors.length === 0 ? (
              <MonitorEmpty title="当前区间暂无上报记录" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] text-slate-400">
                      <th className="px-5 py-2 font-medium">时间</th>
                      <th className="px-3 py-2 font-medium">严重程度</th>
                      <th className="px-3 py-2 font-medium">错误</th>
                      <th className="px-3 py-2 font-medium">来源 / 路由</th>
                      <th className="px-5 py-2 text-right font-medium">耗时</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.recentErrors.map((log) => (
                      <tr key={log.id}>
                        <td className="whitespace-nowrap px-5 py-2.5 font-data text-[11px] text-slate-500">
                          {formatDateTime(log.created_at)}
                        </td>
                        <td className="px-3 py-2.5">
                          <SeverityBadge severity={log.severity} />
                        </td>
                        <td className="max-w-[360px] px-3 py-2.5">
                          <p className="truncate text-[12px] text-slate-700">{log.message}</p>
                          <p className="truncate font-data text-[10px] text-slate-400">
                            {log.error_type}
                            {log.status_code ? ` · HTTP ${log.status_code}` : ''}
                          </p>
                        </td>
                        <td className="max-w-[220px] px-3 py-2.5">
                          <p className="truncate text-[11px] text-slate-500">
                            {sourceLabel(log.source)}
                          </p>
                          <p className="truncate font-data text-[10px] text-slate-400">
                            {log.route || log.page_path || '—'}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-5 py-2.5 text-right font-data text-[11px] text-slate-500">
                          {formatDuration(log.duration_ms)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </>
      ) : null}
    </MonitorPage>
  );
}