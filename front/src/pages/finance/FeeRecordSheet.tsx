import { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ExternalLink,
  Loader2,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import BottomSheet from '@/components/ui/BottomSheet';
import { api, resolveFileUrl } from '@/lib/api';

export interface FeeRecordDetail {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  remark?: string | null;
  billUrl?: string | null;
  createTime?: string;
  create_time?: string;
}

interface FeeRecordSheetProps {
  record: FeeRecordDetail;
  feeType: 'class' | 'group';
  canManage: boolean;
  onClose: () => void;
  onChanged: () => void;
}

function splitRemark(remark?: string | null) {
  const text = (remark || '').trim();
  const matched = text.match(/^【(.+?)】([\s\S]*)$/);
  if (matched) {
    return { category: matched[1], note: matched[2].trim() };
  }
  return { category: '', note: text };
}

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;
}

export default function FeeRecordSheet({
  record,
  feeType,
  canManage,
  onClose,
  onChanged,
}: FeeRecordSheetProps) {
  const { category, note } = splitRemark(record.remark);
  const [editing, setEditing] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>(record.type);
  const [amount, setAmount] = useState(String(record.amount));
  const [remark, setRemark] = useState(note);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isIncome = record.type === 'income';

  const handleSave = async () => {
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error('请输入大于 0 的金额');
      return;
    }
    const nextRemark = [category ? `【${category}】` : '', remark.trim()]
      .filter(Boolean)
      .join('');
    setSaving(true);
    try {
      await api.put(`/fee/update/${record.id}`, {
        type,
        amount: Math.round(amountNum * 100) / 100,
        remark: nextRemark || undefined,
      }, { params: { feeType } });
      toast.success('记录已更新');
      onChanged();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || '更新失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('删除后不可恢复，确认删除这条记录吗？')) return;
    setDeleting(true);
    try {
      await api.delete(`/fee/delete/${record.id}`, { params: { feeType } });
      toast.success('记录已删除');
      onChanged();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || '删除失败，请重试');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={editing ? '编辑记录' : category || (isIncome ? '班费收入' : '班费支出')}
      subtitle={formatDateTime(record.createTime || record.create_time)}
      maxHeight="85vh"
      locked={saving || deleting}
      headerExtra={
        <button
          type="button"
          aria-label="关闭"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[#64748B] active:opacity-70"
        >
          <X className="h-4 w-4" strokeWidth={2.5} />
        </button>
      }
      footer={
        editing ? (
          canManage ? (
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="flex h-[48px] w-full items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(180deg,#2E7DFF_0%,#0062FF_100%)] font-body text-[15px]/[normal] font-semibold text-white shadow-[0_10px_20px_rgba(0,98,255,0.24)] active:opacity-90 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              保存修改
            </button>
          ) : undefined
        ) : canManage ? (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex h-[48px] flex-1 items-center justify-center rounded-[14px] bg-[#F2F5F9] font-body text-[15px]/[normal] font-semibold text-[#475569] active:opacity-80"
            >
              编辑
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className="flex h-[48px] flex-1 items-center justify-center gap-1.5 rounded-[14px] bg-[#FEF2F2] font-body text-[15px]/[normal] font-semibold text-[#DC2626] active:opacity-80 disabled:opacity-60"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              删除
            </button>
          </div>
        ) : undefined
      }
    >
        {editing ? (
          <div className="flex flex-col gap-3 px-5 pb-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('income')}
                className={`flex h-10 items-center justify-center gap-1.5 rounded-lg text-[13px] font-body font-semibold ${
                  type === 'income' ? 'bg-[#16A34A] text-white' : 'bg-[#F1F5F9] text-[#64748B]'
                }`}
              >
                <ArrowDownLeft className="h-4 w-4" strokeWidth={2} />
                收入
              </button>
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`flex h-10 items-center justify-center gap-1.5 rounded-lg text-[13px] font-body font-semibold ${
                  type === 'expense' ? 'bg-[#DC2626] text-white' : 'bg-[#F1F5F9] text-[#64748B]'
                }`}
              >
                <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
                支出
              </button>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] px-4 py-3">
              <span className="text-[15px] font-heading font-bold text-[#1A1A1A]">¥</span>
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-[18px] font-heading font-bold text-[#1A1A1A] outline-none"
              />
            </div>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={2}
              placeholder="备注说明"
              className="w-full resize-none rounded-xl bg-[#F8FAFC] p-3 text-[13px] font-body text-[#1A1A1A] outline-none placeholder:text-[#94A3B8]"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4 px-5 pb-2">
            <div className="rounded-xl bg-[#F8FAFC] p-4">
              <div className="text-[11px] font-caption text-[#94A3B8]">金额</div>
              <div
                className={`mt-1 text-[28px] font-heading font-bold ${
                  isIncome ? 'text-[#16A34A]' : 'text-[#DC2626]'
                }`}
              >
                {isIncome ? '+' : '-'} ¥{formatMoney(record.amount)}
              </div>
              {note && (
                <div className="mt-2 border-t border-[#EEF2F7] pt-2 text-[12px] font-body leading-5 text-[#475569]">
                  {note}
                </div>
              )}
            </div>

            {record.billUrl && (
              <a
                href={resolveFileUrl(record.billUrl)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-xl border border-[#E2E8F0] px-4 py-3 text-[13px] font-body font-semibold text-[#0062FF]"
              >
                查看收支凭证
                <ExternalLink className="h-4 w-4" strokeWidth={2} />
              </a>
            )}

            {!canManage && (
              <div className="text-center text-[11px] font-caption text-[#94A3B8]">
                仅班委可修改账目
              </div>
            )}
          </div>
        )}
    </BottomSheet>
  );
}
