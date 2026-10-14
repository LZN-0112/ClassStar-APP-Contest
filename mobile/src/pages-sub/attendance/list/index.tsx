import { useState, type ReactNode } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad, useDidShow, usePullDownRefresh } from '@tarojs/taro'

import { NavBar } from '@/components/business'
import { Icon } from '@/components/ui'
import { attendanceApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

interface AttendanceItem {
  id: string
  title: string
  startTime: string
  endTime: string
  method: string
  location?: string
  status: string
  checkInCount: number
  createdAt: string
}

type StatusFilter = 'pending' | 'in-progress' | 'completed'

const METHOD_ICON: Record<string, string> = {
  gps: 'map-pin',
  normal: 'map-pin',
  qr: 'qrcode',
  face: 'camera',
  code: 'lock'
}

const METHOD_COLOR: Record<string, string> = {
  gps: '#2563EB',
  normal: '#0062FF',
  qr: '#22C55E',
  face: '#F97316',
  code: '#EF4444'
}

const STATUS_LABELS: Record<StatusFilter, string> = {
  pending: '待完成',
  'in-progress': '进行中',
  completed: '已完成'
}

function getStatus(item: AttendanceItem): StatusFilter {
  const now = Date.now()
  const start = new Date(item.startTime).getTime()
  const end = new Date(item.endTime).getTime()
  if (item.status === 'closed' || now > end) return 'completed'
  if (now >= start && now <= end && item.status === 'open') return 'in-progress'
  return 'pending'
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  if (date.getTime() === today.getTime()) return `今天 ${hh}:${mm}`
  if (date.getTime() === yesterday.getTime()) return `昨天 ${hh}:${mm}`
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${hh}:${mm}`
}

export default function AttendanceList() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const user = useUserStore((s) => s.userInfo)
  const { requireLogin } = useAuth()

  const [items, setItems] = useState<AttendanceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<StatusFilter | null>(null)

  const isCommittee = user?.isCommittee === true

  const fetchList = async () => {
    if (!currentClassId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res: any = await attendanceApi.getList(currentClassId, { pageSize: 100 })
      setItems((res?.list) || [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useLoad(() => {
    if (!requireLogin()) return
    fetchList()
  })

  useDidShow(() => {
    fetchList()
  })

  usePullDownRefresh(async () => {
    await fetchList()
    Taro.stopPullDownRefresh()
  })

  const statusMap = items.reduce<Record<string, StatusFilter>>((acc, item) => {
    acc[item.id] = getStatus(item)
    return acc
  }, {})

  const stats = {
    pending: items.filter((t) => statusMap[t.id] === 'pending').length,
    inProgress: items.filter((t) => statusMap[t.id] === 'in-progress').length,
    completed: items.filter((t) => statusMap[t.id] === 'completed').length
  }

  const displayItems = filter ? items.filter((t) => statusMap[t.id] === filter) : items

  const statItems: { label: string; value: number; key: StatusFilter }[] = [
    { label: '待完成', value: stats.pending, key: 'pending' },
    { label: '进行中', value: stats.inProgress, key: 'in-progress' },
    { label: '已完成', value: stats.completed, key: 'completed' }
  ]

  const toDetail = (item: AttendanceItem) => {
    Taro.navigateTo({
      url: `/pages-sub/attendance/detail/index?classId=${currentClassId}&attendanceId=${item.id}`
    })
  }

  return (
    <View className='attlist'>
      <NavBar
        title='考勤'
        showBack={false}
        right={
          isCommittee ? (
            <View
              className='attlist__add'
              onClick={() => Taro.navigateTo({ url: '/pages-sub/attendance/publish/index' })}
            >
              <View className='attlist__add-icon'>
                <Icon name='plus' size={36} color='#FFFFFF' strokeWidth={3} />
              </View>
            </View>
          ) : null
        }
      />

      <ScrollViewBody loading={loading} onEmpty={displayItems.length === 0} filter={filter}>
        {/* 统计卡片 / 状态筛选 */}
        <View className='attlist__stats'>
          {statItems.map((stat) => {
            const active = filter === stat.key
            return (
              <View
                key={stat.key}
                className={`attlist__stat ${active ? 'attlist__stat--active' : ''}`}
                onClick={() => setFilter((prev) => (prev === stat.key ? null : stat.key))}
              >
                <Text className={`attlist__stat-value ${active ? 'attlist__stat-value--active' : ''}`}>
                  {stat.value}
                </Text>
                <Text className={`attlist__stat-label ${active ? 'attlist__stat-label--active' : ''}`}>
                  {stat.label}
                </Text>
              </View>
            )
          })}
        </View>

        {/* 考勤列表 */}
        <View className='attlist__section'>
          {displayItems.map((item) => {
            const status = statusMap[item.id]
            const progress = status === 'completed' ? '100%' : status === 'in-progress' ? '60%' : '0%'
            return (
              <View
                key={item.id}
                className='attlist__item'
                onClick={() => toDetail(item)}
              >
                <View className='attlist__item-row'>
                  <View className='attlist__item-title-wrap'>
                    <Icon name={METHOD_ICON[item.method] || 'map-pin'} size={34} color={METHOD_COLOR[item.method] || '#0062FF'} />
                    <Text className='attlist__item-title'>{item.title}</Text>
                  </View>
                  <View className={`attlist__tag attlist__tag--${status}`}>
                    <Text className='attlist__tag-text'>{STATUS_LABELS[status]}</Text>
                  </View>
                </View>
                <Text className='attlist__item-meta'>
                  {formatTime(item.startTime)}
                  {item.location ? ` · ${item.location}` : ''}
                </Text>
                <View className='attlist__progress'>
                  <View
                    className={`attlist__progress-fill attlist__progress-fill--${status}`}
                    style={{ width: progress }}
                  />
                </View>
              </View>
            )
          })}
        </View>
      </ScrollViewBody>
    </View>
  )
}

function ScrollViewBody({
  loading,
  onEmpty,
  filter,
  children
}: {
  loading: boolean
  onEmpty: boolean
  filter: StatusFilter | null
  children: ReactNode
}) {
  return (
    <View className='attlist__body'>
      {loading ? (
        <View className='attlist__loading'>
          <Text className='attlist__loading-text'>加载中...</Text>
        </View>
      ) : onEmpty ? (
        <View className='attlist__empty'>
          <Icon name='check-circle' size={72} color='#9CA3AF' strokeWidth={1.5} />
          <Text className='attlist__empty-text'>
            {filter ? `暂无${STATUS_LABELS[filter]}的考勤` : '暂无考勤记录'}
          </Text>
        </View>
      ) : (
        children
      )}
    </View>
  )
}