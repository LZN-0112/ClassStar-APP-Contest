import { useEffect, useRef, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import MonitorPage, { MonitorSkeletonRows } from '../MonitorPage';
import {
  FeedbackStatusBadge,
  MonitorEmpty,
  MonitorErrorBanner,
  MonitorPagination,
  SectionCard,
  StreamBadge,
  formatDateTime,
  feedbackStatusLabel,
  formatNumber,
} from '../components/MonitorUI';
import { useMonitorQuery } from '../hooks/useMonitorQuery';
import { useLiveRefresh } from '../hooks/useMonitorStream';
import { getApiErrorMessage, monitorGet, monitorPatch } from '../api';
import type { FeedbackItem, FeedbackList, FeedbackStatus } from '../types';
import { cn } from '@/lib/utils';
import { resolveFileUrl } from '@/lib/api';

const PAGE_SIZE = 20;

const STATUS_OPTIONS: Array<{ value: '' | FeedbackStatus; label: string }> = [
  { value: '', label: '全部' },
  { value: 'pending', label: '待处理' },
  { value: 'processing', label: '处理中' },
  { value: 'resolved', label: '已解决' },
  { value: 'closed', label: '已关闭' },
];

const STATUS_VALUES: FeedbackStatus[] = ['pending', 'processing', 'resolved', 'closed'];

export default function Feedback() {
  const [status, setStatus] = useState<'' | FeedbackStatus>('');
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const debounceRef = useRef<number | undefined>(undefined);

  const { data, loading, refreshing, error, reload, refresh } = useMonitorQuery(
    () =>
      monitorGet<FeedbackList>('/feedback/admin', {
        page,
        pageSize: PAGE_SIZE,
        status: status || undefined,
        keyword: keyword || undefined,
      }),
    [page, status, keyword],
    { keepPreviousData: true },
  );

  const { status: streamStatus } = useLiveRefresh(refresh);

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

  const updateStatus = async (item: FeedbackItem, next: FeedbackStatus) => {
    if (next === item.status) return;
    setUpdatingId(item.id);
    setActionError('');
    try {
      await monitorPatch(`/feedback/${item.id}/status`, { status: next });
      await refresh();
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <MonitorPage
      title="反馈工单"
      description="用户在 App 与小程序内提交的反馈，可流转处理状态。"
      actions={
        <div className="flex items-center gap-2">
          <StreamBadge status={streamStatus} />
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value || 'all'}
                type="button"
                onClick={() => {
                  setStatus(option.value);
                  setPage(1);
                }}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-[12px] transition-colors',
                  status === option.value
                    ? 'bg-[#0062FF] text-white'
                    : 'text-slate-500 hover:bg-slate-50',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[240px] flex-1 sm:max-w-[320px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              placeholder="搜索反馈内容 / 联系方式"
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-[12px] text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-[#0062FF] focus:bg-white"
            />
          </div>
        </div>
      </div>

      {error && <MonitorErrorBanner message={error} onRetry={reload} />}
      {actionError && <MonitorErrorBanner message={actionError} onRetry={() => setActionError('')} />}

      <SectionCard
        title="反馈列表"
        extra={
          <span className="font-data text-[11px] text-slate-400">
            {loading ? '加载中…' : error && !data ? '加载失败' : `共 ${formatNumber(data?.total ?? 0)} 条`}
          </span>
        }
      >
        {loading ? (
          <MonitorSkeletonRows rows={5} />
        ) : !data || data.items.length === 0 ? (
          error ? null : (
            <MonitorEmpty
              title="没有匹配的反馈"
              description="调整状态或关键词，或等待用户在 App / 小程序内提交反馈。"
            />
          )
        ) : (
          <>
            <ul className="divide-y divide-slate-100">
              {data.items.map((item) => {
                const images = (item.images ?? []).map((src) => resolveFileUrl(src));
                const updating = updatingId === item.id;

                return (
                  <li key={item.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <FeedbackStatusBadge status={item.status} />
                        <span className="font-data text-[11px] text-slate-400">
                          {formatDateTime(item.createdAt)}
                        </span>
                        {item.updatedAt !== item.createdAt && (
                          <span className="font-data text-[11px] text-slate-400">
                            · 更新于 {formatDateTime(item.updatedAt)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {updating && (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-400" />
                        )}
                        <select
                          value={item.status}
                          disabled={updating}
                          onChange={(event) =>
                            void updateStatus(item, event.target.value as FeedbackStatus)
                          }
                          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[12px] text-slate-600 outline-none transition-colors focus:border-[#0062FF] disabled:opacity-50"
                        >
                          {STATUS_VALUES.map((value) => (
                            <option key={value} value={value}>
                              {feedbackStatusLabel(value)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <p className="mt-2.5 whitespace-pre-wrap break-words text-[13px] leading-6 text-slate-800">
                      {item.content}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-slate-400">
                      <span>
                        {item.userName || '匿名用户'}
                        {item.userPhone ? ` · ${item.userPhone}` : ''}
                      </span>
                      {item.contact && <span>联系方式：{item.contact}</span>}
                      <span className="font-data">ID: {item.id}</span>
                    </div>

                    {images.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {images.map((src, index) => (
                          <a
                            key={`${item.id}-${index}`}
                            href={src}
                            target="_blank"
                            rel="noreferrer"
                            className="block overflow-hidden rounded-lg border border-slate-200"
                          >
                            <img
                              src={src}
                              alt={`反馈图片 ${index + 1}`}
                              loading="lazy"
                              className="h-16 w-16 object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            <MonitorPagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              onChange={setPage}
              disabled={refreshing || Boolean(updatingId)}
            />
          </>
        )}
      </SectionCard>
    </MonitorPage>
  );
}