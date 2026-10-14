import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, ChevronDown } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function PublishVote() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [deadline, setDeadline] = useState('');
  const [voteType, setVoteType] = useState<'single' | 'multiple'>('single');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);

  const classId = user?.classId;

  const handleOptionChange = (index: number, value: string) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  };

  const addOption = () => {
    if (options.length >= 20) {
      toast.error('最多20个选项');
      return;
    }
    setOptions((prev) => [...prev, '']);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) {
      toast.error('至少需要2个选项');
      return;
    }
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (loading) return;
    if (!title.trim()) {
      toast.error('请输入投票标题');
      return;
    }
    if (!deadline) {
      toast.error('请选择截止时间');
      return;
    }
    const emptyOptions = options.filter((o) => !o.trim());
    if (emptyOptions.length > 0) {
      toast.error('请填写所有选项内容');
      return;
    }
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
        options: options.map((o) => o.trim()),
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
    <>
      <PageLayout
        title="发起投票"
        variant="a"
        decor={<BarChart3 className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}
      >
        <div className="flex min-h-full w-full flex-col gap-5">
          {/* 投票标题 */}
          <div
            data-pencil-name="Input Field 投票标题"
            className="box-border flex h-[56px] w-full shrink-0 flex-col justify-center rounded-xl border border-[#E2E8F0] bg-white px-4"
          >
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入投票标题"
              className="w-full bg-transparent font-body text-[14px] font-medium text-[#1A1A1A] placeholder:text-[#94A3B8] outline-none"
            />
          </div>

          {/* 投票选项 */}
          <div
            data-pencil-name="Options Card"
            className="box-border flex w-full flex-col gap-2 rounded-xl border border-[#E2E8F0] bg-white p-4"
          >
            <div className="text-[13px] font-body font-medium text-[#6B7280]">
              投票选项
            </div>
            {options.map((option, index) => (
              <div
                key={index}
                data-pencil-name={`Option ${index + 1}`}
                className="box-border flex h-[44px] w-full shrink-0 flex-row items-center rounded-lg bg-[#0062FF0D] px-3"
              >
                <span className="mr-2 text-[13px] font-body font-medium text-[#0062FF]">{index + 1}.</span>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`选项${index + 1}`}
                  className="flex-1 bg-transparent font-body text-[14px] font-medium text-[#1A1A1A] outline-none"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    className="ml-2 text-[13px] text-[#94A3B8] active:text-[#EF4444]"
                  >
                    删除
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addOption}
              className="mt-1 flex h-[36px] w-full items-center justify-center rounded-lg border border-dashed border-[#CBD5E1] text-[13px] font-body text-[#64748B] active:bg-[#F8FAFC]"
            >
              + 添加选项
            </button>
          </div>

          {/* 设置卡片 */}
          <div
            data-pencil-name="Settings Card"
            className="box-border flex w-full flex-col rounded-xl border border-[#E2E8F0] bg-white"
          >
            {/* 截止时间 */}
            <div className="flex h-[48px] w-full flex-row items-center justify-between border-b border-[#F3F4F6] px-4">
              <div className="text-[14px] font-body font-normal text-[#1A1A1A]">
                截止时间
              </div>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="bg-transparent text-right text-[14px] font-body font-normal text-[#0062FF] outline-none"
              />
            </div>

            {/* 投票类型 */}
            <div
              className="relative flex h-[48px] w-full flex-row items-center justify-between border-b border-[#F3F4F6] px-4"
            >
              <div className="text-[14px] font-body font-normal text-[#1A1A1A]">
                投票类型
              </div>
              <button
                type="button"
                onClick={() => setShowTypePicker(!showTypePicker)}
                className="flex flex-row items-center gap-1 text-[14px] font-body font-normal text-[#0062FF]"
              >
                {voteType === 'single' ? '单选' : '多选'}
                <ChevronDown className="h-4 w-4 text-[#94A3B8]" />
              </button>
              {showTypePicker && (
                <div className="absolute right-4 top-[48px] z-10 w-[120px] rounded-lg border border-[#E2E8F0] bg-white shadow-lg">
                  <button
                    type="button"
                    onClick={() => { setVoteType('single'); setShowTypePicker(false); }}
                    className={`w-full px-4 py-2 text-left text-[14px] font-body ${voteType === 'single' ? 'bg-[#EBF4FF] text-[#0062FF]' : 'text-[#1A1A1A]'}`}
                  >
                    单选
                  </button>
                  <button
                    type="button"
                    onClick={() => { setVoteType('multiple'); setShowTypePicker(false); }}
                    className={`w-full px-4 py-2 text-left text-[14px] font-body ${voteType === 'multiple' ? 'bg-[#EBF4FF] text-[#0062FF]' : 'text-[#1A1A1A]'}`}
                  >
                    多选
                  </button>
                </div>
              )}
            </div>

            {/* 是否匿名 */}
            <div className="flex h-[48px] w-full flex-row items-center justify-between px-4">
              <div className="text-[14px] font-body font-normal text-[#1A1A1A]">
                是否匿名
              </div>
              <button
                type="button"
                onClick={() => setIsAnonymous(!isAnonymous)}
                className={`relative h-[24px] w-[44px] rounded-full transition-colors ${isAnonymous ? 'bg-[#0062FF]' : 'bg-[#E2E8F0]'}`}
              >
                <span
                  className={`absolute top-[2px] h-[20px] w-[20px] rounded-full bg-white shadow transition-transform ${isAnonymous ? 'left-[22px]' : 'left-[2px]'}`}
                />
              </button>
            </div>
          </div>

          <div data-pencil-name="Spacer" className="min-h-[20px] flex-1" />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            data-pencil-name="Button Primary"
            className={`box-border flex h-[52px] w-full shrink-0 flex-col items-center justify-center rounded-xl shadow-[0px_4px_16px_0px_#0000001A] ${loading ? 'bg-[#94A3B8]' : 'bg-[#0062FF] active:opacity-80'}`}
          >
            <div className="text-[16px]/[normal] box-border text-left font-body font-semibold text-white [white-space:nowrap]">
              {loading ? '发布中...' : '发布投票'}
            </div>
          </button>
        </div>
      </PageLayout>
    </>
  );
}
