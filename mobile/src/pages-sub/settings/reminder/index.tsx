import { useRef, useState } from 'react'
import { View, Text, Switch } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar } from '@/components/business'
import { Icon } from '@/components/ui'
import { settingsApi } from '@/services'
import { useAuth } from '@/utils'
import './index.scss'

interface RemindRow {
  key: string
  title: string
  subtitle: string
  icon: string
}

const ROWS: RemindRow[] = [
  { key: 'reminderHomework', title: '作业截止提醒', subtitle: '1小时前', icon: 'file-text' },
  { key: 'reminderAttendance', title: '考勤开始提醒', subtitle: '15分钟前', icon: 'clock' },
  { key: 'reminderActivity', title: '活动报名提醒', subtitle: '1天前', icon: 'calendar' },
  { key: 'reminderVote', title: '投票截止提醒', subtitle: '30分钟前', icon: 'bar-chart' }
]

export default function ReminderSettings() {
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
    <View className='rmd'>
      <NavBar title='再次提醒设置' />

      <View className='rmd__body'>
        <View className='rmd__group'>
          <Text className='rmd__group-title'>场景提醒</Text>
          <View className='rmd__card'>
            {ROWS.map((row) => (
              <View key={row.key} className='rmd__row'>
                <View className='rmd__row-icon'>
                  <Icon name={row.icon} size={48} color='#0062FF' strokeWidth={2} />
                </View>
                <View className='rmd__row-info'>
                  <Text className='rmd__row-title'>{row.title}</Text>
                  <Text className='rmd__row-subtitle'>{row.subtitle}</Text>
                </View>
                <Switch
                  className='rmd__switch'
                  checked={!!settings[row.key]}
                  color='#0062FF'
                  onChange={(e) => toggle(row.key, e.detail.value)}
                />
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  )
}