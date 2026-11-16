// ============================================================
// 任务看板
// 1:1 对齐 front/src/pages/tools/TaskBoard.tsx
// - 折叠封面头（variant a + target 装饰 + 右上发布）
// - 统计三卡使用后端全量 stats，可点击筛选
// - 任务卡片左滑露出操作（已完成 / 删除 / 置顶）
// - 完成：班委或负责人；删除：仅班委；置顶：本地持久化，所有人可用
// ============================================================
import { useRef, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useDidShow, useLoad } from '@tarojs/taro'

import { ConfirmDialog, PageHeader } from '@/components/business'
import { Icon } from '@/components/ui'
import { taskApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

type BackendStatus = 'todo' | 'in_progress' | 'done'
type TaskStatus = 'pending' | 'in-progress' | 'completed'

interface TaskItem {
  id: string
  title: string
  ownerId?: string
  ownerName?: string | null
  deadline?: string
  progress: number
  priority?: number
  status: BackendStatus
}

interface TaskStats {
  todo: number
  inProgress: number
  done: number
}

interface PriorityMeta {
  label: string
  text: string
  bg: string
}

/** 任务优先级：0 无 / 1 低 / 2 中 / 3 高（同 App utils/taskPriority） */
const PRIORITY_META: Record<number, PriorityMeta> = {
  0: { label: '无', text: '#64748B', bg: '#F1F5F9' },
  1: { label: '低', text: '#0EA5E9', bg: '#E0F2FE' },
  2: { label: '中', text: '#D97706', bg: '#FEF3C7' },
  3: { label: '高', text: '#DC2626', bg: '#FEE2E2' }
}

/** 单个操作按钮宽度（rpx，App 为 60px） */
const ACTION_W = 120
/** 滑开判定阈值（rpx，App 为 80px） */
const SWIPE_THRESHOLD = 160
/** px → rpx 换算比例 */
const PX_TO_RPX = 750 / (Taro.getSystemInfoSync().windowWidth || 375)

interface TouchLikeEvent {
  touches: { clientX: number; clientY: number }[]
}

function toFrontStatus(s: BackendStatus): TaskStatus {
  if (s === 'done') return 'completed'
  if (s === 'in_progress') return 'in-progress'
  return 'pending'
}

function getPriorityMeta(priority?: number | null): PriorityMeta {
  return PRIORITY_META[priority ?? 0] ?? PRIORITY_META[0]
}

/** 截止时间按本地时区展示 */
function formatDeadline(value?: string | null): string {
  if (!value) return '无截止日期'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).replace('T', ' ')
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`
}

export default function TaskBoard() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const userInfo = useUserStore((s) => s.userInfo)
  const { isCommittee, requireLogin } = useAuth()

  const [taskList, setTaskList] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [stats, setStats] = useState<TaskStats>({ todo: 0, inProgress: 0, done: 0 })
  const [filter, setFilter] = useState<TaskStatus | null>(null)
  const [swipedId, setSwipedId] = useState<string | null>(null)
  const [dragState, setDragState] = useState<{ id: string; offset: number } | null>(null)
  const [confirmTask, setConfirmTask] = useState<TaskItem | null>(null)
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set())

  /* ---------- 加载任务 ---------- */
  const fetchTasks = async () => {
    if (!currentClassId) {
      setLoading(false)
      return
    }
    setLoadError(false)
    try {
      const res: any = await taskApi.getTaskBoard(currentClassId, { pageSize: 100 })
      const list = (res?.list || []) as TaskItem[]
      setTaskList(list)
      // 统计数字使用后端全量统计，避免只统计前 100 条导致不准
      if (res?.stats) {
        setStats({
          todo: res.stats.todo ?? 0,
          inProgress: res.stats.inProgress ?? 0,
          done: res.stats.done ?? 0
        })
      }
    } catch {
      setLoadError(true)
      Taro.showToast({ title: '加载任务失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  useLoad(() => {
    if (!requireLogin()) return
  })

  useDidShow(() => {
    if (!currentClassId) {
      setLoading(false)
      return
    }
    // 置顶为本地偏好，按班级持久化
    const saved = Taro.getStorageSync(`task-pinned-${currentClassId}`)
    if (Array.isArray(saved)) setPinnedIds(new Set(saved as string[]))
    fetchTasks()
  })

  /* ---------- 派生数据 / 权限 ---------- */
  const canComplete = (task: TaskItem) =>
    task.status !== 'done' && (isCommittee || (!!userInfo?.id && task.ownerId === userInfo.id))

  const getActionWidth = (task: TaskItem) =>
    ACTION_W + (canComplete(task) ? ACTION_W : 0) + (isCommittee ? ACTION_W : 0)

  let displayTasks: TaskItem[]
  if (filter === 'completed') {
    displayTasks = taskList.filter((t) => t.status === 'done')
  } else if (filter) {
    displayTasks = taskList.filter((t) => toFrontStatus(t.status) === filter)
  } else {
    displayTasks = taskList.filter((t) => t.status !== 'done')
  }
  // 置顶任务排在前面
  displayTasks = [...displayTasks].sort((a, b) => {
    const aPinned = pinnedIds.has(a.id) ? 1 : 0
    const bPinned = pinnedIds.has(b.id) ? 1 : 0
    return bPinned - aPinned
  })

  /* ---------- 操作 ---------- */
  const handleComplete = async (id: string) => {
    if (!currentClassId) return
    try {
      await taskApi.updateTask(currentClassId, id, { status: 'done', progress: 100 })
      setTaskList((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: 'done' as BackendStatus, progress: 100 } : t))
      )
      swipedRef.current = null
      setSwipedId(null)
      Taro.showToast({ title: '任务已完成', icon: 'success' })
      fetchTasks()
    } catch {
      Taro.showToast({ title: '操作失败', icon: 'none' })
    }
  }

  // 删除前二次确认
  const requestDelete = (task: TaskItem) => {
    swipedRef.current = null
    setSwipedId(null)
    setConfirmTask(task)
  }

  const confirmDelete = async () => {
    const task = confirmTask
    if (!task || !currentClassId) return
    setConfirmTask(null)
    try {
      await taskApi.removeTask(currentClassId, task.id)
      setTaskList((prev) => prev.filter((t) => t.id !== task.id))
      swipedRef.current = null
      setSwipedId(null)
      Taro.showToast({ title: '任务已删除', icon: 'success' })
      fetchTasks()
    } catch {
      Taro.showToast({ title: '删除失败', icon: 'none' })
    }
  }

  const handleTogglePin = (id: string) => {
    const next = new Set(pinnedIds)
    let toastTitle = '已置顶'
    if (next.has(id)) {
      next.delete(id)
      toastTitle = '已取消置顶'
    } else {
      next.add(id)
    }
    setPinnedIds(next)
    if (currentClassId) {
      Taro.setStorageSync(`task-pinned-${currentClassId}`, [...next])
    }
    Taro.showToast({ title: toastTitle, icon: 'none' })
  }

  const goPublish = () => {
    Taro.navigateTo({ url: '/pages-sub/material/publish-task/index' })
  }

  const goDetail = (id: string) => {
    Taro.navigateTo({ url: `/pages-sub/material/task-detail/index?taskId=${id}` })
  }

  const retry = () => {
    setLoading(true)
    fetchTasks()
  }

  /* ---------- 左滑手势 ---------- */
  const swipedRef = useRef<string | null>(null)
  const gestureRef = useRef({
    id: '',
    startX: 0,
    startY: 0,
    base: 0,
    width: 0,
    locked: null as null | 'h' | 'v',
    moved: false,
    offset: 0
  })

  const handleTouchStart = (event: TouchLikeEvent, task: TaskItem) => {
    const touch = event.touches?.[0]
    if (!touch) return
    const open = swipedRef.current === task.id
    const width = getActionWidth(task)
    gestureRef.current = {
      id: task.id,
      startX: touch.clientX,
      startY: touch.clientY,
      base: open ? -width : 0,
      width,
      locked: null,
      moved: false,
      offset: open ? -width : 0
    }
    if (open) {
      setDragState({ id: task.id, offset: -width })
    }
    if (swipedRef.current && swipedRef.current !== task.id) {
      swipedRef.current = null
      setSwipedId(null)
    }
  }

  const handleTouchMove = (event: TouchLikeEvent) => {
    const g = gestureRef.current
    if (!g.id) return
    const touch = event.touches?.[0]
    if (!touch) return
    const dx = touch.clientX - g.startX
    const dy = touch.clientY - g.startY
    if (!g.locked && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      g.locked = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
    }
    if (g.locked !== 'h') return
    g.moved = true
    const next = Math.max(-g.width, Math.min(0, g.base + dx * PX_TO_RPX))
    g.offset = next
    setDragState({ id: g.id, offset: next })
  }

  const handleTouchEnd = () => {
    const g = gestureRef.current
    const id = g.id
    if (!id) return
    g.id = ''
    if (g.moved) {
      if (g.offset <= -SWIPE_THRESHOLD) {
        swipedRef.current = id
        setSwipedId(id)
      } else {
        swipedRef.current = null
        setSwipedId(null)
      }
    } else if (swipedRef.current === id) {
      // 点击已滑开的卡片：先收起
      swipedRef.current = null
      setSwipedId(null)
    } else {
      goDetail(id)
    }
    g.moved = false
    g.locked = null
    setDragState(null)
  }

  /* ---------- 统计卡片 ---------- */
  const statItems: { label: string; value: number; key: TaskStatus }[] = [
    { label: '待完成', value: stats.todo, key: 'pending' },
    { label: '进行中', value: stats.inProgress, key: 'in-progress' },
    { label: '已完成', value: stats.done, key: 'completed' }
  ]

  /* ---------- 渲染 ---------- */
  return (
    <View className='taskboard'>
      <PageHeader
        title='任务看板'
        variant='a'
        decor='target'
        right={
          <View className='taskboard__plus' onClick={goPublish}>
            <Icon name='plus' size={40} color='#FFFFFF' strokeWidth={2.5} />
          </View>
        }
      />

      <View className='taskboard__body'>
        {/* 统计卡片 */}
        <View className='taskboard__stats'>
          {statItems.map((stat) => {
            const active = filter === stat.key
            return (
              <View
                key={stat.key}
                className={`taskboard__stat ${active ? 'taskboard__stat--active' : ''}`}
                onClick={() => setFilter(active ? null : stat.key)}
              >
                <Text className='taskboard__stat-value'>{stat.value}</Text>
                <Text className='taskboard__stat-label'>{stat.label}</Text>
              </View>
            )
          })}
        </View>

        {/* 任务列表 */}
        <View className='taskboard__section'>
          <Text className='taskboard__section-title'>任务列表</Text>

          {loading ? (
            <Text className='taskboard__hint'>加载中...</Text>
          ) : loadError ? (
            <View className='taskboard__error'>
              <Text className='taskboard__hint'>任务加载失败，请检查网络后重试</Text>
              <View className='taskboard__retry' onClick={retry}>
                <Text>重新加载</Text>
              </View>
            </View>
          ) : displayTasks.length === 0 ? (
            <Text className='taskboard__hint'>{filter ? '该分类下暂无任务' : '暂无任务'}</Text>
          ) : (
            <View className='taskboard__list'>
              {displayTasks.map((task) => {
                const offset =
                  dragState?.id === task.id
                    ? dragState.offset
                    : swipedId === task.id
                      ? -getActionWidth(task)
                      : 0
                const priorityMeta = getPriorityMeta(task.priority)
                const progress = Number(task.progress) || 0

                return (
                  <View key={task.id} className='taskboard__row'>
                    {/* 操作按钮（底层）：已完成仅班委或负责人，删除仅班委 */}
                    <View className='taskboard__actions'>
                      {canComplete(task) ? (
                        <View
                          className='taskboard__action taskboard__action--done'
                          onClick={() => handleComplete(task.id)}
                        >
                          <Text>已完成</Text>
                        </View>
                      ) : null}
                      {isCommittee ? (
                        <View
                          className={`taskboard__action taskboard__action--delete ${
                            canComplete(task) ? '' : 'taskboard__action--first'
                          }`}
                          onClick={() => requestDelete(task)}
                        >
                          <Text>删除</Text>
                        </View>
                      ) : null}
                      <View
                        className='taskboard__action taskboard__action--pin'
                        onClick={() => handleTogglePin(task.id)}
                      >
                        <Text>置顶</Text>
                      </View>
                    </View>

                    {/* 任务卡片（可滑动层） */}
                    <View
                      className={`taskboard__card ${
                        dragState?.id === task.id ? 'taskboard__card--dragging' : ''
                      }`}
                      style={{ transform: `translateX(${offset}rpx)` }}
                      onTouchStart={(e) => handleTouchStart(e as unknown as TouchLikeEvent, task)}
                      onTouchMove={(e) => handleTouchMove(e as unknown as TouchLikeEvent)}
                      onTouchEnd={handleTouchEnd}
                    >
                      <View className='taskboard__card-head'>
                        <View className='taskboard__card-title-wrap'>
                          {(task.priority ?? 0) >= 1 ? (
                            <Text
                              className='taskboard__badge'
                              style={{ color: priorityMeta.text, backgroundColor: priorityMeta.bg }}
                            >
                              {priorityMeta.label}
                            </Text>
                          ) : null}
                          <Text className='taskboard__card-title'>{task.title}</Text>
                        </View>
                        <Text className='taskboard__card-progress'>{progress}%</Text>
                      </View>
                      <Text className='taskboard__card-deadline'>截止：{formatDeadline(task.deadline)}</Text>
                      <View className='taskboard__track'>
                        <View
                          className='taskboard__track-fill'
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </View>
                    </View>
                  </View>
                )
              })}
            </View>
          )}
        </View>
      </View>

      {/* 删除二次确认 */}
      <ConfirmDialog
        open={!!confirmTask}
        title='删除任务'
        description={`确定删除「${confirmTask?.title ?? ''}」吗？删除后无法恢复。`}
        confirmText='删除'
        danger
        onCancel={() => setConfirmTask(null)}
        onConfirm={confirmDelete}
      />
    </View>
  )
}