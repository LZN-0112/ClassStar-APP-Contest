import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Wallet, Receipt } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { toast } from 'sonner';

type LedgerType = 'class' | 'league';

export default function FinanceReport() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useCurrentUser();
  const classId = user?.classId;
  const initialType = (location.state as { type?: LedgerType } | null)?.type || 'class';
  const [ledgerType, setLedgerType] = useState<LedgerType>(initialType);
  const [records, setRecords] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    monthly: [] as any[],
  });

  const isLeague = ledgerType === 'league';
  const feeType = isLeague ? 'group' : 'class';

  useEffect(() => {
    if (!classId) return;

    Promise.all([
      api.get('/fee/list', { params: { classId, feeType, pageNum: 1, pageSize: 100 } }),
      api.get('/fee/month-stat', { params: { classId, feeType, year: new Date().getFullYear(), month: new Date().getMonth() + 1 } }),
    ])
      .then(([listRes, statRes]) => {
        const list = listRes.data?.records || [];
        setRecords(list);
        const income = list.filter((r: any) => r.type === 'income').reduce((sum: number, r: any) => sum + r.amount, 0);
        const expense = list.filter((r: any) => r.type === 'expense').reduce((sum: number, r: any) => sum + r.amount, 0);
        setStats({
          totalIncome: income,
          totalExpense: expense,
          balance: income - expense,
          monthly: statRes.data?.monthly || [],
        });
      })
      .catch((error) => {
        console.error('获取财务数据失败:', error);
        toast.error('获取财务数据失败');
      });
  }, [classId, feeType]);
  const maxValue = Math.max(
    1,
    ...stats.monthly.flatMap((m: any) => [m.income, m.expense])
  );

  return (
    <PageLayout title={isLeague ? '团费收支报表' : '班费收支报表'} variant="a">
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
                onClick={() => setLedgerType(tab.value)}
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
          data-pencil-name="Stats Row"
          className="box-border flex w-full flex-row gap-3"
        >
          <div
            data-pencil-name="Stat Card"
            className="box-border flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl bg-white p-4 shadow-soft"
          >
            <div
              data-pencil-name="Text"
              className="text-[28px]/[normal] box-border text-[#004ECC] font-heading font-bold text-left [white-space:nowrap]"
            >
              ¥{stats.totalIncome.toLocaleString()}
            </div>
            <div
              data-pencil-name="Text"
              className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-semibold text-left [white-space:nowrap]"
            >
              总收入
            </div>
          </div>
          <div
            data-pencil-name="Stat Card"
            className="box-border flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl bg-white p-4 shadow-soft"
          >
            <div
              data-pencil-name="Text"
              className="text-[28px]/[normal] box-border text-[#004ECC] font-heading font-bold text-left [white-space:nowrap]"
            >
              ¥{stats.totalExpense.toLocaleString()}
            </div>
            <div
              data-pencil-name="Text"
              className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-semibold text-left [white-space:nowrap]"
            >
              总支出
            </div>
          </div>
          <div
            data-pencil-name="Stat Card"
            className="box-border flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl bg-white p-4 shadow-soft"
          >
            <div
              data-pencil-name="Text"
              className="text-[28px]/[normal] box-border text-[#004ECC] font-heading font-bold text-left [white-space:nowrap]"
            >
              ¥{stats.balance.toLocaleString()}
            </div>
            <div
              data-pencil-name="Text"
              className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-semibold text-left [white-space:nowrap]"
            >
              结余
            </div>
          </div>
        </div>

        <div
          data-pencil-name="Chart"
          className="box-border flex h-[180px] w-full shrink-0 flex-col gap-0 rounded-2xl bg-white p-4 shadow-soft"
        >
          <div
            data-pencil-name="Text"
            className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-bold text-left [white-space:nowrap]"
          >
            月度收支
          </div>
          <div
            data-pencil-name="Bars"
            className="box-border flex w-full flex-1 flex-row items-end justify-center gap-2"
          >
            {stats.monthly.flatMap((item: any) => [
              <div
                key={`${item.month}-income`}
                data-pencil-name="Bar"
                className="box-border w-[24px] shrink-0 rounded-[4px_4px_0px_0px] bg-[#004ECC]"
                style={{ height: `${Math.max((item.income / maxValue) * 100, 8)}%` }}
              ></div>,
              <div
                key={`${item.month}-expense`}
                data-pencil-name="Bar"
                className="box-border w-[24px] shrink-0 rounded-[4px_4px_0px_0px] bg-[#4B83FF]"
                style={{ height: `${Math.max((item.expense / maxValue) * 100, 8)}%` }}
              ></div>,
            ])}
          </div>
        </div>

        <div
          data-pencil-name="Group 收支明细"
          className="box-border flex w-full flex-col gap-[10px]"
        >
          <div
            data-pencil-name="Text"
            className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-semibold text-left [white-space:nowrap]"
          >
            收支明细
          </div>
          <div
            data-pencil-name="Group Content"
            className="box-border flex w-full flex-col gap-2"
          >
            {records.map((item, index) => {
              const isIncome = item.type === 'income';
              const isLast = index === records.length - 1;
              const category = (item as { category?: string }).category;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate('/fee-ledger', { state: { type: ledgerType } })}
                  data-pencil-name="List Item"
                  className="box-border flex h-[64px] w-full shrink-0 flex-row items-center gap-3 rounded-xl bg-white px-4 text-left shadow-soft"
                >
                  <div
                    data-pencil-name="Icon Box"
                    className={`box-border flex h-[40px] w-[40px] shrink-0 flex-col items-center justify-center rounded-lg ${
                      isIncome ? 'bg-[#DCFCE7]' : 'bg-[#FEE2E2]'
                    }`}
                  >
                    {isIncome ? (
                      <Wallet className="h-[24px] w-[24px] text-[#22C55E]" strokeWidth={2} />
                    ) : isLast ? (
                      <Receipt className="h-[24px] w-[24px] text-[#EF4444]" strokeWidth={2} />
                    ) : (
                      <Receipt className="h-[24px] w-[24px] text-[#EF4444]" strokeWidth={2} />
                    )}
                  </div>
                  <div className="flex flex-col items-start justify-center gap-0.5">
                    <div
                      data-pencil-name="Text"
                      className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                    >
                      {item.title}
                    </div>
                    {category && (
                      <div className="text-[11px]/[normal] font-caption font-medium text-[#64748B]">
                        {category}
                      </div>
                    )}
                  </div>
                  <div
                    data-pencil-name="Right"
                    className="box-border ml-auto flex h-fit w-fit shrink-0 flex-row items-center gap-2"
                  >
                    <div
                      data-pencil-name="Text"
                      className="text-[14px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                    >
                      {isIncome ? '+' : ''}¥{Math.abs(item.amount)}
                    </div>
                    <svg
                      data-pencil-name="Icon-chevron-right"
                      viewBox="0 0 24 24"
                      preserveAspectRatio="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="box-border h-[20px] w-[20px] shrink-0 text-[#9CA3AF]"
                    >
                      <path d="M9 18l6-6-6-6" fill="none"></path>
                      <path
                        d="M9 18l6-6-6-6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      ></path>
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
