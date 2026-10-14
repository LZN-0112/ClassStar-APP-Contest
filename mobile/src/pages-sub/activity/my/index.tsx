import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad, useDidShow } from '@tarojs/taro'

import { NavBar, ListEmpty, ListLoading } from '@/components/business'
import { Icon } from '@/components/ui'
import { activityApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

interface ActivityItem {
  id: string
  title: string
  eventDate: string
  location?: string
  displayStatus: 'registering' | 'ongoing' | 'ended'
}

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'ongoing', label: '进行中' },
  { key: 'ended', label: '已结束' }
]

const STATUS_LABEL: Record<string, string> = {
  registering: '报名中',
  ongoing: '进行中',
  ended: '已结束'
}

export default function MyActivities() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireLogin } = useAuth()

  const [filter, setFilter] = useState('all')
  const [list, setList] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  const classIdRef = { id: currentClassId || '' }

  useLoad(() => {
    if (!requireLogin()) return
  })

  useDidShow(() => {
    fetchList()
  })

  const fetchList = async () => {
    if (!classIdRef.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res: any = await activityApi.getList(classIdRef.id, { pageSize: 100 })
      setList(res?.list || [])
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }

  const filtered = list.filter((a) => {
    if (filter === 'ongoing') return a.displayStatus === 'registering' || a.displayStatus === 'ongoing'
    if (filter === 'ended') return a.displayStatus === 'ended'
    return true
  })

  const goDetail = (id: string) => {
    Taro.navigateTo({
      url: `/pages-sub/activity/detail/index?classId=${classIdRef.id}&activityId=${id}`
    })
  }

  return (
    <View className='actmy'>
      <NavBar title='我的活动' />

      <View className='actmy__body'>
        <View className='actmy__filters'>
          {FILTERS.map((f) => {
            const active = filter === f.key
            return (
              <View
                key={f.key}
                className={`actmy__filter ${active ? 'actmy__filter--active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                <Text className={`actmy__filter-text ${active ? 'actmy__filter-text--active' : ''}`}>
                  {f.label}
                </Text>
              </View>
            )
          })}
        </View>

        <Text className='actmy__group-title'>活动记录</Text>

        {loading ? (
          <ListLoading rows={4} />
        ) : filtered.length === 0 ? (
          <ListEmpty text='暂无活动' />
        ) : (
          <View className='actmy__list'>
            {filtered.map((item) => {
              const statusLabel = STATUS_LABEL[item.displayStatus] || '已结束'
              const isEnded = item.displayStatus === 'ended'
              return (
                <View className='actmy__card' key={item.id} onClick={() => goDetail(item.id)}>
                  <View className='actmy__thumb'>
                    <Icon name='calendar' size={64} color='#3B82F6' strokeWidth={2} />
                  </View>
                  <View className='actmy__info'>
                    <Text className='actmy__title'>{item.title}</Text>
                    <Text className='actmy__meta'>{item.eventDate} · {item.location || '待定'}</Text>
                    <View className={`actmy__status ${isEnded ? 'actmy__status--ended' : ''}`}>
                      <Text className={`actmy__status-text ${isEnded ? 'actmy__status-text--ended' : ''}`}>
                        {statusLabel}
                      </Text>
                    </View>
                  </View>
                </View>
              )
            })}
          </View>
        )}
      </View>
    </View>
  )
}