import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import BottomSheet from '@/components/ui/BottomSheet';
import { api } from '@/lib/api';

interface BudgetModalProps {
  classId: string;
  feeType: 'class' | 'group';
  title: string; // '班费' 或 '团费'
  year: number;
  month: number;
  onClose: () => void;
  onSaved: () => void;
}

export default function BudgetModal({
  classId,
  feeType,
  title,
  year,
  month,
  onClose,
  onSaved,
}: BudgetModalProps) {
  // 根据月份判断学期：1-7月为第一学期，8-12月为第二学期
  const defaultSemester = month >= 8 ? '2' : '1';
  const defaultAcademicYear =
    month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;

  const [academicYear, setAcademicYear] = useState(defaultAcademicYear);
  const [semester, setSemester] = useState(defaultSemester);
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(false);

  // 加载已有预算
  useEffect(() => {
    const loadBudget = async () => {
      try {
        const res = await api.get('/fee/budget', {
          params: { classId, feeType, academicYear, semester },
        });
        const data = res.data.data;
        if (data && data.length > 0) {
          const budget = data[0];
          setAmount(String(budget.amount));
          setRemark(budget.remark || '');
        }
      } catch (err) {
        // 查询失败不阻塞用户操作
        console.error('加载预算失败:', err);
      }
    };
    loadBudget();
  }, [classId, feeType, academicYear, semester]);

  const handleSave = async () => {
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      toast.error('预算金额必须大于0');
      return;
    }

    setLoading(true);
    try {
      await api.post('/fee/budget/set', {
        classId,
        feeType,
        academicYear,
        semester,
        amount: amountNum,
        remark: remark.trim() || undefined,
      });
      toast.success('预算已保存');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || '保存预算失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={`设置${title}预算`}
      maxHeight="85vh"
      locked={loading}
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-[48px] flex-1 rounded-[14px] bg-[#F2F5F9] font-body text-[15px]/[normal] font-semibold text-[#475569] active:opacity-80"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="h-[48px] flex-1 rounded-[14px] bg-[linear-gradient(180deg,#2E7DFF_0%,#0062FF_100%)] font-body text-[15px]/[normal] font-semibold text-white shadow-[0_10px_20px_rgba(0,98,255,0.24)] active:opacity-90 disabled:opacity-50"
          >
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      }
    >
        {/* 表单 */}
        <div className="space-y-4 px-5 pb-2">
          {/* 学年 */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              学年
            </label>
            <input
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="如：2024-2025"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* 学期 */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              学期
            </label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="1">第一学期</option>
              <option value="2">第二学期</option>
            </select>
          </div>

          {/* 预算金额 */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              预算金额（元）
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="请输入预算金额"
              min="0"
              step="0.01"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* 备注 */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              备注（可选）
            </label>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="预算用途说明"
              rows={2}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
    </BottomSheet>
  );
}
