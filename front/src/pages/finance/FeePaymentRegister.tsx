import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, CreditCard, Loader2, Search, ShieldAlert, Users, X } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { toast } from 'sonner';

type FeeType = 'income' | 'expense';
type FeeCategory = 'class' | 'group';

interface Member {
  userId: string;
  name: string;
  studentId?: string | null;
}

interface FeeRecordItem {
  id: string;
  type: FeeType;
  remark?: string | null;
}

interface FeePaymentRegisterProps {
  /** class=班费 group=团费 */
  feeType: FeeCategory;
  /** 展示名称：班费 / 团费 */
  title: string;
  /** 默认每人金额 */
  defaultAmount: number;
}

/** 班费 / 团费缴费登记共用页面，避免两套逻辑出现同样的解析错误 */
export default function FeePaymentRegister({
  feeType,
  title,
  defaultAmount,
}: FeePaymentRegisterProps) {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const classId = user?.classId;

  const [members, setMembers] = useState<Member[]>([]);
  const [paidNames, setPaidNames] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [amount, setAmount] = useState(String(defaultAmount));
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canManage =
    user?.roleLevel === 'owner' ||
    user?.roleLevel === 'admin' ||
    user?.isCommittee === true;

  const feeRemarkPrefix = `${title}缴纳 - `;

  useEffect(() => {
    if (!classId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(false);

    Promise.all([
      api.get(`/classes/${classId}/members`, { params: { page: 1, pageSize: 200 } }),
      api.get('/fee/list', { params: { classId, feeType, pageNum: 1, pageSize: 100 } }),
    ])
      .then(([memberRes, feeRes]) => {
        if (cancelled) return;
        const memberBody = memberRes.data?.data ?? memberRes.data;
        const list = (memberBody?.list || []) as Member[];
        setMembers(list);

        const feeBody = feeRes.data?.data ?? feeRes.data;
        const records = (feeBody?.list || []) as FeeRecordItem[];
        const paid = new Set<string>();
        records.forEach((record) => {
          if (record.type !== 'income' || !record.remark) return;
          const remark = record.remark.trim();
          if (remark.startsWith(feeRemarkPrefix)) {
            paid.add(remark.slice(feeRemarkPrefix.length).trim());
          }
        });
        setPaidNames(paid);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [classId, feeType, feeRemarkPrefix]);

  const filteredMembers = useMemo(() => {
    const query = keyword.trim();
    if (!query) return members;
    return members.filter(
      (m) => m.name?.includes(query) || (m.studentId || '').includes(query),
    );
  }, [members, keyword]);

  const unpaidMembers = useMemo(
    () => members.filter((m) => !paidNames.has(m.name)),
    [members, paidNames],
  );

  const selectedMembers = useMemo(
    () => members.filter((m) => selected[m.userId] && !paidNames.has(m.name)),
    [members, selected, paidNames],
  );

  const allSelected =
    unpaidMembers.length > 0 && unpaidMembers.every((m) => selected[m.userId]);
  const paidCount = paidNames.size;

  const toggle = (member: Member) => {
    if (paidNames.has(member.name)) {
      toast.info(`${member.name} 已登记缴费，无需重复登记`);
      return;
    }
    setSelected((prev) => ({ ...prev, [member.userId]: !prev[member.userId] }));
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected({});
      return;
    }
    const next: Record<string, boolean> = {};
    unpaidMembers.forEach((m) => {
      next[m.userId] = true;
    });
    setSelected(next);
  };

  const handleSubmit = async () => {
    if (!classId) {
      toast.error('未找到班级信息');
      return;
    }
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error('请输入大于 0 的缴费金额');
      return;
    }
    if (selectedMembers.length === 0) {
      toast.error('请先勾选已缴费的学生');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/fee/batch-add', {
        classId,
        feeType,
        amount: Math.round(amountNum * 100) / 100,
        payerUserIds: selectedMembers.map((member) => member.userId),
      });
      const data = res.data?.data ?? res.data;
      const created = Number(data?.created || selectedMembers.length);
      toast.success(`已登记 ${created} 人${title}缴费`);
      navigate('/fee-ledger', { state: { type: feeType === 'group' ? 'league' : 'class' } });
    } catch (err: any) {
      toast.error(err?.message || '登记失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canManage) {
    return (
      <PageLayout
        title={`${title}缴费登记`}
        variant="a"
        decor={<CreditCard className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FEF2F2]">
            <ShieldAlert className="h-8 w-8 text-[#DC2626]" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <div className="text-[16px] font-heading font-bold text-[#1A1A1A]">仅班委可登记缴费</div>
            <div className="mt-1.5 text-[12px] font-body text-[#64748B]">
              你可以查看{title}明细，如需登记请联系班委
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={`${title}缴费登记`}
      variant="a"
      decor={<CreditCard className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}
    >
      <div className="flex w-full flex-1 flex-col gap-4">
        {/* 缴费信息卡 */}
        <div className="rounded-2xl bg-[linear-gradient(-120deg,_#0062FF_0%,_#3B82F6_100%)] p-5 text-white shadow-[0_10px_24px_-12px_#0062FF99]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[12px] font-body text-white/80">本次{title}缴费</div>
              <div className="mt-1 text-[22px] font-heading font-bold">
                已缴 {paidCount} / {members.length} 人
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <Users className="h-6 w-6" strokeWidth={1.8} />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-xl bg-white/15 px-3 py-2.5">
            <span className="text-[12px] font-body font-medium text-white/85">每人金额</span>
            <div className="flex flex-1 items-center gap-1">
              <span className="text-[16px] font-heading font-bold">¥</span>
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-[18px] font-heading font-bold text-white outline-none placeholder:text-white/50"
                placeholder="0.00"
              />
            </div>
            <span className="text-[11px] font-caption text-white/70">可修改</span>
          </div>
        </div>

        {/* 搜索 */}
        <div className="flex h-11 w-full shrink-0 items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4">
          <Search className="h-[18px] w-[18px] shrink-0 text-[#64748B]" strokeWidth={2} />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索姓名或学号"
            className="min-w-0 flex-1 bg-transparent text-[14px] font-body text-[#1A1A1A] outline-none placeholder:text-[#94A3B8]"
          />
          {keyword && (
            <button
              type="button"
              aria-label="清空搜索"
              onClick={() => setKeyword('')}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[#64748B]"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* 名单 */}
        <div className="flex w-full flex-col gap-2">
          <div className="flex items-center justify-between px-0.5">
            <div className="text-[12px] font-body font-semibold text-[#6B7280]">
              勾选已缴费学生
            </div>
            {unpaidMembers.length > 0 && (
              <button
                type="button"
                onClick={toggleAll}
                className="flex items-center gap-1 text-[12px] font-body font-semibold text-[#0062FF]"
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded border ${
                    allSelected
                      ? 'border-[#0062FF] bg-[#0062FF] text-white'
                      : 'border-[#CBD5E1] bg-white'
                  }`}
                >
                  {allSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                全选待缴
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-[13px] font-body text-[#64748B]">
              <Loader2 className="h-4 w-4 animate-spin" />
              正在加载名单...
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center gap-3 rounded-xl bg-white py-10 shadow-soft">
              <div className="text-[13px] font-body font-medium text-[#64748B]">名单加载失败</div>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-full bg-[#0062FF] px-5 py-2 text-[12px] font-body font-semibold text-white"
              >
                重新加载
              </button>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl bg-white py-12 shadow-soft">
              <Users className="h-8 w-8 text-[#CBD5E1]" strokeWidth={1.5} />
              <div className="text-[13px] font-body text-[#64748B]">
                {keyword.trim() ? '没有找到匹配的学生' : '班级暂无成员'}
              </div>
            </div>
          ) : (
            <div className="flex w-full flex-col overflow-hidden rounded-xl bg-white shadow-soft">
              {filteredMembers.map((member) => {
                const isPaid = paidNames.has(member.name);
                const isSelected = !!selected[member.userId] && !isPaid;
                return (
                  <button
                    key={member.userId}
                    type="button"
                    onClick={() => toggle(member)}
                    className={`flex w-full items-center gap-3 border-b border-[#F1F5F9] px-4 py-3 text-left last:border-b-0 ${
                      isPaid ? 'bg-[#F8FAFC]' : 'active:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#DBEAFE] text-[13px] font-body font-bold text-[#1D4ED8]">
                      {member.name?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-body font-semibold text-[#1E293B]">
                        {member.name}
                      </div>
                      <div className="truncate text-[11px] font-caption text-[#94A3B8]">
                        {member.studentId || '未设置学号'}
                      </div>
                    </div>
                    {isPaid ? (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#ECFDF5] px-2.5 py-1 text-[11px] font-body font-semibold text-[#16A34A]">
                        <Check className="h-3 w-3" strokeWidth={2.5} />
                        已缴
                      </span>
                    ) : (
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          isSelected
                            ? 'border-[#0062FF] bg-[#0062FF] text-white'
                            : 'border-[#CBD5E1] bg-white'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-1 h-2" />

        <button
          type="button"
          disabled={submitting || loading || selectedMembers.length === 0}
          onClick={handleSubmit}
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(-98.571deg,_#0062FF_14.645%,_#3B82F6_85.355%)] text-[16px] font-body font-semibold text-white shadow-[0_8px_20px_-8px_#0062FF99] active:scale-[0.99] disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              登记中...
            </>
          ) : selectedMembers.length > 0 ? (
            `确认登记 ${selectedMembers.length} 人 · ¥${(Number(amount || 0) * selectedMembers.length).toFixed(2)}`
          ) : (
            '请选择已缴费学生'
          )}
        </button>
        <div className="pb-1 text-center text-[10px] font-caption text-[#94A3B8]">
          已登记的学生会显示「已缴」，避免重复登记
        </div>
      </div>
    </PageLayout>
  );
}
