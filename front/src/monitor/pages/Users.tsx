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
import type { MonitorUserList } from '../types';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

function UserAvatar({ name }: { name: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0062FF]/10 text-[12px] font-medium text-[#0062FF]">
      {name?.slice(0, 1) || '?'}
    </span>
  );
}

export default function Users() {
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const debounceRef = useRef<number | undefined>(undefined);

  const { data, loading, refreshing, error, reload, refresh } = useMonitorQuery(
    () =>
      monitorGet<MonitorUserList>('/monitor/users', {
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
      title="用户"
      description="平台注册用户、所属班级与班委角色、最近登录情况，仅用于只读查看。"
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
            placeholder="搜索姓名 / 手机号 / 学号"
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-[12px] text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-[#0062FF] focus:bg-white"
          />
        </div>
      </div>

      {error && <MonitorErrorBanner message={error} onRetry={reload} />}

      <SectionCard
        title="用户列表"
        extra={
          <span className="font-data text-[11px] text-slate-400">
            {loading ? '加载中…' : error ? '加载失败' : `共 ${formatNumber(data?.total ?? 0)} 位用户`}
          </span>
        }
      >
        {loading ? (
          <MonitorSkeletonRows rows={6} />
        ) : !data || data.items.length === 0 ? (
          error ? null : (
            <MonitorEmpty
              title="没有匹配的用户"
              description="调整搜索关键词，或等待用户在 App 内注册。"
            />
          )
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] text-slate-400">
                    <th className="px-5 py-2.5 font-medium">用户</th>
                    <th className="px-3 py-2.5 font-medium">手机号</th>
                    <th className="px-3 py-2.5 font-medium">学号</th>
                    <th className="px-3 py-2.5 font-medium">所属班级 / 角色</th>
                    <th className="px-3 py-2.5 font-medium">最近登录</th>
                    <th className="px-3 py-2.5 font-medium">注册时间</th>
                    <th className="px-5 py-2.5 text-right font-medium">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.items.map((user) => (
                    <tr key={user.id} className="align-top transition-colors hover:bg-slate-50/60">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar name={user.name} />
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium text-slate-800">
                              {user.name || '未填写姓名'}
                            </p>
                            <p className="truncate font-data text-[10px] text-slate-400">
                              {user.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-data text-[12px] text-slate-700">
                        {user.phone || '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-data text-[12px] text-slate-600">
                        {user.student_id || '—'}
                      </td>
                      <td className="px-3 py-3">
                        {user.classes.length === 0 ? (
                          <span className="text-[12px] text-slate-300">未加入班级</span>
                        ) : (
                          <div className="flex max-w-[280px] flex-wrap gap-1">
                            {user.classes.map((item) => (
                              <span
                                key={item.id}
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]',
                                  item.is_committee || item.role_level !== 'member'
                                    ? 'border-blue-100 bg-blue-50 text-blue-600'
                                    : 'border-slate-200 bg-slate-50 text-slate-500',
                                )}
                              >
                                <span className="max-w-[120px] truncate">{item.name}</span>
                                <span className="text-[10px] opacity-70">{item.role}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <p className="whitespace-nowrap font-data text-[12px] text-slate-600">
                          {formatDateTime(user.last_active_at)}
                        </p>
                        <p className="max-w-[200px] truncate font-data text-[10px] text-slate-400">
                          {user.last_device || user.last_ip || '—'}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-data text-[12px] text-slate-500">
                        {formatDateTime(user.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
                            user.status
                              ? 'border-emerald-100 bg-emerald-50 text-emerald-600'
                              : 'border-slate-200 bg-slate-100 text-slate-500',
                          )}
                        >
                          {user.status ? '正常' : '禁用'}
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