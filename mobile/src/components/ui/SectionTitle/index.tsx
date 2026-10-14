// ============================================================
// SectionTitle 区块标题组件（对应 front data-display/SectionTitle）
// 小号灰色区块标签，中文场景原样显示（不加 uppercase）
// ============================================================
import { View } from '@tarojs/components'
import type { ReactNode } from 'react'

import './index.scss'

interface SectionTitleProps {
  children: ReactNode
  className?: string
}

export default function SectionTitle({ children, className = '' }: SectionTitleProps) {
  const classes = ['cx-section-title', className].filter(Boolean).join(' ')
  return <View className={classes}>{children}</View>
}