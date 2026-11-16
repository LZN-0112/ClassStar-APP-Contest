// ============================================================
// StatusBar 状态栏占位组件
// 小程序使用系统状态栏（时间 / 电量由系统绘制），这里只保留
// 与 App 一致的状态栏高度占位，避免内容被状态栏与胶囊按钮遮挡
// ============================================================
import { useEffect } from 'react'
import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import './index.scss'

interface StatusBarProps {
  /** 亮色模式（深色 / 渐变背景上使用白色系统状态栏图标），默认 false */
  light?: boolean
  /** 自定义类名 */
  className?: string
}

export default function StatusBar({ light = false, className = '' }: StatusBarProps) {
  const statusBarHeight = getStatusBarHeight()

  // 自定义导航栏时，同步系统状态栏图标颜色（深色背景用白色图标）
  useEffect(() => {
    try {
      Taro.setNavigationBarColor({
        frontColor: light ? '#ffffff' : '#000000',
        backgroundColor: light ? '#000000' : '#ffffff'
      })?.catch?.(() => {
        // 部分基础库在自定义导航下不支持，忽略即可
      })
    } catch {
      // 同步异常忽略
    }
  }, [light])

  const classes = ['cx-statusbar', className].filter(Boolean).join(' ')

  return (
    <View className={classes} style={{ paddingTop: `${statusBarHeight}px` }}>
      {/* 状态栏内容行占位：保持原有 56rpx 高度，避免顶部元素与胶囊按钮重叠 */}
      <View className='cx-statusbar__spacer' />
    </View>
  )
}

/** 获取系统状态栏高度（px） */
function getStatusBarHeight(): number {
  try {
    const sys = Taro.getSystemInfoSync()
    return sys.statusBarHeight || 0
  } catch {
    return 0
  }
}