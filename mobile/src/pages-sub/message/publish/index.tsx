import { useState } from 'react'
import { View, Text, Textarea } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar, DateTimePicker } from '@/components/business'
import { Button, Input } from '@/components/ui'
import { messageApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

function toIso(datetime: string): string {
  if (!datetime) return ''
  return new Date(datetime.replace(' ', 'T')).toISOString()
}

export default function MessagePublish() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireAuth } = useAuth()

  const [title, setTitle] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [location, setLocation] = useState('')
  const [content, setContent] = useState('')
  const [requireAck, setRequireAck] = useState(true)
  const [ackDeadline, setAckDeadline] = useState('')
  const [status, setStatus] = useState<'published' | 'ended'>('published')
  const [loading, setLoading] = useState(false)

  useLoad(() => {
    if (!requireAuth('committee')) {
      setTimeout(() => Taro.navigateBack(), 1500)
    }
  })

  const validate = (): boolean => {
    if (!title.trim()) {
      Taro.showToast({ title: '请输入通知标题', icon: 'none' })
      return false
    }
    if (!eventTime) {
      Taro.showToast({ title: '请选择发布时间', icon: 'none' })
      return false
    }
    if (!location.trim()) {
      Taro.showToast({ title: '请输入地点', icon: 'none' })
      return false
    }
    if (!content.trim()) {
      Taro.showToast({ title: '请输入通知内容', icon: 'none' })
      return false
    }
    return true
  }

  const handlePublish = async () => {
    if (!validate() || loading || !currentClassId) return
    setLoading(true)
    try {
      await messageApi.publish(currentClassId, {
        type: 'notice',
        title: title.trim(),
        content: content.trim(),
        location: location.trim(),
        eventTime: toIso(eventTime),
        requireAck,
        status,
        ackDeadline: requireAck && ackDeadline ? toIso(ackDeadline) : undefined
      })
      Taro.showToast({ title: '发布成功', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 500)
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '发布失败，请稍后重试',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='msgpublish'>
      <NavBar title='发布通知' />

      <View className='msgpublish__body'>
        <Input
          value={title}
          onChange={setTitle}
          placeholder='请输入通知标题'
          maxLength={50}
        />

        <View className='msgpublish__picker'>
          <DateTimePicker
            mode='datetime'
            value={eventTime}
            onChange={setEventTime}
            placeholder='请选择发布时间'
          />
        </View>

        <Input
          value={location}
          onChange={setLocation}
          placeholder='请输入地点'
          maxLength={100}
        />

        <View className='msgpublish__textarea'>
          <Textarea
            className='msgpublish__textarea-native'
            value={content}
            placeholder='请输入通知内容...'
            placeholderClass='msgpublish__placeholder'
            maxlength={2000}
            onInput={(e) => setContent(e.detail.value)}
          />
        </View>

        <View className='msgpublish__options'>
          <View className='msgpublish__row'>
            <Text className='msgpublish__row-label'>开启签收确认</Text>
            <View
              className={`msgpublish__switch ${requireAck ? 'msgpublish__switch--on' : ''}`}
              onClick={() => setRequireAck((v) => !v)}
            >
              <View
                className={`msgpublish__switch-dot ${requireAck ? 'msgpublish__switch-dot--on' : ''}`}
              />
            </View>
          </View>

          {requireAck ? (
            <View className='msgpublish__row'>
              <Text className='msgpublish__row-label'>签收截止时间（可选）</Text>
              <DateTimePicker
                mode='datetime'
                value={ackDeadline}
                onChange={setAckDeadline}
                placeholder='请选择'
              />
            </View>
          ) : null}

          <View className='msgpublish__row'>
            <Text className='msgpublish__row-label'>通知状态</Text>
            <View className='msgpublish__seg'>
              <View
                className={`msgpublish__seg-item ${
                  status === 'published' ? 'msgpublish__seg-item--active' : ''
                }`}
                onClick={() => setStatus('published')}
              >
                <Text className='msgpublish__seg-text'>进行中</Text>
              </View>
              <View
                className={`msgpublish__seg-item ${
                  status === 'ended' ? 'msgpublish__seg-item--active' : ''
                }`}
                onClick={() => setStatus('ended')}
              >
                <Text className='msgpublish__seg-text'>已结束</Text>
              </View>
            </View>
          </View>
        </View>

        <View className='msgpublish__footer'>
          <Button
            type='primary'
            size='lg'
            block
            loading={loading}
            onClick={handlePublish}
          >
            发布
          </Button>
        </View>
      </View>
    </View>
  )
}