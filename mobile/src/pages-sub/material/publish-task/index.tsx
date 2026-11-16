import { useState } from 'react'
import { View, Text, Input, Textarea, Picker } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar, DateTimePicker } from '@/components/business'
import { Button } from '@/components/ui'
import { classesApi, taskApi } from '@/services'
import type { ClassMember } from '@/services/classes'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

/** 任务优先级：0 无 / 1 低 / 2 中 / 3 高（同任务详情） */
const PRIORITY_OPTIONS = [
  { value: 0, label: '无' },
  { value: 1, label: '低' },
  { value: 2, label: '中' },
  { value: 3, label: '高' }
]

export default function PublishTask() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const userInfo = useUserStore((s) => s.userInfo)
  const { requireAuth } = useAuth()

  const [title, setTitle] = useState('')
  const [deadline, setDeadline] = useState('')
  const [location, setLocation] = useState('')
  const [content, setContent] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [members, setMembers] = useState<ClassMember[]>([])
  const [priority, setPriority] = useState(0)
  const [loading, setLoading] = useState(false)

  const classIdRef = { id: currentClassId || '' }

  useLoad((o) => {
    if (!requireAuth('committee')) return
    const cid = (o?.classId as string) || currentClassId
    classIdRef.id = cid || ''
    setOwnerId(userInfo?.id || '')
    if (!cid) return
    classesApi
      .getMembers(cid, { pageSize: 200 })
      .then((res) => setMembers(res?.list || []))
      .catch(() => undefined)
  })

  const ownerOptions = members.filter((m) => !!m.userId)
  const ownerName =
    ownerOptions.find((m) => m.userId === ownerId)?.name ||
    (userInfo?.id === ownerId ? userInfo?.name : '') ||
    ''

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
        ownerId: ownerId || undefined,
        deadline: deadline || undefined,
        location: location.trim() || undefined,
        content: content.trim() || undefined,
        priority,
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

        <Picker
          mode='selector'
          range={ownerOptions.map((m) => m.name)}
          onChange={(e) => {
            const picked = ownerOptions[Number(e.detail.value)]
            if (picked?.userId) setOwnerId(picked.userId)
          }}
        >
          <View className='taskpub__row'>
            <Text className='taskpub__label'>负责人</Text>
            <Text className={`taskpub__value${ownerName ? '' : ' taskpub__value--empty'}`}>
              {ownerName || '请选择负责人'}
            </Text>
          </View>
        </Picker>

        <View className='taskpub__row'>
          <Text className='taskpub__label'>截止时间</Text>
          <DateTimePicker mode='datetime' value={deadline} onChange={setDeadline} />
        </View>

        <View className='taskpub__row'>
          <Text className='taskpub__label'>优先级</Text>
          <View className='taskpub__chips'>
            {PRIORITY_OPTIONS.map((option) => (
              <View
                key={option.value}
                className={`taskpub__chip${priority === option.value ? ' taskpub__chip--active' : ''}`}
                onClick={() => setPriority(option.value)}
              >
                <Text className='taskpub__chip-text'>{option.label}</Text>
              </View>
            ))}
          </View>
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