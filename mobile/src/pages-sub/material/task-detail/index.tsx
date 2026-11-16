// ============================================================
// 任务详情
// 1:1 对齐 front/src/pages/tools/TaskDetail.tsx
// 含：任务信息卡（状态/进度/负责人/截止/优先级/地点/创建时间）、
//     任务内容、更新进度（滑块 + 保存 / 标记完成）
// ============================================================
import { useEffect, useState } from 'react'
import { Slider, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { PageHeader } from '@/components/business'
import { Icon } from '@/components/ui'
import { taskApi } from '@/services'
import { useUserStore } from '@/stores'
import './index.scss'

type BackendStatus = 'todo' | 'in_progress' | 'done'

interface TaskDetailData {
  id: string
  classId: string
  title: string
  ownerId: string
  ownerName: string | null
  deadline: string | null
  location: string | null
  content: string | null
  progress: number
  priority?: number
  status: BackendStatus
  createdAt: string
  updatedAt: string
}

const STATUS_META: Record<BackendStatus, { label: string; text: string; bg: string }> = {
  todo: { label: '待完成', text: '#64748B', bg: '#F1F5F9' },
  in_progress: { label: '进行中', text: '#076CAB', bg: '#E0F2FE' },
  done: { label: '已完成', text: '#16A34A', bg: '#DCFCE7' }
}

/** 任务优先级：0 无 / 1 低 / 2 中 / 3 高（同 front/src/utils/taskPriority.ts） */
const PRIORITY_META: Record<number, { label: string; text: string; bg: string }> = {
  0: { label: '无', text: '#64748B', bg: '#F1F5F9' },
  1: { label: '低', text: '#0EA5E9', bg: '#E0F2FE' },
  2: { label: '中', text: '#D97706', bg: '#FEF3C7' },
  3: { label: '高', text: '#DC2626', bg: '#FEE2E2' }
}

function formatDateTime(value?: string | null): string {
  if (!value) return '未设置'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '未设置'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`
}

export default function TaskDetail() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const userInfo = useUserStore((s) => s.userInfo)

  const [taskId, setTaskId] = useState('')
  const [task, setTask] = useState<TaskDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [progress, setProgress] = useState(0)
  const [saving, setSaving] = useState(false)

  useLoad((query) => {
    setTaskId(query?.taskId || '')
  })

  const fetchTask = async (id = taskId) => {
    if (!currentClassId || !id) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(false)
    try {
      const data = (await taskApi.getTaskDetail(currentClassId, id)) as unknown as TaskDetailData
      if (!data) {
        setError(true)
        return
      }
      setTask(data)
      setProgress(Number(data.progress) || 0)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (taskId) void fetchTask(taskId)
    else setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, currentClassId])

  const canEdit = !!task && !!userInfo && (!!userInfo.isCommittee || task.ownerId === userInfo.id)

  const saveProgress = async (nextProgress: number) => {
    if (!currentClassId || !task || saving) return
    const status: BackendStatus =
      nextProgress >= 100 ? 'done' : nextProgress <= 0 ? 'todo' : 'in_progress'
    setSaving(true)
    try {
      const updated = (await taskApi.updateTask(currentClassId, task.id, {
        progress: nextProgress,
        status
      })) as unknown as TaskDetailData
      if (updated) {
        setTask(updated)
        setProgress(Number(updated.progress) || 0)
      } else {
        setTask({ ...task, progress: nextProgress, status })
        setProgress(nextProgress)
      }
      Taro.showToast({ title: '进度已更新', icon: 'success' })
    } catch {
      // 请求层已统一 toast
    } finally {
      setSaving(false)
    }
  }

  const statusMeta = task ? STATUS_META[task.status] ?? STATUS_META.todo : STATUS_META.todo
  const priorityMeta = PRIORITY_META[task?.priority ?? 0] ?? PRIORITY_META[0]
  const progressPercent = Math.min(Math.max(Number(task?.progress) || 0, 0), 100)

  return (
    <View className='taskdetail'>
      <PageHeader title='任务详情' variant='a' decor='target' barBg='#F5F5F7' />

      {loading ? (
        <View className='taskdetail__loading'>
          <Text className='taskdetail__loading-text'>加载中...</Text>
        </View>
      ) : error || !task ? (
        <View className='taskdetail__error'>
          <Text className='taskdetail__error-text'>任务不存在或加载失败</Text>
          <View className='taskdetail__retry' onClick={() => fetchTask()}>
            <Text className='taskdetail__retry-text'>重新加载</Text>
          </View>
        </View>
      ) : (
        <View className='taskdetail__body'>
          {/* 任务信息 */}
          <View className='taskdetail__card'>
            <View className='taskdetail__head'>
              <Text className='taskdetail__title'>{task.title}</Text>
              <View
                className='taskdetail__status'
                style={{ color: statusMeta.text, backgroundColor: statusMeta.bg }}
              >
                <Text className='taskdetail__status-text'>{statusMeta.label}</Text>
              </View>
            </View>

            {/* 进度 */}
            <View className='taskdetail__progress'>
              <View className='taskdetail__progress-head'>
                <Text className='taskdetail__progress-label'>任务进度</Text>
                <Text className='taskdetail__progress-value'>{progressPercent}%</Text>
              </View>
              <View className='taskdetail__track'>
                <View
                  className='taskdetail__track-fill'
                  style={{ width: `${progressPercent}%` }}
                />
              </View>
            </View>

            <View className='taskdetail__meta'>
              <View className='taskdetail__meta-row'>
                <Icon name='user' size={32} color='#94A3B8' strokeWidth={2} />
                <Text className='taskdetail__meta-label'>负责人</Text>
                <Text className='taskdetail__meta-value'>{task.ownerName || '未指定'}</Text>
              </View>
              <View className='taskdetail__meta-row'>
                <Icon name='clock' size={32} color='#94A3B8' strokeWidth={2} />
                <Text className='taskdetail__meta-label'>截止时间</Text>
                <Text className='taskdetail__meta-value'>{formatDateTime(task.deadline)}</Text>
              </View>
              {(task.priority ?? 0) >= 1 && (
                <View className='taskdetail__meta-row'>
                  <Icon name='flag' size={32} color='#94A3B8' strokeWidth={2} />
                  <Text className='taskdetail__meta-label'>优先级</Text>
                  <View
                    className='taskdetail__meta-pill'
                    style={{ color: priorityMeta.text, backgroundColor: priorityMeta.bg }}
                  >
                    <Text className='taskdetail__meta-pill-text'>{priorityMeta.label}</Text>
                  </View>
                </View>
              )}
              {task.location && (
                <View className='taskdetail__meta-row'>
                  <Icon name='map-pin' size={32} color='#94A3B8' strokeWidth={2} />
                  <Text className='taskdetail__meta-label'>任务地点</Text>
                  <Text className='taskdetail__meta-value'>{task.location}</Text>
                </View>
              )}
              <View className='taskdetail__meta-row'>
                <Icon name='calendar-days' size={32} color='#94A3B8' strokeWidth={2} />
                <Text className='taskdetail__meta-label'>创建时间</Text>
                <Text className='taskdetail__meta-value'>{formatDateTime(task.createdAt)}</Text>
              </View>
            </View>
          </View>

          {/* 任务内容 */}
          {task.content ? (
            <View className='taskdetail__card taskdetail__card--tight'>
              <View className='taskdetail__section-head'>
                <Icon name='file-text' size={32} color='#94A3B8' strokeWidth={2} />
                <Text className='taskdetail__section-title'>任务内容</Text>
              </View>
              <Text className='taskdetail__content'>{task.content}</Text>
            </View>
          ) : null}

          {/* 进度更新 */}
          <View className='taskdetail__card taskdetail__card--tight'>
            <Text className='taskdetail__section-title'>更新进度</Text>
            {canEdit ? (
              <>
                <View className='taskdetail__slider-row'>
                  <Slider
                    className='taskdetail__slider'
                    min={0}
                    max={100}
                    step={5}
                    value={progress}
                    disabled={saving}
                    activeColor='#076CAB'
                    backgroundColor='#E2E8F0'
                    blockColor='#076CAB'
                    blockSize={18}
                    onChange={(e) => setProgress(Number(e.detail.value))}
                  />
                  <Text className='taskdetail__slider-value'>{progress}%</Text>
                </View>
                <View className='taskdetail__actions'>
                  <View
                    className={`taskdetail__btn taskdetail__btn--save ${
                      saving || progress === task.progress ? 'taskdetail__btn--disabled' : ''
                    }`}
                    onClick={() => {
                      if (!saving && progress !== task.progress) void saveProgress(progress)
                    }}
                  >
                    <Text>{saving ? '保存中...' : '保存进度'}</Text>
                  </View>
                  <View
                    className={`taskdetail__btn taskdetail__btn--done ${
                      saving || task.status === 'done' ? 'taskdetail__btn--disabled' : ''
                    }`}
                    onClick={() => {
                      if (saving || task.status === 'done') return
                      setProgress(100)
                      void saveProgress(100)
                    }}
                  >
                    <Icon name='check-circle' size={32} color='#16A34A' strokeWidth={2} />
                    <Text>标记完成</Text>
                  </View>
                </View>
              </>
            ) : (
              <Text className='taskdetail__hint'>仅任务负责人或班委可更新进度</Text>
            )}
          </View>
        </View>
      )}
    </View>
  )
}