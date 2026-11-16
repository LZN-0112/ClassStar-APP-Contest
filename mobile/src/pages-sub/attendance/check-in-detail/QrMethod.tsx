import { useState } from 'react'
import { Text, View } from '@tarojs/components'
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
    if (loading) return
    let result = ''
    try {
      result = await scanCode()
    } catch {
      return
    }
    setLoading(true)
    try {
      await attendanceApi.checkIn(classId, attendanceId, { method: 'qr', code: result })
      Taro.showToast({ title: '签到成功！', icon: 'success' })
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
    <View className='attmethod'>
      <View className='attmethod__qr-banner'>
        <View className='attmethod__qr-banner-icon'>
          <Icon name='scan-line' size={56} color='#16A34A' strokeWidth={1.8} />
        </View>
        <View className='attmethod__qr-banner-body'>
          <View className='attmethod__qr-banner-title'>
            <Icon name='qrcode' size={32} color='#15803D' />
            <Text>二维码签到</Text>
          </View>
          <Text className='attmethod__qr-banner-desc'>
            扫描班委在签到现场展示的二维码即可完成签到
          </Text>
        </View>
      </View>

      <View
        className={`attmethod__qr-btn ${loading ? 'attmethod__btn--disabled' : ''}`}
        onClick={() => void handleScan()}
      >
        <Icon name='scan-line' size={40} color='#FFFFFF' />
        <Text>{loading ? '签到中...' : '打开扫一扫'}</Text>
      </View>
    </View>
  )
}