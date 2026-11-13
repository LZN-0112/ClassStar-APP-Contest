import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  BarChart3,
  Plus,
  Trash2,
  CalendarDays,
  CircleDot,
  ListChecks,
} from 'lucide-react';

const ACCENT = '#3D6BE5';
const MAX_OPTIONS = 20;

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function toLocalInput(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function fromNow(offsetMs: number) {
  const date = new Date(Date.now() + offsetMs);
  date.setSeconds(0, 0);
  return toLocalInput(date);
}

function tonight() {
  const date = new Date();
  date.setHours(22, 0, 0, 0);
  if (date.getTime() <= Date.now()) {
    date.setDate(date.getDate() + 1);
  }
  return toLocalInput(date);
}

function formatDisplay(value: string) {
  if (!value) return '未设置';
  const [date, time] = value.split('T');
  return `${date.replace(/-/g, '/')} ${time || ''}`.trim();
}

export default function PublishVote() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [deadline, setDeadline] = useState('');
  const [voteType, setVoteType] = useState<'single' | 'multiple'>('single');

  const classId = user?.classId;
  const canManage =
    user?.roleLevel === 'owner' || user?.roleLevel === 'admin' || user?.isCommittee === true;

  const presets = useMemo(
    () => [
      { key: '1h', label: '1 小时后', value: fromNow(3600000) },
      { key: 'tonight', label: '今晚 22:00', value: tonight() },
      { key: 'tomorrow', label: '明天此刻', value: fromNow(86400000) },
      { key: '3d', label: '3 天后', value: fromNow(3 * 86400000) },
      { key: '7d', label: '一周后', value: fromNow(7 * 86400000) },
    ],
    []
  );

  const handleOptionChange = (index: number, value: string) => {
    setOptions((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const addOption = () => {
    if (options.length >= MAX_OPTIONS) {
      toast.error(`最多 ${MAX_OPTIONS} 个选项`);
      return;
    }
    setOptions((prev) => [...prev, '']);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) {
      toast.error('至少需要 2 个选项');
      return;
    }
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const emptyOptionIndex = options.findIndex((item) => !item.trim());
  const deadlineDate = deadline ? new Date(deadline) : null;
  const deadlinePast = deadlineDate ? deadlineDate.getTime() <= Date.now() : false;
  const canSubmit =
    title.trim().length > 0 &&
    deadline.length > 0 &&
    !deadlinePast &&
    emptyOptionIndex === -1 &&
    !loading;

  const tip = !title.trim()
    ? '请先填写投票标题'
    : emptyOptionIndex !== -1
      ? `请填写选项 ${emptyOptionIndex + 1} 的内容`
      : !deadline
        ? '请选择截止时间'
        : deadlinePast
          ? '截止时间需晚于当前时间'
          : '';

  const handleSubmit = async () => {
    if (loading || !canSubmit) return;
    if (!classId) {
      toast.error('请先加入班级');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/classes/${classId}/votes`, {
        title: title.trim(),
        voteType,
        deadline: new Date(deadline).toISOString(),
        options: options.map((item) => item.trim()),
      });
      toast.success('投票发布成功');
      navigate('/vote-list', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '发布失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout
      title="发起投票"
      variant="a"
      decor={<BarChart3 className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}
    >
      <div className="flex min-h-full w-full flex-col gap-4">
        {!canManage && (
          <div className="rounded-xl bg-[#FFF7ED] px-3 py-2.5 font-body text-[12px] leading-relaxed text-[#B45309]">
            仅班委可以发起投票，你可以先浏览其他投票。
          </div>
        )}

        {/* 标题 */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="font-body text-[12px] font-semibold text-[#64748B]">投票标题</span>
            <span className="font-data text-[11px] text-[#94A3B8]">{title.length}/50</span>
          </div>
          <input
            type="text"
            value={title}
            maxLength={50}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="例如：本周班会时间投票"
            className="mt-2 w-full bg-transparent font-body text-[15px] font-medium text-[#1A1A1A] placeholder:text-[#CBD5E1] outline-none"
          />
        </div>

        {/* 选项 */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="font-body text-[12px] font-semibold text-[#64748B]">投票选项</span>
            <span className="font-body text-[11px] text-[#94A3B8]">
              共 {options.length} 个 · 至少 2 个
            </span>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {options.map((option, index) => (
              <div
                key={index}
                className="flex h-[46px] w-full items-center rounded-xl bg-[#F7F9FD] px-3"
              >
                <span
                  className="mr-2 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full font-data text-[11px] font-semibold"
                  style={{ backgroundColor: '#E4ECFD', color: ACCENT }}
                >
                  {index + 1}
                </span>
                <input
                  type="text"
                  value={option}
                  maxLength={40}
                  onChange={(event) => handleOptionChange(index, event.target.value)}
                  placeholder={`选项 ${index + 1}`}
                  className="min-w-0 flex-1 bg-transparent font-body text-[14px] font-medium text-[#1A1A1A] placeholder:text-[#CBD5E1] outline-none"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#94A3B8] active:bg-[#E9EEF7] active:text-[#EF4444]"
                    aria-label={`删除选项 ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {options.length < MAX_OPTIONS && (
            <button
              type="button"
              onClick={addOption}
              className="mt-2 flex h-[40px] w-full items-center justify-center gap-1 rounded-xl border border-dashed border-[#CBD5E1] font-body text-[13px] text-[#64748B] active:bg-[#F8FAFC]"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              添加选项
            </button>
          )}
        </div>

        {/* 截止时间 */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-body text-[12px] font-semibold text-[#64748B]">
              <CalendarDays className="h-3.5 w-3.5 text-[#94A3B8]" strokeWidth={1.8} />
              截止时间
            </span>
            <span
              className={`font-data text-[11px] ${deadline ? 'text-[#3D6BE5]' : 'text-[#94A3B8]'}`}
            >
              {formatDisplay(deadline)}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {presets.map((preset) => {
              const active = deadline === preset.value;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => setDeadline(preset.value)}
                  className={`rounded-full border px-3 py-[6px] font-body text-[12px] transition-colors ${
                    active
                      ? 'border-[#3D6BE5] bg-[#EDF1FD] font-semibold text-[#3D6BE5]'
                      : 'border-[#E2E8F0] bg-white text-[#64748B] active:bg-[#F8FAFC]'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between rounded-xl bg-[#F7F9FD] px-3 py-2.5">
            <span className="font-body text-[12px] text-[#64748B]">自定义日期与时间</span>
            <input
              type="datetime-local"
              value={deadline}
              min={toLocalInput(new Date())}
              onChange={(event) => setDeadline(event.target.value)}
              className="bg-transparent font-data text-[12px] text-[#1E293B] outline-none"
            />
          </div>
        </div>

        {/* 投票类型 */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
          <span className="font-body text-[12px] font-semibold text-[#64748B]">投票类型</span>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(
              [
                {
                  value: 'single',
                  label: '单选',
                  desc: '每人只能选 1 项',
                  icon: CircleDot,
                },
                {
                  value: 'multiple',
                  label: '多选',
                  desc: '每人可选多项',
                  icon: ListChecks,
                },
              ] as const
            ).map((item) => {
              const active = voteType === item.value;
              const Icon = item.icon;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setVoteType(item.value)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    active
                      ? 'border-[#3D6BE5] bg-[#F1F5FF]'
                      : 'border-[#E2E8F0] bg-white active:bg-[#F8FAFC]'
                  }`}
                >
                  <div
                    className={`flex items-center gap-1.5 font-body text-[13px] font-semibold ${
                      active ? 'text-[#3D6BE5]' : 'text-[#1E293B]'
                    }`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.8} />
                    {item.label}
                  </div>
                  <div className="mt-1 font-body text-[11px] text-[#94A3B8]">{item.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-[8px] flex-1" />

        {tip && (
          <div className="text-center font-body text-[11px] text-[#B45309]">{tip}</div>
        )}

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!canSubmit}
          className={`flex h-[50px] w-full shrink-0 items-center justify-center rounded-xl font-body text-[15px] font-semibold transition-opacity ${
            canSubmit
              ? 'text-white shadow-[0_8px_20px_-10px_rgba(61,107,229,0.9)] active:opacity-80'
              : 'cursor-not-allowed bg-[#E5E7EB] text-[#94A3B8]'
          }`}
          style={canSubmit ? { backgroundColor: ACCENT } : undefined}
        >
          {loading ? '发布中...' : '发布投票'}
        </button>
      </div>
    </PageLayout>
  );
}
