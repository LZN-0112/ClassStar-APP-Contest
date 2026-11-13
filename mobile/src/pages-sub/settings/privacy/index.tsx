import { useRef, useState } from 'react'
import { View, Text, Switch } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar } from '@/components/business'
import { Icon } from '@/components/ui'
import { settingsApi } from '@/services'
import { useAuth } from '@/utils'
import './index.scss'

interface PrivRow {
  key: string
  title: string
  subtitle: string
  icon: string
}

const ROWS: PrivRow[] = [
  { key: 'showStudentId', title: '班级信息可见', subtitle: '控制个人资料展示范围', icon: 'eye' },
  { key: 'showPhone', title: '联系方式可见', subtitle: '控制手机号展示范围', icon: 'phone' },
  { key: 'showAttendance', title: '考勤记录可见', subtitle: '控制考勤数据展示范围', icon: 'calendar' }
]

export default function PrivacySettings() {
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
      applySettings((res?.privacySettings as Record<string, boolean>) || {})
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
      await settingsApi.updateSettings({ privacySettings: next })
      Taro.showToast({ title: '设置已保存', icon: 'success' })
    } catch {
      applySettings(prev)
      Taro.showToast({ title: '保存失败，请重试', icon: 'none' })
    }
  }

  return (
    <View className='priv'>
      <NavBar title='隐私设置' />

      <View className='priv__body'>
        <View className='priv__card'>
          {ROWS.map((row) => (
            <View key={row.key} className='priv__row'>
              <View className='priv__row-icon'>
                <Icon name={row.icon} size={48} color='#0062FF' strokeWidth={2} />
              </View>
              <View className='priv__row-info'>
                <Text className='priv__row-title'>{row.title}</Text>
                <Text className='priv__row-subtitle'>{row.subtitle}</Text>
              </View>
              <Switch
                className='priv__switch'
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