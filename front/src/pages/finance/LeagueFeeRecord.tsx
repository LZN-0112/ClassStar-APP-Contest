import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { toast } from 'sonner';

type FeeType = 'income' | 'expense';

const categories: Record<FeeType, string[]> = {
  income: ['团费收缴'],
  expense: ['活动支出', '材料采购'],
};

export default function LeagueFeeRecord() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const classId = user?.classId;
  const [type, setType] = useState<FeeType>('income');
  const [form, setForm] = useState({
    amount: '',
    category: '',
    note: '',
  });

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    const amount = parseFloat(form.amount) || 0;
    if (amount <= 0) {
      toast.error('请输入有效金额');
      return;
    }
    if (!classId) {
      toast.error('未找到班级信息');
      return;
    }

    try {
      await api.post('/fee/add', {
        classId,
        feeType: 'group',
        type,
        amount,
        remark: form.note || (type === 'income' ? '团费收缴' : '团费支出'),
      });
      toast.success('记录保存成功');
      navigate('/fee-ledger', { state: { type: 'league' } });
    } catch (error: any) {
      console.error('保存记录失败:', error);
      toast.error(error.message || '保存失败，请重试');
    }
  };

  return (
    <PageLayout
      title="团费记账"
      variant="a"
      decor={<Wallet className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}
    >
      <div className="flex w-full flex-1 flex-col gap-5">
        <div
          data-pencil-name="Type Switch"
          className="box-border flex h-[44px] w-full shrink-0 flex-row items-start justify-start gap-0 rounded-xl bg-[#F1F5F9] p-1"
        >
          <button
            type="button"
            onClick={() => setType('income')}
            className={`box-border flex h-[36px] flex-1 flex-col items-center justify-center rounded-[10px] ${
              type === 'income' ? 'bg-[#FFFFFF]' : 'bg-[#00000000]'
            }`}
          >
            <div
              className={`text-[14px]/[normal] box-border font-body font-semibold text-left [white-space:nowrap] ${
                type === 'income' ? 'text-[#22C55E]' : 'text-[#64748B]'
              }`}
            >
              收入
            </div>
          </button>
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`box-border flex h-[36px] flex-1 flex-col items-center justify-center rounded-[10px] ${
              type === 'expense' ? 'bg-[#FFFFFF]' : 'bg-[#00000000]'
            }`}
          >
            <div
              className={`text-[14px]/[normal] box-border font-body font-semibold text-left [white-space:nowrap] ${
                type === 'expense' ? 'text-[#EF4444]' : 'text-[#64748B]'
              }`}
            >
              支出
            </div>
          </button>
        </div>

        <div
          data-pencil-name="Input Field"
          className="box-border flex h-[56px] w-full shrink-0 flex-col justify-center rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-4"
        >
          <input
            type="number"
            value={form.amount}
            onChange={(e) => handleChange('amount', e.target.value)}
            placeholder="请输入金额"
            className="w-full bg-transparent text-[14px] font-body font-medium text-[#1A1A1A] placeholder:text-[#94A3B8] outline-none"
          />
        </div>

        <div className="box-border flex w-full flex-col gap-2">
          <div className="text-[11px]/[normal] font-body font-semibold text-[#6B7280]">收支分类</div>
          <div className="box-border flex w-full flex-row flex-wrap gap-2">
            {categories[type].map((cat) => {
              const active = form.category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleChange('category', cat)}
                  className={`box-border flex h-[32px] shrink-0 flex-col items-center justify-center rounded-full px-4 text-[13px]/[normal] font-body font-semibold transition-colors ${
                    active ? 'bg-[#0062FF] text-white' : 'bg-[#F1F5F9] text-[#64748B]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        <div
          data-pencil-name="Textarea"
          className="box-border flex h-[100px] w-full shrink-0 flex-col items-start justify-start rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] p-4"
        >
          <textarea
            value={form.note}
            onChange={(e) => handleChange('note', e.target.value)}
            placeholder="请输入备注..."
            className="h-full w-full resize-none bg-transparent text-[14px] font-body font-medium text-[#1A1A1A] placeholder:text-[#94A3B8] outline-none"
          />
        </div>

        <button
          type="button"
          data-pencil-name="Upload Area"
          className="box-border flex h-[100px] w-full shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
        >
          <svg
            data-pencil-name="Icon-camera"
            viewBox="0 0 24 24"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
            className="box-border h-[28px] w-[28px] shrink-0 overflow-visible"
          >
            <path
              d="M23 19a2 2 0 0 1-2 2h-18a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z m-11-2a4 4 0 1 0 0-8 4 4 0 0 0 0 8"
              fill="none"
            ></path>
            <path
              d="M23 19a2 2 0 0 1-2 2h-18a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z m-11-2a4 4 0 1 0 0-8 4 4 0 0 0 0 8"
              fill="none"
              stroke="#94A3B8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            ></path>
          </svg>
          <div
            data-pencil-name="Text"
            className="text-[11px]/[normal] box-border text-[#94A3B8] font-body font-medium text-left [white-space:nowrap]"
          >
            上传凭证
          </div>
        </button>

        <div className="box-border w-full shrink-0 flex-1"></div>

        <button
          type="button"
          onClick={handleSubmit}
          data-pencil-name="Button Primary"
          className="box-border flex h-[52px] w-full shrink-0 flex-col items-center justify-center rounded-xl bg-[#0062FF] [box-shadow:0px_4px_16px_0px_#0000001A] active:opacity-90"
        >
          <div
            data-pencil-name="Text"
            className="text-[16px]/[normal] box-border w-full text-center text-[#FFFFFF] font-body font-semibold [white-space:nowrap]"
          >
            保存记录
          </div>
        </button>
      </div>
    </PageLayout>
  );
}
