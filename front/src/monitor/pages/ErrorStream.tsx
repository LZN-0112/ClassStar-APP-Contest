import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, RefreshCw, RotateCcw, Search } from 'lucide-react';
import MonitorPage, { MonitorSkeletonRows } from '../MonitorPage';
import {
  GROUP_STATUS_OPTIONS,
  GroupStatusBadge,
  MonitorEmpty,
  MonitorErrorBanner,
  MonitorPagination,
  SectionCard,
  SeverityBadge,
  StreamBadge,
  formatDateTime,
  formatNumber,
  severityLabel,
  sourceLabel,
} from '../components/MonitorUI';
import { useMonitorQuery } from '../hooks/useMonitorQuery';
import { useLiveRefresh } from '../hooks/useMonitorStream';
import { monitorGet } from '../api';
import type { ErrorGroupList, MonitorFilters } from '../types';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

const SELECT_CLASS =
  'h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] text-slate-600 outline-none transition-colors focus:border-[#0062FF]';

const DAY_OPTIONS = [
  { value: '1', label: '近 24 小时' },
  { value: '7', label: '近 7 天' },
  { value: '30', label: '近 30 天' },
];

const ORDER_OPTIONS = [
  { value: 'recent', label: '按最近出现' },
  { value: 'count', label: '按出现次数' },
];

export default function ErrorStream() {
  const navigate = useNavigate();

  const [source, setSource] = useState('');
  const [severity, setSeverity] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [days, setDays] = useState('7');
  const [orderBy, setOrderBy] = useState<'recent' | 'count'>('recent');
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const debounceRef = useRef<number | undefined>(undefined);

  const { data: filters } = useMonitorQuery(
    () => monitorGet<MonitorFilters>('/monitor/filters'),
    [],
  );

  const { data, loading, refreshing, error, reload, refresh } = useMonitorQuery(
    () =>
      monitorGet<ErrorGroupList>('/errors/groups', {
        page,
        pageSize: PAGE_SIZE,
        days: Number(days),
        orderBy,
        source: source || undefined,
        severity: severity || undefined,
        status: statusFilter || undefined,
        keyword: keyword || undefined,
      }),
    [page, days, orderBy, source, severity, statusFilter, keyword],
    { keepPreviousData: true },
  );

  const { status } = useLiveRefresh(refresh);

  useEffect(() => {
    if (debounceRef.current !== undefined) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setKeyword(keywordInput.trim());
      setPage(1);
    }, 300);
    return () => {
      if (debounceRef.current !== undefined) window.clearTimeout(debounceRef.current);
    };
  }, [keywordInput]);

  const hasFilter =
    Boolean(source) ||
    Boolean(severity) ||
    Boolean(statusFilter) ||
    days !== '7' ||
    orderBy !== 'recent' ||
    Boolean(keywordInput);

  const resetFilters = () => {
    setSource('');
    setSeverity('');
    setStatusFilter('');
    setDays('7');
    setOrderBy('recent');
    setKeywordInput('');
    setKeyword('');
    setPage(1);
  };

  return (
    <MonitorPage
      title="错误流"
      description="按指纹聚合的错误分组，点击可查看聚合详情与最近上报记录。"
      actions={
        <div className="flex items-center gap-2">
          <StreamBadge status={status} />
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            title="刷新"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          </button>
        </div>
      }
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 pr-1 text-[12px] text-slate-500">
            <Filter className="h-4 w-4" />
            筛选
          </div>

          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              placeholder="搜索错误信息 / 路由 / 页面路径"
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-[12px] text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-[#0062FF] focus:bg-white"
            />
          </div>

          <select
            value={source}
            onChange={(event) => {
              setSource(event.target.value);
              setPage(1);
            }}
            className={SELECT_CLASS}
          >
            <option value="">全部来源</option>
            {(filters?.sources ?? []).map((item) => (
              <option key={item} value={item}>
                {sourceLabel(item)}
              </option>
            ))}
          </select>

          <select
            value={severity}
            onChange={(event) => {
              setSeverity(event.target.value);
              setPage(1);
            }}
            className={SELECT_CLASS}
          >
            <option value="">全部严重程度</option>
            {(filters?.severities ?? []).map((item) => (
              <option key={item} value={item}>
                {severityLabel(item)}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            className={SELECT_CLASS}
          >
            <option value="">全部处理状态</option>
            {GROUP_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={days}
            onChange={(event) => {
              setDays(event.target.value);
              setPage(1);
            }}
            className={SELECT_CLASS}
          >
            {DAY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={orderBy}
            onChange={(event) => {
              setOrderBy(event.target.value as 'recent' | 'count');
              setPage(1);
            }}
            className={SELECT_CLASS}
          >
            {ORDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {hasFilter && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[12px] text-slate-500 transition-colors hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              重置
            </button>
          )}
        </div>
      </div>

      {error && <MonitorErrorBanner message={error} onRetry={reload} />}

      <SectionCard
        title="错误分组"
        extra={
          <span className="font-data text-[11px] text-slate-400">
            {loading ? '加载中…' : error && !data ? '加载失败' : `共 ${formatNumber(data?.total ?? 0)} 组`}
          </span>
        }
      >
        {loading ? (
          <MonitorSkeletonRows rows={6} />
        ) : !data || data.data.length === 0 ? (
          error ? null : (
            <MonitorEmpty
              title="没有匹配的错误分组"
              description="调整筛选条件，或等待 App / 小程序上报新的错误。"
            />
          )
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[990px] text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] text-slate-400">
                    <th className="w-[90px] px-5 py-2.5 font-medium">严重程度</th>
                    <th className="w-[90px] px-3 py-2.5 font-medium">处理状态</th>
                    <th className="px-3 py-2.5 font-medium">错误信息</th>
                    <th className="w-[170px] px-3 py-2.5 font-medium">来源 / 路由</th>
                    <th className="w-[80px] px-3 py-2.5 text-right font-medium">次数</th>
                    <th className="w-[150px] px-3 py-2.5 font-medium">最近出现</th>
                    <th className="w-[150px] px-5 py-2.5 font-medium">首次出现</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.data.map((group) => (
                    <tr
                      key={group.id}
                      onClick={() => navigate(`/monitor/errors/${group.id}`)}
                      className="cursor-pointer transition-colors hover:bg-slate-50"
                    >
                      <td className="px-5 py-3">
                        <SeverityBadge severity={group.severity} />
                      </td>
                      <td className="px-3 py-3">
                        <GroupStatusBadge status={group.status} />
                      </td>
                      <td className="max-w-[420px] px-3 py-3">
                        <p className="line-clamp-2 text-[13px] leading-5 text-slate-800">
                          {group.message}
                        </p>
                        <p className="mt-0.5 truncate font-data text-[11px] text-slate-400">
                          {group.error_type}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-[12px] text-slate-500">{sourceLabel(group.source)}</p>
                        <p className="max-w-[160px] truncate font-data text-[11px] text-slate-400">
                          {group.route || group.page_path || '—'}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-right font-data text-[12px] text-slate-700">
                        {formatNumber(group.occurrence_count)}
                      </td>
                      <td className="px-3 py-3 font-data text-[11px] text-slate-500">
                        {formatDateTime(group.last_seen_at)}
                      </td>
                      <td className="px-5 py-3 font-data text-[11px] text-slate-400">
                        {formatDateTime(group.first_seen_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <MonitorPagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              onChange={setPage}
              disabled={refreshing}
            />
          </>
        )}
      </SectionCard>
    </MonitorPage>
  );
}