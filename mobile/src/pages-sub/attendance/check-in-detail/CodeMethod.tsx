import { useState } from 'react'
import { View, Text, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { Icon } from '@/components/ui'
import { attendanceApi } from '@/services'
import './method.scss'

interface Props {
  classId: string
  attendanceId: string
  onSuccess: () => void
}

export default function CodeMethod({ classId, attendanceId, onSuccess }: Props) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCheckIn = async () => {
    if (code.length !== 4) {
      Taro.showToast({ title: '请输入4位签到口令', icon: 'none' })
      return
    }
    setLoading(true)
    try {
      await attendanceApi.checkIn(classId, attendanceId, { method: 'code', code })
      Taro.showToast({ title: '签到成功', icon: 'success' })
      onSuccess()
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '签到失败',
        icon: 'none'
      })
      setCode('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='attdmethod'>
      <View className='attdmethod__banner attdmethod__banner--red'>
        <View className='attdmethod__banner-head'>
          <Icon name='lock' size={32} color='#DC2626' strokeWidth={2} />
          <Text className='attdmethod__banner-title'>口令签到</Text>
        </View>
        <Text className='attdmethod__banner-sub'>请输入发起人公布的4位数字签到口令</Text>
      </View>

      <View className='attdmethod__panel'>
        <View className='attdmethod__code-icon'>
          <Icon name='lock' size={96} color='#0062FF' strokeWidth={2} />
        </View>
        <Text className='attdmethod__code-tip'>请输入4位签到口令</Text>
        <Input
          className='attdmethod__code-input'
          type='number'
          maxlength={4}
          value={code}
          placeholder='— — — —'
          placeholderClass='attdmethod__code-placeholder'
          onInput={(e) => setCode(e.detail.value.replace(/\D/g, '').slice(0, 4))}
        />
      </View>

      <View
        className={`attdmethod__btn ${code.length !== 4 ? 'attdmethod__btn--disabled' : ''}`}
        onClick={handleCheckIn}
      >
        <Text className='attdmethod__btn-text'>{loading ? '签到中...' : '确认签到'}</Text>
      </View>
    </View>
  )
}