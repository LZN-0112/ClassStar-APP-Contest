// ============================================================
// StatusBar 自定义状态栏组件
// 动态使用系统状态栏高度（px），内容与 front StatusBar 对齐（9:41 + 信号 + 100%）
// ============================================================
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'

import './index.scss'

interface StatusBarProps {
  /** 亮色模式（深色 / 渐变背景上白色文字），默认 false */
  light?: boolean
  /** 自定义类名 */
  className?: string
}

export default function StatusBar({
  light = false,
  className = ''
}: StatusBarProps) {
  const statusBarHeight = getStatusBarHeight()

  const classes = ['cx-statusbar', light ? 'cx-statusbar--light' : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <View className={classes} style={{ paddingTop: `${statusBarHeight}px` }}>
      <View className='cx-statusbar__inner'>
        <Text className='cx-statusbar__time'>9:41</Text>
        <View className='cx-statusbar__icons'>
          <Text className='cx-statusbar__signal'>◉◉◉◉</Text>
          <Text className='cx-statusbar__battery'>100%</Text>
        </View>
      </View>
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