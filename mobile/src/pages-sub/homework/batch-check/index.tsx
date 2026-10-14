import { useState } from 'react'
import { View, Text, Textarea } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar } from '@/components/business'
import { Button } from '@/components/ui'
import { homeworkApi } from '@/services'
import { useAuth } from '@/utils'
import './index.scss'

export default function BatchCheck() {
  const { requireAuth, requireLogin } = useAuth()

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const paramsRef = { classId: '', homeworkId: '', homeworkTitle: '' }

  const parsedIds = input
    .split(/[\s,，\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)

  useLoad((o) => {
    if (!requireLogin()) return
    if (!requireAuth('committee')) return
    paramsRef.classId = (o?.classId as string) || ''
    paramsRef.homeworkId = (o?.homeworkId as string) || ''
    paramsRef.homeworkTitle = (o?.homeworkTitle as string) || ''
  })

  const handleCheck = async () => {
    if (loading) return
    if (!paramsRef.classId || !paramsRef.homeworkId) {
      Taro.showToast({ title: '请先选择作业', icon: 'none' })
      return
    }
    if (parsedIds.length === 0) {
      Taro.showToast({ title: '请输入至少一个学号', icon: 'none' })
      return
    }
    setLoading(true)
    try {
      const res: any = await homeworkApi.offlineCheck(paramsRef.classId, {
        homeworkId: paramsRef.homeworkId,
        checkType: 'student_id',
        studentIds: parsedIds
      })
      const result = res?.data ?? res
      Taro.navigateTo({
        url: `/pages-sub/homework/check-result/index?classId=${paramsRef.classId}&homeworkId=${paramsRef.homeworkId}&homeworkTitle=${encodeURIComponent(
          paramsRef.homeworkTitle || '作业核对'
        )}&result=${encodeURIComponent(JSON.stringify(result || {}))}`
      })
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : '核对失败，请重试', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='hwbc'>
      <NavBar title='批量学号核对' />

      <View className='hwbc__body'>
        <View className='hwbc__section'>
          <Text className='hwbc__label'>核对作业</Text>
          <Text className='hwbc__hw-title'>{paramsRef.homeworkTitle || '未选择作业'}</Text>
        </View>

        <View className='hwbc__section'>
          <Text className='hwbc__label'>已交学生学号</Text>
          <View className='hwbc__textarea-wrap'>
            <Textarea
              className='hwbc__textarea'
              value={input}
              placeholder='粘贴/输入已交学生学号，支持空格、换行分隔'
              placeholderClass='hwbc__placeholder'
              onInput={(e) => setInput(e.detail.value)}
            />
          </View>
        </View>

        <View className='hwbc__hint'>
          <Text className='hwbc__hint-text'>
            提示：支持学号输入，多个学号用空格、逗号或换行分隔。已输入{' '}
            <Text className='hwbc__hint-num'>{parsedIds.length}</Text> 个学号。
          </Text>
        </View>

        <View className='hwbc__spacer' />

        <Button type='primary' size='lg' block loading={loading} disabled={input.trim().length === 0} onClick={handleCheck}>
          {loading ? '核对中...' : '开始核对'}
        </Button>
      </View>
    </View>
  )
}