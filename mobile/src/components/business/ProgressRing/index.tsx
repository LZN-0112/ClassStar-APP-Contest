// ============================================================
// ProgressRing 环形进度组件
// 用途：占比/进度环形展示
// ============================================================
import { View, Text } from '@tarojs/components'

import './index.scss'

interface ProgressRingProps {
  /** 进度百分比 0-100 */
  percent: number
  /** 直径（rpx），默认 120 */
  size?: number
  /** 进度颜色（hex），默认主色 */
  color?: string
  /** 轨道颜色，默认浅灰 */
  trackColor?: string
  /** 是否展示中心文字 */
  showLabel?: boolean
}

export default function ProgressRing({
  percent,
  size = 120,
  color = '#0062ff',
  trackColor = '#f3f4f6',
  showLabel = true
}: ProgressRingProps) {
  const clamp = Math.max(0, Math.min(100, percent))
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const dashoffset = circumference * (1 - clamp / 100)

  return (
    <View className='cx-ring' style={{ width: `${size}rpx`, height: `${size}rpx` }}>
      <svg width={`${size}rpx`} height={`${size}rpx`} viewBox='0 0 100 100'>
        <circle
          cx='50'
          cy='50'
          r={radius}
          fill='none'
          stroke={trackColor}
          strokeWidth='10'
        />
        <circle
          cx='50'
          cy='50'
          r={radius}
          fill='none'
          stroke={color}
          strokeWidth='10'
          strokeLinecap='round'
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          transform='rotate(-90 50 50)'
        />
      </svg>
      {showLabel ? (
        <Text className='cx-ring__label'>{Math.round(clamp)}%</Text>
      ) : null}
    </View>
  )
}