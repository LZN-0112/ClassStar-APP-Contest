import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { Icon } from '@/components/ui'
import { attendanceApi } from '@/services'
import { scanCode } from '@/utils/native'
import './method.scss'

interface Props {
  classId: string
  attendanceId: string
  onSuccess: () => void
}

export default function QrMethod({ classId, attendanceId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)

  const handleScan = async () => {
    setLoading(true)
    try {
      const result = await scanCode()
      await attendanceApi.checkIn(classId, attendanceId, { method: 'qr', code: result })
      Taro.showToast({ title: '签到成功', icon: 'success' })
      onSuccess()
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '签到失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='attdmethod'>
      <View className='attdmethod__banner attdmethod__banner--green'>
        <View className='attdmethod__banner-head'>
          <Icon name='qrcode' size={32} color='#15803D' strokeWidth={2} />
          <Text className='attdmethod__banner-title'>二维码签到</Text>
        </View>
        <Text className='attdmethod__banner-sub'>请扫描老师展示的签到二维码完成签到</Text>
      </View>

      <View className='attdmethod__panel'>
        <View className='attdmethod__qrcode'>
          <Icon name='qrcode' size={160} color='#0062FF' strokeWidth={2} />
        </View>
        <Text className='attdmethod__qrcode-tip'>使用扫码功能扫描二维码</Text>
      </View>

      <View className='attdmethod__btn' onClick={handleScan}>
        <Icon name='scan-line' size={32} color='#FFFFFF' strokeWidth={2} />
        <Text className='attdmethod__btn-text'>{loading ? '签到中...' : '扫码签到'}</Text>
      </View>
    </View>
  )
}