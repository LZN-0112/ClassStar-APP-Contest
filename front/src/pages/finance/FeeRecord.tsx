import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Camera,
  Check,
  Loader2,
  ShieldAlert,
  Wallet,
  X,
} from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { api, resolveFileUrl } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { toast } from 'sonner';

type FeeType = 'income' | 'expense';

const CATEGORIES: Record<'class' | 'group', Record<FeeType, string[]>> = {
  class: {
    income: ['班费收缴', '活动返款', '其他收入'],
    expense: ['活动支出', '学习用品', '班级建设', '其他支出'],
  },
  group: {
    income: ['团费收缴', '活动返款', '其他收入'],
    expense: ['活动支出', '材料采购', '其他支出'],
  },
};

const MAX_BILL_SIZE = 5 * 1024 * 1024;

interface FeeRecordProps {
  defaultFeeType?: 'class' | 'group';
}

export default function FeeRecord({ defaultFeeType = 'class' }: FeeRecordProps) {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const classId = user?.classId;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLeague = defaultFeeType === 'group';
  const title = isLeague ? '团费' : '班费';
  const categoryOptions = CATEGORIES[defaultFeeType];

  const [type, setType] = useState<FeeType>('income');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categoryOptions.income[0]);
  const [note, setNote] = useState('');
  const [billKey, setBillKey] = useState('');
  const [billPreviewUrl, setBillPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canManage =
    user?.roleLevel === 'owner' ||
    user?.roleLevel === 'admin' ||
    user?.isCommittee === true;

  const switchType = (next: FeeType) => {
    setType(next);
    setCategory(categoryOptions[next][0]);
  };

  const handleBillChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !classId) return;
    if (!/^image\/(jpeg|png)$/.test(file.type)) {
      toast.error('仅支持 jpg / png 格式的凭证图片');
      return;
    }
    if (file.size > MAX_BILL_SIZE) {
      toast.error('凭证图片不能超过 5MB');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/fee/upload-bill', formData, {
        params: { classId },
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });
      const data = res.data?.data ?? res.data;
      const key = data?.billKey as string | undefined;
      const url = data?.billUrl as string | undefined;
      if (!key) throw new Error('上传失败');
      setBillKey(key);
      setBillPreviewUrl(url || '');
      toast.success('凭证已上传');
    } catch (err: any) {
      toast.error(err?.message || '凭证上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!classId) {
      toast.error('未找到班级信息');
      return;
    }
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error('请输入大于 0 的金额');
      return;
    }
    if (amountNum > 999999) {
      toast.error('单笔金额不能超过 999999 元');
      return;
    }

    const remarkParts = [
      category ? `【${category}】` : '',
      note.trim(),
    ].filter(Boolean);
    const remark = remarkParts.join('') || category || undefined;

    setSubmitting(true);
    try {
      await api.post('/fee/add', {
        classId,
        feeType: defaultFeeType,
        type,
        amount: Math.round(amountNum * 100) / 100,
        remark,
        billKey: billKey || undefined,
      });
      toast.success(
        type === 'income' ? `收入已记入${title}账本` : `支出已记入${title}账本`,
      );
      navigate('/fee-ledger', {
        replace: true,
        state: { type: isLeague ? 'league' : 'class' },
      });
    } catch (err: any) {
      toast.error(err?.message || '保存失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canManage) {
    return (
      <PageLayout
        title={`${title}记账`}
        variant="a"
        decor={<Wallet className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FEF2F2]">
            <ShieldAlert className="h-8 w-8 text-[#DC2626]" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <div className="text-[16px] font-heading font-bold text-[#1A1A1A]">仅班委可记账</div>
            <div className="mt-1.5 text-[12px] font-body text-[#64748B]">
              你可以查看{title}明细，如需记账请联系班委
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/fee-ledger')}
            className="rounded-full bg-[#0062FF] px-6 py-2.5 text-[14px] font-body font-semibold text-white"
          >
            查看班费明细
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={`${title}记账`}
      variant="a"
      decor={<Wallet className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}
    >
      <div className="flex w-full flex-1 flex-col gap-4">
        {/* 收支类型 */}
        <div className="grid w-full grid-cols-2 gap-2">
          {[
            { value: 'income' as FeeType, label: '收入', icon: ArrowDownLeft, color: '#16A34A', bg: '#ECFDF5' },
            { value: 'expense' as FeeType, label: '支出', icon: ArrowUpRight, color: '#DC2626', bg: '#FEF2F2' },
          ].map((item) => {
            const active = type === item.value;
            const Icon = item.icon;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => switchType(item.value)}
                className={`flex h-[52px] items-center justify-center gap-2 rounded-xl border text-[15px] font-body font-semibold transition-all ${
                  active
                    ? 'border-transparent text-white shadow-[0_8px_20px_-10px_#0062FF]'
                    : 'border-[#E2E8F0] bg-white text-[#64748B]'
                }`}
                style={{ backgroundColor: active ? item.color : undefined }}
              >
                <Icon className="h-5 w-5" strokeWidth={2.2} />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* 金额 */}
        <div className="rounded-2xl bg-white p-5 shadow-soft">
          <div className="text-[12px] font-body font-semibold text-[#64748B]">
            {type === 'income' ? '收入金额' : '支出金额'}
          </div>
          <div className="mt-2 flex items-end gap-2 border-b border-[#EEF2F7] pb-3">
            <span className="pb-1 font-heading text-[24px] font-bold text-[#1A1A1A]">¥</span>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="min-w-0 flex-1 bg-transparent font-heading text-[34px]/[1.1] font-bold text-[#1A1A1A] outline-none placeholder:text-[#CBD5E1]"
            />
            {amount && (
              <button
                type="button"
                aria-label="清空金额"
                onClick={() => setAmount('')}
                className="mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#F1F5F9] text-[#64748B]"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            )}
          </div>
          <div className="mt-2 text-[11px] font-caption text-[#94A3B8]">
            支持两位小数，保存后可在账本中修改或删除
          </div>
        </div>

        {/* 分类 */}
        <div className="rounded-2xl bg-white p-4 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[13px] font-body font-semibold text-[#1A1A1A]">收支分类</div>
            <div className="text-[11px] font-caption text-[#94A3B8]">用于账本统计与查找</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {categoryOptions[type].map((item) => {
              const active = category === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`flex h-8 items-center gap-1 rounded-full px-3.5 text-[12px] font-body font-semibold transition-colors ${
                    active
                      ? 'bg-[#0062FF] text-white'
                      : 'bg-[#F1F5F9] text-[#64748B]'
                  }`}
                >
                  {active && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        {/* 备注 */}
        <div className="rounded-2xl bg-white p-4 shadow-soft">
          <div className="mb-2 text-[13px] font-body font-semibold text-[#1A1A1A]">备注说明</div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              type === 'income'
                ? `如：3 月${title}收取，每人 ${isLeague ? 10 : 50} 元`
                : '如：购买运动会物资'
            }
            rows={3}
            maxLength={200}
            className="w-full resize-none rounded-xl bg-[#F8FAFC] p-3 text-[13px] font-body leading-5 text-[#1A1A1A] outline-none placeholder:text-[#94A3B8]"
          />
          <div className="mt-1 text-right text-[10px] font-data text-[#94A3B8]">{note.length}/200</div>
        </div>

        {/* 上传凭证 */}
        <div className="rounded-2xl bg-white p-4 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[13px] font-body font-semibold text-[#1A1A1A]">收支凭证</div>
            <div className="text-[11px] font-caption text-[#94A3B8]">选填 · jpg/png ≤ 5MB</div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={handleBillChange}
          />
          {billKey ? (
            <div className="relative overflow-hidden rounded-xl border border-[#E2E8F0]">
              <img
                src={resolveFileUrl(billPreviewUrl)}
                alt="收支凭证"
                className="h-32 w-full object-cover"
              />
              <button
                type="button"
                aria-label="移除凭证"
                onClick={() => {
                  setBillKey('');
                  setBillPreviewUrl('');
                }}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <X className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex h-[84px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] text-[12px] font-body font-medium text-[#64748B] active:bg-[#F1F5F9] disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-[#0062FF]" />
                  正在上传...
                </>
              ) : (
                <>
                  <Camera className="h-5 w-5 text-[#0062FF]" strokeWidth={2} />
                  拍照或从相册选择凭证
                </>
              )}
            </button>
          )}
        </div>

        <div className="mt-1 h-2" />

        <button
          type="button"
          disabled={submitting || uploading}
          onClick={handleSubmit}
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(-98.571deg,_#0062FF_14.645%,_#3B82F6_85.355%)] text-[16px] font-body font-semibold text-white shadow-[0_8px_20px_-8px_#0062FF99] active:scale-[0.99] disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            '保存记录'
          )}
        </button>
        <div className="pb-1 text-center text-[10px] font-caption text-[#94A3B8]">
          记录保存后全班可在账本中查看，班委可随时修改
        </div>
      </div>
    </PageLayout>
  );
}
