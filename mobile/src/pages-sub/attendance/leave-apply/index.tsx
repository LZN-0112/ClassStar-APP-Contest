import { useState } from 'react'
import { View, Text, Textarea } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar } from '@/components/business'
import { Button } from '@/components/ui'
import { attendanceApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

export default function LeaveApply() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireLogin } = useAuth()

  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const classIdRef = { id: '' }
  const idRef = { id: '' }

  useLoad((options) => {
    if (!requireLogin()) return
    const classId = (options?.classId as string) || currentClassId
    const attendanceId = options?.attendanceId as string
    if (!classId || !attendanceId) {
      Taro.showToast({ title: '参数缺失', icon: 'none' })
      Taro.navigateBack()
      return
    }
    classIdRef.id = classId
    idRef.id = attendanceId
  })

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Taro.showToast({ title: '请填写请假原因', icon: 'none' })
      return
    }
    if (loading) return
    setLoading(true)
    try {
      await attendanceApi.leaveApply(classIdRef.id, idRef.id, { reason: reason.trim() })
      Taro.showToast({ title: '请假申请已提交', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 500)
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '提交失败，请重试',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='attleave'>
      <NavBar title='请假申请' />

      <View className='attleave__body'>
        <View className='attleave__field'>
          <Text className='attleave__label'>请假原因</Text>
          <Textarea
            className='attleave__textarea'
            value={reason}
            maxlength={200}
            placeholder='请填写请假原因...'
            placeholderClass='attleave__placeholder'
            onInput={(e) => setReason(e.detail.value)}
          />
        </View>

        <View className='attleave__footer'>
          <Button type='primary' size='lg' block loading={loading} onClick={handleSubmit}>
            提交申请
          </Button>
        </View>
      </View>
    </View>
  )
}