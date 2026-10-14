import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad, usePullDownRefresh } from '@tarojs/taro'

import { NavBar, ListEmpty, ListLoading } from '@/components/business'
import { Icon } from '@/components/ui'
import type { IconName } from '@/constants/icons'
import { messageApi } from '@/services'
import { useUserStore } from '@/stores'
import { formatRelativeTime } from '@/utils'
import type { MessageItem } from '@/types/message'
import './index.scss'

const ICON_MAP: Record<string, IconName> = {
  homework: 'file-text',
  activity: 'clock',
  vote: 'vote',
  random_draw: 'dices',
  fee: 'wallet'
}

const BG_MAP: Record<string, string> = {
  homework: '#DBEAFE',
  activity: '#DCFCE7',
  vote: '#FEF3C7',
  random_draw: '#F3E8FF',
  fee: '#DCFCE7'
}

const COLOR_MAP: Record<string, string> = {
  homework: '#1986E6',
  activity: '#22C55E',
  vote: '#F59E0B',
  random_draw: '#A855F7',
  fee: '#22C55E'
}

const LABEL_MAP: Record<string, string> = {
  homework: '作业',
  activity: '活动',
  vote: '投票',
  random_draw: '抽签',
  fee: '班费'
}

function isReadOf(item: MessageItem): boolean {
  return (item as any).isRead === true || item.read === true
}

export default function MessageInteraction() {
  const currentClassId = useUserStore((s) => s.currentClassId)

  const [messages, setMessages] = useState<MessageItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchList = async () => {
    if (!currentClassId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res: any = await messageApi.getList(currentClassId, { pageSize: 100 })
      const raw = res?.list || []
      const interaction = raw.filter((m: MessageItem) => m.type !== 'notice')
      setMessages(interaction)
    } catch {
      Taro.showToast({ title: '获取互动消息失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  useLoad(() => {
    fetchList()
  })

  usePullDownRefresh(() => {
    fetchList().then(() => Taro.stopPullDownRefresh())
  })

  const handleItemClick = (id: string) => {
    Taro.navigateTo({ url: `/pages-sub/message/detail/index?messageId=${id}` })
  }

  return (
    <View className='interact'>
      <View className='interact__header'>
        <NavBar title='互动消息' transparent light showBack />
      </View>

      <View className='interact__body'>
        <View className='interact__decor' />
        <View className='interact__content'>
          <View className='interact__list'>
            {loading ? (
              <ListLoading rows={5} />
            ) : messages.length === 0 ? (
              <ListEmpty icon='bell' text='暂无互动消息' />
            ) : (
              messages.map((item) => {
                const type = item.type || 'activity'
                const bg = BG_MAP[type] || '#F3F4F6'
                const color = COLOR_MAP[type] || '#4B5563'
                const icon = ICON_MAP[type] || 'bell'
                const label = LABEL_MAP[type] || '消息'
                const statusLabel = item.status === 'ended' ? '已结束' : '进行中'
                const unread = !isReadOf(item)
                return (
                  <View
                    key={item.id}
                    className='interact__card'
                    onClick={() => handleItemClick(item.id)}
                  >
                    <View className='interact__icon' style={{ backgroundColor: bg }}>
                      <Icon name={icon} size={40} color={color} />
                    </View>
                    <View className='interact__info'>
                      <Text className='interact__title'>{item.title}</Text>
                      <Text className='interact__desc'>{label} · {statusLabel}</Text>
                    </View>
                    <View className='interact__side'>
                      <Text className='interact__time'>
                        {formatRelativeTime(item.createdAt || '')}
                      </Text>
                      <Text className='interact__dot'>
                        {unread ? '●' : ''}
                      </Text>
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