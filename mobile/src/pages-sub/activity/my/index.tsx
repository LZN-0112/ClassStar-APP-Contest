import { useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useDidShow, useLoad } from '@tarojs/taro'

import { PageHeader } from '@/components/business'
import { Icon } from '@/components/ui'
import { activityApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

type ActivityStatus = '全部' | '报名中' | '进行中' | '已结束'

interface ActivityItem {
  id: string
  title: string
  date: string
  eventTime: string | null
  location: string
  displayStatus: 'registering' | 'ongoing' | 'ended'
  registrationStatus: 'pending' | 'registered' | 'approved' | 'rejected' | null
}

const REGISTRATION_META: Record<
  'pending' | 'registered' | 'approved' | 'rejected',
  { label: string; bg: string; color: string }
> = {
  pending: { label: '待审核', bg: '#fef3c7', color: '#b45309' },
  registered: { label: '已通过', bg: '#dcfce7', color: '#15803d' },
  approved: { label: '已通过', bg: '#dcfce7', color: '#15803d' },
  rejected: { label: '未通过', bg: '#fee2e2', color: '#b91c1c' }
}

const STATUS_META: Record<
  'registering' | 'ongoing' | 'ended',
  { label: string; bg: string; color: string }
> = {
  registering: { label: '报名中', bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' },
  ongoing: { label: '进行中', bg: 'rgba(0, 98, 255, 0.1)', color: '#0062ff' },
  ended: { label: '已结束', bg: 'rgba(107, 114, 128, 0.1)', color: '#6b7280' }
}

const TABS: ActivityStatus[] = ['全部', '报名中', '进行中', '已结束']

const TAB_STATUS: Record<ActivityStatus, ActivityItem['displayStatus'] | null> = {
  全部: null,
  报名中: 'registering',
  进行中: 'ongoing',
  已结束: 'ended'
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

export default function MyActivities() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireLogin } = useAuth()

  const [filter, setFilter] = useState<ActivityStatus>('全部')
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useLoad(() => {
    requireLogin()
  })

  useDidShow(() => {
    void fetchList()
  })

  const fetchList = async () => {
    if (!currentClassId) {
      setActivities([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res: any = await activityApi.myRegistration(currentClassId, { pageSize: 100 })
      const list: any[] = res?.list || []
      const mapped: ActivityItem[] = list.map((item) => ({
        id: item.activity.id,
        title: item.activity.title,
        date: formatDate(item.activity.eventDate || item.activity.event_date),
        eventTime: item.activity.eventTime || null,
        location: item.activity.location || '待定',
        displayStatus: item.activity.displayStatus || 'ended',
        registrationStatus: item.status || null
      }))
      // 同一活动只保留一条记录（避免重复报名数据造成重复卡片）
      const seen = new Set<string>()
      setActivities(
        mapped.filter((item) => {
          if (seen.has(item.id)) return false
          seen.add(item.id)
          return true
        })
      )
    } catch {
      setActivities([])
    } finally {
      setLoading(false)
    }
  }

  const targetStatus = TAB_STATUS[filter]
  const filtered = targetStatus
    ? activities.filter((item) => item.displayStatus === targetStatus)
    : activities

  const goDetail = (id: string) => {
    Taro.navigateTo({
      url: `/pages-sub/activity/detail/index?classId=${currentClassId}&activityId=${id}`
    })
  }

  return (
    <View className='actmy'>
      <PageHeader title='我的活动' variant='b' />

      <View className='actmy__body'>
        <View className='actmy__filters'>
          {TABS.map((tab) => {
            const active = filter === tab
            return (
              <View
                key={tab}
                className={`actmy__filter ${active ? 'actmy__filter--active' : ''}`}
                onClick={() => setFilter(tab)}
              >
                <Text
                  className={`actmy__filter-text ${
                    active ? 'actmy__filter-text--active' : ''
                  }`}
                >
                  {tab}
                </Text>
              </View>
            )
          })}
        </View>

        <View className='actmy__group'>
          <Text className='actmy__group-title'>活动记录</Text>

          <View className='actmy__list'>
            {loading ? (
              <View className='actmy__placeholder'>
                <Text>加载中...</Text>
              </View>
            ) : filtered.length === 0 ? (
              <View className='actmy__placeholder'>
                <Text>暂无活动</Text>
              </View>
            ) : (
              filtered.map((item) => {
                const meta = STATUS_META[item.displayStatus]
                const reg = item.registrationStatus
                  ? REGISTRATION_META[item.registrationStatus]
                  : null
                return (
                  <View
                    key={item.id}
                    className='actmy__card'
                    onClick={() => goDetail(item.id)}
                  >
                    <View className='actmy__thumb'>
                      <Icon name='calendar' size={64} color='#0062FF' strokeWidth={2} />
                    </View>
                    <View className='actmy__info'>
                      <Text className='actmy__title'>{item.title}</Text>
                      <Text className='actmy__meta'>
                        {item.date}
                        {item.eventTime ? ` ${item.eventTime}` : ''} · {item.location}
                      </Text>
                      <View className='actmy__tags'>
                        <View
                          className='actmy__tag'
                          style={{ background: meta.bg }}
                        >
                          <Text className='actmy__tag-text' style={{ color: meta.color }}>
                            {meta.label}
                          </Text>
                        </View>
                        {reg ? (
                          <View
                            className='actmy__tag'
                            style={{ background: reg.bg }}
                          >
                            <Text className='actmy__tag-text' style={{ color: reg.color }}>
                              报名{reg.label}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
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