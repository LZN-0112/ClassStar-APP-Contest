import { useState, useRef, useCallback } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad, useDidShow, usePullDownRefresh } from '@tarojs/taro'

import { NavBar, ListEmpty, ListLoading } from '@/components/business'
import { Icon } from '@/components/ui'
import type { IconName } from '@/constants/icons'
import { messageApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth , formatRelativeTime } from '@/utils'
import type { MessageItem } from '@/types/message'
import './index.scss'

const PAGE_SIZE = 50

const ICON_MAP: Record<string, IconName> = {
  notice: 'bell',
  homework: 'file-text',
  activity: 'flag'
}

const LABEL_MAP: Record<string, string> = {
  notice: '通知',
  homework: '学业',
  activity: '活动'
}

const COLOR_MAP: Record<string, string> = {
  notice: '#0062FF',
  homework: '#22C55E',
  activity: '#F59E0B'
}

function isReadOf(item: MessageItem): boolean {
  return (item as any).isRead === true || item.read === true
}

export default function MessageList() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { isCommittee } = useAuth()

  const [list, setList] = useState<MessageItem[]>([])
  const [loading, setLoading] = useState(true)

  const listRef = useRef<MessageItem[]>([])
  const firstShowRef = useRef(true)

  const fetchList = useCallback(
    async () => {
      if (!currentClassId) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const res: any = await messageApi.getList(currentClassId, {
          page: 1,
          pageSize: PAGE_SIZE
        })
        const raw = res?.list || []
        listRef.current = raw
        setList(raw)
      } catch {
        Taro.showToast({ title: '获取消息列表失败', icon: 'none' })
      } finally {
        setLoading(false)
      }
    },
    [currentClassId]
  )

  useLoad(() => {
    fetchList()
  })

  useDidShow(() => {
    // 返回本页时重新拉取第一页（首帧由 useLoad 触发，避免重复）
    if (firstShowRef.current) {
      firstShowRef.current = false
      return
    }
    fetchList()
  })

  usePullDownRefresh(() => {
    fetchList().then(() => Taro.stopPullDownRefresh())
  })

  const handleItemClick = (id: string) => {
    Taro.navigateTo({ url: `/pages-sub/message/detail/index?messageId=${id}` })
  }

  const handlePublish = () => {
    if (!isCommittee) {
      Taro.showToast({ title: '仅班委可发布通知', icon: 'none' })
      return
    }
    Taro.navigateTo({ url: '/pages-sub/message/publish/index' })
  }

  return (
    <View className='msglist'>
      <NavBar
        title='通知'
        right={
          <View className='msglist__publish' onClick={handlePublish}>
            <Text className='msglist__publish-text'>发布通知</Text>
          </View>
        }
      />

      <View className='msglist__body'>
        <View className='msglist__list'>
          {loading ? (
            <ListLoading rows={6} />
          ) : list.length === 0 ? (
            <ListEmpty icon='bell' text='暂无通知' />
          ) : (
            list.map((item) => {
              const type = item.type || 'notice'
              const color = COLOR_MAP[type] || '#0062FF'
              const label = LABEL_MAP[type] || '通知'
              const statusLabel = item.status === 'ended' ? '已结束' : '进行中'
              const unread = !isReadOf(item)
              return (
                <View
                  key={item.id}
                  className='msglist__card'
                  onClick={() => handleItemClick(item.id)}
                >
                  <View className='msglist__icon' style={{ backgroundColor: color }}>
                    <Icon name={ICON_MAP[type] || 'bell'} size={36} color='#FFFFFF' />
                  </View>
                  <View className='msglist__info'>
                    <Text className='msglist__title'>{item.title}</Text>
                    <Text className='msglist__meta'>
                      {formatRelativeTime(item.createdAt || '')} · {label} · {statusLabel}
                    </Text>
                  </View>
                  {unread ? <View className='msglist__dot' /> : null}
                </View>
              )
            })
          )}
        </View>
      </View>
    </View>
  )
}