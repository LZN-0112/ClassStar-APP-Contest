// ============================================================
// IconBox 图标容器组件（对应 front data-display/IconBox）
// 统一的图标容器：背景色 + 圆角，用于列表项、统计卡片等
// ============================================================
import { View } from '@tarojs/components'
import type { ReactNode } from 'react'

import './index.scss'

export type IconBoxVariant = 'primary' | 'success' | 'warning' | 'danger' | 'muted'
export type IconBoxSize = 'sm' | 'md' | 'lg'

interface IconBoxProps {
  /** 变体（背景/前景色组合） */
  variant?: IconBoxVariant
  /** 尺寸 */
  size?: IconBoxSize
  /** 图标内容 */
  children: ReactNode
  /** 自定义类名 */
  className?: string
}

export default function IconBox({
  variant = 'primary',
  size = 'md',
  children,
  className = ''
}: IconBoxProps) {
  const classes = [
    'cx-iconbox',
    `cx-iconbox--${variant}`,
    `cx-iconbox--${size}`,
    className
  ]
    .filter(Boolean)
    .join(' ')

  return <View className={classes}>{children}</View>
}