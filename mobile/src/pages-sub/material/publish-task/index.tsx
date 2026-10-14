import { useState } from 'react'
import { View, Text, Input, Textarea } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar, DateTimePicker } from '@/components/business'
import { Button } from '@/components/ui'
import { taskApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

export default function PublishTask() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireAuth } = useAuth()

  const [title, setTitle] = useState('')
  const [deadline, setDeadline] = useState('')
  const [location, setLocation] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  const classIdRef = { id: currentClassId || '' }

  useLoad((o) => {
    if (!requireAuth('committee')) return
    const cid = (o?.classId as string) || currentClassId
    classIdRef.id = cid || ''
  })

  const handleSubmit = async () => {
    if (!title.trim()) {
      Taro.showToast({ title: '请输入任务名称', icon: 'none' })
      return
    }
    if (!classIdRef.id) {
      Taro.showToast({ title: '请先加入班级', icon: 'none' })
      return
    }
    setLoading(true)
    try {
      await taskApi.publishTask(classIdRef.id, {
        title: title.trim(),
        deadline: deadline || undefined,
        progress: 0
      })
      Taro.showToast({ title: '任务创建成功', icon: 'success' })
      setTimeout(() => {
        Taro.navigateBack()
      }, 600)
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : '创建任务失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='taskpub'>
      <NavBar title='新增任务' />

      <View className='taskpub__body'>
        <View className='taskpub__field'>
          <Input
            className='taskpub__native'
            type='text'
            value={title}
            placeholder='请输入任务名称'
            placeholderClass='taskpub__placeholder'
            onInput={(e) => setTitle(e.detail.value)}
          />
        </View>

        <View className='taskpub__row'>
          <Text className='taskpub__label'>截止时间</Text>
          <DateTimePicker mode='datetime' value={deadline} onChange={setDeadline} />
        </View>

        <View className='taskpub__field'>
          <Input
            className='taskpub__native'
            type='text'
            value={location}
            placeholder='请输入任务地点'
            placeholderClass='taskpub__placeholder'
            onInput={(e) => setLocation(e.detail.value)}
          />
        </View>

        <View className='taskpub__field taskpub__field--area'>
          <Textarea
            className='taskpub__area'
            value={content}
            placeholder='请输入任务内容...'
            placeholderClass='taskpub__placeholder'
            onInput={(e) => setContent(e.detail.value)}
          />
        </View>

        <View className='taskpub__spacer' />

        <Button type='primary' size='lg' block loading={loading} onClick={handleSubmit}>
          {loading ? '创建中...' : '新增任务'}
        </Button>
      </View>
    </View>
  )
}