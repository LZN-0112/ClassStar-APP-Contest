import { useCallback, useEffect, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useDidShow, useLoad } from '@tarojs/taro'

import { PageHeader } from '@/components/business'
import { Icon } from '@/components/ui'
import { attendanceApi } from '@/services'
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
  myRecord?: { id: string; status: string } | null
  myLeaveApplication?: { id: string; status: string; reason: string } | null
}

type StatusFilter = 'pending' | 'in-progress' | 'completed'

const METHOD_ICONS: Record<string, { name: string; color: string }> = {
  gps: { name: 'map-pin', color: '#2563EB' },
  qr: { name: 'qrcode', color: '#22C55E' },
  face: { name: 'camera', color: '#F97316' },
  code: { name: 'key-round', color: '#EF4444' },
  normal: { name: 'map-pin', color: '#0062FF' }
}

const STATUS_LABELS: Record<StatusFilter, string> = {
  pending: '未开始',
  'in-progress': '进行中',
  completed: '已结束'
}

const SECTION_DOT: Record<StatusFilter, string> = {
  'in-progress': '#0062FF',
  pending: '#F59E0B',
  completed: '#94A3B8'
}

function getAttendanceStatus(item: AttendanceItem, nowMs: number): StatusFilter {
  const now = new Date(nowMs)
  const start = new Date(item.startTime)
  const end = new Date(item.endTime)
  if (item.status === 'closed' || now > end) return 'completed'
  if (now >= start && now <= end && item.status === 'open') return 'in-progress'
  return 'pending'
}

