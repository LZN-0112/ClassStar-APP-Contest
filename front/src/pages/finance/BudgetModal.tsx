import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div className="w-full max-w-[320px] rounded-2xl bg-white p-5">
        {/* 标题栏 */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">
            设置{title}预算
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 表单 */}
        <div className="space-y-4">
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

        {/* 按钮 */}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
