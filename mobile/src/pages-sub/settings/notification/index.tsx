import { useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { SettingsHeader } from '@/components/business'
import { Icon } from '@/components/ui'
import { settingsApi } from '@/services'
import { useAuth } from '@/utils'
import './index.scss'

type NotifyKey = 'classNotice' | 'homework' | 'attendance' | 'activity' | 'vote' | 'system'

interface NotifyItem {
  enabled: boolean
  advance?: number
}

type NotifySettings = Record<NotifyKey, NotifyItem>

interface NotifyRowConfig {
  key: NotifyKey
  title: string
  subtitle: string
  icon: string
  advanceOptions?: number[]
}

const ADVANCE_LABELS: Record<number, string> = {
  5: '5分钟前',
  15: '15分钟前',
  30: '30分钟前',
  60: '1小时前',
  120: '2小时前',
  1440: '1天前',
  2880: '2天前'
}

const DEFAULT_SETTINGS: NotifySettings = {
  classNotice: { enabled: true },
  homework: { enabled: true, advance: 60 },
  attendance: { enabled: true, advance: 15 },
  activity: { enabled: false, advance: 1440 },
  vote: { enabled: true, advance: 30 },
  system: { enabled: true }
}

const ROWS: NotifyRowConfig[] = [
  {
    key: 'classNotice',
    title: '班级通知',
    subtitle: '接收班级发布的各类通知',
    icon: 'bell'
  },
  {
    key: 'homework',
    title: '作业提醒',
    subtitle: '作业截止前提醒',
    icon: 'book-open',
    advanceOptions: [15, 30, 60, 120, 1440]
  },
  {
    key: 'attendance',
    title: '考勤提醒',
    subtitle: '签到开始前提醒',
    icon: 'clock-check',
    advanceOptions: [5, 15, 30]
  },
  {
    key: 'activity',
    title: '活动提醒',
    subtitle: '活动报名截止前提醒',
    icon: 'flag',
    advanceOptions: [60, 120, 1440, 2880]
  },
  {
    key: 'vote',
    title: '投票提醒',
    subtitle: '投票截止前提醒',
    icon: 'check-square',
    advanceOptions: [15, 30, 60, 1440]
  },
  {
    key: 'system',
    title: '系统消息',
    subtitle: '版本更新与公告',
    icon: 'settings'
  }
]

function normalizeSettings(raw: unknown): NotifySettings {
  const next: NotifySettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS))
  if (!raw || typeof raw !== 'object') return next

  ;(Object.keys(DEFAULT_SETTINGS) as NotifyKey[]).forEach((key) => {
    const value = (raw as Record<string, unknown>)[key]
    if (typeof value === 'boolean') {
      next[key] = { ...next[key], enabled: value }
      return
    }
    if (value && typeof value === 'object') {
      const item = { ...next[key] }
      const { enabled, advance } = value as { enabled?: unknown; advance?: unknown }
      if (typeof enabled === 'boolean') item.enabled = enabled
      if (typeof advance === 'number') item.advance = advance
      next[key] = item
    }
  })

  return next
}

export default function NotificationSettings() {
  const { requireLogin } = useAuth()
  const [settings, setSettings] = useState<NotifySettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeKey, setActiveKey] = useState<NotifyKey | null>(null)

  useLoad(() => {
    if (!requireLogin()) return
    fetchSettings()
  })

  const fetchSettings = async () => {
    try {
      const res: any = await settingsApi.getSettings()
      setSettings(normalizeSettings(res?.notificationSettings))
    } catch {
      // 读取失败时沿用默认值
    } finally {
      setLoading(false)
    }
  }

  const persist = async (next: NotifySettings, previous: NotifySettings) => {
    setSaving(true)
    try {
      await settingsApi.updateSettings({ notificationSettings: next })
      Taro.showToast({ title: '已保存', icon: 'success' })
    } catch {
      setSettings(previous)
      Taro.showToast({ title: '保存失败，请稍后重试', icon: 'none' })
    } finally {
      setSaving(false)
    }
  }

  const updateItem = (key: NotifyKey, patch: Partial<NotifyItem>) => {
    if (loading || saving) return
    const previous = settings
    const next: NotifySettings = {
      ...previous,
      [key]: { ...previous[key], ...patch }
    }
    setSettings(next)
    void persist(next, previous)
  }

  const activeRow = ROWS.find((row) => row.key === activeKey)

  return (
    <View className='notify'>
      <SettingsHeader title='消息通知' />

      <View className='notify__body'>
        <View className='notify__card'>
          {ROWS.map((row) => {
            const item = settings[row.key]
            const advanceLabel =
              item.advance !== undefined ? ADVANCE_LABELS[item.advance] : undefined
            return (
              <View key={row.key} className='notify__row'>
                <View className='notify__row-icon'>
                  <Icon name={row.icon} size={48} color='#0062FF' strokeWidth={2} />
                </View>
                <View className='notify__row-info'>
                  <Text className='notify__row-title'>{row.title}</Text>
                  <Text className='notify__row-subtitle'>{row.subtitle}</Text>
                </View>
                <View className='notify__row-right'>
                  {row.advanceOptions && (
                    <View
                      className={`notify__advance ${
                        item.enabled ? '' : 'notify__advance--off'
                      }`}
                      onClick={() => {
                        if (!item.enabled || loading || saving) return
                        setActiveKey(row.key)
                      }}
                    >
                      <Text className='notify__advance-text'>
                        {advanceLabel ?? '设置时间'}
                      </Text>
                      <Icon
                        name='chevron-down'
                        size={24}
                        color={item.enabled ? '#0062FF' : '#9CA3AF'}
                        strokeWidth={2.5}
                      />
                    </View>
                  )}
                  <View
                    className={`notify__switch ${item.enabled ? 'notify__switch--on' : ''} ${
                      loading || saving ? 'notify__switch--disabled' : ''
                    }`}
                    onClick={() => updateItem(row.key, { enabled: !item.enabled })}
                  >
                    <View className='notify__switch-knob' />
                  </View>
                </View>
              </View>
            )
          })}
        </View>

        <Text className='notify__tip'>
          {saving ? '保存中...' : '开关与提醒时间修改后自动保存到云端'}
        </Text>
      </View>

      {activeRow && settings[activeRow.key].enabled && (
        <View className='notify__sheet'>
          <View className='notify__sheet-mask' onClick={() => setActiveKey(null)} />
          <View className='notify__sheet-panel'>
            <View className='notify__sheet-handle-wrap'>
              <View className='notify__sheet-handle' />
            </View>
            <View className='notify__sheet-header'>
              <Text className='notify__sheet-title'>{activeRow.title} · 提前时间</Text>
            </View>
            <View className='notify__sheet-list'>
              {(activeRow.advanceOptions ?? []).map((option) => {
                const selected = settings[activeRow.key].advance === option
                return (
                  <View
                    key={option}
                    className={`notify__sheet-option ${
                      selected ? 'notify__sheet-option--selected' : ''
                    } ${saving ? 'notify__sheet-option--disabled' : ''}`}
                    onClick={() => {
                      if (saving) return
                      setActiveKey(null)
                      updateItem(activeRow.key, { advance: option })
                    }}
                  >
                    <Text
                      className={`notify__sheet-option-text ${
                        selected ? 'notify__sheet-option-text--selected' : ''
                      }`}
                    >
                      {ADVANCE_LABELS[option]}
                    </Text>
                    {selected && (
                      <Icon name='check' size={40} color='#0062FF' strokeWidth={2} />
                    )}
                  </View>
                )
              })}
            </View>
          </View>
        </View>
      )}
    </View>
  )
}