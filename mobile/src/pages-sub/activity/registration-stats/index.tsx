import { useCallback, useEffect, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { PageHeader } from '@/components/business'
import { activityApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected'

interface RegistrationItem {
  id: string
  studentName: string
  status: 'pending' | 'registered' | 'approved' | 'rejected'
  registeredAt: string
}

interface StatsData {
  total: number
  pending: number
  approved: number
  rejected: number
  participationRate: number
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: '待审核', className: 'actstats__status--pending' },
  registered: { label: '已通过', className: 'actstats__status--approved' },
  approved: { label: '已通过', className: 'actstats__status--approved' },
  rejected: { label: '未通过', className: 'actstats__status--rejected' }
}

function formatTime(value?: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${month}月${day}日 ${hh}:${mm}`
}

export default function RegistrationStats() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireAuth } = useAuth()

  const [classId, setClassId] = useState('')
  const [activityId, setActivityId] = useState('')
  const [items, setItems] = useState<RegistrationItem[]>([])
  const [stats, setStats] = useState<StatsData | null>(null)
  const [activityTitle, setActivityTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [reviewingId, setReviewingId] = useState('')

  useLoad((options) => {
    if (!requireAuth('committee')) return
    const cid = (options?.classId as string) || currentClassId
    const aid = options?.activityId as string
    if (!cid || !aid) {
      Taro.showToast({ title: '缺少活动信息', icon: 'none' })
      setLoading(false)
      setError('缺少活动信息')
      return
    }
    setClassId(cid)
    setActivityId(aid)
  })

  const fetchStats = useCallback(async () => {
    if (!classId || !activityId) return
    setLoading(true)
    setError('')
    try {
      const [data, activity] = await Promise.all([
        activityApi.registrationStats(classId, activityId) as Promise<any>,
        (activityApi.getDetail(classId, activityId) as Promise<any>).catch(() => null)
      ])

      const list: any[] = data?.list || []
      setItems(
        list.map((item) => ({
          id: item.id,
          studentName: item.studentName || '未知同学',
          status: item.status,
          registeredAt: item.registeredAt
        }))
      )
      setStats({
        total: data?.total || 0,
        pending: data?.pending || 0,
        approved: data?.approved || 0,
        rejected: data?.rejected || 0,
        participationRate: data?.participationRate || 0
      })
      if (activity) {
        setActivityTitle(activity.title || '')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取报名数据失败'
      setError(message)
      Taro.showToast({ title: message, icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [classId, activityId])

  useEffect(() => {
    if (classId && activityId) void fetchStats()
  }, [classId, activityId, fetchStats])

  const updateStatus = async (id: string, status: 'registered' | 'rejected') => {
    if (!classId || !activityId || reviewingId) return
    setReviewingId(id)
    try {
      await activityApi.reviewRegistration(classId, activityId, id, { status })
      Taro.showToast({
        title: status === 'registered' ? '已通过报名' : '已驳回报名',
        icon: 'success'
      })
      await fetchStats()
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '审核失败，请重试',
        icon: 'none'
      })
    } finally {
      setReviewingId('')
    }
  }

  const filtered = items.filter((item) => {
    if (filter === 'all') return true
    if (filter === 'approved') {
      return item.status === 'registered' || item.status === 'approved'
    }
    return item.status === filter
  })

  const tabs: Array<{ key: FilterStatus; label: string; count: number }> = [
    { key: 'all', label: '全部', count: stats?.total || 0 },
    { key: 'pending', label: '待审核', count: stats?.pending || 0 },
    { key: 'approved', label: '已通过', count: stats?.approved || 0 },
    { key: 'rejected', label: '未通过', count: stats?.rejected || 0 }
  ]

  return (
    <View className='actstats'>
      <PageHeader title='报名统计' variant='b' />

      <View className='actstats__body'>
        {activityTitle ? (
          <Text className='actstats__activity-title'>{activityTitle}</Text>
        ) : null}

        <View className='actstats__stat-row'>
          {[
            { value: stats?.total ?? 0, label: '总报名' },
            { value: stats?.pending ?? 0, label: '待审核' },
            { value: `${stats?.participationRate ?? 0}%`, label: '参与率' }
          ].map((item) => (
            <View key={item.label} className='actstats__stat-card'>
              <Text className='actstats__stat-num'>{item.value}</Text>
              <Text className='actstats__stat-label'>{item.label}</Text>
            </View>
          ))}
        </View>

        <View className='actstats__filters'>
          {tabs.map((tab) => {
            const active = filter === tab.key
            return (
              <View
                key={tab.key}
                className={`actstats__filter ${active ? 'actstats__filter--active' : ''}`}
                onClick={() => setFilter(tab.key)}
              >
                <Text
                  className={`actstats__filter-text ${
                    active ? 'actstats__filter-text--active' : ''
                  }`}
                >
                  {tab.label} {tab.count}
                </Text>
              </View>
            )
          })}
        </View>

        <View className='actstats__group'>
          <Text className='actstats__group-title'>报名人员</Text>

          <View className='actstats__list'>
            {loading ? (
              <View className='actstats__placeholder'>
                <Text>加载中...</Text>
              </View>
            ) : error ? (
              <View className='actstats__error'>
                <Text>{error}</Text>
                <View className='actstats__retry' onClick={() => void fetchStats()}>
                  <Text>重新加载</Text>
                </View>
              </View>
            ) : filtered.length === 0 ? (
              <View className='actstats__placeholder'>
                <Text>暂无报名记录</Text>
              </View>
            ) : (
              filtered.map((item) => {
                const meta = STATUS_META[item.status] || STATUS_META.pending
                return (
                  <View key={item.id} className='actstats__card'>
                    <View className='actstats__card-head'>
                      <Text className='actstats__name'>{item.studentName}</Text>
                      <Text className={`actstats__status ${meta.className}`}>
                        {meta.label}
                      </Text>
                    </View>
                    <Text className='actstats__info'>
                      报名于 {formatTime(item.registeredAt)}
                    </Text>
                    {item.status === 'pending' ? (
                      <View className='actstats__actions'>
                        <View
                          className={`actstats__btn actstats__btn--approve ${
                            reviewingId ? 'actstats__btn--disabled' : ''
                          }`}
                          onClick={() => void updateStatus(item.id, 'registered')}
                        >
                          <Text className='actstats__btn-text actstats__btn-text--approve'>
                            {reviewingId === item.id ? '处理中...' : '通过'}
                          </Text>
                        </View>
                        <View
                          className={`actstats__btn actstats__btn--reject ${
                            reviewingId ? 'actstats__btn--disabled' : ''
                          }`}
                          onClick={() => void updateStatus(item.id, 'rejected')}
                        >
                          <Text className='actstats__btn-text actstats__btn-text--reject'>
                            驳回
                          </Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                )
              })
            )}
          </View>
        </View>
      </View>
    </View>
  )
}