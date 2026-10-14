import { View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar } from '@/components/business'
import { Icon } from '@/components/ui'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

export default function CheckInEntry() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireLogin } = useAuth()

  const classIdRef = { id: '' }
  const idRef = { id: '' }

  useLoad((options) => {
    if (!requireLogin()) return
    const classId = (options?.classId as string) || currentClassId
    const attendanceId = options?.attendanceId as string
    classIdRef.id = classId || ''
    idRef.id = attendanceId || ''
    if (!classIdRef.id || !idRef.id) {
      Taro.showToast({ title: '参数缺失', icon: 'none' })
    }
  })

  const goCheckInDetail = () => {
    if (!classIdRef.id || !idRef.id) {
      Taro.showToast({ title: '参数缺失', icon: 'none' })
      return
    }
    Taro.redirectTo({
      url: `/pages-sub/attendance/check-in-detail/index?classId=${classIdRef.id}&attendanceId=${idRef.id}`
    })
  }

  const goLeaveApply = () => {
    if (!classIdRef.id || !idRef.id) {
      Taro.showToast({ title: '参数缺失', icon: 'none' })
      return
    }
    Taro.navigateTo({
      url: `/pages-sub/attendance/leave-apply/index?classId=${classIdRef.id}&attendanceId=${idRef.id}`
    })
  }

  return (
    <View className='attcheckin-entry'>
      <NavBar title='班会签到' />

      <View className='attcheckin-entry__body'>
        <Text className='attcheckin-entry__meta'>请在指定地点范围内完成签到</Text>

        {/* 地图区域 */}
        <View className='attcheckin-entry__map'>
          <View className='attcheckin-entry__pin'>
            <Icon name='map-pin' size={80} color='#0062FF' strokeWidth={1.5} />
          </View>
          <Text className='attcheckin-entry__hint'>定位中...</Text>
        </View>

        <View className='attcheckin-entry__btn' onClick={goCheckInDetail}>
          <Text className='attcheckin-entry__btn-text'>立即签到</Text>
        </View>

        <View className='attcheckin-entry__btn attcheckin-entry__btn--leave' onClick={goLeaveApply}>
          <Text className='attcheckin-entry__btn-text--blue'>请假</Text>
        </View>
      </View>
    </View>
  )
}