function formatTime(iso: string): string {
  const d = new Date(iso)
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
  const { user, requireLogin } = useAuth()
  const [items, setItems] = useState<AttendanceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<StatusFilter | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const classId = user?.classId
  const isAdmin = user?.roleLevel === 'owner' || user?.roleLevel === 'admin'

  useLoad(() => {
    requireLogin()
  })

  // 每 30 秒刷新一次基准时间，保证跨越起止时间后状态与统计及时更新
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [])

  const fetchList = useCallback(async () => {
    if (!classId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = (await attendanceApi.getList(classId, { pageSize: 100 })) as any
      setItems(Array.isArray(data?.list) ? data.list : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取考勤列表失败')
    } finally {
      setLoading(false)
    }
  }, [classId])

  useDidShow(() => {
    fetchList()
  })

  const statusMap = items.reduce<Record<string, StatusFilter>>((acc, item) => {
    acc[item.id] = getAttendanceStatus(item, now)
    return acc
  }, {})

  const sortedItems = [...items].sort((a, b) => {
    const rank: Record<StatusFilter, number> = { 'in-progress': 0, pending: 1, completed: 2 }
    const diff = rank[statusMap[a.id]] - rank[statusMap[b.id]]
    if (diff !== 0) return diff
    if (statusMap[a.id] === 'pending') {
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    }
    return new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  })

  const displayItems = filter ? sortedItems.filter((t) => statusMap[t.id] === filter) : sortedItems

  const stats: Record<StatusFilter, number> = {
    pending: items.filter((t) => statusMap[t.id] === 'pending').length,
    'in-progress': items.filter((t) => statusMap[t.id] === 'in-progress').length,
    completed: items.filter((t) => statusMap[t.id] === 'completed').length
  }

  const statItems: { label: string; value: number; key: StatusFilter }[] = [
    { label: '未开始', value: stats.pending, key: 'pending' },
    { label: '进行中', value: stats['in-progress'], key: 'in-progress' },
    { label: '已结束', value: stats.completed, key: 'completed' }
  ]

  const getMyState = (item: AttendanceItem): string | null => {
    if (item.myRecord) {
      return item.myRecord.status === 'late' ? '迟到' : '已签到'
    }
    if (item.myLeaveApplication?.status === 'approved') return '已请假'
    if (item.myLeaveApplication?.status === 'pending') return '请假审核中'
    if (statusMap[item.id] === 'completed') return '缺勤'
    return null
  }

  const sections = filter
    ? [{ key: filter, label: STATUS_LABELS[filter], dot: SECTION_DOT[filter], items: displayItems }]
    : (['in-progress', 'pending', 'completed'] as StatusFilter[])
        .map((key) => ({
          key,
          label: STATUS_LABELS[key],
          dot: SECTION_DOT[key],
          items: displayItems.filter((item) => statusMap[item.id] === key)
        }))
        .filter((section) => section.items.length > 0)

  return (
    <View className='attlist'>
      <PageHeader
        title='考勤'
        variant='a'
        decor='target'
        right={
          isAdmin ? (
            <View
              className='attlist__add'
              onClick={() => Taro.navigateTo({ url: '/pages-sub/attendance/publish/index' })}
            >
              <Text className='attlist__add-text'>+</Text>
            </View>
          ) : undefined
        }
      />

      <View className='attlist__body'>
        {/* 统计卡片 */}
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
        <View className='attlist__main'>
          <View className='attlist__head'>
            <Text className='attlist__head-title'>考勤列表</Text>
            {isAdmin ? (
              <View className='attlist__head-links'>
                <Text
                  className='attlist__head-link'
                  onClick={() =>
                    Taro.navigateTo({
                      url: `/pages-sub/attendance/leave-approval/index?classId=${classId}`
                    })
                  }
                >
                  请假审批
                </Text>
                <Text
                  className='attlist__head-link'
                  onClick={() =>
                    Taro.navigateTo({
                      url: `/pages-sub/attendance/report/index?classId=${classId}`
                    })
                  }
                >
                  考勤报表
                </Text>
              </View>
            ) : null}
          </View>

          {loading ? (
            <View className='attlist__loading'>
              <Text className='attlist__loading-text'>加载中...</Text>
            </View>
          ) : error ? (
            <View className='attlist__error'>
              <Text className='attlist__error-text'>{error}</Text>
              <View className='attlist__error-btn' onClick={fetchList}>
                <Text className='attlist__error-btn-text'>重新加载</Text>
              </View>
            </View>
          ) : displayItems.length === 0 ? (
            <View className='attlist__empty'>
              <Text className='attlist__empty-text'>
                {filter ? `暂无${STATUS_LABELS[filter]}的考勤` : '暂无考勤记录'}
              </Text>
            </View>
          ) : (
            <View className='attlist__sections'>
              {sections.map((section) => (
                <View key={section.key} className='attlist__section'>
                  <View className='attlist__section-head'>
                    <View
                      className='attlist__section-dot'
                      style={{ backgroundColor: section.dot }}
                    />
                    <Text className='attlist__section-label'>{section.label}</Text>
                    <Text className='attlist__section-count'>{section.items.length}</Text>
                  </View>

                  {section.items.map((item) => {
                    const itemStatus = statusMap[item.id]
                    const ongoing = itemStatus === 'in-progress'
                    const myState = getMyState(item)
                    const canCheckInNow =
                      ongoing && !item.myRecord && item.myLeaveApplication?.status !== 'approved'
                    const method = METHOD_ICONS[item.method] || METHOD_ICONS.normal
                    return (
                      <View
                        key={item.id}
                        className={`attlist__item ${ongoing ? 'attlist__item--ongoing' : ''}`}
                        onClick={() =>
                          Taro.navigateTo({
                            url: `/pages-sub/attendance/check-in-detail/index?classId=${classId}&attendanceId=${item.id}`
                          })
                        }
                      >
                        {ongoing ? <View className='attlist__item-bar' /> : null}

                        <View className='attlist__item-row'>
                          <View className='attlist__item-title-wrap'>
                            <Icon name={method.name} size={40} color={method.color} />
                            <Text className='attlist__item-title'>{item.title}</Text>
                          </View>
                          <Text
                            className={`attlist__tag ${
                              ongoing
                                ? 'attlist__tag--ongoing'
                                : itemStatus === 'pending'
                                  ? 'attlist__tag--pending'
                                  : 'attlist__tag--completed'
                            }`}
                          >
                            {STATUS_LABELS[itemStatus]}
                          </Text>
                        </View>

                        <View className='attlist__item-time'>
                          <Icon name='clock' size={24} color='#64748B' />
                          <Text className='attlist__item-time-text'>{formatTime(item.startTime)}</Text>
                          {item.location ? (
                            <Text className='attlist__item-location'>· {item.location}</Text>
                          ) : null}
                        </View>

                        <View className='attlist__item-bottom'>
                          <View className='attlist__item-state'>
                            <Text className='attlist__item-count'>已签到 {item.checkInCount} 人</Text>
                            {myState ? (
                              <Text
                                className={`attlist__my-state ${
                                  myState === '已签到'
                                    ? 'attlist__my-state--present'
                                    : myState === '迟到' ||
                                        myState === '已请假' ||
                                        myState === '请假审核中'
                                      ? 'attlist__my-state--warn'
                                      : myState === '缺勤'
                                        ? 'attlist__my-state--absent'
                                        : 'attlist__my-state--default'
                                }`}
                              >
                                {myState}
                              </Text>
                            ) : null}
                          </View>
                          {canCheckInNow ? (
                            <View className='attlist__checkin-pill'>
                              <Text className='attlist__checkin-pill-text'>立即签到</Text>
                              <Icon name='chevron-right' size={24} color='#FFFFFF' />
                            </View>
                          ) : (
                            <Icon name='chevron-right' size={32} color='#CBD5E1' />
                          )}
                        </View>
                      </View>
                    )
                  })}
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  )
}