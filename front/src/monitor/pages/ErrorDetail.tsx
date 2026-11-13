import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bug, RefreshCw } from 'lucide-react';
import MonitorPage, { MonitorSkeletonRows } from '../MonitorPage';
import {
  GROUP_STATUS_OPTIONS,
  GroupStatusBadge,
  MonitorEmpty,
  MonitorErrorBanner,
  SectionCard,
  SeverityBadge,
  StreamBadge,
  formatDateTime,
  formatDuration,
  formatNumber,
  sourceLabel,
} from '../components/MonitorUI';
import { useMonitorQuery } from '../hooks/useMonitorQuery';
import { useLiveRefresh } from '../hooks/useMonitorStream';
import { getApiErrorMessage, monitorGet, monitorPut } from '../api';
import type { ErrorGroupDetail, ErrorSolution, GroupStatus } from '../types';
import { cn } from '@/lib/utils';

const FIELD_CLASS =
  'mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] text-slate-700 outline-none transition-colors focus:border-[#0062FF]';

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-slate-400">{label}</dt>
      <dd className="mt-1 truncate font-data text-[12px] text-slate-600">{value}</dd>
    </div>
  );
}

function HandlingCard({
  group,
  onSaved,
}: {
  group: ErrorGroupDetail;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<GroupStatus>(group.status ?? 'pending');
  const [note, setNote] = useState(group.note ?? '');
  const [solutionId, setSolutionId] = useState(group.solution_id ?? '');
  const [solutions, setSolutions] = useState<ErrorSolution[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveError, setSaveError] = useState('');

  // 实时刷新会带来新的 group：未编辑时同步服务端最新值，编辑中则不覆盖本地输入
  useEffect(() => {
    const serverStatus = group.status ?? 'pending';
    const serverNote = group.note ?? '';
    const serverSolutionId = group.solution_id ?? '';
    if (!dirty) {
      setStatus(serverStatus);
      setNote(serverNote);
      setSolutionId(serverSolutionId);
      return;
    }
    // 服务端数据已追平本地输入（保存成功）时退出编辑态
    if (
      serverStatus === status &&
      serverNote === note &&
      serverSolutionId === solutionId
    ) {
      setDirty(false);
    }
  }, [group.status, group.note, group.solution_id, dirty, status, note, solutionId]);

  useEffect(() => {
    let cancelled = false;
    monitorGet<ErrorSolution[]>('/errors/solutions')
      .then((items) => {
        if (!cancelled) setSolutions(items);
      })
      .catch(() => {
        if (!cancelled) setSolutions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const linked = group.error_solutions ?? null;
  // 接口只返回启用中的方案；已停用的关联方案不放进下拉，避免选中后被后端拒绝
  const linkedInactive = Boolean(linked && linked.is_active === false);
  const options =
    linked && !linkedInactive && !solutions.some((item) => item.id === linked.id)
      ? [linked, ...solutions]
      : solutions;
  const selectableSolutionId = options.some((item) => item.id === solutionId)
    ? solutionId
    : '';
  const selectedSolution = options.find((item) => item.id === selectableSolutionId);

  const markDirty = () => {
    setSaved(false);
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await monitorPut(`/errors/groups/${group.id}/status`, {
        status,
        note,
        solution_id: selectableSolutionId || null,
      });
      setSaved(true);
      onSaved();
    } catch (err) {
      setSaveError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="处理闭环"
      extra={<GroupStatusBadge status={group.status} />}
    >
      <div className="space-y-4 px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="text-[11px] text-slate-400">处理状态</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as GroupStatus);
                markDirty();
              }}
              className={FIELD_CLASS}
            >
              {GROUP_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-400">处理人</p>
            <p className="mt-1 truncate font-data text-[12px] text-slate-600">
              {group.handled_by_name || (group.handled_by ? '账号已删除' : '—')}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-400">处理时间</p>
            <p className="mt-1 truncate font-data text-[12px] text-slate-600">
              {formatDateTime(group.handled_at)}
            </p>
          </div>
        </div>

        <label className="block">
          <span className="flex items-center justify-between text-[11px] text-slate-400">
            <span>处理备注</span>
            <span className="font-data">{note.length}/2000</span>
          </span>
          <textarea
            value={note}
            rows={3}
            maxLength={2000}
            placeholder="记录排查结论、修复计划或规避方案"
            onChange={(event) => {
              setNote(event.target.value);
              markDirty();
            }}
            className="mt-1 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] leading-5 text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-[#0062FF]"
          />
        </label>

        <label className="block">
          <span className="text-[11px] text-slate-400">关联解决方案</span>
          <select
            value={selectableSolutionId}
            onChange={(event) => {
              setSolutionId(event.target.value);
              markDirty();
            }}
            className={FIELD_CLASS}
          >
            <option value="">不关联</option>
            {options.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} · {item.error_type}
              </option>
            ))}
          </select>
        </label>

        {linkedInactive && linked && !selectableSolutionId && (
          <p className="text-[12px] text-amber-600">
            当前关联的解决方案「{linked.title}」已停用，保存时会自动解除关联。
          </p>
        )}

        {selectedSolution && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[12px] font-medium text-slate-700">{selectedSolution.title}</p>
            {selectedSolution.description && (
              <p className="mt-1 text-[12px] leading-5 text-slate-500">
                {selectedSolution.description}
              </p>
            )}
            {selectedSolution.steps && (
              <pre className="mt-2 whitespace-pre-wrap break-words font-data text-[11px] leading-5 text-slate-600">
                {selectedSolution.steps}
              </pre>
            )}
          </div>
        )}

        {saveError && <p className="text-[12px] text-red-500">{saveError}</p>}

        <div className="flex items-center justify-end gap-2">
          {saved && <span className="text-[12px] text-emerald-600">已保存</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-[#0062FF] px-3 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? '保存中…' : '保存处理结果'}
          </button>
        </div>
      </div>
    </SectionCard>
  );
}

export default function ErrorDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const { data, loading, refreshing, error, reload, refresh } = useMonitorQuery(
    () => monitorGet<ErrorGroupDetail>(`/errors/groups/${groupId}`),
    [groupId],
  );
  const { status } = useLiveRefresh(refresh);

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/monitor/errors');
  };

  return (
    <MonitorPage
      title="错误详情"
      description="单个错误分组的聚合信息与最近上报记录。"
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
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            返回错误流
          </button>
        </div>
      }
    >
      {error && <MonitorErrorBanner message={error} onRetry={reload} />}

      {loading ? (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
            <div className="mt-4 h-3 w-2/3 animate-pulse rounded bg-slate-50" />
            <div className="mt-6 h-16 animate-pulse rounded bg-slate-50" />
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <MonitorSkeletonRows rows={5} />
          </div>
        </>
      ) : data ? (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-2.5">
                <SeverityBadge severity={data.severity} />
                <div className="min-w-0">
                  <p className="break-all font-data text-[11px] uppercase tracking-[0.12em] text-slate-400">
                    {data.error_type}
                  </p>
                  <p className="mt-1.5 break-words text-[15px] leading-6 text-slate-800">
                    {data.message}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-6">
                <div>
                  <p className="text-[11px] text-slate-400">累计次数</p>
                  <p className="mt-1 font-data text-[20px] font-semibold leading-none text-slate-800">
                    {formatNumber(data.occurrence_count)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">最近出现</p>
                  <p className="mt-1 font-data text-[12px] text-slate-600">
                    {formatDateTime(data.last_seen_at)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">首次出现</p>
                  <p className="mt-1 font-data text-[12px] text-slate-600">
                    {formatDateTime(data.first_seen_at)}
                  </p>
                </div>
              </div>
            </div>

            <dl className="mt-5 grid gap-x-6 gap-y-3 border-t border-slate-100 pt-4 sm:grid-cols-2 xl:grid-cols-3">
              <MetaItem label="Group ID" value={data.id} />
              <MetaItem label="Fingerprint" value={data.fingerprint} />
              <MetaItem label="来源" value={sourceLabel(data.source)} />
              <MetaItem label="路由" value={data.route || '—'} />
              <MetaItem label="页面路径" value={data.page_path || '—'} />
              <MetaItem label="最近上报" value={`${formatNumber(data.logs.length)} 条`} />
            </dl>
          </div>

          <HandlingCard key={data.id} group={data} onSaved={refresh} />

          <SectionCard
            title="最近上报记录"
            extra={
              <span className="flex items-center gap-1.5 font-data text-[11px] text-slate-400">
                <Bug className="h-3.5 w-3.5" />
                最近 {data.logs.length} 条
              </span>
            }
          >
            {data.logs.length === 0 ? (
              <MonitorEmpty title="暂无上报记录" description="该分组尚未关联到明细日志。" />
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.logs.map((log) => (
                  <li key={log.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      <span className="font-data text-slate-500">
                        {formatDateTime(log.created_at)}
                      </span>
                      <SeverityBadge severity={log.severity} />
                      {log.status_code ? (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-data text-slate-500">
                          HTTP {log.status_code}
                        </span>
                      ) : null}
                      {log.duration_ms !== null && log.duration_ms !== undefined ? (
                        <span className="font-data">{formatDuration(log.duration_ms)}</span>
                      ) : null}
                      <span className="ml-auto max-w-[46%] truncate font-data">
                        trace: {log.trace_id || '—'}
                      </span>
                    </div>

                    <p className="mt-2 break-words text-[13px] leading-6 text-slate-800">
                      {log.message}
                    </p>

                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-data text-[11px] text-slate-400">
                      <span>{sourceLabel(log.source)}</span>
                      <span>{log.route || '—'}</span>
                      <span>{log.page_path || '—'}</span>
                      {log.app_version && <span>v{log.app_version}</span>}
                    </div>

                    {log.stack_trace && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-[11px] text-[#0062FF]">
                          查看堆栈
                        </summary>
                        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-900 p-3 text-[11px] leading-5 text-slate-200">
                          {log.stack_trace}
                        </pre>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </>
      ) : null}
    </MonitorPage>
  );
}