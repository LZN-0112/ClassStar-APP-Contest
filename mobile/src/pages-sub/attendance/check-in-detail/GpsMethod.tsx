import { useState } from 'react'
import { Text, View } from '@tarojs/components'
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

  const hasCenter = attendance.latitude != null && attendance.longitude != null
  const radius = attendance.checkRadius ?? 500
  const inRange = !hasCenter || (distance != null && distance <= radius)

  const handleLocate = async () => {
    setLocating(true)
    try {
      const coords = await getLocation()
      setUserLat(coords.latitude)
      setUserLng(coords.longitude)
      if (hasCenter) {
        const dist = calcDistance(
          Number(attendance.latitude),
          Number(attendance.longitude),
          coords.latitude,
          coords.longitude
        )
        setDistance(Math.round(dist))
      } else {
        setDistance(null)
      }
    } catch (err) {
      Taro.showToast({
        title:
          err instanceof Error && /auth|deny/i.test(err.message)
            ? '请允许定位权限'
            : '定位失败，请重试',
        icon: 'none'
      })
    } finally {
      setLocating(false)
    }
  }

  const handleCheckIn = async () => {
    if (userLat == null || userLng == null) {
      Taro.showToast({ title: '请先获取定位', icon: 'none' })
      return
    }
    setLoading(true)
    try {
      await attendanceApi.checkIn(classId, attendanceId, {
        method: 'gps',
        latitude: userLat,
        longitude: userLng
      })
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
      <View className='attmethod__banner attmethod__banner--gps'>
        <View className='attmethod__banner-title attmethod__banner-title--gps'>
          <Icon name='map-pin' size={32} color='#0369A1' />
          <Text>定位签到</Text>
        </View>
        <Text className='attmethod__banner-desc'>
          {attendance.location
            ? `签到地点：${attendance.location}`
            : '请在签到地点范围内完成定位签到'}
        </Text>
        {hasCenter ? (
          <Text className='attmethod__banner-desc'>有效范围：{radius} 米</Text>
        ) : (
          <View className='attmethod__banner-note'>
            <Text>发起人未设置签到点坐标，本次不校验距离，班委将结合签到记录核对</Text>
          </View>
        )}
      </View>

      <View className='attmethod__panel'>
        <View
          className={`attmethod__gps-circle ${
            userLat != null ? 'attmethod__gps-circle--active' : ''
          }`}
        >
          <Icon
            name='navigation'
            size={64}
            color={userLat != null ? '#16A34A' : '#9CA3AF'}
          />
        </View>
        {userLat != null ? (
          <View className='attmethod__gps-result'>
            <Text className='attmethod__gps-success'>定位成功</Text>
            <Text className='attmethod__gps-coords'>
              {userLat.toFixed(6)}, {userLng!.toFixed(6)}
            </Text>
            {distance != null ? (
              <Text
                className={`attmethod__gps-distance ${
                  inRange ? 'attmethod__gps-distance--in' : 'attmethod__gps-distance--out'
                }`}
              >
                距签到点 {distance} 米 {inRange ? '✓ 在范围内' : '✗ 超出范围'}
              </Text>
            ) : null}
          </View>
        ) : (
          <View className='attmethod__gps-result'>
            <Text className='attmethod__gps-idle'>尚未定位</Text>
            <Text className='attmethod__gps-idle-hint'>点击下方按钮获取当前位置</Text>
          </View>
        )}
      </View>

      {userLat == null ? (
        <View
          className={`attmethod__primary-btn ${locating ? 'attmethod__btn--disabled' : ''}`}
          onClick={() => {
            if (!locating) void handleLocate()
          }}
        >
          <Icon name='navigation' size={32} color='#FFFFFF' />
          <Text>{locating ? '定位中...' : '获取定位'}</Text>
        </View>
      ) : (
        <>
          <View
            className={`attmethod__primary-btn attmethod__primary-btn--rounded ${
              loading || !inRange ? 'attmethod__btn--disabled' : ''
            }`}
            onClick={() => {
              if (!loading && inRange) void handleCheckIn()
            }}
          >
            <Text>{loading ? '签到中...' : '立即签到'}</Text>
          </View>
          <View
            className={`attmethod__outline-btn ${locating || loading ? 'attmethod__btn--disabled' : ''}`}
            onClick={() => {
              if (!locating && !loading) void handleLocate()
            }}
          >
            <Icon name='navigation' size={32} color='#0062FF' />
            <Text>{locating ? '重新定位中...' : '定位不准？重新定位'}</Text>
          </View>
        </>
      )}
    </View>
  )
}