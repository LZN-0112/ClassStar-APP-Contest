import { View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar } from '@/components/business'
import { Icon } from '@/components/ui'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

interface MethodOption {
  key: string
  icon: string
  label: string
  subtitle: string
  color: string
}

const METHODS: MethodOption[] = [
  { key: 'gps', icon: 'map-pin', label: '定位签到', subtitle: '基于GPS定位范围验证', color: '#0062FF' },
  { key: 'qr', icon: 'qrcode', label: '二维码签到', subtitle: '扫码完成签到', color: '#0062FF' },
  { key: 'face', icon: 'camera', label: '水印拍照签到', subtitle: '拍照带时间地点水印', color: '#0062FF' },
  { key: 'code', icon: 'lock', label: '口令签到', subtitle: '输入4位数字口令', color: '#0062FF' }
]

export default function CheckInMethod() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireAuth } = useAuth()

  const classIdRef = { id: '' }
  const idRef = { id: '' }

  useLoad((options) => {
    if (!requireAuth('student')) return
    const classId = (options?.classId as string) || currentClassId
    const attendanceId = options?.attendanceId as string
    classIdRef.id = classId || ''
    idRef.id = attendanceId || ''
    if (!classIdRef.id || !idRef.id) {
      Taro.showToast({ title: '参数缺失', icon: 'none' })
    }
  })

  const selectMethod = () => {
    if (!classIdRef.id || !idRef.id) {
      Taro.showToast({ title: '参数缺失', icon: 'none' })
      return
    }
    Taro.navigateTo({
      url: `/pages-sub/attendance/check-in-detail/index?classId=${classIdRef.id}&attendanceId=${idRef.id}`
    })
  }

  const rows = [METHODS.slice(0, 2), METHODS.slice(2, 4)]

  return (
    <View className='attmethod'>
      {/* 渐变头部 */}
      <View className='attmethod__header'>
        <NavBar title='选择签到方式' transparent />
        <View className='attmethod__header-deco' />
      </View>

      <View className='attmethod__body'>
        {rows.map((row, ri) => (
          <View className='attmethod__row' key={ri}>
            {row.map((m) => (
              <View className='attmethod__cell' key={m.key} onClick={selectMethod}>
                <View className='attmethod__cell-icon'>
                  <Icon name={m.icon} size={96} color={m.color} strokeWidth={2} />
                </View>
                <Text className='attmethod__cell-title'>{m.label}</Text>
                <Text className='attmethod__cell-sub'>{m.subtitle}</Text>
              </View>
            ))}
          </View>
        ))}

        <View className='attmethod__next'>
          <Text className='attmethod__next-text'>下一步</Text>
        </View>
      </View>
    </View>
  )
}