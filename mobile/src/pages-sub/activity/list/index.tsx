import { useCallback, useEffect, useState } from 'react'
import { Image, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { PageHeader } from '@/components/business'
import { Icon } from '@/components/ui'
import { activityApi, resolveFileUrl } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

type MyRegistrationStatus = 'pending' | 'registered' | 'approved' | 'rejected' | null

interface ActivityItem {
  id: string
  title: string
  category?: string | null
  eventDate: string
  eventTime: string | null
  deadline?: string | null
  location?: string
  capacity?: number
  registeredCount?: number
  coverUrl?: string | null
  displayStatus: 'registering' | 'ongoing' | 'ended'
  registrationOpen?: boolean
  myRegistrationStatus?: MyRegistrationStatus
}

type ActivityStatus = '全部' | '报名中' | '进行中' | '已结束'

const statusMap: Record<ActivityStatus, '' | 'registering' | 'ongoing' | 'ended'> = {
  全部: '',
  报名中: 'registering',
  进行中: 'ongoing',
  已结束: 'ended'
}

const statusBadgeMap = {
  ended: { label: '已结束', color: '#64748B', bg: '#F1F5F9' },
  ongoing: { label: '进行中', color: '#0369A1', bg: '#E0F2FE' },
  urgent: { label: '即将截止', color: '#B45309', bg: '#FEF3C7' },
  registering: { label: '报名中', color: '#1D4ED8', bg: '#DBEAFE' }
}

const formatEventDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
  return `${date.getMonth() + 1}月${date.getDate()}日 ${week}`
}

const pad = (n: number) => String(n).padStart(2, '0')

/** 报名截止倒计时：返回展示文案与是否进入 24 小时紧迫区间 */
function getCountdown(deadline?: string | null) {
  if (!deadline) return null
  const diff = new Date(deadline).getTime() - Date.now()
  if (Number.isNaN(diff)) return null
  if (diff <= 0) return { text: '已截止', urgent: true }
  const totalMinutes = Math.floor(diff / 60000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) {
    return { text: `${days}天${hours}小时后截止`, urgent: days < 1 }
  }
  if (hours > 0) {
    return { text: `${hours}小时${pad(minutes)}分后截止`, urgent: true }
  }
  return { text: `${minutes}分钟后截止`, urgent: true }
}

function getStatusBadge(item: ActivityItem) {
  if (item.displayStatus === 'ended') return statusBadgeMap.ended
  if (item.displayStatus === 'ongoing') return statusBadgeMap.ongoing
  const countdown = getCountdown(item.deadline)
  if (countdown?.urgent) return statusBadgeMap.urgent
  return statusBadgeMap.registering
}

function getActionState(item: ActivityItem) {
  const isEnded = item.displayStatus === 'ended'
  const isOngoing = item.displayStatus === 'ongoing'
  const isFull = item.capacity ? (item.registeredCount || 0) >= item.capacity : false
  const isClosed = item.displayStatus === 'registering' && item.registrationOpen === false
  const mine = item.myRegistrationStatus

  if (mine === 'pending') return { label: '待审核', disabled: true, primary: false }
  if (mine === 'registered' || mine === 'approved')
    return { label: '已报名', disabled: true, primary: false }
  if (mine === 'rejected') return { label: '未通过', disabled: true, primary: false }
  if (isEnded) return { label: '已结束', disabled: true, primary: false }
  if (isOngoing) return { label: '进行中', disabled: true, primary: false }
  if (isClosed) return { label: '报名截止', disabled: true, primary: false }
  if (isFull) return { label: '名额已满', disabled: true, primary: false }
  return { label: '立即报名', disabled: false, primary: true }
}

