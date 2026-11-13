import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Save, Send, Webhook } from 'lucide-react';
import {
  MonitorEmpty,
  MonitorErrorBanner,
  SectionCard,
  SeverityBadge,
  formatDateTime,
  formatNumber,
  severityLabel,
} from './MonitorUI';
import { getApiErrorMessage, monitorGet, monitorPost, monitorPut } from '../api';
import type { AlertConfig, AlertEvent, AlertTestResult } from '../types';
import { cn } from '@/lib/utils';

const SEVERITY_VALUES = ['critical', 'major', 'minor', 'info'];

interface AlertForm {
  enabled: boolean;
  severities: string[];
  threshold: number;
  window_minutes: number;
  silence_minutes: number;
  webhook_url: string;
}

const EMPTY_FORM: AlertForm = {
  enabled: true,
  severities: ['critical', 'major'],
  threshold: 3,
  window_minutes: 10,
  silence_minutes: 30,
  webhook_url: '',
};

function toForm(config: AlertConfig): AlertForm {
  return {
    enabled: config.enabled,
    severities: config.severities
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    threshold: config.threshold,
    window_minutes: config.window_minutes,
    silence_minutes: config.silence_minutes,
    webhook_url: config.webhook_url ?? '',
  };
}

const NUMBER_FIELDS: Array<{
  key: 'threshold' | 'window_minutes' | 'silence_minutes';
  label: string;
  hint: string;
  min: number;
  max: number;
}> = [
  { key: 'threshold', label: '触发阈值（次）', hint: '窗口内同一错误达到该次数触发', min: 1, max: 1000 },
  { key: 'window_minutes', label: '统计窗口（分钟）', hint: '只统计最近该时间段内的错误', min: 1, max: 1440 },
  { key: 'silence_minutes', label: '静默窗口（分钟）', hint: '同一错误告警后在该时长内不再重复发送', min: 0, max: 1440 },
];

