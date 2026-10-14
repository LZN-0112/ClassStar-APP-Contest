import { useState } from 'react'
import { View, Text, Input as TaroInput } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar, DateTimePicker } from '@/components/business'
import { Button, Icon } from '@/components/ui'
import { attendanceApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import { getLocation } from '@/utils/native'
import './index.scss'

type Method = 'gps' | 'normal' | 'qr' | 'face' | 'code'

const METHODS: { key: Method; icon: string; label: string; color: string }[] = [
  { key: 'gps', icon: 'map-pin', label: '定位', color: '#2563EB' },
  { key: 'qr', icon: 'qrcode', label: '二维码', color: '#22C55E' },
  { key: 'face', icon: 'camera', label: '拍照', color: '#F97316' },
  { key: 'code', icon: 'lock', label: '口令', color: '#EF4444' }
]

function toIso(datetime: string): string {
  if (!datetime) return ''
  return new Date(datetime.replace(' ', 'T')).toISOString()
}

export default function AttendancePublish() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireAuth } = useAuth()

  const [title, setTitle] = useState('')
  const [method, setMethod] = useState<Method>('gps')
  const [location, setLocation] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [code, setCode] = useState('')
  const [checkRadius, setCheckRadius] = useState('500')
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)

  useLoad(() => {
    if (!requireAuth('committee')) {
      setTimeout(() => Taro.navigateBack(), 1500)
    }
  })

  const handleLocate = async () => {
    if (locating) return
    setLocating(true)
    try {
      const pos = await getLocation()
      setLat(pos.latitude)
      setLng(pos.longitude)
      Taro.showToast({ title: '定位成功', icon: 'success' })
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '定位失败',
        icon: 'none'
      })
    } finally {
      setLocating(false)
    }
  }

  const validate = (): boolean => {
    if (!title.trim()) {
      Taro.showToast({ title: '请输入签到标题', icon: 'none' })
      return false
    }
    if (!startTime) {
      Taro.showToast({ title: '请选择开始时间', icon: 'none' })
      return false
    }
    if (!endTime) {
      Taro.showToast({ title: '请选择结束时间', icon: 'none' })
      return false
    }
    if (method === 'code' && !code.trim()) {
      Taro.showToast({ title: '请输入签到口令', icon: 'none' })
      return false
    }
    if (method === 'gps' && (lat == null || lng == null)) {
      Taro.showToast({ title: '请先获取定位', icon: 'none' })
      return false
    }
    return true
  }

  const handlePublish = async () => {
    if (!validate() || loading || !currentClassId) return
    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        method,
        startTime: toIso(startTime),
        endTime: toIso(endTime)
      }
      if (location.trim()) body.location = location.trim()
      if (method === 'gps') {
        body.latitude = lat
        body.longitude = lng
        body.checkRadius = parseInt(checkRadius, 10) || 500
      }
      if (method === 'code') body.code = code.trim()
      await attendanceApi.publish(currentClassId, body as never)
      Taro.showToast({ title: '签到发布成功', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 500)
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '发布失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='attpublish'>
      <NavBar title='发起签到' />

      <View className='attpublish__body'>
        {/* 标题 */}
        <View className='attpublish__field'>
          <Text className='attpublish__label'>签到标题</Text>
          <TaroInput
            className='attpublish__input'
            value={title}
            maxlength={50}
            placeholder='例如：班会签到'
            placeholderClass='attpublish__placeholder'
            onInput={(e) => setTitle(e.detail.value)}
          />
        </View>

        {/* 签到方式 */}
        <View className='attpublish__method-box'>
          <Text className='attpublish__method-title'>签到方式</Text>
          <View className='attpublish__method-grid'>
            {METHODS.map((m) => {
              const active = method === m.key
              return (
                <View
                  key={m.key}
                  className={`attpublish__method ${active ? 'attpublish__method--active' : ''}`}
                  onClick={() => setMethod(m.key)}
                >
                  <View
                    className='attpublish__method-icon'
                    style={{ backgroundColor: m.color }}
                  >
                    <Icon name={m.icon} size={40} color='#FFFFFF' strokeWidth={2} />
                  </View>
                  <Text className='attpublish__method-label'>{m.label}</Text>
                </View>
              )
            })}
          </View>
        </View>

        {/* 地点 */}
        <View className='attpublish__field'>
          <Text className='attpublish__label'>签到地点</Text>
          <TaroInput
            className='attpublish__input'
            value={location}
            maxlength={100}
            placeholder='例如：教学楼A301'
            placeholderClass='attpublish__placeholder'
            onInput={(e) => setLocation(e.detail.value)}
          />
        </View>

        {/* GPS 定位设置 */}
        {method === 'gps' ? (
          <View className='attpublish__gps-box'>
            <View className='attpublish__gps-row'>
              <Text className='attpublish__gps-title'>签到定位中心</Text>
              <View className='attpublish__gps-btn' onClick={handleLocate}>
                <Icon name='navigation' size={28} color='#FFFFFF' strokeWidth={2} />
                <Text className='attpublish__gps-btn-text'>
                  {locating ? '定位中...' : lat != null ? '重新定位' : '获取定位'}
                </Text>
              </View>
            </View>
            {lat != null ? (
              <Text className='attpublish__gps-info'>
                纬度：{lat.toFixed(6)}，经度：{(lng ?? 0).toFixed(6)}
              </Text>
            ) : (
              <Text className='attpublish__gps-hint'>点击上方按钮获取当前定位作为签到中心</Text>
            )}
            <View className='attpublish__field attpublish__field--mt'>
              <Text className='attpublish__label'>有效范围（米）</Text>
              <TaroInput
                className='attpublish__input'
                type='number'
                value={checkRadius}
                maxlength={5}
                placeholder='500'
                placeholderClass='attpublish__placeholder'
                onInput={(e) => setCheckRadius(e.detail.value.replace(/\D/g, ''))}
              />
            </View>
          </View>
        ) : null}

        {/* 口令 */}
        {method === 'code' ? (
          <View className='attpublish__field'>
            <Text className='attpublish__label'>签到口令（4位数字）</Text>
            <TaroInput
              className='attpublish__input'
              type='number'
              value={code}
              maxlength={4}
              placeholder='例如：1234'
              placeholderClass='attpublish__placeholder'
              onInput={(e) => setCode(e.detail.value.replace(/\D/g, '').slice(0, 4))}
            />
          </View>
        ) : null}

        {/* 时间 */}
        <View className='attpublish__field'>
          <Text className='attpublish__label'>开始时间</Text>
          <DateTimePicker
            mode='datetime'
            value={startTime}
            onChange={setStartTime}
            placeholder='请选择开始时间'
          />
        </View>
        <View className='attpublish__field'>
          <Text className='attpublish__label'>结束时间</Text>
          <DateTimePicker
            mode='datetime'
            value={endTime}
            onChange={setEndTime}
            placeholder='请选择结束时间'
          />
        </View>

        <View className='attpublish__footer'>
          <Button type='primary' size='lg' block loading={loading} onClick={handlePublish}>
            发布签到
          </Button>
        </View>
      </View>
    </View>
  )
}