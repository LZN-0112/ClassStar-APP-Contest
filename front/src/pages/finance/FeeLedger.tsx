import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Receipt, Wallet, Target } from 'lucide-react';
import { toast } from 'sonner';
import PageLayout from '@/components/layout/PageLayout';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import BudgetModal from './BudgetModal';

type FeeFilter = '全部' | '本月' | '上月';
type LedgerType = 'class' | 'league';

interface FeeRecord {
  id: string;
  title?: string;
  remark?: string;
  amount: number;
  type: 'income' | 'expense';
  createTime?: string;
  create_time?: string;
}

interface BudgetInfo {
  budgetAmount: number;
  spentAmount: number;
  remainingAmount: number;
  usagePercent: number;
}

export default function FeeLedger() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [filter, setFilter] = useState<FeeFilter>('全部');
  const [ledgerType, setLedgerType] = useState<LedgerType>('class');
  const [records, setRecords] = useState<FeeRecord[]>([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });
  const [budget, setBudget] = useState<BudgetInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);

  const isLeague = ledgerType === 'league';
  const feeType = isLeague ? 'group' : 'class';
  const classId = user?.classId;

  // 班委判断
  const canManage =
    user?.roleLevel === 'owner' ||
    user?.roleLevel === 'admin' ||
    user?.isCommittee === true;

  const tabs: FeeFilter[] = ['全部', '本月', '上月'];

  const now = new Date();
  const currentMonth = { year: now.getFullYear(), month: now.getMonth() + 1 };

  const fetchData = useCallback(async () => {
    if (!classId) return;

    setLoading(true);
    try {
      const [listRes, statRes] = await Promise.all([
        api.get(`/fee/list`, {
          params: { classId, feeType, pageSize: 100 },
        }),
        api.get(`/fee/month-stat`, {
          params: { classId, feeType, year: currentMonth.year, month: currentMonth.month },
        }),
      ]);

      const listData = listRes.data.data || listRes.data;
      const statData = statRes.data.data || statRes.data;

      setRecords(listData.list || []);
      setSummary(listData.summary || { income: 0, expense: 0, balance: 0 });
      setBudget(statData.budget || null);
    } catch (err: any) {
      toast.error('加载账本数据失败');
    } finally {
      setLoading(false);
    }
  }, [classId, feeType, currentMonth.year, currentMonth.month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 切换账本类型时重新加载
  const handleLedgerTypeChange = (type: LedgerType) => {
    setLedgerType(type);
    setFilter('全部');
  };

  // 过滤记录
  const filteredRecords = useMemo(() => {
    if (filter === '全部') return records;

    const now = new Date();
    let targetYear: number, targetMonth: number;

    if (filter === '本月') {
      targetYear = now.getFullYear();
      targetMonth = now.getMonth() + 1;
    } else {
      // 上月
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      targetYear = lastMonth.getFullYear();
      targetMonth = lastMonth.getMonth() + 1;
    }

    return records.filter((item) => {
      const timeStr = item.createTime || item.create_time;
      if (!timeStr) return false;
      const d = new Date(timeStr);
      return d.getFullYear() === targetYear && d.getMonth() + 1 === targetMonth;
    });
  }, [filter, records]);

  const handleBudgetSaved = () => {
    fetchData();
  };

  return (
    <PageLayout
      title={isLeague ? '团费账本' : '班费账本'}
      variant="a"
      decor={<Wallet className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}
      right={
        canManage ? (
          <div className="mr-2 flex flex-row gap-2">
            <button
              type="button"
              onClick={() => navigate(isLeague ? '/league-payment-register' : '/payment-register')}
              className="flex h-9 items-center gap-1 rounded-full bg-white/20 px-3 text-sm font-medium text-white backdrop-blur"
            >
              <Receipt className="h-4 w-4" />
              缴费登记
            </button>
            <button
              type="button"
              onClick={() => navigate(isLeague ? '/league-fee-record' : '/fee-record')}
              className="flex h-9 items-center gap-1 rounded-full bg-white/20 px-3 text-sm font-medium text-white backdrop-blur"
            >
              <Plus className="h-4 w-4" />
              记账
            </button>
            <button
              type="button"
              onClick={() => setBudgetModalOpen(true)}
              className="flex h-9 items-center gap-1 rounded-full bg-white/20 px-3 text-sm font-medium text-white backdrop-blur"
            >
              <Target className="h-4 w-4" />
              预算
            </button>
          </div>
        ) : null
      }
    >
      <div className="flex w-full flex-1 flex-col gap-5">
        {/* 班费/团费切换 */}
        <div
          data-pencil-name="Ledger Type Tabs"
          className="box-border flex w-full flex-row items-start justify-start gap-2"
        >
          {[
            { value: 'class' as LedgerType, label: '班费' },
            { value: 'league' as LedgerType, label: '团费' },
          ].map((tab) => {
            const active = ledgerType === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => handleLedgerTypeChange(tab.value)}
                className={`box-border flex h-[36px] flex-1 flex-col items-center justify-center rounded-full text-[14px]/[normal] font-body font-semibold transition-colors ${
                  active ? 'bg-[#0062FF] text-white shadow-soft' : 'bg-[#F1F5F9] text-[#64748B]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div
          data-pencil-name="Balance Card"
          className="box-border flex w-full shrink-0 flex-col gap-2 rounded-[20px] bg-[#0062FF] p-6 shadow-[0px_6px_20px_0px_#00000026]"
        >
          <div
            data-pencil-name="Text"
            className="text-[14px]/[normal] box-border text-left font-body font-medium text-white/80 [white-space:nowrap]"
          >
            当前{isLeague ? '团费' : '班费'}余额
          </div>
          <div
            data-pencil-name="Text"
            className="text-[36px]/[normal] box-border text-left font-heading font-bold text-white [white-space:nowrap]"
          >
            ¥{summary.balance.toLocaleString()}.00
          </div>

          {/* 预算进度条 */}
          {budget !== null && (
            <div className="mt-2">
              <div className="flex justify-between text-[11px] text-white/80">
                <span>学期预算 ¥{Number(budget.budgetAmount).toLocaleString()}</span>
                <span>已用 {Number(budget.usagePercent).toFixed(1)}%</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-all"
                  style={{ width: `${Math.min(Number(budget.usagePercent), 100)}%` }}
                />
              </div>
              <div className="mt-1 text-[11px] text-white/70">
                剩余 ¥{Number(budget.remainingAmount).toLocaleString()}
              </div>
            </div>
          )}

          <div
            data-pencil-name="Month"
            className="box-border flex w-full flex-row items-start justify-start gap-4"
          >
            <div
              data-pencil-name="Text"
              className="text-[11px]/[normal] box-border text-left font-body font-medium text-white/80 [white-space:nowrap]"
            >
              本月收入 +¥{summary.income}
            </div>
            <div
              data-pencil-name="Text"
              className="text-[11px]/[normal] box-border text-left font-body font-medium text-white/80 [white-space:nowrap]"
            >
              本月支出 -¥{summary.expense}
            </div>
          </div>
        </div>

        <div
          data-pencil-name="Filter Tabs"
          className="box-border flex w-full flex-row items-start justify-start gap-2"
        >
          {tabs.map((tab) => {
            const active = filter === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`box-border flex h-[32px] shrink-0 flex-col items-center justify-center rounded-full px-4 ${
                  active ? 'bg-[#0062FF]' : 'bg-[#F1F5F9]'
                }`}
              >
                <div
                  className={`text-[11px]/[normal] box-border font-body font-semibold text-left [white-space:nowrap] ${
                    active ? 'text-white' : 'text-[#64748B]'
                  }`}
                >
                  {tab}
                </div>
              </button>
            );
          })}
        </div>

        <div
          data-pencil-name="Group 收支明细"
          className="box-border flex w-full flex-col gap-[10px]"
        >
          <div
            data-pencil-name="Text"
            className="text-[11px]/[normal] box-border text-left font-body font-semibold text-[#6B7280] [white-space:nowrap]"
          >
            收支明细
          </div>
          <div
            data-pencil-name="Group Content"
            className="box-border flex w-full flex-col gap-2"
          >
            {loading ? (
              <div className="flex items-center justify-center py-12 text-sm text-[#64748B]">
                加载中...
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-sm text-[#64748B]">
                暂无收支记录
              </div>
            ) : (
              filteredRecords.map((item) => {
                const isIncome = item.type === 'income';
                const title = item.title || item.remark || '收支记录';
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate('/finance-report', { state: { type: ledgerType } })}
                    data-pencil-name="List Item"
                    className="box-border flex h-[64px] w-full shrink-0 items-center justify-start gap-3 rounded-xl bg-white px-4 text-left shadow-soft"
                  >
                    <div
                      data-pencil-name="Icon Box"
                      className={`box-border flex h-[40px] w-[40px] shrink-0 flex-col items-center justify-center rounded-lg ${
                        isIncome ? 'bg-[#DCFCE7]' : 'bg-[#FEE2E2]'
                      }`}
                    >
                      {isIncome ? (
                        <Wallet className="h-[24px] w-[24px] text-[#22C55E]" strokeWidth={2} />
                      ) : (
                        <Receipt className="h-[24px] w-[24px] text-[#EF4444]" strokeWidth={2} />
                      )}
                    </div>
                    <div className="flex flex-col items-start justify-center gap-0.5">
                      <div
                        data-pencil-name="Text"
                        className="text-[14px]/[normal] box-border text-left font-body font-semibold text-[#1A1A1A] [white-space:nowrap]"
                      >
                        {title}
                      </div>
                    </div>
                    <div
                      data-pencil-name="Right"
                      className="box-border ml-auto flex h-fit w-fit shrink-0 flex-row items-center justify-start gap-2"
                    >
                      <div
                        data-pencil-name="Text"
                        className="text-[14px]/[normal] box-border text-left font-body font-medium text-[#6B7280] [white-space:nowrap]"
                      >
                        {isIncome ? '+' : '-'}¥{Math.abs(item.amount)}
                      </div>
                      <svg
                        data-pencil-name="Icon-chevron-right"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                        className="box-border h-[20px] w-[20px] shrink-0 text-[#9CA3AF]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 预算设置弹层 */}
      {budgetModalOpen && classId && (
        <BudgetModal
          classId={classId}
          feeType={feeType}
          title={isLeague ? '团费' : '班费'}
          year={currentMonth.year}
          month={currentMonth.month}
          onClose={() => setBudgetModalOpen(false)}
          onSaved={handleBudgetSaved}
        />
      )}
    </PageLayout>
  );
}
