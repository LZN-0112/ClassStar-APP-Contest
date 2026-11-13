import { useEffect, useMemo, useRef, useState } from 'react';
import { Target, User, ChevronRight, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import BottomSheet from '@/components/ui/BottomSheet';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { api } from '@/lib/api';
import { registerOverlayBack } from '@/lib/overlayBack';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { ROLE_LABEL, type RoleLevel } from '@/utils/role';
import { PRIORITY_OPTIONS, getPriorityMeta } from '@/utils/taskPriority';
import { toast } from 'sonner';

type DeadlinePreset = 'none' | 'today' | 'tomorrow' | 'friday' | 'custom';

const DEADLINE_PRESETS: { key: DeadlinePreset; label: string }[] = [
  { key: 'none', label: '不设置' },
  { key: 'today', label: '今天' },
  { key: 'tomorrow', label: '明天' },
  { key: 'friday', label: '本周五' },
  { key: 'custom', label: '自定义' },
];

interface Member {
  id: string;
  userId: string;
  name: string;
  role?: string;
  roleLevel: RoleLevel;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toLocalInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 按快捷项计算截止时间（默认 23:59） */
function buildPresetDeadline(preset: DeadlinePreset): string {
  if (preset === 'none' || preset === 'custom') return '';
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59);
  if (preset === 'tomorrow') {
    target.setDate(target.getDate() + 1);
  } else if (preset === 'friday') {
    target.setDate(target.getDate() + ((5 - target.getDay() + 7) % 7));
  }
  return toLocalInputValue(target);
}

export default function PublishTask() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [form, setForm] = useState({
    title: '',
    location: '',
    content: '',
  });
  const [ownerId, setOwnerId] = useState('');
  const [ownerSheetOpen, setOwnerSheetOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [deadlinePreset, setDeadlinePreset] = useState<DeadlinePreset>('none');
  const [customDeadline, setCustomDeadline] = useState('');
  const [priority, setPriority] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const leavingRef = useRef(false);

  // 默认负责人为当前用户
  useEffect(() => {
    if (user?.id) setOwnerId((prev) => prev || user.id);
  }, [user?.id]);

  // 加载班级成员，供负责人选择
  useEffect(() => {
    const classId = user?.classId;
    if (!classId) return;
    let cancelled = false;
    setMembersLoading(true);
    api
      .get(`/classes/${classId}/members`, { params: { pageSize: 200 } })
      .then((res) => {
        if (!cancelled) setMembers(res.data?.data?.list || []);
      })
      .catch(() => {
        // 成员加载失败时仍可默认当前用户为负责人
      })
      .finally(() => {
        if (!cancelled) setMembersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.classId]);

  // 是否有未保存的编辑内容
  const isDirty =
    form.title.trim() !== '' ||
    form.location.trim() !== '' ||
    form.content.trim() !== '' ||
    (!!user?.id && ownerId !== user.id) ||
    deadlinePreset !== 'none' ||
    customDeadline !== '' ||
    priority !== 0;

  // 返回：有草稿时先确认，避免误丢内容
  const requestLeave = () => {
    if (!isDirty) {
      navigate(-1);
      return;
    }
    setDiscardOpen(true);
  };

  // 系统返回键：草稿确认弹层优先，其次才是负责人弹层（后注册优先）
  useEffect(() => {
    return registerOverlayBack(() => {
      if (discardOpen) {
        setDiscardOpen(false);
        return true;
      }
      if (leavingRef.current || !isDirty) return false;
      setDiscardOpen(true);
      return true;
    });
  }, [discardOpen, isDirty]);

  const ownerName = useMemo(() => {
    if (!ownerId) return '';
    const found = members.find((m) => m.userId === ownerId);
    if (found) return found.name;
    if (user?.id === ownerId) return user.name || '我';
    return '';
  }, [ownerId, members, user]);

  const deadlineValue =
    deadlinePreset === 'custom' ? customDeadline : buildPresetDeadline(deadlinePreset);

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!form.title.trim()) {
      toast.error('请输入任务名称');
      return;
    }
    if (deadlinePreset === 'custom' && !customDeadline) {
      toast.error('请选择截止时间');
      return;
    }
    if (!user?.classId) {
      toast.error('请先加入班级');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/classes/${user.classId}/tasks`, {
        title: form.title.trim(),
        ownerId: ownerId || undefined,
        deadline: deadlineValue || undefined,
        location: form.location.trim() || undefined,
        content: form.content.trim() || undefined,
        priority,
        progress: 0,
      });
      toast.success('任务创建成功');
      leavingRef.current = true;
      navigate('/task-board', { replace: true });
    } catch (error: any) {
      const msg = error.response?.data?.message || '创建任务失败';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout
      title="新增任务"
      variant="a"
      onBack={requestLeave}
      decor={<Target className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}
    >
      <div className="flex min-h-full flex-1 flex-col gap-5">
        <div>
          <div className="mb-2 text-[11px] font-semibold text-[#6B7280]">任务名称</div>
          <div
            data-pencil-name="Input Field 任务名称"
            className="box-border flex h-[56px] w-full shrink-0 flex-row items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4"
          >
            <input
              type="text"
              value={form.title}
              maxLength={200}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="请输入任务名称"
              className="w-full bg-transparent font-body text-[14px] font-medium text-[#1A1A1A] placeholder:text-[#94A3B8] outline-none"
            />
            <span
              className={`shrink-0 text-[11px] ${
                form.title.length >= 200 ? 'text-[#EF4444]' : 'text-[#CBD5E1]'
              }`}
            >
              {form.title.length}/200
            </span>
          </div>
        </div>

        <div>
          <div className="mb-2 text-[11px] font-semibold text-[#6B7280]">负责人</div>
          <button
            type="button"
            onClick={() => setOwnerSheetOpen(true)}
            data-pencil-name="Selector 负责人"
            className="box-border flex h-[56px] w-full shrink-0 flex-row items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 text-left active:opacity-80"
          >
            <User className="h-[16px] w-[16px] shrink-0 text-[#94A3B8]" strokeWidth={2} />
            <span
              className={`min-w-0 flex-1 truncate font-body text-[14px] font-medium ${
                ownerName ? 'text-[#1A1A1A]' : 'text-[#94A3B8]'
              }`}
            >
              {ownerName || '选择负责人'}
            </span>
            <ChevronRight className="h-[16px] w-[16px] shrink-0 text-[#CBD5E1]" strokeWidth={2} />
          </button>
        </div>

        <div>
          <div className="mb-2 text-[11px] font-semibold text-[#6B7280]">截止时间</div>
          <div className="flex flex-wrap gap-2">
            {DEADLINE_PRESETS.map((preset) => {
              const active = deadlinePreset === preset.key;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => setDeadlinePreset(preset.key)}
                  className={`rounded-full border px-[14px] py-[7px] font-body text-[12px] font-medium transition-colors ${
                    active
                      ? 'border-[#0062FF] bg-[#EFF6FF] text-[#0062FF]'
                      : 'border-[#E2E8F0] bg-white text-[#64748B]'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
          {deadlinePreset === 'custom' && (
            <div className="mt-2 box-border flex h-[52px] w-full flex-col justify-center rounded-xl border border-[#E2E8F0] bg-white px-4">
              <input
                type="datetime-local"
                value={customDeadline}
                onChange={(e) => setCustomDeadline(e.target.value)}
                className="w-full bg-transparent font-body text-[14px] font-medium text-[#1A1A1A] outline-none"
              />
            </div>
          )}
          {deadlineValue && (
            <div className="mt-2 text-[11px] text-[#64748B]">
              截止：{deadlineValue.replace('T', ' ')}
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 text-[11px] font-semibold text-[#6B7280]">优先级</div>
          <div className="flex w-full gap-2">
            {PRIORITY_OPTIONS.map((option) => {
              const active = priority === option.value;
              const meta = getPriorityMeta(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPriority(option.value)}
                  className={`flex-1 rounded-xl border py-[10px] font-body text-[12px] font-semibold transition-colors ${
                    active
                      ? 'border-transparent'
                      : 'border-[#E2E8F0] bg-white text-[#64748B]'
                  }`}
                  style={active ? { color: meta.text, backgroundColor: meta.bg } : undefined}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 text-[11px] font-semibold text-[#6B7280]">任务地点</div>
          <div
            data-pencil-name="Input Field 地点"
            className="box-border flex h-[56px] w-full shrink-0 flex-col justify-center rounded-xl border border-[#E2E8F0] bg-white px-4"
          >
            <input
              type="text"
              value={form.location}
              maxLength={200}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="请输入任务地点"
              className="w-full bg-transparent font-body text-[14px] font-medium text-[#1A1A1A] placeholder:text-[#94A3B8] outline-none"
            />
          </div>
        </div>

        <div>
          <div className="mb-2 text-[11px] font-semibold text-[#6B7280]">任务内容</div>
          <div
            data-pencil-name="Textarea 任务内容"
            className="box-border flex h-[140px] w-full shrink-0 flex-col justify-start rounded-xl border border-[#E2E8F0] bg-white p-4"
          >
            <textarea
              value={form.content}
              maxLength={2000}
              onChange={(e) => handleChange('content', e.target.value)}
              placeholder="请输入任务内容..."
              rows={4}
              className="h-full w-full resize-none bg-transparent font-body text-[14px] font-medium text-[#1A1A1A] placeholder:text-[#94A3B8] outline-none"
            />
          </div>
        </div>

        <div data-pencil-name="Spacer" className="min-h-[20px] flex-1" />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          data-pencil-name="Button Primary"
          className="box-border flex h-[52px] w-full shrink-0 flex-col items-center justify-center rounded-xl bg-[#0062FF] shadow-[0px_4px_16px_0px_#0000001A] disabled:opacity-60"
        >
          <div className="text-[16px]/[normal] box-border text-left font-body font-semibold text-white [white-space:nowrap]">
            {submitting ? '创建中...' : '新增任务'}
          </div>
        </button>
      </div>

      <BottomSheet
        open={ownerSheetOpen}
        onClose={() => setOwnerSheetOpen(false)}
        title="选择负责人"
        maxHeight="65vh"
        headerExtra={
          <button
            type="button"
            onClick={() => setOwnerSheetOpen(false)}
            className="shrink-0 font-body text-[14px]/[normal] font-medium text-[#64748B] active:opacity-70"
          >
            取消
          </button>
        }
      >
        <div className="px-2 pb-2">
          {membersLoading ? (
            <div className="py-8 text-center text-[12px] text-[#94A3B8]">加载中...</div>
          ) : members.length === 0 ? (
            <div className="py-8 text-center text-[12px] text-[#94A3B8]">暂无成员信息</div>
          ) : (
            members.map((member) => {
              const active = member.userId === ownerId;
              return (
                <button
                  key={member.userId}
                  type="button"
                  onClick={() => {
                    setOwnerId(member.userId);
                    setOwnerSheetOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-[14px] px-3 py-3 text-left active:bg-[#F7F9FC]"
                >
                  <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[#E0F2FE] text-[13px] font-semibold text-[#076CAB]">
                    {member.name?.slice(0, 1) || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-medium text-[#1E293B]">
                      {member.name}
                    </div>
                    <div className="truncate text-[11px] text-[#94A3B8]">
                      {ROLE_LABEL[member.roleLevel]}
                      {member.role ? ` · ${member.role}` : ''}
                    </div>
                  </div>
                  {active && (
                    <Check className="h-[18px] w-[18px] shrink-0 text-[#0062FF]" strokeWidth={2.5} />
                  )}
                </button>
              );
            })
          )}
        </div>
      </BottomSheet>

      {/* 草稿未保存确认 */}
      <ConfirmDialog
        open={discardOpen}
        title="放弃编辑？"
        description="当前填写的内容尚未保存，返回后将丢失。"
        cancelText="继续编辑"
        confirmText="放弃"
        danger
        onCancel={() => setDiscardOpen(false)}
        onConfirm={() => {
          setDiscardOpen(false);
          leavingRef.current = true;
          navigate(-1);
        }}
      />
    </PageLayout>
  );
}