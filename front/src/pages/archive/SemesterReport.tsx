import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  BookOpen,
  CalendarDays,
  Copy,
  FileText,
  RefreshCw,
  Users,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';
import { saveBlobFile } from '@/lib/save-file';

interface SemesterReportData {
  period: { startTime: string; endTime: string };
  memberCount: number;
  attendance: { totalSessions: number; expected: number; present: number; rate: number };
  homework: { totalHomeworks: number; expected: number; submitted: number; rate: number };
  activity: { totalActivities: number; expected: number; participated: number; rate: number };
  fee: { income: number; expense: number; balance: number };
}

function formatPercent(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}%`;
}

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

interface ReportMetric {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  accent: string;
}

export default function SemesterReport() {
  const { user } = useCurrentUser();
  const classId = user?.classId;
  const [data, setData] = useState<SemesterReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!classId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFailed(false);

    api
      .get('/data/semester-report', { params: { classId } })
      .then((res) => {
        if (cancelled) return;
        setData((res.data?.data || res.data) as SemesterReportData);
      })
      .catch(() => {
        if (cancelled) return;
        setData(null);
        setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [classId, reloadKey]);

  const metrics = useMemo<ReportMetric[]>(() => {
    if (!data) return [];
    return [
      {
        icon: CalendarDays,
        label: '考勤签到',
        value: data.attendance.totalSessions > 0 ? formatPercent(data.attendance.rate) : '—',
        detail: `${data.attendance.totalSessions} 次签到 · ${data.attendance.present}/${data.attendance.expected} 人次`,
        accent: '#0062FF',
      },
      {
        icon: BookOpen,
        label: '作业提交',
        value: data.homework.totalHomeworks > 0 ? formatPercent(data.homework.rate) : '—',
        detail: `${data.homework.totalHomeworks} 次作业 · ${data.homework.submitted}/${data.homework.expected} 份`,
        accent: '#F97316',
      },
      {
        icon: Users,
        label: '活动参与',
        value: data.activity.totalActivities > 0 ? formatPercent(data.activity.rate) : '—',
        detail: `${data.activity.totalActivities} 场活动 · ${data.activity.participated}/${data.activity.expected} 人次`,
        accent: '#7C3AED',
      },
      {
        icon: Wallet,
        label: '班费结余',
        value: `¥${formatMoney(data.fee.balance)}`,
        detail: `收入 ¥${formatMoney(data.fee.income)} · 支出 ¥${formatMoney(data.fee.expense)}`,
        accent: '#2F9E86',
      },
    ];
  }, [data]);

  const summaryLines = useMemo(() => {
    if (!data) return [];
    return [
      `本周期共组织 ${data.attendance.totalSessions} 次签到，${data.attendance.present}/${data.attendance.expected} 人次完成签到，平均出勤率 ${formatPercent(data.attendance.rate)}。`,
      `发布作业 ${data.homework.totalHomeworks} 次，累计提交 ${data.homework.submitted}/${data.homework.expected} 份，提交率 ${formatPercent(data.homework.rate)}。`,
      `举办活动 ${data.activity.totalActivities} 场，累计 ${data.activity.participated}/${data.activity.expected} 人次参与，参与率 ${formatPercent(data.activity.rate)}。`,
      `班费收入 ¥${formatMoney(data.fee.income)}，支出 ¥${formatMoney(data.fee.expense)}，当前结余 ¥${formatMoney(data.fee.balance)}。`,
    ];
  }, [data]);

  const summaryText = useMemo(() => {
    if (!data) return '';
    return [
      `${user?.className || '班级'}学期工作总结`,
      `统计周期：${data.period.startTime} 至 ${data.period.endTime}（${data.memberCount} 名成员）`,
      '',
      ...summaryLines,
    ].join('\n');
  }, [data, summaryLines, user?.className]);

  const handleCopy = async () => {
    if (!summaryText) return;
    try {
      await navigator.clipboard.writeText(summaryText);
      toast.success('总结已复制，可粘贴到文档中继续编辑');
    } catch {
      toast.error('复制失败，请长按文字手动复制');
    }
  };

  const handleExport = async () => {
    if (!data || exporting) return;
    setExporting(true);
    try {
      const rows: string[][] = [
        ['项目', '数值', '说明'],
        ['统计周期', `${data.period.startTime} 至 ${data.period.endTime}`, ''],
        ['班级人数', String(data.memberCount), ''],
        ['考勤签到率', formatPercent(data.attendance.rate), `${data.attendance.totalSessions} 次签到，${data.attendance.present}/${data.attendance.expected} 人次`],
        ['作业提交率', formatPercent(data.homework.rate), `${data.homework.totalHomeworks} 次作业，${data.homework.submitted}/${data.homework.expected} 份`],
        ['活动参与率', formatPercent(data.activity.rate), `${data.activity.totalActivities} 场活动，${data.activity.participated}/${data.activity.expected} 人次`],
        ['班费收入', `¥${formatMoney(data.fee.income)}`, ''],
        ['班费支出', `¥${formatMoney(data.fee.expense)}`, ''],
        ['班费结余', `¥${formatMoney(data.fee.balance)}`, ''],
      ];
      const csv = '\uFEFF' + rows
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const fileName = `学期报表_${user?.className || '班级'}_${data.period.endTime}.csv`;
      const result = await saveBlobFile(fileName, blob, 'text/csv');
      if (!result.ok) {
        toast.error('导出失败，请稍后重试');
        return;
      }
      toast.success(result.path ? `已导出到：${result.path}` : '已导出 CSV 文件');
    } catch {
      toast.error('导出失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  };

  const hasAnyRecord = data
    ? data.attendance.totalSessions > 0 ||
      data.homework.totalHomeworks > 0 ||
      data.activity.totalActivities > 0 ||
      data.fee.income > 0 ||
      data.fee.expense > 0
    : false;

  return (
    <PageLayout
      title="学期报表"
      variant="b"
      right={
        <button
          type="button"
          onClick={handleExport}
          disabled={!data || exporting}
          className="flex h-8 items-center gap-1 rounded-lg border border-white/40 bg-white/20 px-2.5 font-body text-[11px] font-medium text-white transition-opacity active:opacity-70 disabled:opacity-40"
        >
          <FileText className="h-3.5 w-3.5" strokeWidth={2} />
          {exporting ? '导出中…' : '导出'}
        </button>
      }
      decor={<FileText className="h-[112px] w-[112px] text-white" strokeWidth={1.5} />}
    >
      {!classId ? (
        <div className="flex min-h-[420px] flex-col items-center justify-center gap-2 text-center">
          <div className="font-body text-[14px] font-semibold text-[#1E293B]">还没有加入班级</div>
          <div className="font-body text-[12px] text-[#94A3B8]">加入班级后可生成学期报表</div>
        </div>
      ) : loading ? (
        <div className="flex flex-col gap-3">
          <div className="h-[120px] animate-pulse rounded-2xl bg-[#F1F5F9]" />
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[110px] animate-pulse rounded-2xl bg-[#F1F5F9]" />
            ))}
          </div>
          <div className="h-[220px] animate-pulse rounded-2xl bg-[#F1F5F9]" />
        </div>
      ) : failed || !data ? (
        <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 text-center">
          <RefreshCw className="h-7 w-7 text-[#94A3B8]" strokeWidth={1.8} />
          <div className="font-body text-[14px] font-semibold text-[#1E293B]">报表加载失败</div>
          <div className="font-body text-[12px] text-[#94A3B8]">请检查网络后重试</div>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="mt-1 rounded-lg bg-[#0062FF] px-4 py-2 font-body text-[13px] font-semibold text-white"
          >
            重新加载
          </button>
        </div>
      ) : (
        <div className="flex w-full flex-col gap-3 pb-3">
          <div className="relative -mt-8 w-full rounded-2xl border border-[#EDF1F7] bg-white p-4 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.45)]">
            <div className="font-body text-[11px] text-[#64748B]">统计周期</div>
            <div className="mt-1 font-heading text-[18px] font-semibold text-[#0F172A]">
              {data.period.startTime} 至 {data.period.endTime}
            </div>
            <div className="mt-2 flex items-center gap-3 font-body text-[11px] text-[#64748B]">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" strokeWidth={1.8} />
                {data.memberCount} 名成员
              </span>
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.8} />
                近 180 天数据
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div
                  key={metric.label}
                  className="flex flex-col gap-2 rounded-2xl border border-[#EDF1F7] bg-white p-3.5 shadow-[0_6px_18px_-12px_rgba(15,23,42,0.25)]"
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${metric.accent}14` }}
                  >
                    <Icon className="h-4 w-4" style={{ color: metric.accent }} strokeWidth={2} />
                  </span>
                  <div>
                    <div className="font-body text-[11px] text-[#64748B]">{metric.label}</div>
                    <div className="mt-0.5 font-data text-[22px] font-bold leading-tight text-[#0F172A]">
                      {metric.value}
                    </div>
                  </div>
                  <div className="font-body text-[10px] leading-relaxed text-[#94A3B8]">
                    {metric.detail}
                  </div>
                </div>
              );
            })}
          </div>

          {!hasAnyRecord ? (
            <div className="rounded-xl border border-[#EDF1F7] bg-[#F8FAFC] p-4 text-center font-body text-[12px] text-[#64748B]">
              该周期内还没有签到、作业、活动或班费记录，完成相关操作后可生成更完整的报表。
            </div>
          ) : null}

          <div className="rounded-2xl border border-[#EDF1F7] bg-white p-4 shadow-[0_6px_18px_-12px_rgba(15,23,42,0.25)]">
            <div className="flex items-center justify-between">
              <span className="font-heading text-[15px] font-semibold text-[#0F172A]">自动生成的总结</span>
              <span className="rounded-full bg-[#EDF1FD] px-2 py-[2px] font-body text-[10px] font-semibold text-[#0062FF]">
                根据数据生成
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-2.5">
              {summaryLines.map((line, index) => (
                <div key={index} className="flex gap-2">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#0062FF]" />
                  <span className="font-body text-[12px] leading-relaxed text-[#334155]">{line}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl bg-[#F8FAFC] p-3 font-body text-[10px] leading-relaxed text-[#94A3B8]">
              总结内容可直接复制到评优材料、班级总结或家长会汇报中使用。
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleCopy}
              className="flex h-[46px] items-center justify-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white font-body text-[13px] font-semibold text-[#334155] active:bg-[#F8FAFC]"
            >
              <Copy className="h-4 w-4" strokeWidth={2} />
              复制总结
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="flex h-[46px] items-center justify-center gap-1.5 rounded-xl bg-[#0062FF] font-body text-[13px] font-semibold text-white shadow-[0_8px_20px_-10px_#0062FF99] active:opacity-80 disabled:opacity-60"
            >
              <FileText className="h-4 w-4" strokeWidth={2} />
              {exporting ? '导出中…' : '导出 CSV'}
            </button>
          </div>
          <div className="text-center font-body text-[10px] text-[#94A3B8]">
            如需 PDF，可复制总结后粘贴到文档中打印导出
          </div>
        </div>
      )}
    </PageLayout>
  );
}