export default function AlertConfigPanel() {
  const [form, setForm] = useState<AlertForm>(EMPTY_FORM);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [config, alertEvents] = await Promise.all([
        monitorGet<AlertConfig>('/monitor/alert-config'),
        monitorGet<AlertEvent[]>('/monitor/alert-events', { limit: 10 }),
      ]);
      setForm(toForm(config));
      setEvents(alertEvents);
      setLoaded(true);
    } catch (err) {
      // 加载失败时隐藏表单，避免把默认值误当成服务端配置保存回去
      setLoaded(false);
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patchForm = (patch: Partial<AlertForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setNotice('');
  };

  const toggleSeverity = (severity: string) => {
    setForm((prev) => ({
      ...prev,
      severities: prev.severities.includes(severity)
        ? prev.severities.filter((item) => item !== severity)
        : [...prev.severities, severity],
    }));
    setNotice('');
  };

  const save = async () => {
    if (form.severities.length === 0) {
      setActionError('请至少选择一个需要告警的严重程度');
      return;
    }
    setSaving(true);
    setActionError('');
    setNotice('');
    try {
      const config = await monitorPut<AlertConfig>('/monitor/alert-config', {
        enabled: form.enabled,
        severities: form.severities,
        threshold: form.threshold,
        window_minutes: form.window_minutes,
        silence_minutes: form.silence_minutes,
        webhook_url: form.webhook_url.trim(),
      });
      setForm(toForm(config));
      setNotice('配置已保存');
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    setActionError('');
    setNotice('');
    try {
      const result = await monitorPost<AlertTestResult>('/monitor/alert-config/test');
      if (result.success) {
        setNotice(`测试消息已发送（${result.duration_ms} ms）`);
      } else {
        setActionError(`测试消息发送失败：${result.response}`);
      }
      const alertEvents = await monitorGet<AlertEvent[]>('/monitor/alert-events', {
        limit: 10,
      });
      setEvents(alertEvents);
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <SectionCard
        title="告警规则"
        extra={
          <button
            type="button"
            onClick={load}
            disabled={loading}
            title="刷新"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </button>
        }
      >
        <div className="space-y-5 px-5 py-5">
          {error && <MonitorErrorBanner message={error} onRetry={load} />}
          {!loaded && loading && (
            <p className="py-6 text-center text-[12px] text-slate-400">正在加载告警配置…</p>
          )}
          {!loaded && !loading && !error && (
            <p className="py-6 text-center text-[12px] text-slate-400">暂无告警配置</p>
          )}
          {loaded && (
            <>
          {actionError && (
            <MonitorErrorBanner message={actionError} onRetry={() => setActionError('')} />
          )}
          {notice && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-[12px] text-emerald-600">
              {notice}
            </div>
          )}

          <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              checked={form.enabled}
              disabled={loading}
              onChange={(event) => patchForm({ enabled: event.target.checked })}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#0062FF]"
            />
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-slate-800">启用错误告警</span>
              <span className="mt-0.5 block text-[12px] leading-5 text-slate-500">
                关闭后仍会记录错误与超时，但不再匹配规则、也不再向 Webhook 推送消息。
              </span>
            </span>
          </label>

          <div>
            <p className="text-[12px] font-medium text-slate-600">告警级别</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SEVERITY_VALUES.map((severity) => {
                const checked = form.severities.includes(severity);
                return (
                  <button
                    key={severity}
                    type="button"
                    disabled={loading}
                    onClick={() => toggleSeverity(severity)}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-[12px] transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                      checked
                        ? 'border-[#0062FF] bg-[#0062FF]/5 text-[#0062FF]'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50',
                    )}
                  >
                    {severityLabel(severity)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {NUMBER_FIELDS.map((field) => (
              <label key={field.key} className="block">
                <span className="text-[12px] font-medium text-slate-600">{field.label}</span>
                <input
                  type="number"
                  min={field.min}
                  max={field.max}
                  value={form[field.key]}
                  disabled={loading}
                  onChange={(event) => {
                    const parsed = Number(event.target.value);
                    patchForm({
                      [field.key]: Number.isFinite(parsed) ? parsed : field.min,
                    });
                  }}
                  className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none transition-colors focus:border-[#0062FF]"
                />
                <span className="mt-1 block text-[11px] leading-5 text-slate-400">
                  {field.hint}
                </span>
              </label>
            ))}
          </div>

          <label className="block">
            <span className="flex items-center gap-1.5 text-[12px] font-medium text-slate-600">
              <Webhook className="h-3.5 w-3.5 text-slate-400" />
              飞书群机器人 Webhook
            </span>
            <input
              type="url"
              value={form.webhook_url}
              disabled={loading}
              onChange={(event) => patchForm({ webhook_url: event.target.value })}
              placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
              className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-data text-[12px] text-slate-700 outline-none transition-colors placeholder:text-slate-300 focus:border-[#0062FF]"
            />
            <span className="mt-1 block text-[11px] leading-5 text-slate-400">
              以飞书文本消息格式发送，留空则只记录告警事件不推送；修改后需先保存再发送测试。
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={save}
              disabled={saving || loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0062FF] px-3 py-2 text-[12px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              保存配置
            </button>
            <button
              type="button"
              onClick={sendTest}
              disabled={testing || saving || loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              {testing ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              发送测试消息
            </button>
          </div>
            </>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="最近告警"
        extra={
          <span className="font-data text-[11px] text-slate-400">
            {loading ? '加载中…' : `最近 ${formatNumber(events.length)} 条`}
          </span>
        }
      >
        {!loading && events.length === 0 ? (
          <MonitorEmpty
            title="暂无告警记录"
            description="配置 Webhook 并保存后，窗口内错误次数达到阈值时会自动推送并在此留痕。"
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {events.map((event) => (
              <li key={event.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
                        event.success
                          ? 'border-emerald-100 bg-emerald-50 text-emerald-600'
                          : 'border-red-100 bg-red-50 text-red-600',
                      )}
                    >
                      {event.success ? '发送成功' : '发送失败'}
                    </span>
                    <SeverityBadge severity={event.severity} />
                    <span className="text-[13px] font-medium text-slate-800">
                      {event.error_type}
                    </span>
                    <span className="font-data text-[11px] text-slate-400">
                      {event.count} 次 · {event.channel}
                    </span>
                  </div>
                  <span className="font-data text-[11px] text-slate-400">
                    {formatDateTime(event.created_at)}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 break-words text-[12px] leading-5 text-slate-600">
                  {event.message}
                </p>
                {event.response && (
                  <p className="mt-1 line-clamp-2 break-all font-data text-[11px] text-slate-400">
                    {event.response}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </>
  );
}