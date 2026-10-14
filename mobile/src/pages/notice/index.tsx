import { useState, useRef, useCallback } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad, useDidShow, usePullDownRefresh, useReachBottom } from '@tarojs/taro'

import { NavBar, Tabs, ListEmpty, ListLoading } from '@/components/business'
import { Icon } from '@/components/ui'
import type { IconName } from '@/constants/icons'
import { messageApi } from '@/services'
import { useUserStore } from '@/stores'
import { formatRelativeTime } from '@/utils'
import type { MessageItem } from '@/types/message'
import './index.scss'

const PAGE_SIZE = 10

const NOTICE_TAB = 'notice'
const INTERACT_TAB = 'interact'

const TYPE_LABEL: Record<string, string> = {
  notice: '通知',
  homework: '作业',
  activity: '活动',
  vote: '投票',
  random_draw: '抽签',
  fee: '班费'
}

const NOTICE_COLOR: Record<string, string> = {
  notice: '#2563EB',
  homework: '#F97316',
  activity: '#EF4444'
}

const INTERACT_COLOR: Record<string, string> = {
  homework: '#1986E6',
  activity: '#22C55E',
  vote: '#F59E0B',
  random_draw: '#A855F7',
  fee: '#22C55E'
}

const INTERACT_BG: Record<string, string> = {
  homework: '#DBEAFE',
  activity: '#DCFCE7',
  vote: '#FEF3C7',
  random_draw: '#F3E8FF',
  fee: '#DCFCE7'
}

const INTERACT_ICON: Record<string, IconName> = {
  homework: 'file-text',
  activity: 'clock',
  vote: 'vote',
  random_draw: 'dices',
  fee: 'wallet'
}

function isReadOf(item: MessageItem): boolean {
  return (item as any).isRead === true || item.read === true
}

export default function Notice() {
  const currentClassId = useUserStore((s) => s.currentClassId)

  const [activeTab, setActiveTab] = useState<string>(NOTICE_TAB)
  const [list, setList] = useState<MessageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  const pageRef = useRef(1)
  const listRef = useRef<MessageItem[]>([])
  const firstShowRef = useRef(true)

  const fetchList = useCallback(
    async (nextPage: number, tab: string) => {
      const classId = currentClassId
      if (!classId) {
        setLoading(false)
        return
      }
      const isNotice = tab === NOTICE_TAB
      if (nextPage === 1) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      try {
        const res: any = await messageApi.getList(classId, {
          type: isNotice ? 'notice' : undefined,
          page: nextPage,
          pageSize: PAGE_SIZE
        })
        const raw = res?.list || []
        const rawTotal = res?.total ?? 0
        const eligible = isNotice ? raw : raw.filter((m: any) => m.type !== 'notice')

        const prevLen = nextPage === 1 ? 0 : listRef.current.length
        const mergedLen = prevLen + eligible.length
        const merged = nextPage === 1 ? [...eligible] : [...listRef.current, ...eligible]

        listRef.current = merged
        pageRef.current = nextPage
        setList(merged)
        setHasMore(isNotice ? mergedLen < rawTotal : raw.length >= PAGE_SIZE)
      } catch {
        Taro.showToast({ title: '获取消息列表失败', icon: 'none' })
      } finally {
        if (nextPage === 1) {
          setLoading(false)
        } else {
          setLoadingMore(false)
        }
      }
    },
    [currentClassId]
  )

  useLoad(() => {
    fetchList(1, activeTab)
  })

  useDidShow(() => {
    // 返回本页时重新拉第一页（首帧由 useLoad 触发，避免重复）
    if (firstShowRef.current) {
      firstShowRef.current = false
      return
    }
    fetchList(1, activeTab)
  })

  usePullDownRefresh(() => {
    fetchList(1, activeTab).then(() => Taro.stopPullDownRefresh())
  })

  useReachBottom(() => {
    if (loading || loadingMore || !hasMore) return
    fetchList(pageRef.current + 1, activeTab)
  })

  const handleTabChange = (key: string) => {
    if (key === activeTab) return
    setActiveTab(key)
    listRef.current = []
    pageRef.current = 1
    fetchList(1, key)
  }

  const handleItemClick = (id: string) => {
    Taro.navigateTo({ url: `/pages-sub/message/detail/index?messageId=${id}` })
  }

  const renderItem = (item: MessageItem) => {
    const isNotice = activeTab === NOTICE_TAB
    const type = item.type || 'notice'
    const timeStr = formatRelativeTime(item.createdAt || '')
    const publisherName = item.publisher?.name || '未知'
    const unread = !isReadOf(item)

    if (isNotice) {
      const color = NOTICE_COLOR[type] || '#2563EB'
      const ackLabel = item.requireAck
        ? isReadOf(item)
          ? '已确认'
          : '待确认'
        : isReadOf(item)
          ? '已读'
          : '未读'
      return (
        <View key={item.id} className='notice__card notice__card--notice press-bg' onClick={() => handleItemClick(item.id)}>
          <View className='notice__card-icon' style={{ backgroundColor: color }}>
            <View className='notice__card-icon-shine' />
            <Icon name='bell' size={48} color='#FFFFFF' />
          </View>
          <View className='notice__card-body'>
            <Text className='notice__card-title'>{item.title}</Text>
            <Text className='notice__card-meta'>
              {timeStr} · {ackLabel} · {publisherName}
            </Text>
          </View>
          {unread ? <View className='notice__card-dot' /> : null}
        </View>
      )
    }

    // 互动
    const bg = INTERACT_BG[type] || '#F3F4F6'
    const color = INTERACT_COLOR[type] || '#6B7280'
    const icon = INTERACT_ICON[type] || 'bell'
    const typeLabel = TYPE_LABEL[type] || '消息'
    const statusLabel = item.status === 'ended' ? '已结束' : '进行中'
    return (
      <View key={item.id} className='notice__card press-bg' onClick={() => handleItemClick(item.id)}>
        <View className='notice__card-icon' style={{ backgroundColor: bg }}>
          <View className='notice__card-icon-shine' />
          <Icon name={icon} size={48} color={color} />
        </View>
        <View className='notice__card-body'>
          <Text className='notice__card-title'>{item.title}</Text>
          <Text className='notice__card-meta'>
            {typeLabel} · {statusLabel}
          </Text>
        </View>
        <View className='notice__card-time'>
          <Text className='notice__card-meta'>{timeStr}</Text>
          {unread ? <View className='notice__card-dot' /> : null}
        </View>
      </View>
    )
  }

  return (
    <View className='notice'>
      <NavBar title='通知' showBack={false} />

      <View className='notice__body'>
        <View className='notice__tabs-wrap'>
          <Tabs
            tabs={[
              { key: NOTICE_TAB, label: '通知' },
              { key: INTERACT_TAB, label: '互动' }
            ]}
            activeKey={activeTab}
            onChange={handleTabChange}
          />
        </View>

        <View className='notice__list'>
          {loading ? (
            <ListLoading rows={5} />
          ) : list.length === 0 ? (
            <ListEmpty
              icon='bell'
              text={activeTab === NOTICE_TAB ? '暂无通知' : '暂无互动消息'}
            />
          ) : (
            <>
              {list.map(renderItem)}
              {loadingMore ? (
                <View className='notice__more'>
                  <Text className='notice__more-text'>加载中...</Text>
                </View>
              ) : hasMore ? (
                <View className='notice__more'>
                  <Text className='notice__more-text'>上拉加载更多</Text>
                </View>
              ) : (
                <View className='notice__more'>
                  <Text className='notice__more-text'>没有更多了</Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  )
}