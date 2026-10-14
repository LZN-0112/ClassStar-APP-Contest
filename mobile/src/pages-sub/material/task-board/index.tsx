import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad, useDidShow } from '@tarojs/taro'

import { NavBar, ListEmpty, ListLoading } from '@/components/business'
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
  owner?: string
  deadline?: string
  progress: number
  status: BackendStatus
}

function toFrontStatus(s: BackendStatus): TaskStatus {
  if (s === 'done') return 'completed'
  if (s === 'in_progress') return 'in-progress'
  return 'pending'
}

export default function TaskBoard() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { isCommittee, requireLogin } = useAuth()

  const [taskList, setTaskList] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TaskStatus | null>(null)

  const fetchTasks = async () => {
    if (!currentClassId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res: any = await taskApi.getTaskBoard(currentClassId, { pageSize: 100 })
      setTaskList(res?.list || [])
    } catch {
      setTaskList([])
    } finally {
      setLoading(false)
    }
  }

  useLoad(() => {
    if (!requireLogin()) return
    fetchTasks()
  })

  useDidShow(() => {
    fetchTasks()
  })

  const stats = {
    pending: taskList.filter((t) => t.status === 'todo').length,
    inProgress: taskList.filter((t) => t.status === 'in_progress').length,
    completed: taskList.filter((t) => t.status === 'done').length
  }

  const displayTasks = () => {
    if (filter === 'completed') return taskList.filter((t) => t.status === 'done')
    if (filter) return taskList.filter((t) => toFrontStatus(t.status) === filter)
    return taskList.filter((t) => t.status !== 'done')
  }

  const handleComplete = async (id: string) => {
    if (!currentClassId) return
    try {
      await taskApi.updateTask(currentClassId, id, { status: 'done', progress: 100 })
      fetchTasks()
      Taro.showToast({ title: '已完成', icon: 'success' })
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : '操作失败', icon: 'none' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!currentClassId) return
    try {
      await taskApi.removeTask(currentClassId, id)
      fetchTasks()
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : '删除失败', icon: 'none' })
    }
  }

  const handlePin = () => {
    Taro.showToast({ title: '置顶功能开发中', icon: 'none' })
  }

  const goPublish = () => {
    Taro.navigateTo({ url: '/pages-sub/material/publish-task/index' })
  }

  const statItems: { label: string; value: number; key: TaskStatus }[] = [
    { label: '待完成', value: stats.pending, key: 'pending' },
    { label: '进行中', value: stats.inProgress, key: 'in-progress' },
    { label: '已完成', value: stats.completed, key: 'completed' }
  ]

  return (
    <View className='taskboard'>
      <NavBar
        title='任务看板'
        right={
          isCommittee ? (
            <View className='taskboard__nav-plus' onClick={goPublish}>
              <Icon name='plus' size={40} color='#fff' strokeWidth={2.5} />
            </View>
          ) : (
            <Text />
          )
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
                <Text className={`taskboard__stat-value ${active ? 'taskboard__stat-value--active' : ''}`}>
                  {stat.value}
                </Text>
                <Text className={`taskboard__stat-label ${active ? 'taskboard__stat-label--active' : ''}`}>
                  {stat.label}
                </Text>
              </View>
            )
          })}
        </View>

        {/* 任务列表 */}
        <View className='taskboard__section'>
          <Text className='taskboard__section-title'>任务列表</Text>
          {loading ? (
            <ListLoading rows={5} />
          ) : displayTasks().length === 0 ? (
            <ListEmpty icon='flag' text='暂无任务' />
          ) : (
            displayTasks().map((task) => {
              const deadlineStr = task.deadline ? task.deadline.replace('T', '  ') : '无截止日期'
              const progress = Number(task.progress) || 0
              return (
                <View key={task.id} className='taskboard__card'>
                  <View className='taskboard__card-head'>
                    <Text className='taskboard__card-title'>{task.title}</Text>
                    <Text className='taskboard__card-progress'>{progress}%</Text>
                  </View>
                  <Text className='taskboard__card-deadline'>截止：{deadlineStr}</Text>
                  <View className='taskboard__track'>
                    <View
                      className='taskboard__track-fill'
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </View>
                  {task.status !== 'done' && (
                    <View className='taskboard__actions'>
                      <Text className='taskboard__act taskboard__act--done' onClick={() => handleComplete(task.id)}>
                        已完成
                      </Text>
                      <Text className='taskboard__act taskboard__act--delete' onClick={() => handleDelete(task.id)}>
                        删除
                      </Text>
                      <Text className='taskboard__act taskboard__act--pin' onClick={handlePin}>
                        置顶
                      </Text>
                    </View>
                  )}
                </View>
              )
            })
          )}
        </View>
      </View>
    </View>
  )
}