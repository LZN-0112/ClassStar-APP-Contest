import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { Icon } from '@/components/ui'
import { useAuth } from '@/utils'
import { scanCode } from '@/utils/native'
import { classesApi, attendanceApi } from '@/services'
import './index.scss'

export default function Scan() {
  const { requireLogin } = useAuth()
  const [handling, setHandling] = useState(false)

  // 解析扫码结果并处理：加入班级 / 考勤签到 / 查看资料
  const handleResult = async (data: string) => {
    // 班级邀请码：class-assistant://class/join?code=XXXXXX
    const classMatch = data.match(/class-assistant:\/\/class\/join\?code=(\d{6})$/)
    if (classMatch) {
      setHandling(true)
      try {
        const res: any = await classesApi.joinClass({ code: classMatch[1] })
        const name = res?.name || res?.data?.name || ''
        Taro.showToast({ title: name ? `成功加入班级：${name}` : '加入班级成功', icon: 'success' })
        setTimeout(() => Taro.reLaunch({ url: '/pages/home/index' }), 800)
      } catch (err) {
        const msg = err instanceof Error ? err.message : '加入班级失败'
        if (msg.includes('已是') || msg.includes('已加入') || msg.includes('已存在')) {
          Taro.showToast({ title: '你已是该班级成员', icon: 'none' })
          setTimeout(() => Taro.reLaunch({ url: '/pages/class-home/index' }), 800)
        } else {
          Taro.showToast({ title: msg, icon: 'none' })
        }
      } finally {
        setHandling(false)
      }
      return
    }

    // 考勤签到码：attendance:{classId}:{attendanceId}
    const attMatch = data.match(/^attendance:([^:]+):([^:]+)$/)
    if (attMatch) {
      setHandling(true)
      const [, classId, attendanceId] = attMatch
      try {
        await attendanceCheckIn(classId, attendanceId)
        Taro.showToast({ title: '签到成功！', icon: 'success' })
        setTimeout(() => {
          Taro.navigateTo({ url: `/pages-sub/attendance/check-in-detail/index?id=${attendanceId}&classId=${classId}` })
        }, 800)
      } catch (err) {
        Taro.showToast({ title: err instanceof Error ? err.message : '签到失败', icon: 'none' })
      } finally {
        setHandling(false)
      }
      return
    }

    // 资料链接：material:{fileId}
    const matMatch = data.match(/^material:([^:]+)$/)
    if (matMatch) {
      Taro.navigateTo({ url: `/pages-sub/material/detail/index?id=${matMatch[1]}` })
      return
    }

    Taro.showToast({ title: '无法识别的二维码', icon: 'none' })
  }

  const attendanceCheckIn = async (classId: string, attendanceId: string) => {
    // 走统一请求层签到
    const r: any = await attendanceApi.checkIn(classId, attendanceId, { method: 'qr' })
    return r
  }

  const handleScan = async () => {
    if (handling) return
    if (!requireLogin()) return
    try {
      const result = await scanCode()
      if (result) await handleResult(result)
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : '扫码失败', icon: 'none' })
    }
  }

  useLoad(() => {
    requireLogin()
  })

  return (
    <View className='scan'>
      <View className='scan__top'>
        <View className='scan__back' onClick={() => Taro.navigateBack()}>
          <Icon name='arrow-left' size={44} color='#fff' strokeWidth={2} />
        </View>
        <Text className='scan__title'>扫一扫</Text>
        <View className='scan__top-spacer' />
      </View>

      <View className='scan__frame'>
        <View className='scan__frame-corner scan__frame-corner--tl' />
        <View className='scan__frame-corner scan__frame-corner--tr' />
        <View className='scan__frame-corner scan__frame-corner--bl' />
        <View className='scan__frame-corner scan__frame-corner--br' />
        <View className='scan__frame-line' />
      </View>
      <Text className='scan__hint'>对准二维码，即可自动扫描</Text>

      <View className='scan__bottom'>
        <View className={`scan__btn ${handling ? 'scan__btn--loading' : ''}`} onClick={handleScan}>
          <Icon name='scan-line' size={56} color='#fff' strokeWidth={2} />
          <Text className='scan__btn-text'>{handling ? '处理中...' : '开始扫码'}</Text>
        </View>
      </View>
    </View>
  )
}