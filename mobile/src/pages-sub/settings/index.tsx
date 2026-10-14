import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { StatusBar } from '@/components/business'
import { Icon } from '@/components/ui'
import { authApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

interface SettingItem {
  key: string
  label: string
  icon: string
  iconBg?: string
  iconColor?: string
  url: string
}

interface SettingGroup {
  title: string
  items: SettingItem[]
}

const GROUPS: SettingGroup[] = [
  {
    title: '账号与安全',
    items: [
      {
        key: 'account-security',
        label: '账号与安全',
        icon: 'shield',
        iconBg: '#E0F2FE',
        iconColor: '#004ECC',
        url: '/pages-sub/settings/account-security/index'
      },
      {
        key: 'privacy',
        label: '隐私设置',
        icon: 'lock',
        iconBg: '#E0F2FE',
        iconColor: '#004ECC',
        url: '/pages-sub/settings/privacy/index'
      }
    ]
  },
  {
    title: '通知设置',
    items: [
      {
        key: 'notification',
        label: '消息通知设置',
        icon: 'bell',
        iconBg: '#E0F2FE',
        iconColor: '#0062FF',
        url: '/pages-sub/settings/notification/index'
      },
      {
        key: 'reminder',
        label: '再次提醒设置',
        icon: 'clock',
        iconBg: '#E0F2FE',
        iconColor: '#0062FF',
        url: '/pages-sub/settings/reminder/index'
      }
    ]
  },
  {
    title: '通用设置',
    items: [
      {
        key: 'general',
        label: '通用设置',
        icon: 'settings',
        iconBg: '#F3F4F6',
        iconColor: '#4B5563',
        url: '/pages-sub/settings/general/index'
      },
      {
        key: 'about',
        label: '关于',
        icon: 'info',
        iconBg: '#F3F4F6',
        iconColor: '#4B5563',
        url: '/pages-sub/settings/about/index'
      }
    ]
  },
  {
    title: '帮助反馈',
    items: [
      {
        key: 'help-feedback',
        label: '帮助与反馈',
        icon: 'help-circle',
        iconBg: '#FEF3C7',
        iconColor: '#D97706',
        url: '/pages-sub/settings/help-feedback/index'
      }
    ]
  }
]

export default function Settings() {
  const { requireLogin } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useLoad(() => {
    requireLogin()
  })

  const go = (url: string) => {
    Taro.navigateTo({ url })
  }

  const handleBack = () => {
    const pages = Taro.getCurrentPages()
    if (pages.length > 1) Taro.navigateBack()
    else Taro.reLaunch({ url: '/pages/home/index' })
  }

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await authApi.logout()
      Taro.showToast({ title: '已退出登录', icon: 'success' })
    } catch {
      // 即使接口失败也继续清理本地状态
    } finally {
      useUserStore.getState().logout()
      setIsLoggingOut(false)
      Taro.reLaunch({ url: '/pages/auth/login/index' })
    }
  }

  return (
    <View className='sett'>
      <View className='sett__header'>
        <StatusBar light />
        <View className='sett__nav'>
          <View className='sett__back press-opacity' onClick={handleBack}>
            <Icon name='arrow-left' size={40} color='#FFFFFF' strokeWidth={2} />
          </View>
          <Text className='sett__title'>设置</Text>
          <View className='sett__nav-right' />
        </View>
      </View>

      <View className='sett__body'>
        {GROUPS.map((group) => (
          <View key={group.title} className='sett__group'>
            <Text className='sett__group-title'>{group.title}</Text>
            <View className='sett__group-items'>
              {group.items.map((item) => (
                <View key={item.key} className='sett__item' onClick={() => go(item.url)}>
                  <View className='sett__item-icon' style={{ backgroundColor: item.iconBg }}>
                    <Icon name={item.icon} size={48} color={item.iconColor} strokeWidth={2} />
                  </View>
                  <Text className='sett__item-label'>{item.label}</Text>
                  <View className='sett__item-arrow'>
                    <Icon name='chevron-right' size={40} color='#9CA3AF' strokeWidth={2} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}

        <View className='sett__group'>
          <Text className='sett__group-title'>账号操作</Text>
          <View className='sett__group-items'>
            <View className='sett__item' onClick={handleLogout}>
              <View className='sett__item-icon sett__item-icon--danger'>
                <Icon name='log-out' size={48} color='#DC2626' strokeWidth={2} />
              </View>
              <Text className='sett__item-label sett__item-label--danger'>
                {isLoggingOut ? '退出中...' : '退出登录'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}