import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Target, User, Clock, CalendarDays, CheckCircle2, MapPin, FileText, Flag } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getPriorityMeta } from '@/utils/taskPriority';
import { toast } from 'sonner';

type BackendStatus = 'todo' | 'in_progress' | 'done';

interface TaskDetailData {
  id: string;
  classId: string;
  title: string;
  ownerId: string;
  ownerName: string | null;
  deadline: string | null;
  location: string | null;
  content: string | null;
  progress: number;
  priority?: number;
  status: BackendStatus;
  createdAt: string;
  updatedAt: string;
}

const STATUS_META: Record<BackendStatus, { label: string; text: string; bg: string }> = {
  todo: { label: '待完成', text: '#64748B', bg: '#F1F5F9' },
  in_progress: { label: '进行中', text: '#076CAB', bg: '#E0F2FE' },
  done: { label: '已完成', text: '#16A34A', bg: '#DCFCE7' },
};

function formatDateTime(value?: string | null): string {
  if (!value) return '未设置';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '未设置';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { user } = useCurrentUser();

  const [task, setTask] = useState<TaskDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);

  const fetchTask = useCallback(async () => {
    if (!user?.classId || !taskId) return;
    setLoading(true);
    setError(false);
    try {
      const res = await api.get(`/classes/${user.classId}/tasks/${taskId}`);
      const data = (res.data.data || res.data) as TaskDetailData;
      setTask(data);
      setProgress(data.progress);
    } catch (err) {
      setError(true);
      toast.error(err instanceof Error ? err.message : '加载任务详情失败');
    } finally {
      setLoading(false);
    }
  }, [user?.classId, taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const canEdit =
    !!task && !!user && (user.isCommittee || task.ownerId === user.id);

  const saveProgress = async (nextProgress: number) => {
    if (!user?.classId || !task || saving) return;
    const status: BackendStatus =
      nextProgress >= 100 ? 'done' : nextProgress <= 0 ? 'todo' : 'in_progress';
    setSaving(true);
    try {
      const res = await api.put(`/classes/${user.classId}/tasks/${task.id}`, {
        progress: nextProgress,
        status,
      });
      const updated = (res.data.data || res.data) as TaskDetailData;
      setTask(updated);
      setProgress(updated.progress);
      toast.success('进度已更新');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新进度失败');
    } finally {
      setSaving(false);
    }
  };

  const statusMeta = task ? STATUS_META[task.status] ?? STATUS_META.todo : STATUS_META.todo;
  const priorityMeta = getPriorityMeta(task?.priority);

  return (
    <PageLayout
      title="任务详情"
      variant="a"
      showBack
      onBack={() => navigate(-1)}
      contentClassName="bg-[#F5F5F7]"
      decor={<Target className="h-[112px] w-[112px] text-white" strokeWidth={1.5} />}
    >
      {loading ? (
        <div className="py-16 text-center text-[13px] text-[#94A3B8]">加载中...</div>
      ) : error || !task ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="text-[13px] text-[#94A3B8]">任务不存在或加载失败</div>
          <button
            type="button"
            onClick={fetchTask}
            className="rounded-full bg-[#076CAB] px-5 py-2 text-[13px] font-semibold text-white"
          >
            重新加载
          </button>
        </div>
      ) : (
        <div className="flex w-full flex-col gap-4">
          {/* 任务信息 */}
          <div className="flex w-full flex-col gap-4 rounded-2xl bg-white p-5 shadow-soft">
            <div className="flex w-full items-start justify-between gap-3">
              <div className="text-[18px]/[1.4] font-heading font-bold text-[#1E293B]">
                {task.title}
              </div>
              <span
                className="shrink-0 rounded-full px-[10px] py-[4px] text-[11px] font-semibold"
                style={{ color: statusMeta.text, backgroundColor: statusMeta.bg }}
              >
                {statusMeta.label}
              </span>
            </div>

            {/* 进度 */}
            <div className="flex w-full flex-col gap-2">
              <div className="flex w-full items-end justify-between">
                <span className="text-[11px] font-semibold text-[#6B7280]">任务进度</span>
                <span className="text-[24px] font-heading font-bold text-[#076CAB]">
                  {task.progress}%
                </span>
              </div>
              <div className="flex h-[6px] w-full flex-col justify-start rounded-full bg-[#E2E8F0]">
                <div
                  className="h-[6px] shrink-0 rounded-full bg-[#076CAB] transition-[width] duration-300"
                  style={{ width: `${Math.min(Math.max(task.progress, 0), 100)}%` }}
                />
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 border-t border-[#F1F5F9] pt-4">
              <div className="flex items-center gap-2 text-[13px] text-[#475569]">
                <User className="h-[16px] w-[16px] text-[#94A3B8]" strokeWidth={2} />
                <span className="text-[#94A3B8]">负责人</span>
                <span className="ml-auto font-medium text-[#1E293B]">
                  {task.ownerName || '未指定'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[13px] text-[#475569]">
                <Clock className="h-[16px] w-[16px] text-[#94A3B8]" strokeWidth={2} />
                <span className="text-[#94A3B8]">截止时间</span>
                <span className="ml-auto font-medium text-[#1E293B]">
                  {formatDateTime(task.deadline)}
                </span>
              </div>
              {(task.priority ?? 0) >= 1 && (
                <div className="flex items-center gap-2 text-[13px] text-[#475569]">
                  <Flag className="h-[16px] w-[16px] text-[#94A3B8]" strokeWidth={2} />
                  <span className="text-[#94A3B8]">优先级</span>
                  <span
                    className="ml-auto rounded-full px-[8px] py-[2px] text-[11px] font-semibold"
                    style={{ color: priorityMeta.text, backgroundColor: priorityMeta.bg }}
                  >
                    {priorityMeta.label}
                  </span>
                </div>
              )}
              {task.location && (
                <div className="flex items-center gap-2 text-[13px] text-[#475569]">
                  <MapPin className="h-[16px] w-[16px] text-[#94A3B8]" strokeWidth={2} />
                  <span className="text-[#94A3B8]">任务地点</span>
                  <span className="ml-auto font-medium text-[#1E293B]">{task.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-[13px] text-[#475569]">
                <CalendarDays className="h-[16px] w-[16px] text-[#94A3B8]" strokeWidth={2} />
                <span className="text-[#94A3B8]">创建时间</span>
                <span className="ml-auto font-medium text-[#1E293B]">
                  {formatDateTime(task.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* 任务内容 */}
          {task.content && (
            <div className="flex w-full flex-col gap-2 rounded-2xl bg-white p-5 shadow-soft">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[#1E293B]">
                <FileText className="h-[16px] w-[16px] text-[#94A3B8]" strokeWidth={2} />
                任务内容
              </div>
              <div className="whitespace-pre-wrap break-words text-[13px]/[1.7] text-[#475569]">
                {task.content}
              </div>
            </div>
          )}

          {/* 进度更新 */}
          <div className="flex w-full flex-col gap-3 rounded-2xl bg-white p-5 shadow-soft">
            <div className="text-[13px] font-semibold text-[#1E293B]">更新进度</div>
            {canEdit ? (
              <>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={progress}
                    disabled={saving}
                    onChange={(e) => setProgress(Number(e.target.value))}
                    className="h-[6px] w-full accent-[#076CAB]"
                  />
                  <span className="w-[42px] shrink-0 text-right text-[14px] font-semibold text-[#076CAB]">
                    {progress}%
                  </span>
                </div>
                <div className="flex w-full gap-2">
                  <button
                    type="button"
                    disabled={saving || progress === task.progress}
                    onClick={() => saveProgress(progress)}
                    className="flex-1 rounded-full bg-[#076CAB] py-[10px] text-[13px] font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? '保存中...' : '保存进度'}
                  </button>
                  <button
                    type="button"
                    disabled={saving || task.status === 'done'}
                    onClick={() => {
                      setProgress(100);
                      saveProgress(100);
                    }}
                    className="flex flex-1 items-center justify-center gap-1 rounded-full bg-[#DCFCE7] py-[10px] text-[13px] font-semibold text-[#16A34A] disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-[16px] w-[16px]" strokeWidth={2} />
                    标记完成
                  </button>
                </div>
              </>
            ) : (
              <div className="text-[12px] text-[#94A3B8]">仅任务负责人或班委可更新进度</div>
            )}
          </div>
        </div>
      )}
    </PageLayout>
  );
}