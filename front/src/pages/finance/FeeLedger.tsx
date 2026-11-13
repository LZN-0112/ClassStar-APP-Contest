import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronRight,
  Eye,
  EyeOff,
  FileBarChart,
  Paperclip,
  Plus,
  Receipt,
  RefreshCw,
  Target,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import PageLayout from '@/components/layout/PageLayout';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import BudgetModal from './BudgetModal';
import FeeRecordSheet, { FeeRecordDetail } from './FeeRecordSheet';

type FeeFilter = '全部' | '本月' | '上月';
type LedgerType = 'class' | 'league';

interface LedgerRecord extends FeeRecordDetail {
  amount: number;
  type: 'income' | 'expense';
}

interface BudgetInfo {
  budgetAmount: number;
  spentAmount: number;
  remainingAmount: number;
  usagePercent: number;
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

function recordTime(record: LedgerRecord) {
  return record.createTime || record.create_time || '';
}

function dayKey(value?: string) {
  if (!value) return 'unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

function dayLabel(key: string) {
  if (key === 'unknown') return '较早记录';
  const [year, month, day] = key.split('-').map(Number);
  const target = new Date(year, month - 1, day);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((startOfToday.getTime() - target.getTime()) / 86400000);
  const weekYmd = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  if (diff === 0) return `今天 · ${weekYmd[target.getDay()]}`;
  if (diff === 1) return `昨天 · ${weekYmd[target.getDay()]}`;
  return `${month}月${day}日 · ${weekYmd[target.getDay()]}`;
}

function clock(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export default function FeeLedger() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useCurrentUser();

  const initialType = (location.state as { type?: LedgerType } | null)?.type;
  const [ledgerType, setLedgerType] = useState<LedgerType>(initialType || 'class');
  const [filter, setFilter] = useState<FeeFilter>('全部');
  const [records, setRecords] = useState<LedgerRecord[]>([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });
  const [monthStat, setMonthStat] = useState<{
    income: number;
    expense: number;
    budget: BudgetInfo | null;
  }>({ income: 0, expense: 0, budget: null });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [activeRecord, setActiveRecord] = useState<LedgerRecord | null>(null);

  const isLeague = ledgerType === 'league';
  const feeType = isLeague ? 'group' : 'class';
  const classId = user?.classId;

  const canManage =
    user?.roleLevel === 'owner' || user?.roleLevel === 'admin';

  const now = new Date();
  const statYear = filter === '上月' ? new Date(now.getFullYear(), now.getMonth() - 1, 1).getFullYear() : now.getFullYear();
  const statMonth = filter === '上月' ? new Date(now.getFullYear(), now.getMonth() - 1, 1).getMonth() + 1 : now.getMonth() + 1;
  const monthTag = filter === '上月' ? '上月' : '本月';

  const fetchData = useCallback(async () => {
    if (!classId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      const [listRes, statRes] = await Promise.all([
        api.get('/fee/list', { params: { classId, feeType, pageNum: 1, pageSize: 100 } }),
        api.get('/fee/month-stat', {
          params: { classId, feeType, year: statYear, month: statMonth },
        }),
      ]);

      const listData = listRes.data?.data ?? listRes.data;
      setRecords((listData?.list || []) as LedgerRecord[]);
      setSummary(
        listData?.summary || { income: 0, expense: 0, balance: 0 },
      );

      const statData = statRes.data?.data ?? statRes.data;
      setMonthStat({
        income: Number(statData?.income || 0),
        expense: Number(statData?.expense || 0),
        budget: statData?.budget || null,
      });
    } catch (err: any) {
      setLoadError(true);
      toast.error(err?.message || '加载账本数据失败');
    } finally {
      setLoading(false);
    }
  }, [classId, feeType, statYear, statMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredRecords = useMemo(() => {
    if (filter === '全部') return records;
    return records.filter((item) => {
      const time = recordTime(item);
      if (!time) return false;
      const date = new Date(time);
      if (Number.isNaN(date.getTime())) return false;
      return date.getFullYear() === statYear && date.getMonth() + 1 === statMonth;
    });
  }, [filter, records, statYear, statMonth]);

  const groupedRecords = useMemo(() => {
    const groups = new Map<string, LedgerRecord[]>();
    filteredRecords.forEach((item) => {
      const key = dayKey(recordTime(item));
      const list = groups.get(key) || [];
      list.push(item);
      groups.set(key, list);
    });
    return Array.from(groups.entries());
  }, [filteredRecords]);

  const actions = useMemo(() => {
    type QuickAction = {
      label: string;
      icon: typeof Plus;
      color: string;
      bg: string;
      onClick: () => void;
    };
    const items: QuickAction[] = [];
    if (canManage) {
      items.push(
        {
          label: '记账',
          icon: Plus,
          color: '#0062FF',
          bg: '#EFF6FF',
          onClick: () => navigate(isLeague ? '/league-fee-record' : '/fee-record'),
        },
        {
          label: '缴费登记',
          icon: Receipt,
          color: '#16A34A',
          bg: '#ECFDF5',
          onClick: () => navigate(isLeague ? '/league-payment-register' : '/payment-register'),
        },
        {
          label: '预算',
          icon: Target,
          color: '#D97706',
          bg: '#FFF7ED',
          onClick: () => setBudgetModalOpen(true),
        },
        {
          label: '报表',
          icon: FileBarChart,
          color: '#7C3AED',
          bg: '#F5F3FF',
          onClick: () => navigate('/finance-report', { state: { type: ledgerType } }),
        },
      );
    }
    return items;
  }, [canManage, isLeague, ledgerType, navigate]);

  if (!classId) {
    return (
      <PageLayout title={isLeague ? '团费账本' : '班费账本'} variant="a">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16">
          <Wallet className="h-10 w-10 text-[#CBD5E1]" strokeWidth={1.5} />
          <div className="text-[14px] font-body text-[#64748B]">加入班级后可查看账本</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={isLeague ? '团费账本' : '班费账本'}
      variant="a"
      decor={<Wallet className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}
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
                onClick={() => {
                  setLedgerType(tab.value);
                  setFilter('全部');
                }}
                className={`flex h-9 flex-1 items-center justify-center rounded-full text-[14px] font-body font-semibold transition-colors ${
                  active ? 'bg-[#0062FF] text-white shadow-soft' : 'bg-[#F1F5F9] text-[#64748B]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 余额卡 */}
        <div className="relative w-full overflow-hidden rounded-2xl bg-[linear-gradient(-133.249deg,_#0062FF_25.619%,_#004ECC_74.381%)] p-5 shadow-[0_12px_28px_-14px_#0062FF]">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10" />
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[12px] font-body text-white/80">
                当前{isLeague ? '团费' : '班费'}余额
                <button
                  type="button"
                  aria-label={balanceVisible ? '隐藏余额' : '显示余额'}
                  onClick={() => setBalanceVisible((v) => !v)}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-white/70"
                >
                  {balanceVisible ? (
                    <Eye className="h-3.5 w-3.5" strokeWidth={2} />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" strokeWidth={2} />
                  )}
                </button>
              </div>
              <div className="mt-1.5 text-[34px]/[1.15] font-heading font-bold text-white">
                ¥{balanceVisible ? formatMoney(summary.balance) : '****'}
              </div>
            </div>
            <div className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-caption text-white/85">
              全部收支结余
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/12 px-3 py-2">
              <div className="text-[10px] font-caption text-white/70">{monthTag}收入</div>
              <div className="mt-0.5 text-[16px] font-heading font-bold text-white">
                +¥{formatMoney(monthStat.income)}
              </div>
            </div>
            <div className="rounded-xl bg-white/12 px-3 py-2">
              <div className="text-[10px] font-caption text-white/70">{monthTag}支出</div>
              <div className="mt-0.5 text-[16px] font-heading font-bold text-white">
                -¥{formatMoney(monthStat.expense)}
              </div>
            </div>
          </div>

          {monthStat.budget && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px] text-white/80">
                <span>学期预算 ¥{formatMoney(monthStat.budget.budgetAmount)}</span>
                <span>已用 {Number(monthStat.budget.usagePercent).toFixed(1)}%</span>
              </div>
              <div className="mt-1.5 h-2 w-full rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-all"
                  style={{ width: `${Math.min(Number(monthStat.budget.usagePercent), 100)}%` }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-white/70">
                <span>剩余 ¥{formatMoney(monthStat.budget.remainingAmount)}</span>
                </div>
            </div>
          )}
        </div>

        {/* 快捷操作 */}
        <div
          className="grid w-full gap-2 rounded-2xl bg-white p-3 shadow-soft"
          style={{ gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))` }}
        >
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className="flex flex-col items-center gap-1.5 rounded-xl py-2 transition-transform active:scale-95"
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: action.bg }}
                >
                  <Icon className="h-[20px] w-[20px]" style={{ color: action.color }} strokeWidth={2} />
                </span>
                <span className="text-[12px] font-body font-semibold text-[#1A1A1A]">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* 月份筛选 */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {(['全部', '本月', '上月'] as FeeFilter[]).map((tab) => {
              const active = filter === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={`flex h-8 items-center justify-center rounded-full px-4 text-[11px] font-body font-semibold ${
                    active ? 'bg-[#0062FF] text-white' : 'bg-[#F1F5F9] text-[#64748B]'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>
          <div className="text-[11px] font-caption text-[#94A3B8]">
            共 {filteredRecords.length} 笔
          </div>
        </div>

        {/* 收支明细 */}
        {loading ? (
          <div className="flex w-full flex-col gap-3">
            <div className="h-16 w-full animate-pulse rounded-xl bg-[#E9EEF5]" />
            <div className="h-16 w-full animate-pulse rounded-xl bg-[#E9EEF5]" />
            <div className="h-16 w-full animate-pulse rounded-xl bg-[#E9EEF5]" />
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center gap-3 rounded-xl bg-white py-10 shadow-soft">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FEF2F2]">
              <RefreshCw className="h-5 w-5 text-[#DC2626]" strokeWidth={2} />
            </div>
            <div className="text-[13px] font-body font-medium text-[#64748B]">账本加载失败</div>
            <button
              type="button"
              onClick={fetchData}
              className="rounded-full bg-[#0062FF] px-5 py-2 text-[12px] font-body font-semibold text-white"
            >
              重新加载
            </button>
          </div>
        ) : groupedRecords.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl bg-white py-12 shadow-soft">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EBF3FF]">
              <Receipt className="h-6 w-6 text-[#0062FF]" strokeWidth={1.8} />
            </div>
            <div className="text-center">
              <div className="text-[14px] font-body font-semibold text-[#1A1A1A]">
                {filter === '全部' ? '还没有收支记录' : `${monthTag}没有收支记录`}
              </div>
              <div className="mt-1 text-[11px] font-caption text-[#94A3B8]">
                {canManage ? '记录班费收支，全班都能看到' : '班委记账后会显示在这里'}
              </div>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={() => navigate(isLeague ? '/league-fee-record' : '/fee-record')}
                className="flex items-center gap-1 rounded-full bg-[#0062FF] px-5 py-2 text-[12px] font-body font-semibold text-white"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                记一笔
              </button>
            )}
          </div>
        ) : (
          <div className="flex w-full flex-col gap-3">
            {groupedRecords.map(([key, items]) => {
              const dayIncome = items
                .filter((i) => i.type === 'income')
                .reduce((sum, i) => sum + Number(i.amount || 0), 0);
              const dayExpense = items
                .filter((i) => i.type === 'expense')
                .reduce((sum, i) => sum + Number(i.amount || 0), 0);
              return (
                <div key={key} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between px-1">
                    <div className="text-[11px] font-body font-semibold text-[#6B7280]">
                      {dayLabel(key)}
                    </div>
                    {(dayIncome > 0 || dayExpense > 0) && (
                      <div className="text-[10px] font-caption text-[#94A3B8]">
                        {dayIncome > 0 ? `收 ¥${formatMoney(dayIncome)}` : ''}
                        {dayIncome > 0 && dayExpense > 0 ? ' · ' : ''}
                        {dayExpense > 0 ? `支 ¥${formatMoney(dayExpense)}` : ''}
                      </div>
                    )}
                  </div>
                  <div className="overflow-hidden rounded-xl bg-white shadow-soft">
                    {items.map((item, index) => {
                      const isIncome = item.type === 'income';
                      const { category, note } = splitRemark(item.remark);
                      const title = category || (isIncome ? '班费收入' : '班费支出');
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveRecord(item)}
                          className={`flex w-full items-center gap-3 px-4 py-3 text-left active:bg-[#F8FAFC] ${
                            index === items.length - 1 ? '' : 'border-b border-[#F1F5F9]'
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
                              {title}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-caption text-[#94A3B8]">
                              {clock(recordTime(item))}
                              {note && <span className="truncate">· {note}</span>}
                              {item.billUrl && <Paperclip className="h-3 w-3 shrink-0" />}
                            </div>
                          </div>
                          <div
                            className={`shrink-0 text-[14px] font-data font-semibold ${
                              isIncome ? 'text-[#16A34A]' : 'text-[#DC2626]'
                            }`}
                          >
                            {isIncome ? '+' : '-'}¥{formatMoney(Number(item.amount || 0))}
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-[#CBD5E1]" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {filter === '全部' && records.length >= 100 && (
              <div className="text-center text-[10px] font-caption text-[#94A3B8]">
                仅展示最近 100 笔记录
              </div>
            )}
          </div>
        )}
      </div>

      {budgetModalOpen && (
        <BudgetModal
          classId={classId}
          feeType={feeType}
          title={isLeague ? '团费' : '班费'}
          year={now.getFullYear()}
          month={now.getMonth() + 1}
          onClose={() => setBudgetModalOpen(false)}
          onSaved={fetchData}
        />
      )}

      {activeRecord && (
        <FeeRecordSheet
          record={activeRecord}
          feeType={feeType}
          canManage={canManage}
          onClose={() => setActiveRecord(null)}
          onChanged={fetchData}
        />
      )}
    </PageLayout>
  );
}
