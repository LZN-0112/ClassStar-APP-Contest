// ============================================================
// 扫一扫
// 1:1 对齐 front/src/pages/tools/ScanPage.tsx
// 小程序端使用原生 scanCode 取景，页面复刻 App 的取景框视觉
// ============================================================
import { useState } from 'react'
import Taro, { useLoad } from '@tarojs/taro'
import { Text, View } from '@tarojs/components'

import { StatusBar } from '@/components/business'
import { Icon } from '@/components/ui'
import { attendanceApi, classesApi } from '@/services'
import { scanCode } from '@/utils/native'
import { useUserStore } from '@/stores'
import './index.scss'

const CLASS_JOIN_REG = /^class-assistant:\/\/class\/join\?code=([A-Za-z0-9]+)/
const ATTENDANCE_REG = /^class-assistant:\/\/attendance\/checkin\?classId=([^&]+)&id=([^&]+)/

export default function ScanPage() {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [flashOn, setFlashOn] = useState(false)
  const setCurrentClass = useUserStore((s) => s.setCurrentClass)

  const handleResult = async (raw: string) => {
    const content = (raw || '').trim()

    // 班级邀请码
    const joinMatch = content.match(CLASS_JOIN_REG)
    if (joinMatch) {
      const code = joinMatch[1].toUpperCase()
      try {
        const info: any = await classesApi.joinClass({ code })
        const classId = info?.id || info?.classId
        if (classId) setCurrentClass(classId)
        Taro.showToast({ title: info?.name ? `已加入 ${info.name}` : '已加入班级', icon: 'success' })
        setTimeout(() => Taro.reLaunch({ url: '/pages/home/index' }), 800)
      } catch (err: any) {
        const message = String(err?.message || '')
        if (message.includes('学号') || message.includes('名单') || /student/i.test(message)) {
          Taro.showToast({ title: '该班级已导入名单，请填写学号后加入', icon: 'none' })
        }
      }
      return
    }

    // 考勤签到
    const attendanceMatch = content.match(ATTENDANCE_REG)
    if (attendanceMatch) {
      const classId = decodeURIComponent(attendanceMatch[1])
      const attendanceId = decodeURIComponent(attendanceMatch[2])
      try {
        await attendanceApi.checkIn(classId, attendanceId, { method: 'qr' })
        Taro.showToast({ title: '签到成功', icon: 'success' })
        setTimeout(() => Taro.navigateTo({ url: '/pages-sub/attendance/list/index' }), 800)
      } catch {
        // request 层已统一提示错误
      }
      return
    }

    Taro.showToast({ title: '无法识别的二维码', icon: 'none' })
  }

  const handleScan = async (fromAlbum = false) => {
    if (scanning) return
    setScanning(true)
    setError('')
    try {
      const raw = await scanCode({ onlyFromCamera: !fromAlbum })
      await handleResult(raw)
    } catch (err: any) {
      const message = String(err?.message || '')
      if (!message.includes('cancel')) setError('扫码失败，请重试')
    } finally {
      setScanning(false)
    }
  }

  useLoad(() => {
    handleScan(false)
  })

  const toggleFlash = () => {
    setFlashOn(!flashOn)
    Taro.showToast({ title: '请在小程序扫码界面开启闪光灯', icon: 'none' })
  }

  const hintText = scanning
    ? '正在识别二维码…'
    : error || '将二维码放入框内，即可自动扫描'

  return (
    <View className='scan'>
      <StatusBar light />

      <View className='scan__stage'>
        {/* 取景区域（小程序使用系统扫码界面，这里保留 App 的暗色取景层） */}
        <View className='scan__camera' />

        {/* 顶部栏 */}
        <View className='scan__head'>
          <View className='scan__icon-btn' onClick={() => Taro.navigateBack()}>
            <Icon name='chevron-left' size={40} color='#FFFFFF' strokeWidth={2} />
          </View>
          <Text className='scan__title'>扫一扫</Text>
          <View className='scan__icon-btn' onClick={toggleFlash}>
            <Icon
              name={flashOn ? 'zap' : 'zap-off'}
              size={36}
              color={flashOn ? '#FBBF24' : '#FFFFFF'}
              strokeWidth={2}
            />
          </View>
        </View>

        {/* 扫描框 */}
        <View className='scan__frame-wrap'>
          <View className='scan__frame' onClick={() => handleScan(false)}>
            <View className='scan__corner scan__corner--tl' />
            <View className='scan__corner scan__corner--tr' />
            <View className='scan__corner scan__corner--bl' />
            <View className='scan__corner scan__corner--br' />
            <View className='scan__line' />
          </View>
        </View>

        {/* 底部提示 */}
        <View className='scan__hint'>
          <Text className={`scan__hint-text ${error ? 'scan__hint-text--error' : ''}`}>
            {hintText}
          </Text>
          <Text className='scan__hint-sub'>轻触扫描框可重新扫码</Text>
        </View>
      </View>

      {/* 底部操作栏 */}
      <View className='scan__toolbar'>
        <View className='scan__album' onClick={() => handleScan(true)}>
          <View className='scan__album-icon'>
            <Icon name='image' size={40} color='#FFFFFF' strokeWidth={2} />
          </View>
          <Text className='scan__album-text'>相册</Text>
        </View>
      </View>
    </View>
  )
}