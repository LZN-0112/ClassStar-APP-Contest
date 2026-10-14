import { useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro, { useLoad, useDidShow } from '@tarojs/taro'

import { NavBar, Tabs, ListEmpty, ListLoading } from '@/components/business'
import { Icon } from '@/components/ui'
import { activityApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

interface ActivityItem {
  id: string
  title: string
  eventDate: string
  eventTime?: string | null
  location?: string
  capacity?: number
  registeredCount?: number
  coverUrl?: string | null
  displayStatus: 'registering' | 'ongoing' | 'ended'
}

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'registering', label: '报名中' },
  { key: 'ongoing', label: '进行中' },
  { key: 'ended', label: '已结束' }
]

const STATUS_LABEL: Record<string, string> = {
  registering: '报名中',
  ongoing: '进行中',
  ended: '已结束'
}

export default function ActivityList() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireLogin, isCommittee: isCommitteeFlag } = useAuth()

  const [filter, setFilter] = useState('all')
  const [list, setList] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  const classIdRef = { id: currentClassId || '' }

  useLoad((o) => {
    if (!requireLogin()) return
    const cid = (o?.classId as string) || currentClassId
    classIdRef.id = cid || ''
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
      const res: any = await activityApi.getList(classIdRef.id, {
        pageSize: 100,
        status: filter === 'all' ? undefined : (filter as never)
      })
      setList(res?.list || [])
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }

  const goPublish = () => {
    Taro.navigateTo({ url: '/pages-sub/activity/publish/index' })
  }

  const goDetail = (id: string) => {
    Taro.navigateTo({
      url: `/pages-sub/activity/detail/index?classId=${classIdRef.id}&activityId=${id}`
    })
  }

  return (
    <View className='actlist'>
      <NavBar
        title='活动列表'
        right={
          isCommitteeFlag ? (
            <View className='actlist__publish' onClick={goPublish}>
              <Icon name='plus' size={32} color='#0062FF' strokeWidth={2} />
              <Text className='actlist__publish-text'>发布</Text>
            </View>
          ) : undefined
        }
      />

      <View className='actlist__body'>
        <Tabs tabs={TABS} activeKey={filter} onChange={(k) => setFilter(k)} />

        {loading ? (
          <ListLoading rows={4} />
        ) : list.length === 0 ? (
          <ListEmpty text='暂无活动' />
        ) : (
          <View className='actlist__group'>
            <Text className='actlist__group-title'>活动列表</Text>
            {list.map((item) => {
              const isEnded = item.displayStatus === 'ended'
              const isFull = item.capacity
                ? (item.registeredCount || 0) >= item.capacity
                : false
              const statusLabel = STATUS_LABEL[item.displayStatus] || '已结束'
              return (
                <View className='actlist__card' key={item.id} onClick={() => goDetail(item.id)}>
                  <View className='actlist__cover'>
                    {item.coverUrl ? (
                      <Image src={item.coverUrl} className='actlist__cover-img' mode='aspectFill' />
                    ) : (
                      <Icon name='image' size={96} color='#8ACAE5' strokeWidth={2} />
                    )}
                  </View>
                  <View className='actlist__info'>
                    <Text className='actlist__title'>{item.title}</Text>
                    <Text className='actlist__meta'>
                      {item.eventDate} {item.eventTime ?? ''} · {item.location || '待定'}
                    </Text>
                    <View className='actlist__footer'>
                      <Text className='actlist__count'>
                        报名 {isFull ? '已满' : `${item.registeredCount || 0}/${item.capacity ?? '不限'}`}
                      </Text>
                      <View className={`actlist__status ${isEnded ? 'actlist__status--ended' : ''}`}>
                        <Text className={`actlist__status-text ${isEnded ? 'actlist__status-text--ended' : ''}`}>
                          {statusLabel === '报名中' ? '报名' : statusLabel}
                        </Text>
                      </View>
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