export default function ActivityList() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { user, requireLogin } = useAuth()

  const [classId, setClassId] = useState('')
  const [filter, setFilter] = useState<ActivityStatus>('全部')
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [registeringId, setRegisteringId] = useState<string | null>(null)

  useLoad((o) => {
    if (!requireLogin()) return
    setClassId((o?.classId as string) || currentClassId || user?.classId || '')
  })

  const fetchActivities = useCallback(async () => {
    if (!classId) {
      setActivities([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const status = statusMap[filter]
      const data = (await activityApi.getList(classId, {
        pageSize: 100,
        status: status || undefined
      })) as any
      setActivities(Array.isArray(data?.list) ? data.list : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取活动列表失败')
      setActivities([])
    } finally {
      setLoading(false)
    }
  }, [classId, filter])

  useEffect(() => {
    void fetchActivities()
  }, [fetchActivities, reloadKey])

  const handleRegister = async (item: ActivityItem) => {
    if (!classId || registeringId) return
    setRegisteringId(item.id)
    try {
      await activityApi.register(classId, item.id)
      Taro.showToast({ title: '报名成功', icon: 'success' })
      setActivities((prev) =>
        prev.map((a) =>
          a.id === item.id
            ? {
                ...a,
                registeredCount: (a.registeredCount || 0) + 1,
                myRegistrationStatus: 'pending' as MyRegistrationStatus
              }
            : a
        )
      )
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '报名失败，请稍后重试',
        icon: 'none'
      })
    } finally {
      setRegisteringId(null)
    }
  }

  const goPublish = () => Taro.navigateTo({ url: '/pages-sub/activity/publish/index' })

  const goDetail = (id: string) =>
    Taro.navigateTo({
      url: `/pages-sub/activity/detail/index?classId=${classId}&activityId=${id}`
    })

  return (
    <View className='actlist'>
      <PageHeader
        title='活动列表'
        variant='b'
        decor='calendar'
        right={
          user?.roleLevel === 'owner' || user?.roleLevel === 'admin' ? (
            <View className='actlist__publish' onClick={goPublish}>
              <Icon name='plus' size={32} color='#FFFFFF' strokeWidth={2} />
              <Text className='actlist__publish-text'>发布</Text>
            </View>
          ) : undefined
        }
      />

      <View className='actlist__body'>
        {/* 筛选 Tabs */}
        <View className='actlist__tabs'>
          {(Object.keys(statusMap) as ActivityStatus[]).map((tab) => {
            const active = filter === tab
            return (
              <View
                key={tab}
                className={`actlist__tab ${active ? 'actlist__tab--active' : ''}`}
                onClick={() => setFilter(tab)}
              >
                <Text className={`actlist__tab-text ${active ? 'actlist__tab-text--active' : ''}`}>
                  {tab}
                </Text>
              </View>
            )
          })}
        </View>

        <View className='actlist__group'>
          <Text className='actlist__group-title'>活动列表</Text>

          {loading ? (
            <View className='actlist__placeholder'>
              <Text className='actlist__placeholder-text'>加载中...</Text>
            </View>
          ) : (
            <View className='actlist__content'>
              {activities.map((item) => {
                const badge = getStatusBadge(item)
                const countdown =
                  item.displayStatus === 'registering' ? getCountdown(item.deadline) : null
                const action = getActionState(item)
                const isRegistering = registeringId === item.id
                const progress = item.capacity
                  ? Math.min(
                      100,
                      Math.round(((item.registeredCount || 0) / item.capacity) * 100)
                    )
                  : 0

                return (
                  <View className='actlist__card' key={item.id} onClick={() => goDetail(item.id)}>
                    <View className='actlist__cover'>
                      {item.coverUrl ? (
                        <Image
                          className='actlist__cover-img'
                          src={resolveFileUrl(item.coverUrl)}
                          mode='aspectFill'
                        />
                      ) : (
                        <Icon name='image' size={96} color='#8ACAE5' strokeWidth={2} />
                      )}
                      <View
                        className='actlist__badge'
                        style={{ color: badge.color, backgroundColor: badge.bg }}
                      >
                        <Text>{badge.label}</Text>
                      </View>
                      {countdown ? (
                        <View
                          className='actlist__countdown'
                          style={{ color: countdown.urgent ? '#B45309' : '#475569' }}
                        >
                          <Text>{countdown.text}</Text>
                        </View>
                      ) : null}
                    </View>

                    <View className='actlist__info'>
                      <View className='actlist__title-row'>
                        {item.category ? (
                          <View className='actlist__category'>
                            <Text>{item.category}</Text>
                          </View>
                        ) : null}
                        <Text className='actlist__title'>{item.title}</Text>
                      </View>

                      <Text className='actlist__meta'>
                        {formatEventDate(item.eventDate)}
                        {item.eventTime ? ` ${item.eventTime}` : ''} · {item.location || '待定'}
                      </Text>

                      {item.capacity ? (
                        <View className='actlist__capacity'>
                          <View className='actlist__progress'>
                            <View
                              className='actlist__progress-fill'
                              style={{ width: `${progress}%` }}
                            />
                          </View>
                          <Text className='actlist__count'>
                            {item.registeredCount || 0} 人已报名 · 余{' '}
                            {Math.max(item.capacity - (item.registeredCount || 0), 0)} 席
                          </Text>
                        </View>
                      ) : (
                        <Text className='actlist__count'>
                          {item.registeredCount || 0} 人已报名 · 不限名额
                        </Text>
                      )}

                      <View className='actlist__footer'>
                        <View className='actlist__detail-btn' onClick={() => goDetail(item.id)}>
                          <Text>查看详情</Text>
                        </View>
                        <View
                          className={`actlist__register-btn ${
                            action.primary
                              ? 'actlist__register-btn--primary'
                              : 'actlist__register-btn--disabled'
                          } ${isRegistering ? 'actlist__register-btn--loading' : ''}`}
                          onClick={() => {
                            if (!action.disabled && !isRegistering) void handleRegister(item)
                          }}
                        >
                          <Text>{isRegistering ? '报名中...' : action.label}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )
              })}

              {error ? (
                <View className='actlist__error'>
                  <Text className='actlist__error-text'>{error}</Text>
                  <View
                    className='actlist__retry'
                    onClick={() => setReloadKey((k) => k + 1)}
                  >
                    <Text>点击重试</Text>
                  </View>
                </View>
              ) : activities.length === 0 ? (
                <View className='actlist__placeholder'>
                  <Text className='actlist__placeholder-text'>暂无活动</Text>
                </View>
              ) : null}
            </View>
          )}
        </View>
      </View>
    </View>
  )
}