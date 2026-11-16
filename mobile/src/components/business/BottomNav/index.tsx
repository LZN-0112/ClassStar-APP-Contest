// ============================================================
// BottomNav 底部主导航
// 与 App front/src/components/layout/BottomNav.tsx 视觉一致：
// 白底、顶部细分割线、5 项（首页/班级/AI 助手/数据/我的）
// 小程序已移除原生 tabBar，由本组件在每个主页面底部渲染
// ============================================================
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'

import Icon from '@/components/ui/Icon'
import './index.scss'

export type BottomNavKey = 'home' | 'class' | 'ai' | 'data' | 'profile'

interface NavItem {
  key: BottomNavKey
  label: string
  icon: string
  path: string
}

const NAV_ITEMS: NavItem[] = [
  { key: 'home', label: '首页', icon: 'home', path: '/pages/home/index' },
  { key: 'class', label: '班级', icon: 'users', path: '/pages/class-home/index' },
  { key: 'ai', label: 'AI 助手', icon: 'sparkles', path: '/pages/ai/index' },
  { key: 'data', label: '数据', icon: 'bar-chart', path: '/pages/data/index' },
  { key: 'profile', label: '我的', icon: 'user', path: '/pages/profile/index' }
]

interface BottomNavProps {
  /** 当前页签 */
  active: BottomNavKey
}

export default function BottomNav({ active }: BottomNavProps) {
  const handleTap = (item: NavItem) => {
    if (item.key === active) return
    // 无原生 tabBar，主页面之间用 reLaunch 切换，避免页面栈无限叠加
    Taro.reLaunch({ url: item.path })
  }

  return (
    <View className='bottom-nav'>
      {NAV_ITEMS.map((item) => {
        const isActive = item.key === active
        return (
          <View
            key={item.key}
            className={`bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}
            hoverClass='bottom-nav__item--hover'
            onClick={() => handleTap(item)}
          >
            <View className='bottom-nav__icon'>
              <Icon name={item.icon} size={48} color={isActive ? '#0062FF' : '#6B7280'} />
            </View>
            <Text className='bottom-nav__label'>{item.label}</Text>
          </View>
        )
      })}
    </View>
  )
}