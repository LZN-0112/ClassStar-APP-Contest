import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Download,
  FileSpreadsheet,
  Loader2,
  Receipt,
  Wallet,
} from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { toast } from 'sonner';

type LedgerType = 'class' | 'league';

interface FeeRecordItem {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  remark?: string | null;
  createTime?: string;
}

interface MonthPoint {
  label: string;
  income: number;
  expense: number;
}

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function splitRemark(remark?: string | null) {
  const text = (remark || '').trim();
  const matched = text.match(/^【(.+?)】([\s\S]*)$/);
  if (matched) return { category: matched[1], note: matched[2].trim() };
  return { category: '', note: text };
}

function shortDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export default function FinanceReport() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useCurrentUser();
  const classId = user?.classId;
  // 班费账目仅班委可见，与后端 /fee/list、/fee/export 权限保持一致
  const canManage =
    user?.roleLevel === 'owner' || user?.roleLevel === 'admin';
  const initialType = (location.state as { type?: LedgerType } | null)?.type || 'class';

  const [ledgerType, setLedgerType] = useState<LedgerType>(initialType);
  const [records, setRecords] = useState<FeeRecordItem[]>([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });
  const [monthly, setMonthly] = useState<MonthPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const isLeague = ledgerType === 'league';
  const feeType = isLeague ? 'group' : 'class';

  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        label: `${date.getMonth() + 1}月`,
      };
    });
  }, []);

  useEffect(() => {
    if (!classId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    Promise.all([
      api.get('/fee/list', { params: { classId, feeType, pageNum: 1, pageSize: 100 } }),
      ...months.map((item) =>
        api.get('/fee/month-stat', {
          params: { classId, feeType, year: item.year, month: item.month },
        }),
      ),
    ])
      .then(([listRes, ...statResList]) => {
        if (cancelled) return;
        const listData = listRes.data?.data ?? listRes.data;
        setRecords((listData?.list || []) as FeeRecordItem[]);
        setSummary(listData?.summary || { income: 0, expense: 0, balance: 0 });

        const points = statResList.map((res, index) => {
          const stat = res.data?.data ?? res.data;
          return {
            label: months[index].label,
            income: Number(stat?.income || 0),
            expense: Number(stat?.expense || 0),
          };
        });
        setMonthly(points);
      })
      .catch((error: any) => {
        if (!cancelled) toast.error(error?.message || '获取财务数据失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [classId, feeType, months]);

  const maxValue = useMemo(
    () => Math.max(1, ...monthly.flatMap((m) => [m.income, m.expense])),
    [monthly],
  );

  const handleExport = async () => {
    if (!classId || exporting) return;
    setExporting(true);
    try {
      const res = await api.get('/fee/export', { params: { classId, feeType } });
      const data = res.data?.data ?? res.data;
      if (!data?.downloadUrl) throw new Error('导出失败');
      const anchor = document.createElement('a');
      anchor.href = data.downloadUrl;
      anchor.download = `${isLeague ? '团费' : '班费'}收支明细.xlsx`;
      anchor.target = '_blank';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      toast.success(`已导出 ${data.total || 0} 条记录`);
    } catch (err: any) {
      toast.error(err?.message || '导出失败，请稍后再试');
    } finally {
      setExporting(false);
    }
  };

  const recentRecords = records.slice(0, 10);

  if (!canManage) {
    return (
      <PageLayout title={isLeague ? '团费收支报表' : '班费收支报表'} variant="a">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16">
          <FileSpreadsheet className="h-10 w-10 text-[#CBD5E1]" strokeWidth={1.5} />
          <div className="text-[14px] font-body text-[#64748B]">仅班委可查看收支报表</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={isLeague ? '团费收支报表' : '班费收支报表'}
      variant="a"
      decor={<FileSpreadsheet className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}
      right={
        <button
          type="button"
          disabled={exporting}
          onClick={handleExport}
          className="flex h-9 items-center gap-1.5 rounded-full bg-white/20 px-3.5 text-[12px] font-body font-semibold text-white active:opacity-80 disabled:opacity-60"
        >
          {exporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" strokeWidth={2} />
          )}
          导出 Excel
        </button>
      }
    >
      <div className="flex w-full flex-1 flex-col gap-4">
        {/* 班费/团费切换 */}
        <div className="flex w-full gap-2">
          {[
            { value: 'class' as LedgerType, label: '班费' },
            { value: 'league' as LedgerType, label: '团费' },
          ].map((tab) => {
            const active = ledgerType === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setLedgerType(tab.value)}
                className={`flex h-9 flex-1 items-center justify-center rounded-full text-[14px] font-body font-semibold transition-colors ${
                  active ? 'bg-[#0062FF] text-white shadow-soft' : 'bg-[#F1F5F9] text-[#64748B]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 汇总 */}
        <div className="flex w-full gap-2">
          {[
            { label: '总收入', value: summary.income, color: '#16A34A' },
            { label: '总支出', value: summary.expense, color: '#DC2626' },
            { label: '结余', value: summary.balance, color: '#004ECC' },
          ].map((item) => (
            <div
              key={item.label}
              className="flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl bg-white px-2 py-4 shadow-soft"
            >
              <div
                className="w-full truncate text-center font-data text-[20px] font-bold"
                style={{ color: item.color }}
              >
                ¥{formatMoney(item.value)}
              </div>
              <div className="text-[11px] font-body font-semibold text-[#64748B]">
                {item.label}
              </div>
            </div>
          ))}
        </div>

        {/* 月度趋势 */}
        <div className="w-full rounded-2xl bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <div className="text-[14px] font-body font-bold text-[#1A1A1A]">近 6 个月收支</div>
            <div className="flex items-center gap-3 text-[10px] font-caption text-[#94A3B8]">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#004ECC]" />
                收入
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#93B4FF]" />
                支出
              </span>
            </div>
          </div>

          {loading ? (
            <div className="mt-4 h-[140px] animate-pulse rounded-xl bg-[#E9EEF5]" />
          ) : (
            <div className="mt-4 flex h-[150px] w-full flex-col">
              <div className="flex flex-1 items-end justify-between gap-1.5">
                {monthly.map((point) => (
                  <div key={point.label} className="flex h-full flex-1 flex-col items-center justify-end">
                    <div className="flex h-full w-full items-end justify-center gap-1">
                      <div
                        className="w-[10px] rounded-t-[4px] bg-[#004ECC]"
                        style={{ height: `${Math.max((point.income / maxValue) * 100, 2)}%` }}
                      />
                      <div
                        className="w-[10px] rounded-t-[4px] bg-[#93B4FF]"
                        style={{ height: `${Math.max((point.expense / maxValue) * 100, 2)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex w-full justify-between gap-1.5">
                {monthly.map((point) => (
                  <div
                    key={point.label}
                    className="flex-1 text-center text-[10px] font-caption text-[#94A3B8]"
                  >
                    {point.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 收支明细 */}
        <div className="flex w-full flex-col gap-2">
          <div className="flex items-center justify-between px-0.5">
            <div className="text-[12px] font-body font-semibold text-[#6B7280]">
              最近收支
            </div>
            {records.length > 10 && (
              <button
                type="button"
                onClick={() => navigate('/fee-ledger', { state: { type: ledgerType } })}
                className="flex items-center gap-0.5 text-[11px] font-body font-semibold text-[#0062FF]"
              >
                查看全部
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {loading ? (
            <div className="h-16 w-full animate-pulse rounded-xl bg-[#E9EEF5]" />
          ) : recentRecords.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl bg-white py-10 shadow-soft">
              <Receipt className="h-8 w-8 text-[#CBD5E1]" strokeWidth={1.5} />
              <div className="text-[12px] font-body text-[#64748B]">暂无收支记录</div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl bg-white shadow-soft">
              {recentRecords.map((item, index) => {
                const isIncome = item.type === 'income';
                const { category, note } = splitRemark(item.remark);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate('/fee-ledger', { state: { type: ledgerType } })}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left active:bg-[#F8FAFC] ${
                      index === recentRecords.length - 1 ? '' : 'border-b border-[#F1F5F9]'
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        isIncome ? 'bg-[#ECFDF5]' : 'bg-[#FEF2F2]'
                      }`}
                    >
                      {isIncome ? (
                        <Wallet className="h-[18px] w-[18px] text-[#16A34A]" strokeWidth={2} />
                      ) : (
                        <Receipt className="h-[18px] w-[18px] text-[#DC2626]" strokeWidth={2} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-body font-semibold text-[#1A1A1A]">
                        {category || (isIncome ? '班费收入' : '班费支出')}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] font-caption text-[#94A3B8]">
                        {shortDate(item.createTime)}
                        {note && ` · ${note}`}
                      </div>
                    </div>
                    <div
                      className={`shrink-0 font-data text-[14px] font-semibold ${
                        isIncome ? 'text-[#16A34A]' : 'text-[#DC2626]'
                      }`}
                    >
                      {isIncome ? '+' : '-'}¥{formatMoney(item.amount)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="pb-1 text-center text-[10px] font-caption text-[#94A3B8]">
          报表数据实时统计自本账本，导出为 Excel 表格
        </div>
      </div>
    </PageLayout>
  );
}
