import { useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { SettingsHeader } from '@/components/business'
import { Icon } from '@/components/ui'
import { settingsApi } from '@/services'
import { useAuth } from '@/utils'
import './index.scss'

type Visibility = 'all' | 'class' | 'committee' | 'self'
type SettingKey = 'classInfo' | 'contact' | 'attendance'

interface VisibilityOption {
  value: Visibility
  label: string
  className: string
}

const VISIBILITY_OPTIONS: VisibilityOption[] = [
  { value: 'all', label: '所有人可见', className: 'priv__tag--all' },
  { value: 'class', label: '同班可见', className: 'priv__tag--class' },
  { value: 'committee', label: '仅班委可见', className: 'priv__tag--committee' },
  { value: 'self', label: '仅自己可见', className: 'priv__tag--self' }
]

const OPTION_MAP = VISIBILITY_OPTIONS.reduce(
  (acc, option) => ({ ...acc, [option.value]: option }),
  {} as Record<Visibility, VisibilityOption>
)

const ROWS: Array<{
  key: SettingKey
  title: string
  subtitle: string
  icon: string
}> = [
  {
    key: 'classInfo',
    title: '班级信息可见',
    subtitle: '控制个人资料展示范围',
    icon: 'eye'
  },
  {
    key: 'contact',
    title: '联系方式可见',
    subtitle: '控制手机号展示范围',
    icon: 'phone'
  },
  {
    key: 'attendance',
    title: '考勤记录可见',
    subtitle: '控制考勤数据展示范围',
    icon: 'calendar-check'
  }
]

const DEFAULT_SETTINGS: Record<SettingKey, Visibility> = {
  classInfo: 'class',
  contact: 'committee',
  attendance: 'self'
}

export default function PrivacySettings() {
  const { requireLogin } = useAuth()
  const [settings, setSettings] = useState<Record<SettingKey, Visibility>>(DEFAULT_SETTINGS)
  const [activeKey, setActiveKey] = useState<SettingKey | null>(null)
  const [saving, setSaving] = useState(false)

  useLoad(() => {
    if (!requireLogin()) return
    settingsApi
      .getSettings()
      .then((res: any) => {
        const remote = res?.privacySettings as Partial<Record<SettingKey, Visibility>> | undefined
        if (!remote) return
        setSettings((prev) => {
          const next = { ...prev }
          ;(Object.keys(prev) as SettingKey[]).forEach((key) => {
            const value = remote[key]
            if (value && OPTION_MAP[value]) next[key] = value
          })
          return next
        })
      })
      .catch(() => {
        // 读取失败时沿用默认值
      })
  })

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    try {
      await settingsApi.updateSettings({ privacySettings: settings })
      Taro.showToast({ title: '设置已保存', icon: 'success' })
    } catch (error) {
      Taro.showToast({
        title: error instanceof Error ? error.message : '保存失败，请稍后重试',
        icon: 'none'
      })
    } finally {
      setSaving(false)
    }
  }

  const activeRow = ROWS.find((row) => row.key === activeKey)

  return (
    <View className='priv'>
      <SettingsHeader title='隐私设置' />

      <View className='priv__body'>
        <View className='priv__card'>
          {ROWS.map((row) => {
            const option = OPTION_MAP[settings[row.key]]
            return (
              <View
                key={row.key}
                className='priv__row'
                onClick={() => setActiveKey(row.key)}
              >
                <View className='priv__row-icon'>
                  <Icon name={row.icon} size={48} color='#0062FF' strokeWidth={2} />
                </View>
                <View className='priv__row-info'>
                  <Text className='priv__row-title'>{row.title}</Text>
                  <Text className='priv__row-subtitle'>{row.subtitle}</Text>
                </View>
                <View className={`priv__tag ${option.className}`}>
                  <Text className='priv__tag-text'>{option.label}</Text>
                </View>
              </View>
            )
          })}
        </View>

        <View
          className={`priv__submit ${saving ? 'priv__submit--disabled' : ''}`}
          onClick={handleSave}
        >
          <Text className='priv__submit-text'>{saving ? '保存中...' : '保存'}</Text>
        </View>
      </View>

      {activeRow && (
        <View className='priv__sheet'>
          <View className='priv__sheet-mask' onClick={() => setActiveKey(null)} />
          <View className='priv__sheet-panel'>
            <View className='priv__sheet-handle-wrap'>
              <View className='priv__sheet-handle' />
            </View>
            <View className='priv__sheet-header'>
              <Text className='priv__sheet-title'>{activeRow.title}</Text>
            </View>
            <View className='priv__sheet-list'>
              {VISIBILITY_OPTIONS.map((option) => {
                const selected = settings[activeRow.key] === option.value
                return (
                  <View
                    key={option.value}
                    className='priv__sheet-option'
                    onClick={() => {
                      setSettings((prev) => ({ ...prev, [activeRow.key]: option.value }))
                      setActiveKey(null)
                    }}
                  >
                    <Text
                      className={`priv__sheet-option-text ${
                        selected ? 'priv__sheet-option-text--selected' : ''
                      }`}
                    >
                      {option.label}
                    </Text>
                    {selected && <Icon name='check' size={40} color='#0062FF' strokeWidth={2} />}
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