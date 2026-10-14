import { useState, useRef, useCallback, useEffect } from 'react';
import { Target, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { toast } from 'sonner';

// 后端状态: todo / in_progress / done
type BackendStatus = 'todo' | 'in_progress' | 'done';
// 前端展示状态
type TaskStatus = 'pending' | 'in-progress' | 'completed';

interface TaskItem {
  id: string;
  title: string;
  owner?: string;
  deadline: string;
  progress: number;
  status: BackendStatus;
  location?: string;
  content?: string;
}

const SWIPE_THRESHOLD = 80;

// 后端状态 → 前端状态
function toFrontStatus(s: BackendStatus): TaskStatus {
  if (s === 'done') return 'completed';
  if (s === 'in_progress') return 'in-progress';
  return 'pending';
}

export default function TaskBoard() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();

  /* ---------- 状态 ---------- */
  const [taskList, setTaskList] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<TaskStatus | null>(null);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(`task-pinned-${user?.classId}`);
    return saved ? new Set(JSON.parse(saved)) : new Set<string>();
  });

  /* ---------- 加载任务 ---------- */
  const fetchTasks = useCallback(async () => {
    if (!user?.classId) return;
    try {
      const res = await api.get(`/classes/${user.classId}/tasks`, { params: { pageSize: 100 } });
      const body = res.data.data || res.data;
      const list = (body.list || []) as TaskItem[];
      setTaskList(list);
    } catch {
      toast.error('加载任务失败');
    } finally {
      setLoading(false);
    }
  }, [user?.classId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  /* ---------- 派生数据 ---------- */
  const stats = {
    pending: taskList.filter((t) => t.status === 'todo').length,
    inProgress: taskList.filter((t) => t.status === 'in_progress').length,
    completed: taskList.filter((t) => t.status === 'done').length,
  };

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
      await api.patch(`/classes/${user.classId}/tasks/${id}`, {
        status: 'done',
        progress: 100,
      });
      setTaskList((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: 'done' as BackendStatus, progress: 100 } : t)),
      );
      setSwipedId(null);
    } catch {
      toast.error('操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!user?.classId) return;
    try {
      await api.delete(`/classes/${user.classId}/tasks/${id}`);
      setTaskList((prev) => prev.filter((t) => t.id !== id));
      setSwipedId(null);
    } catch {
      toast.error('删除失败');
    }
  };

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

  const getPoint = (e: MouseEvent | TouchEvent) => {
    if ('touches' in e && e.touches.length) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if ('changedTouches' in e && e.changedTouches.length) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
  };

  const beginSwipe = (clientX: number, clientY: number, id: string) => {
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
      if (dx <= 0 && dx >= -200) {
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
      const rect = el.getBoundingClientRect();
      const parentRect = el.parentElement?.getBoundingClientRect();
      const offset = parentRect ? parentRect.left - rect.left : 0;

      el.style.transition = '';
      if (offset >= SWIPE_THRESHOLD) {
        el.style.transform = 'translateX(-180px)';
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
    { label: '待完成', value: stats.pending, key: 'pending' },
    { label: '进行中', value: stats.inProgress, key: 'in-progress' },
    { label: '已完成', value: stats.completed, key: 'completed' },
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
            ) : displayTasks.length === 0 ? (
              <div className="py-10 text-center text-[13px] text-[#94A3B8]">暂无任务</div>
            ) : (
              displayTasks.map((task) => {
                const isSwiped = swipedId === task.id;
                const deadlineStr = task.deadline ? task.deadline.replace('T', '  ') : '无截止日期';

                return (
                  <div key={task.id} className="relative overflow-hidden rounded-2xl">
                    {/* 操作按钮（底层） */}
                    <div className="absolute inset-y-0 right-0 flex h-full">
                      <button
                        type="button"
                        onClick={() => handleComplete(task.id)}
                        className="flex h-full w-[60px] items-center justify-center rounded-r-2xl bg-white text-[11px] font-semibold text-[#076CAB] shadow-soft"
                      >
                        已完成
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(task.id)}
                        className="flex h-full w-[60px] items-center justify-center bg-white text-[11px] font-semibold text-[#EF4444] shadow-soft"
                      >
                        删除
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTogglePin(task.id)}
                        className="flex h-full w-[60px] items-center justify-center rounded-l-2xl bg-white text-[11px] font-semibold text-[#F59E0B] shadow-soft"
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
                      style={{ transform: isSwiped ? 'translateX(-180px)' : 'translateX(0)' }}
                    >
                      <div className="box-border flex w-full flex-row items-center justify-between">
                        <div className="text-[14px]/[normal] box-border text-left font-body font-semibold text-[#1E293B] [white-space:nowrap]">
                          {task.title}
                        </div>
                        <div className="text-[14px]/[normal] box-border text-left font-body font-bold text-[#076CAB] [white-space:nowrap]">
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
    </PageLayout>
  );
}
