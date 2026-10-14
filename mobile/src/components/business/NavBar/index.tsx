// ============================================================
// NavBar 自定义导航栏组件
// 适配微信小程序胶囊按钮，使用系统状态栏高度
// ============================================================
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { ReactNode } from 'react'

import Icon from '@/components/ui/Icon'
import StatusBar from '../StatusBar'
import './index.scss'

interface NavBarProps {
  /** 标题 */
  title: string
  /** 是否显示返回按钮，默认 true */
  showBack?: boolean
  /** 返回回调（默认 Taro.navigateBack） */
  onBack?: () => void
  /** 右侧自定义内容 */
  right?: ReactNode
  /** 是否透明（沉浸式，默认 false） */
  transparent?: boolean
  /** 亮色模式（深色背景上白色文字），对应 front StatusBar 的 light */
  light?: boolean
}

export default function NavBar({
  title,
  showBack = true,
  onBack,
  right,
  transparent = false,
  light = false
}: NavBarProps) {
  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      const pages = Taro.getCurrentPages()
      if (pages.length > 1) Taro.navigateBack()
      else Taro.reLaunch({ url: '/pages/home/index' })
    }
  }

  const className = [
    'cx-navbar',
    transparent ? 'cx-navbar--transparent' : '',
    light ? 'cx-navbar--light' : ''
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <View className={className}>
      <StatusBar light={light} />
      <View className='cx-navbar__inner'>
        <View className='cx-navbar__side cx-navbar__side--left'>
          {showBack ? (
            <View className='cx-navbar__back press-opacity' onClick={handleBack}>
              <Icon
                name='arrow-left'
                size={40}
                color={light ? '#ffffff' : 'currentColor'}
                strokeWidth={2}
              />
            </View>
          ) : null}
        </View>
        <Text className='cx-navbar__title'>{title}</Text>
        <View className='cx-navbar__side cx-navbar__side--right'>{right}</View>
      </View>
    </View>
  )
}