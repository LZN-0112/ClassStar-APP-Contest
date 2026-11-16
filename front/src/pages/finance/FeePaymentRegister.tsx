import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  Check,
  CreditCard,
  Loader2,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import BottomSheet from '@/components/ui/BottomSheet';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { toast } from 'sonner';

type FeeCategory = 'class' | 'group';

interface FeeBill {
  id: string;
  feeType: FeeCategory;
  title: string;
  period?: string | null;
  amount: number;
  deadline?: string | null;
  status: string;
  createdAt: string;
  totalMembers: number;
  paidCount: number;
  unpaidCount: number;
  expectedAmount: number;
  collectedAmount: number;
}

interface BillMember {
  userId: string;
  name: string;
  studentId?: string | null;
  amount: number;
  status: 'paid' | 'unpaid';
  paidAt?: string | null;
  remark?: string | null;
}

interface FeePaymentRegisterProps {
  /** class=班费 group=团费 */
  feeType: FeeCategory;
  /** 展示名称：班费 / 团费 */
  title: string;
  /** 新建账单时默认每人金额 */
  defaultAmount: number;
}

function formatDay(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

/** 班费 / 团费按期账单页：创建账单、查看应缴名单、支持逾期补登记 */
export default function FeePaymentRegister({
  feeType,
  title,
  defaultAmount,
}: FeePaymentRegisterProps) {
  const { user } = useCurrentUser();
  const classId = user?.classId;

  const [bills, setBills] = useState<FeeBill[]>([]);
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [billMembers, setBillMembers] = useState<BillMember[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [memberLoading, setMemberLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formPeriod, setFormPeriod] = useState('');
  const [formAmount, setFormAmount] = useState(String(defaultAmount));
  const [formDeadline, setFormDeadline] = useState('');
  const [creating, setCreating] = useState(false);

  const canManage =
    user?.roleLevel === 'owner' ||
    user?.roleLevel === 'admin' ||
    user?.isCommittee === true;

  const selectedBill = useMemo(
    () => bills.find((bill) => bill.id === selectedBillId) || null,
    [bills, selectedBillId],
  );

  const loadBills = useCallback(async () => {
    if (!classId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      const res = await api.get('/fee/bills', { params: { classId, feeType } });
      const body = res.data?.data ?? res.data;
      const list = (Array.isArray(body) ? body : []) as FeeBill[];
      setBills(list);
      setSelectedBillId((prev) => {
        if (prev && list.some((bill) => bill.id === prev)) return prev;
        return list[0]?.id || null;
      });
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [classId, feeType]);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  useEffect(() => {
    if (!selectedBillId) {
      setBillMembers([]);
      setSelected({});
      return;
    }
    let cancelled = false;
    setMemberLoading(true);
    api
      .get(`/fee/bills/${selectedBillId}/members`, { params: { status: 'all' } })
      .then((res) => {
        if (cancelled) return;
        const body = res.data?.data ?? res.data;
        setBillMembers((body?.list || []) as BillMember[]);
        setSelected({});
      })
      .catch(() => {
        if (!cancelled) toast.error('账单明细加载失败');
      })
      .finally(() => {
        if (!cancelled) setMemberLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedBillId]);

  const filteredMembers = useMemo(() => {
    const query = keyword.trim();
    if (!query) return billMembers;
    return billMembers.filter(
      (member) =>
        member.name?.includes(query) || (member.studentId || '').includes(query),
    );
  }, [billMembers, keyword]);

  const unpaidMembers = useMemo(
    () => billMembers.filter((member) => member.status === 'unpaid'),
    [billMembers],
  );

  const selectedMembers = useMemo(
    () =>
      billMembers.filter(
        (member) => selected[member.userId] && member.status === 'unpaid',
      ),
    [billMembers, selected],
  );

  const allSelected =
    unpaidMembers.length > 0 && unpaidMembers.every((member) => selected[member.userId]);

  const toggle = (member: BillMember) => {
    if (member.status === 'paid') {
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
    unpaidMembers.forEach((member) => {
      next[member.userId] = true;
    });
    setSelected(next);
  };

  const openCreateSheet = () => {
    const now = new Date();
    setFormTitle(`${now.getFullYear()}年${now.getMonth() + 1}月${title}`);
    setFormPeriod(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    setFormAmount(String(defaultAmount));
    setFormDeadline('');
    setCreateOpen(true);
  };

  const handleCreateBill = async () => {
    if (!classId) {
      toast.error('未找到班级信息');
      return;
    }
    const billTitle = formTitle.trim();
    if (!billTitle) {
      toast.error('请填写账单名称');
      return;
    }
    const amountNum = Number(formAmount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error('请输入大于 0 的每人金额');
      return;
    }
    setCreating(true);
    try {
      const res = await api.post('/fee/bills', {
        classId,
        feeType,
        title: billTitle,
        period: formPeriod.trim() || undefined,
        amount: Math.round(amountNum * 100) / 100,
        deadline: formDeadline ? new Date(`${formDeadline}T23:59:59`).toISOString() : undefined,
      });
      const body = res.data?.data ?? res.data;
      toast.success('账单已创建，可随时补登记缴费');
      setCreateOpen(false);
      await loadBills();
      if (body?.id) {
        setSelectedBillId(body.id);
      }
    } catch (err: any) {
      toast.error(err?.message || '创建账单失败，请重试');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBill = async () => {
    if (!selectedBill) return;
    if (!window.confirm(`确定删除账单「${selectedBill.title}」吗？`)) return;
    try {
      await api.delete(`/fee/bills/${selectedBill.id}`);
      toast.success('账单已删除');
      setSelectedBillId(null);
      await loadBills();
    } catch (err: any) {
      toast.error(err?.message || '删除失败');
    }
  };

  const refreshMembers = async () => {
    if (!selectedBillId) return;
    const res = await api.get(`/fee/bills/${selectedBillId}/members`, {
      params: { status: 'all' },
    });
    const body = res.data?.data ?? res.data;
    setBillMembers((body?.list || []) as BillMember[]);
  };

  const handleSubmit = async () => {
    if (!selectedBill) {
      toast.error('请先选择或创建账单');
      return;
    }
    if (selectedMembers.length === 0) {
      toast.error('请先勾选已缴费的学生');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post(`/fee/bills/${selectedBill.id}/register`, {
        userIds: selectedMembers.map((member) => member.userId),
      });
      const data = res.data?.data ?? res.data;
      const created = Number(data?.created ?? selectedMembers.length);
      const skipped = Number(data?.skipped || 0);
      if (created <= 0) {
        toast.info('所选学生均已登记缴费，无需重复登记');
        return;
      }
      toast.success(
        `已登记 ${created} 人${title}缴费${skipped > 0 ? `，${skipped} 人已缴跳过` : ''}`,
      );
      setSelected({});
      await Promise.all([loadBills(), refreshMembers()]);
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
        {/* 账单切换 */}
        <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {bills.map((bill) => {
            const active = bill.id === selectedBillId;
            return (
              <button
                key={bill.id}
                type="button"
                onClick={() => setSelectedBillId(bill.id)}
                className={`shrink-0 rounded-full px-3.5 py-2 text-[12px] font-body font-semibold transition-colors ${
                  active
                    ? 'bg-[#0062FF] text-white'
                    : 'border border-[#E5E7EB] bg-white text-[#475569]'
                }`}
              >
                {bill.title}
                <span className={active ? 'text-white/75' : 'text-[#94A3B8]'}>
                  {' '}
                  {bill.paidCount}/{bill.totalMembers}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={openCreateSheet}
            className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-[#93C5FD] bg-[#EFF6FF] px-3.5 py-2 text-[12px] font-body font-semibold text-[#0062FF]"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            新建账单
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center gap-2 py-16 text-[13px] font-body text-[#64748B]">
            <Loader2 className="h-4 w-4 animate-spin" />
            正在加载账单...
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center gap-3 rounded-xl bg-white py-10 shadow-soft">
            <div className="text-[13px] font-body font-medium text-[#64748B]">账单加载失败</div>
            <button
              type="button"
              onClick={loadBills}
              className="rounded-full bg-[#0062FF] px-5 py-2 text-[12px] font-body font-semibold text-white"
            >
              重新加载
            </button>
          </div>
        ) : !selectedBill ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-10 shadow-soft">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EFF6FF]">
              <CalendarClock className="h-7 w-7 text-[#0062FF]" strokeWidth={1.6} />
            </div>
            <div className="text-center">
              <div className="text-[15px] font-heading font-bold text-[#1A1A1A]">
                还没有{title}账单
              </div>
              <div className="mt-1.5 text-[12px] font-body leading-relaxed text-[#64748B]">
                创建账单后会自动生成全班应缴名单，逾期未缴的同学也可以随时补登记
              </div>
            </div>
            <button
              type="button"
              onClick={openCreateSheet}
              className="mt-1 flex h-[44px] items-center gap-2 rounded-xl bg-[#0062FF] px-5 text-[14px] font-body font-semibold text-white active:opacity-90"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              创建第一期账单
            </button>
          </div>
        ) : (
          <>
            {/* 当前账单信息 */}
            <div className="rounded-2xl bg-[linear-gradient(-120deg,_#0062FF_0%,_#3B82F6_100%)] p-5 text-white shadow-[0_10px_24px_-12px_#0062FF99]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-body text-white/80">
                    {selectedBill.period || '缴费账单'}
                  </div>
                  <div className="mt-1 truncate text-[20px] font-heading font-bold">
                    {selectedBill.title}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                    <Users className="h-6 w-6" strokeWidth={1.8} />
                  </div>
                  {selectedBill.paidCount === 0 && (
                    <button
                      type="button"
                      aria-label="删除账单"
                      onClick={handleDeleteBill}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 active:opacity-70"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-end justify-between">
                <div>
                  <div className="text-[12px] font-body text-white/80">已缴人数</div>
                  <div className="mt-0.5 text-[24px] font-heading font-bold">
                    {selectedBill.paidCount}
                    <span className="text-[14px] font-body font-medium text-white/75">
                      {' '}
                      / {selectedBill.totalMembers} 人
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-caption text-white/70">每人 ¥{selectedBill.amount}</div>
                  <div className="mt-0.5 text-[12px] font-body text-white/85">
                    已收 ¥{selectedBill.collectedAmount}
                  </div>
                </div>
              </div>

              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-all"
                  style={{
                    width: `${
                      selectedBill.totalMembers > 0
                        ? Math.round(
                            (selectedBill.paidCount / selectedBill.totalMembers) * 100,
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] font-caption text-white/75">
                <span>未缴 {selectedBill.unpaidCount} 人</span>
                <span>
                  {selectedBill.deadline
                    ? `截止 ${formatDay(selectedBill.deadline)}`
                    : '长期有效，可补登记'}
                </span>
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
                  勾选本次已缴费的学生
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

              {memberLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-[13px] font-body text-[#64748B]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在加载名单...
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl bg-white py-12 shadow-soft">
                  <Users className="h-8 w-8 text-[#CBD5E1]" strokeWidth={1.5} />
                  <div className="text-[13px] font-body text-[#64748B]">
                    {keyword.trim() ? '没有找到匹配的学生' : '账单暂无成员'}
                  </div>
                </div>
              ) : (
                <div className="flex w-full flex-col overflow-hidden rounded-xl bg-white shadow-soft">
                  {filteredMembers.map((member) => {
                    const isPaid = member.status === 'paid';
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
              disabled={submitting || memberLoading || selectedMembers.length === 0}
              onClick={handleSubmit}
              className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(-98.571deg,_#0062FF_14.645%,_#3B82F6_85.355%)] text-[16px] font-body font-semibold text-white shadow-[0_8px_20px_-8px_#0062FF99] active:scale-[0.99] disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  登记中...
                </>
              ) : selectedMembers.length > 0 ? (
                `确认登记 ${selectedMembers.length} 人 · ¥${(
                  selectedBill.amount * selectedMembers.length
                ).toFixed(2)}`
              ) : (
                '请选择已缴费学生'
              )}
            </button>
            <div className="pb-1 text-center text-[10px] font-caption text-[#94A3B8]">
              已登记的学生会显示「已缴」，无论是否超过截止时间都可补登记
            </div>
          </>
        )}
      </div>

      {/* 新建账单 */}
      <BottomSheet
        open={createOpen}
        onClose={() => {
          if (!creating) setCreateOpen(false);
        }}
        title={`新建${title}账单`}
        subtitle="创建后自动生成全班应缴名单，之后可逐人或批量登记"
        maxHeight="80vh"
        footer={
          <div className="flex flex-row gap-3">
            <button
              type="button"
              disabled={creating}
              onClick={() => setCreateOpen(false)}
              className="h-[48px] flex-1 rounded-[14px] bg-[#F2F5F9] font-body text-[15px] font-semibold text-[#475569] active:opacity-80"
            >
              取消
            </button>
            <button
              type="button"
              disabled={creating}
              onClick={handleCreateBill}
              className="h-[48px] flex-[1.4] rounded-[14px] bg-[linear-gradient(180deg,#2E7DFF_0%,#0062FF_100%)] font-body text-[15px] font-semibold text-white shadow-[0_10px_20px_rgba(0,98,255,0.24)] active:opacity-90 disabled:opacity-60"
            >
              {creating ? '创建中...' : '创建账单'}
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 px-5 pb-2">
          <div>
            <label className="mb-2 block text-[13px] text-[#4B5563]">账单名称</label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder={`如 2026年11月${title}`}
              className="h-[48px] w-full rounded-lg border border-[#E5E7EB] px-4 text-[14px] text-[#1A1A1A] outline-none placeholder:text-[#9CA3AF] focus:border-[#0062FF]"
            />
          </div>
          <div>
            <label className="mb-2 block text-[13px] text-[#4B5563]">缴费周期（选填）</label>
            <input
              type="text"
              value={formPeriod}
              onChange={(e) => setFormPeriod(e.target.value)}
              placeholder="如 2026-11 或 2026年秋季"
              className="h-[48px] w-full rounded-lg border border-[#E5E7EB] px-4 text-[14px] text-[#1A1A1A] outline-none placeholder:text-[#9CA3AF] focus:border-[#0062FF]"
            />
          </div>
          <div>
            <label className="mb-2 block text-[13px] text-[#4B5563]">每人金额</label>
            <div className="flex h-[48px] w-full items-center rounded-lg border border-[#E5E7EB] px-4 focus-within:border-[#0062FF]">
              <span className="mr-1 text-[15px] font-semibold text-[#1A1A1A]">¥</span>
              <input
                type="number"
                inputMode="decimal"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="0.00"
                className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[#1A1A1A] outline-none placeholder:text-[#9CA3AF]"
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-[13px] text-[#4B5563]">截止日期（选填）</label>
            <input
              type="date"
              value={formDeadline}
              onChange={(e) => setFormDeadline(e.target.value)}
              className="h-[48px] w-full rounded-lg border border-[#E5E7EB] px-4 text-[14px] text-[#1A1A1A] outline-none focus:border-[#0062FF]"
            />
            <div className="mt-1.5 text-[11px] text-[#9CA3AF]">
              超过截止日期不会关闭账单，仍可补登记
            </div>
          </div>
        </div>
      </BottomSheet>
    </PageLayout>
  );
}