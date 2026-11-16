import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { SettingsHeader } from '@/components/business'
import { Icon } from '@/components/ui'
import './index.scss'

const APP_VERSION = '1.0.0'

interface AboutRow {
  key: string
  label: string
  icon: string
  iconColor: string
  iconBg: string
  value?: string
  onClick?: () => void
}

export default function About() {
  const rows: AboutRow[] = [
    {
      key: 'agreement',
      label: '用户协议',
      icon: 'file-text',
      iconColor: '#4B5563',
      iconBg: '#F3F4F6',
      onClick: () => Taro.navigateTo({ url: '/pages/auth/user-agreement/index' })
    },
    {
      key: 'privacy',
      label: '隐私政策',
      icon: 'lock',
      iconColor: '#4B5563',
      iconBg: '#F3F4F6',
      onClick: () => Taro.navigateTo({ url: '/pages/auth/privacy-policy/index' })
    },
    {
      key: 'version',
      label: '版本更新',
      icon: 'refresh',
      iconColor: '#4B5563',
      iconBg: '#F3F4F6',
      value: `v${APP_VERSION}`
    },
    {
      key: 'rate',
      label: '给我们评分',
      icon: 'star',
      iconColor: '#D97706',
      iconBg: '#FEF3C7',
      onClick: () => Taro.showToast({ title: '应用商店暂未上架，敬请期待', icon: 'none' })
    }
  ]

  return (
    <View className='about'>
      <SettingsHeader title='关于' />

      <View className='about__body'>
        <View className='about__list'>
          {rows.map((row) => (
            <View key={row.key} className='about__item' onClick={row.onClick}>
              <View
                className='about__icon-box'
                style={{ backgroundColor: row.iconBg }}
              >
                <Icon name={row.icon} size={48} color={row.iconColor} strokeWidth={2} />
              </View>
              <Text className='about__label'>{row.label}</Text>
              <View className='about__right'>
                {row.value && <Text className='about__value'>{row.value}</Text>}
                {row.onClick && (
                  <Icon name='chevron-right' size={40} color='#9CA3AF' strokeWidth={2} />
                )}
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}