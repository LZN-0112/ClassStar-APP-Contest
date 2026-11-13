import { useState, useRef, useCallback, useEffect } from 'react';
import { Target, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getPriorityMeta } from '@/utils/taskPriority';
import { toast } from 'sonner';

// 后端状态: todo / in_progress / done
type BackendStatus = 'todo' | 'in_progress' | 'done';
// 前端展示状态
type TaskStatus = 'pending' | 'in-progress' | 'completed';

interface TaskItem {
  id: string;
  title: string;
  ownerId?: string;
  ownerName?: string | null;
  deadline: string;
  progress: number;
  priority?: number;
  status: BackendStatus;
  location?: string;
  content?: string;
}

interface TaskStats {
  todo: number;
  inProgress: number;
  done: number;
}

const SWIPE_THRESHOLD = 80;

// 后端状态 → 前端状态
function toFrontStatus(s: BackendStatus): TaskStatus {
  if (s === 'done') return 'completed';
  if (s === 'in_progress') return 'in-progress';
  return 'pending';
}

/** 截止时间按本地时区展示 */
function formatDeadline(value?: string | null): string {
  if (!value) return '无截止日期';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).replace('T', ' ');
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function TaskBoard() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();

  /* ---------- 状态 ---------- */
  const [taskList, setTaskList] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [stats, setStats] = useState<TaskStats>({ todo: 0, inProgress: 0, done: 0 });
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [confirmTask, setConfirmTask] = useState<TaskItem | null>(null);
  const [filter, setFilter] = useState<TaskStatus | null>(null);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(`task-pinned-${user?.classId}`);
    return saved ? new Set(JSON.parse(saved)) : new Set<string>();
  });

  /* ---------- 加载任务 ---------- */
  const fetchTasks = useCallback(async () => {
    if (!user?.classId) return;
    setLoadError(false);
    try {
      const res = await api.get(`/classes/${user.classId}/tasks`, { params: { pageSize: 100 } });
      const body = res.data.data || res.data;
      const list = (body.list || []) as TaskItem[];
      setTaskList(list);
      // 统计数字使用后端全量统计，避免只统计前 100 条导致不准
      if (body.stats) {
        setStats({
          todo: body.stats.todo ?? 0,
          inProgress: body.stats.inProgress ?? 0,
          done: body.stats.done ?? 0,
        });
      }
    } catch {
      setLoadError(true);
      toast.error('加载任务失败');
    } finally {
      setLoading(false);
    }
  }, [user?.classId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  /* ---------- 派生数据 / 权限 ---------- */
  const isCommittee =
    user?.roleLevel === 'owner' || user?.roleLevel === 'admin';
  // 已完成：班委或该任务负责人；删除：仅班委；置顶：本地偏好，所有人可用
  const canComplete = (task: TaskItem) =>
    task.status !== 'done' && (isCommittee || (!!user?.id && task.ownerId === user.id));
  const getActionWidth = (task: TaskItem) =>
    60 + (canComplete(task) ? 60 : 0) + (isCommittee ? 60 : 0);

  const displayTasks = (() => {
    let list: TaskItem[];
    if (filter === 'completed') {
      list = taskList.filter((t) => t.status === 'done');
    } else if (filter) {
      list = taskList.filter((t) => toFrontStatus(t.status) === filter);
    } else {
      list = taskList.filter((t) => t.status !== 'done');
    }
    // 置顶任务排在前面
    return list.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id) ? 1 : 0;
      const bPinned = pinnedIds.has(b.id) ? 1 : 0;
      return bPinned - aPinned;
    });
  })();

  /* ---------- 操作 ---------- */
  const handleComplete = async (id: string) => {
    if (!user?.classId) return;
    try {
      await api.put(`/classes/${user.classId}/tasks/${id}`, {
        status: 'done',
        progress: 100,
      });
      setTaskList((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: 'done' as BackendStatus, progress: 100 } : t)),
      );
      setSwipedId(null);
      toast.success('任务已完成');
      fetchTasks();
    } catch {
      toast.error('操作失败');
    }
  };

  // 删除前二次确认
  const requestDelete = (task: TaskItem) => {
    setSwipedId(null);
    setConfirmTask(task);
  };

  const confirmDelete = async () => {
    const task = confirmTask;
    if (!task || !user?.classId) return;
    setConfirmTask(null);
    try {
      await api.delete(`/classes/${user.classId}/tasks/${task.id}`);
      setTaskList((prev) => prev.filter((t) => t.id !== task.id));
      setSwipedId(null);
      toast.success('任务已删除');
      fetchTasks();
    } catch {
      toast.error('删除失败');
    }
  };

  // 系统返回键优先关闭删除确认弹层由 ConfirmDialog 内部处理
  const handleTogglePin = (id: string) => {
    setPinnedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
        toast.success('已取消置顶');
      } else {
        newSet.add(id);
        toast.success('已置顶');
      }
      localStorage.setItem(`task-pinned-${user?.classId}`, JSON.stringify([...newSet]));
      return newSet;
    });
  };

  /* ---------- 滑动（触屏 + 鼠标通用） ---------- */
  const startX = useRef(0);
  const startY = useRef(0);
  const swiping = useRef(false);
  const locked = useRef<'h' | 'v' | null>(null);
  const activeId = useRef<string | null>(null);
  const activeWidth = useRef(180);

  const getPoint = (e: MouseEvent | TouchEvent) => {
    if ('touches' in e && e.touches.length) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if ('changedTouches' in e && e.changedTouches.length) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
  };

  const beginSwipe = (clientX: number, clientY: number, id: string) => {
    const task = taskList.find((t) => t.id === id);
    activeWidth.current = task ? getActionWidth(task) : 60;
    startX.current = clientX;
    startY.current = clientY;
    swiping.current = false;
    locked.current = null;
    activeId.current = id;
    setSwipedId((prev) => (prev !== id ? null : prev));

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!activeId.current) return;
      const { x, y } = getPoint(e);
      const dx = x - startX.current;
      const dy = y - startY.current;
      if (!locked.current && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        locked.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      }
      if (locked.current !== 'h') return;
      swiping.current = true;
      const el = document.getElementById(`tc-${activeId.current}`);
      if (!el) return;
      el.style.transition = 'none';
      const dragLimit = Math.max(activeWidth.current + 20, SWIPE_THRESHOLD + 40);
      if (dx <= 0 && dx >= -dragLimit) {
        el.style.transform = `translateX(${dx}px)`;
      }
      if ('preventDefault' in e) e.preventDefault();
    };

    const handleUp = (e: MouseEvent | TouchEvent) => {
      const id = activeId.current;
      activeId.current = null;
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleUp);
      if (!id) return;

      const el = document.getElementById(`tc-${id}`);
      if (!el) return;
      const { x, y } = getPoint(e);
      const dx = x - startX.current;
      const dy = y - startY.current;
      const tapped = !swiping.current && Math.abs(dx) < 8 && Math.abs(dy) < 8;

      const rect = el.getBoundingClientRect();
      const parentRect = el.parentElement?.getBoundingClientRect();
      const offset = parentRect ? parentRect.left - rect.left : 0;

      el.style.transition = '';
      if (tapped) {
        // 点击（非滑动）：已滑开时先收起，否则进入任务详情
        el.style.transform = 'translateX(0)';
        setSwipedId(null);
        if (offset < SWIPE_THRESHOLD) {
          navigate(`/task-detail/${id}`);
        }
      } else if (offset >= SWIPE_THRESHOLD) {
        el.style.transform = `translateX(-${activeWidth.current}px)`;
        setSwipedId(id);
      } else {
        el.style.transform = 'translateX(0)';
        setSwipedId(null);
      }
      swiping.current = false;
      locked.current = null;
      if ('preventDefault' in e) e.preventDefault();
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleUp);
  };

  const onTouchStart = (e: React.TouchEvent, id: string) => {
    beginSwipe(e.touches[0].clientX, e.touches[0].clientY, id);
  };

  const onMouseDown = (e: React.MouseEvent, id: string) => {
    beginSwipe(e.clientX, e.clientY, id);
  };

  /* ---------- 原生 touchstart 监听 ---------- */
  useEffect(() => {
    const container = document.getElementById('task-list-container');
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const card = target.closest('[data-task-id]') as HTMLElement | null;
      if (!card) return;
      const id = card.getAttribute('data-task-id');
      if (!id) return;
      e.preventDefault();
      beginSwipe(e.touches[0].clientX, e.touches[0].clientY, id);
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
    };
  }, [displayTasks]);

  /* ---------- 统计卡片 ---------- */
  const statItems: { label: string; value: number; key: TaskStatus }[] = [
    { label: '待完成', value: stats.todo, key: 'pending' },
    { label: '进行中', value: stats.inProgress, key: 'in-progress' },
    { label: '已完成', value: stats.done, key: 'completed' },
  ];

  /* ---------- 渲染 ---------- */
  return (
    <PageLayout
      title="任务看板"
      variant="a"
      decor={<Target className="h-[112px] w-[112px] text-white" strokeWidth={1.5} />}
      right={
        <button
          type="button"
          onClick={() => navigate('/publish-task')}
          className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-[#0062FF] shadow-[0px_2px_8px_0px_#0000001A]"
        >
          <Plus className="h-[20px] w-[20px] text-white" strokeWidth={2.5} />
        </button>
      }
    >
      <div className="flex w-full min-h-full flex-col gap-5">
        {/* 统计卡片 */}
        <div className="box-border grid w-full grid-cols-3 gap-3">
          {statItems.map((stat) => (
            <button
              key={stat.label}
              type="button"
              onClick={() => setFilter((prev) => (prev === stat.key ? null : stat.key))}
              className={`box-border flex flex-col items-center gap-[6px] rounded-2xl p-4 shadow-soft transition-all ${
                filter === stat.key ? 'bg-[#076CAB]' : 'bg-white'
              }`}
            >
              <div
                className={`font-heading text-[28px] font-bold ${
                  filter === stat.key ? 'text-white' : 'text-[#076CAB]'
                }`}
              >
                {stat.value}
              </div>
              <div
                className={`font-body text-[11px] font-semibold ${
                  filter === stat.key ? 'text-white/80' : 'text-[#6B7280]'
                }`}
              >
                {stat.label}
              </div>
            </button>
          ))}
        </div>

        {/* 任务列表 */}
        <div id="task-list-container" className="box-border flex w-full flex-col gap-[10px]">
          <div className="text-[11px]/[normal] box-border text-left font-body font-semibold text-[#6B7280] [white-space:nowrap]">
            任务列表
          </div>
          <div className="box-border flex w-full flex-col gap-2">
            {loading ? (
              <div className="py-10 text-center text-[13px] text-[#94A3B8]">加载中...</div>
            ) : loadError ? (
              <div className="flex flex-col items-center gap-3 py-10">
                <div className="text-[13px] text-[#94A3B8]">任务加载失败，请检查网络后重试</div>
                <button
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    fetchTasks();
                  }}
                  className="rounded-full border border-[#076CAB] px-4 py-[6px] text-[12px] font-semibold text-[#076CAB] active:opacity-70"
                >
                  重新加载
                </button>
              </div>
            ) : displayTasks.length === 0 ? (
              <div className="py-10 text-center text-[13px] text-[#94A3B8]">
                {filter ? '该分类下暂无任务' : '暂无任务'}
              </div>
            ) : (
              displayTasks.map((task) => {
                const isSwiped = swipedId === task.id;
                const deadlineStr = formatDeadline(task.deadline);
                const priorityMeta = getPriorityMeta(task.priority);

                return (
                  <div key={task.id} className="relative overflow-hidden rounded-2xl">
                    {/* 操作按钮（底层）：删除仅班委、已完成仅班委或负责人可见 */}
                    <div className="absolute inset-y-0 right-0 flex h-full">
                      {canComplete(task) && (
                        <button
                          type="button"
                          onClick={() => handleComplete(task.id)}
                          className="flex h-full w-[60px] items-center justify-center rounded-l-2xl bg-white text-[11px] font-semibold text-[#076CAB] shadow-soft"
                        >
                          已完成
                        </button>
                      )}
                      {isCommittee && (
                        <button
                          type="button"
                          onClick={() => requestDelete(task)}
                          className={`flex h-full w-[60px] items-center justify-center bg-white text-[11px] font-semibold text-[#EF4444] shadow-soft ${
                            canComplete(task) ? '' : 'rounded-l-2xl'
                          }`}
                        >
                          删除
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleTogglePin(task.id)}
                        className="flex h-full w-[60px] items-center justify-center rounded-r-2xl bg-white text-[11px] font-semibold text-[#F59E0B] shadow-soft"
                      >
                        置顶
                      </button>
                    </div>

                    {/* 任务卡片（可滑动层） */}
                    <div
                      id={`tc-${task.id}`}
                      data-task-id={task.id}
                      onTouchStart={(e) => onTouchStart(e, task.id)}
                      onMouseDown={(e) => onMouseDown(e, task.id)}
                      className="relative z-10 box-border flex w-full flex-col gap-[10px] rounded-2xl bg-white p-4 text-left shadow-soft transition-[transform] duration-200 ease-out select-none"
                      style={{ transform: isSwiped ? `translateX(-${getActionWidth(task)}px)` : 'translateX(0)' }}
                    >
                      <div className="box-border flex w-full flex-row items-center justify-between gap-2">
                        <div className="flex min-w-0 flex-1 flex-row items-center gap-[6px]">
                          {(task.priority ?? 0) >= 1 && (
                            <span
                              className="shrink-0 rounded-full px-[6px] py-[1px] text-[10px] font-semibold"
                              style={{
                                color: priorityMeta.text,
                                backgroundColor: priorityMeta.bg,
                              }}
                            >
                              {priorityMeta.label}
                            </span>
                          )}
                          <div className="truncate text-[14px]/[normal] box-border text-left font-body font-semibold text-[#1E293B]">
                            {task.title}
                          </div>
                        </div>
                        <div className="shrink-0 text-[14px]/[normal] box-border text-left font-body font-bold text-[#076CAB] [white-space:nowrap]">
                          {task.progress}%
                        </div>
                      </div>
                      <div className="text-[11px]/[normal] box-border text-left font-body font-medium text-[#64748B] [white-space:nowrap]">
                        截止：{deadlineStr}
                      </div>
                      <div className="box-border flex h-[6px] w-full flex-col justify-start rounded-full bg-[#E2E8F0]">
                        <div
                          className="box-border h-[6px] shrink-0 rounded-full bg-[#076CAB] transition-[width] duration-300"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 删除二次确认 */}
      <ConfirmDialog
        open={!!confirmTask}
        title="删除任务"
        description={`确定删除「${confirmTask?.title ?? ''}」吗？删除后无法恢复。`}
        confirmText="删除"
        danger
        onCancel={() => setConfirmTask(null)}
        onConfirm={confirmDelete}
      />
    </PageLayout>
  );
}
