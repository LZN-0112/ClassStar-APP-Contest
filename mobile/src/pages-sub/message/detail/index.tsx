import { useState } from 'react'
import { View, Text, RichText } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar, ListLoading } from '@/components/business'
import { Icon } from '@/components/ui'
import { messageApi } from '@/services'
import { useUserStore } from '@/stores'
import { formatRelativeTime } from '@/utils'
import { cleanHtml } from '@/utils/html'
import type { MessageItem } from '@/types/message'
import './index.scss'

interface DetailData extends Partial<MessageItem> {
  isAcked?: boolean
  isRead?: boolean
  ackDeadline?: string
  eventTime?: string
  location?: string
  publisher?: { id: string; name: string }
}

function formatDateTime(iso?: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export default function MessageDetail() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const user = useUserStore((s) => s.userInfo)

  const [message, setMessage] = useState<DetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [acking, setAcking] = useState(false)

  const messageIdRef = { id: '' }

  const isAdmin =
    user?.roleLevel === 'owner' ||
    user?.roleLevel === 'admin' ||
    user?.isCommittee === true

  useLoad((options) => {
    const messageId = options?.messageId as string
    if (!messageId) {
      Taro.showToast({ title: '通知ID缺失', icon: 'none' })
      Taro.navigateBack()
      return
    }
    messageIdRef.id = messageId

    const load = async () => {
      if (!currentClassId) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const res: any = await messageApi.getDetail(currentClassId, messageId)
        setMessage(res || null)
      } catch {
        Taro.showToast({ title: '获取通知详情失败', icon: 'none' })
      } finally {
        setLoading(false)
      }
      // 已读标记失败不影响详情展示
      try {
        await messageApi.markRead(currentClassId, messageId)
      } catch {
        /* ignore */
      }
    }
    load()
  })

  const handleAck = async () => {
    if (!message || message.isAcked || !currentClassId || acking) return
    setAcking(true)
    try {
      await messageApi.ack(currentClassId, messageIdRef.id)
      setMessage((prev) => (prev ? { ...prev, isAcked: true } : prev))
      Taro.showToast({ title: '签收成功', icon: 'success' })
    } catch (err) {
      const msg = err instanceof Error ? err.message || '' : ''
      if (msg.includes('重复签收') || msg.includes('已签收')) {
        setMessage((prev) => (prev ? { ...prev, isAcked: true } : prev))
        Taro.showToast({ title: '已签收，不能重复签收', icon: 'none' })
      } else {
        Taro.showToast({ title: msg || '签收失败，请稍后重试', icon: 'none' })
      }
    } finally {
      setAcking(false)
    }
  }

  const handleViewStats = () => {
    Taro.navigateTo({
      url: `/pages-sub/message/stats/index?messageId=${messageIdRef.id}`
    })
  }

  const isOverdue =
    message?.requireAck &&
    message?.ackDeadline &&
    !message.isAcked &&
    new Date() > new Date(message.ackDeadline)

  return (
    <View className='msgdetail'>
      <NavBar title='通知详情' />

      <View className='msgdetail__body'>
        {loading ? (
          <ListLoading rows={4} />
        ) : !message ? (
          <View className='msgdetail__empty'>
            <Text className='msgdetail__empty-text'>通知不存在</Text>
          </View>
        ) : (
          <>
            <Text className='msgdetail__title'>{message.title}</Text>
            <Text className='msgdetail__time'>
              发布时间：{formatDateTime(message.createdAt)}
            </Text>

            <View className='msgdetail__status'>
              <View
                className={`msgdetail__tag ${
                  message.status === 'ended' ? 'msgdetail__tag--muted' : 'msgdetail__tag--active'
                }`}
              >
                <Text className='msgdetail__tag-text'>
                  {message.status === 'ended' ? '已结束' : '进行中'}
                </Text>
              </View>
            </View>

            <View className='msgdetail__card'>
              <Text className='msgdetail__card-line'>📅 时间：{formatDateTime(message.eventTime)}</Text>
              <Text className='msgdetail__card-line'>📍 地点：{message.location || '-'}</Text>
              {message.requireAck ? (
                <Text className='msgdetail__card-line'>
                  ⏰ 签收截止：{message.ackDeadline ? formatDateTime(message.ackDeadline) : '不限制'}
                </Text>
              ) : null}
            </View>

            <View className='msgdetail__card'>
              <RichText className='msgdetail__content' nodes={cleanHtml(message.content || '')} />
            </View>

            {isOverdue ? (
              <View className='msgdetail__overdue'>
                <Text className='msgdetail__overdue-text'>该通知已超过签收截止时间</Text>
              </View>
            ) : null}

            {message.requireAck ? (
              <View
                className={`msgdetail__btn ${
                  message.isAcked ? 'msgdetail__btn--done' : 'msgdetail__btn--primary'
                }`}
                onClick={message.isAcked ? undefined : handleAck}
              >
                {message.isAcked ? <Icon name='check' size={36} color='#FFFFFF' /> : null}
                <Text className='msgdetail__btn-text'>
                  {message.isAcked ? '已签收' : acking ? '签收中...' : '确认签收'}
                </Text>
              </View>
            ) : null}

            {isAdmin ? (
              <View className='msgdetail__btn msgdetail__btn--ghost' onClick={handleViewStats}>
                <Text className='msgdetail__btn-text--blue'>查看签收统计</Text>
              </View>
            ) : null}

            <View className='msgdetail__foot'>
              <Text className='msgdetail__foot-text'>
                发布人：{message.publisher?.name || '系统'} · {formatRelativeTime(message.createdAt || '')}
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  )
}