// ============================================================
// Card 通用卡片组件
// 设计规范 8.2
// ============================================================
import { View, Text } from '@tarojs/components'
import type { ReactNode } from 'react'

import './index.scss'

interface CardProps {
  /** 卡片标题 */
  title?: string
  /** 右侧额外内容 */
  extra?: ReactNode
  /** 自定义内边距（rpx），默认 $spacing-lg */
  padding?: number
  /** 子元素 */
  children: ReactNode
  /** 自定义类名 */
  className?: string
}

export default function Card({
  title,
  extra,
  padding,
  children,
  className = ''
}: CardProps) {
  const classes = ['cx-card', className].filter(Boolean).join(' ')

  const style = padding !== undefined ? { padding: `${padding}rpx` } : undefined

  const hasHeader = title !== undefined || extra !== undefined

  return (
    <View className={classes} style={style}>
      {hasHeader && (
        <View className='cx-card__header'>
          {title !== undefined && <Text className='cx-card__title'>{title}</Text>}
          {extra && <View className='cx-card__extra'>{extra}</View>}
        </View>
      )}
      <View className='cx-card__body'>{children}</View>
    </View>
  )
}
