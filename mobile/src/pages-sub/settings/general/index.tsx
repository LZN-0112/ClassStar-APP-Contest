import { View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar } from '@/components/business'
import { Icon } from '@/components/ui'
import { settingsApi } from '@/services'
import { useAuth } from '@/utils'
import './index.scss'

interface GenRow {
  key: string
  label: string
  value: string
  valueColor?: string
  url?: string
}

const GROUPS: { title: string; rows: GenRow[] }[] = [
  {
    title: '基础偏好',
    rows: [
      { key: 'lang', label: '语言', value: '简体中文' },
      { key: 'theme', label: '深色模式', value: '跟随系统' }
    ]
  },
  {
    title: '存储管理',
    rows: [{ key: 'cache', label: '清除缓存', value: '12.5 MB', valueColor: '#0062FF' }]
  },
  {
    title: '关于',
    rows: [
      {
        key: 'about',
        label: '关于',
        value: 'v1.0.0',
        url: '/pages-sub/settings/about/index'
      }
    ]
  }
]

export default function GeneralSettings() {
  const { requireLogin } = useAuth()

  useLoad(() => {
    if (!requireLogin()) return
    loadSettings()
  })

  const loadSettings = async () => {
    try {
      await settingsApi.getSettings()
    } catch {
      // 静默失败，保持占位 UI
    }
  }

  const go = (url?: string) => {
    if (!url) return
    Taro.navigateTo({ url })
  }

  return (
    <View className='gene'>
      <NavBar title='通用设置' />

      <View className='gene__body'>
        {GROUPS.map((group) => (
          <View key={group.title} className='gene__group'>
            <Text className='gene__group-title'>{group.title}</Text>
            <View className='gene__card'>
              {group.rows.map((row) => (
                <View key={row.key} className='gene__row' onClick={() => go(row.url)}>
                  <Text className='gene__row-label'>{row.label}</Text>
                  <View className='gene__row-right'>
                    <Text
                      className='gene__row-value'
                      style={{ color: row.valueColor }}
                    >
                      {row.value}
                    </Text>
                    <Icon name='chevron-right' size={48} color='#4B5563' strokeWidth={2} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}