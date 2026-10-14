import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { Icon } from '@/components/ui'
import { attendanceApi } from '@/services'
import { getLocation } from '@/utils/native'
import './method.scss'

interface Props {
  classId: string
  attendanceId: string
  attendance: {
    location?: string
    latitude?: number | null
    longitude?: number | null
    checkRadius?: number
  }
  onSuccess: () => void
}

function calcDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000
  const toRad = (v: number) => (v * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function GpsMethod({ classId, attendanceId, attendance, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)
  const [distance, setDistance] = useState<number | null>(null)

  const toast = (title: string) => Taro.showToast({ title, icon: 'none' })

  const handleLocate = async () => {
    setLocating(true)
    try {
      const pos = await getLocation()
      setUserLat(pos.latitude)
      setUserLng(pos.longitude)
      if (attendance.latitude != null && attendance.longitude != null) {
        setDistance(
          Math.round(calcDistance(attendance.latitude, attendance.longitude, pos.latitude, pos.longitude))
        )
      }
    } catch {
      toast('定位失败，请重试')
    } finally {
      setLocating(false)
    }
  }

  const handleCheckIn = async () => {
    if (userLat == null || userLng == null) {
      toast('请先获取定位')
      return
    }
    setLoading(true)
    try {
      await attendanceApi.checkIn(classId, attendanceId, {
        method: 'gps',
        latitude: userLat,
        longitude: userLng
      })
      Taro.showToast({ title: '签到成功', icon: 'success' })
      onSuccess()
    } catch (err) {
      toast(err instanceof Error ? err.message : '签到失败')
    } finally {
      setLoading(false)
    }
  }

  const inRange = distance != null && distance <= (attendance.checkRadius || 500)

  return (
    <View className='attdmethod'>
      <View className='attdmethod__banner attdmethod__banner--blue'>
        <View className='attdmethod__banner-head'>
          <Icon name='map-pin' size={32} color='#0369A1' strokeWidth={2} />
          <Text className='attdmethod__banner-title'>定位签到</Text>
        </View>
        <Text className='attdmethod__banner-sub'>
          {attendance.location ? `签到地点：${attendance.location}` : '请在签到地点范围内完成定位签到'}
        </Text>
        {attendance.checkRadius ? (
          <Text className='attdmethod__banner-sub'>有效范围：{attendance.checkRadius} 米</Text>
        ) : null}
      </View>

      <View className='attdmethod__panel'>
        <View className={`attdmethod__navi ${userLat != null ? 'attdmethod__navi--ok' : ''}`}>
          <Icon name='navigation' size={64} color={userLat != null ? '#16A34A' : '#9CA3AF'} strokeWidth={2} />
        </View>
        {userLat != null ? (
          <View className='attdmethod__center'>
            <Text className='attdmethod__center-title'>定位成功</Text>
            <Text className='attdmethod__center-sub'>
              {userLat.toFixed(6)}, {userLng!.toFixed(6)}
            </Text>
            {distance != null ? (
              <Text className={`attdmethod__distance ${inRange ? 'attdmethod__distance--ok' : 'attdmethod__distance--bad'}`}>
                距签到点 {distance} 米 {inRange ? '✓ 在范围内' : '✗ 超出范围'}
              </Text>
            ) : null}
          </View>
        ) : (
          <View className='attdmethod__center'>
            <Text className='attdmethod__center-sub'>尚未定位</Text>
            <Text className='attdmethod__center-hint'>点击下方按钮获取当前位置</Text>
          </View>
        )}
      </View>

      {userLat == null ? (
        <View className='attdmethod__btn' onClick={handleLocate}>
          <Icon name='navigation' size={32} color='#FFFFFF' strokeWidth={2} />
          <Text className='attdmethod__btn-text'>{locating ? '定位中...' : '获取定位'}</Text>
        </View>
      ) : (
        <View
          className={`attdmethod__btn ${!inRange ? 'attdmethod__btn--disabled' : ''}`}
          onClick={handleCheckIn}
        >
          <Text className='attdmethod__btn-text'>{loading ? '签到中...' : '立即签到'}</Text>
        </View>
      )}
    </View>
  )
}