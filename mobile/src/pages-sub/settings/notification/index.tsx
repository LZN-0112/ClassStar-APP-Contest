import { useRef, useState } from 'react'
import { View, Text, Switch } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar } from '@/components/business'
import { Icon } from '@/components/ui'
import { settingsApi } from '@/services'
import { useAuth } from '@/utils'
import './index.scss'

interface NotifyRow {
  key: string
  title: string
  subtitle: string
  icon: string
}

const ROWS: NotifyRow[] = [
  { key: 'classNews', title: '班级通知', subtitle: '接收班级通知', icon: 'bell' },
  { key: 'homeworkRemind', title: '作业提醒', subtitle: '截止前提醒', icon: 'file-text' },
  { key: 'attendanceRemind', title: '考勤提醒', subtitle: '签到开始前提醒', icon: 'clock' },
  { key: 'activityRemind', title: '活动提醒', subtitle: '报名截止提醒', icon: 'flag' },
  { key: 'systemNews', title: '系统消息', subtitle: '版本更新与公告', icon: 'settings' }
]

export default function NotificationSettings() {
  const { requireLogin } = useAuth()
  const [settings, setSettings] = useState<Record<string, boolean>>({})
  // 同步镜像最新开关状态，连续切换时不会基于过期快照保存
  const settingsRef = useRef<Record<string, boolean>>({})

  useLoad(() => {
    if (!requireLogin()) return
    fetchSettings()
  })

  const applySettings = (next: Record<string, boolean>) => {
    settingsRef.current = next
    setSettings(next)
  }

  const fetchSettings = async () => {
    try {
      const res: any = await settingsApi.getSettings()
      applySettings((res?.notificationSettings as Record<string, boolean>) || {})
    } catch {
      // 静默失败，保持占位 UI
    }
  }

  const toggle = async (key: string, val: boolean) => {
    const prev = settingsRef.current
    // 全量提交，避免只传单个 key 时与其他开关互相覆盖
    const next = { ...prev, [key]: val }
    applySettings(next)
    try {
      await settingsApi.updateSettings({ notificationSettings: next })
      Taro.showToast({ title: '设置已保存', icon: 'success' })
    } catch {
      applySettings(prev)
      Taro.showToast({ title: '保存失败，请重试', icon: 'none' })
    }
  }

  return (
    <View className='notify'>
      <NavBar title='消息通知设置' />

      <View className='notify__body'>
        <View className='notify__card'>
          {ROWS.map((row) => (
            <View key={row.key} className='notify__row'>
              <View className='notify__row-icon'>
                <Icon name={row.icon} size={48} color='#0062FF' strokeWidth={2} />
              </View>
              <View className='notify__row-info'>
                <Text className='notify__row-title'>{row.title}</Text>
                <Text className='notify__row-subtitle'>{row.subtitle}</Text>
              </View>
              <Switch
                className='notify__switch'
                checked={!!settings[row.key]}
                color='#0062FF'
                onChange={(e) => toggle(row.key, e.detail.value)}
              />
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}