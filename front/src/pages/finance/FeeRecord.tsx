import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';

type FeeType = 'income' | 'expense';

export default function FeeRecord() {
  const navigate = useNavigate();
  const [type, setType] = useState<FeeType>('income');
  const [form, setForm] = useState({
    amount: '',
    category: '',
    note: '',
  });

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    navigate('/fee-ledger', { replace: true });
  };

  return (
    <PageLayout
      title="班费记账"
      variant="a"
      decor={<Wallet className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}
    >
      <div className="flex flex-1 flex-col gap-[20px]">
        <div
          data-pencil-name="Type Switch"
          className="box-border w-full h-[44px] shrink-0 flex flex-row gap-0 p-[4px] justify-start items-start bg-[#F1F5F9] rounded-xl"
        >
          <button
            type="button"
            onClick={() => setType('income')}
            className={`box-border [flex:1_1_0] h-[36px] flex flex-col gap-0 justify-center items-center rounded-[10px] ${
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
            className={`box-border [flex:1_1_0] h-[36px] flex flex-col gap-0 justify-center items-center rounded-[10px] ${
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
          className="box-border w-full h-[56px] shrink-0 flex flex-col gap-0 p-[0px_16px] justify-center items-start bg-[#FFFFFF] [border:1px_solid_#E2E8F0] rounded-lg"
        >
          <input
            type="number"
            value={form.amount}
            onChange={(e) => handleChange('amount', e.target.value)}
            placeholder="请输入金额"
            className="w-full bg-transparent text-[14px] font-body font-medium text-[#1A1A1A] placeholder:text-[#94A3B8] outline-none"
          />
        </div>

        <div
          data-pencil-name="Input Field"
          className="box-border w-full h-[56px] shrink-0 flex flex-col gap-0 p-[0px_16px] justify-center items-start bg-[#FFFFFF] [border:1px_solid_#E2E8F0] rounded-lg"
        >
          <input
            type="text"
            value={form.category}
            onChange={(e) => handleChange('category', e.target.value)}
            placeholder="请选择分类"
            className="w-full bg-transparent text-[14px] font-body font-medium text-[#1A1A1A] placeholder:text-[#94A3B8] outline-none"
          />
        </div>

        <div
          data-pencil-name="Textarea"
          className="box-border w-full h-[100px] shrink-0 flex flex-col gap-0 p-4 justify-start items-start bg-[#FFFFFF] [border:1px_solid_#E2E8F0] rounded-lg"
        >
          <textarea
            value={form.note}
            onChange={(e) => handleChange('note', e.target.value)}
            placeholder="请输入备注..."
            className="w-full h-full resize-none bg-transparent text-[14px] font-body font-medium text-[#1A1A1A] placeholder:text-[#94A3B8] outline-none"
          />
        </div>

        <button
          type="button"
          data-pencil-name="Upload Area"
          className="box-border w-full h-[100px] shrink-0 flex flex-col gap-2 justify-center items-center bg-[#F8FAFC] [border:1px_solid_#E2E8F0] rounded-xl"
        >
          <svg
            data-pencil-name="Icon-camera"
            viewBox="0 0 24 24"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
            className="box-border w-[28px] h-[28px] shrink-0 overflow-visible"
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

        <div
          data-pencil-name="Spacer"
          className="box-border w-full h-[20px] shrink-0 flex flex-row gap-0 justify-start items-start bg-[#00000000]"
        ></div>

        <button
          type="button"
          onClick={handleSubmit}
          data-pencil-name="Button Primary"
          className="box-border w-full h-[52px] shrink-0 [box-shadow:0px_4px_16px_0px_#0000001A] flex flex-col gap-0 justify-center items-center bg-[#0062FF] rounded-xl"
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
