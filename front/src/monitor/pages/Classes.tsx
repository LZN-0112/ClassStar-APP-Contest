import { useEffect, useRef, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import MonitorPage, { MonitorSkeletonRows } from '../MonitorPage';
import {
  MonitorEmpty,
  MonitorErrorBanner,
  MonitorPagination,
  SectionCard,
  formatDateTime,
  formatNumber,
} from '../components/MonitorUI';
import { useMonitorQuery } from '../hooks/useMonitorQuery';
import { monitorGet } from '../api';
import type { MonitorClassList } from '../types';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

export default function Classes() {
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const debounceRef = useRef<number | undefined>(undefined);

  const { data, loading, refreshing, error, reload, refresh } = useMonitorQuery(
    () =>
      monitorGet<MonitorClassList>('/monitor/classes', {
        page,
        pageSize: PAGE_SIZE,
        keyword: keyword || undefined,
      }),
    [page, keyword],
    { keepPreviousData: true },
  );

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

  return (
    <MonitorPage
      title="班级"
      description="平台全部班级、创建者、成员与班委规模、最近消息时间，仅用于只读查看。"
      actions={
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          title="刷新"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
        </button>
      }
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="relative min-w-[240px] sm:w-[320px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            placeholder="搜索班级名称 / 班级码"
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-[12px] text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-[#0062FF] focus:bg-white"
          />
        </div>
      </div>

      {error && <MonitorErrorBanner message={error} onRetry={reload} />}

      <SectionCard
        title="班级列表"
        extra={
          <span className="font-data text-[11px] text-slate-400">
            {loading ? '加载中…' : error ? '加载失败' : `共 ${formatNumber(data?.total ?? 0)} 个班级`}
          </span>
        }
      >
        {loading ? (
          <MonitorSkeletonRows rows={6} />
        ) : !data || data.items.length === 0 ? (
          error ? null : (
            <MonitorEmpty
              title="没有匹配的班级"
              description="调整搜索关键词，或等待班委在 App 内创建班级。"
            />
          )
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] text-slate-400">
                    <th className="px-5 py-2.5 font-medium">班级</th>
                    <th className="px-3 py-2.5 font-medium">年级 / 专业</th>
                    <th className="px-3 py-2.5 font-medium">创建者</th>
                    <th className="px-3 py-2.5 text-right font-medium">成员</th>
                    <th className="px-3 py-2.5 text-right font-medium">班委</th>
                    <th className="px-3 py-2.5 font-medium">最近消息</th>
                    <th className="px-3 py-2.5 font-medium">创建时间</th>
                    <th className="px-5 py-2.5 text-right font-medium">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.items.map((item) => (
                    <tr key={item.id} className="align-top transition-colors hover:bg-slate-50/60">
                      <td className="px-5 py-3">
                        <p className="max-w-[220px] truncate text-[13px] font-medium text-slate-800">
                          {item.name}
                        </p>
                        <p className="font-data text-[10px] text-slate-400">{item.code}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="whitespace-nowrap text-[12px] text-slate-600">
                          {item.grade || '—'}
                        </p>
                        <p className="max-w-[180px] truncate text-[11px] text-slate-400">
                          {item.major || '—'}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="whitespace-nowrap text-[12px] text-slate-700">
                          {item.creator_name || '—'}
                        </p>
                        <p className="whitespace-nowrap font-data text-[11px] text-slate-400">
                          {item.creator_phone || '—'}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-data text-[12px] text-slate-700">
                        {formatNumber(item.member_count)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-data text-[12px] text-slate-600">
                        {formatNumber(item.committee_count)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-data text-[12px] text-slate-500">
                        {formatDateTime(item.last_message_at)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-data text-[12px] text-slate-500">
                        {formatDateTime(item.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
                            item.status
                              ? 'border-emerald-100 bg-emerald-50 text-emerald-600'
                              : 'border-slate-200 bg-slate-100 text-slate-500',
                          )}
                        >
                          {item.status ? '正常' : '停用'}
                        </span>
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