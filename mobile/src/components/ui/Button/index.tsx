// ============================================================
// Button 通用按钮组件
// 设计规范 8.1
// ============================================================
import { View, Text } from '@tarojs/components'
import type { ReactNode } from 'react'

import './index.scss'

export type ButtonType = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps {
  /** 按钮类型 */
  type?: ButtonType
  /** 按钮尺寸 */
  size?: ButtonSize
  /** 加载中 */
  loading?: boolean
  /** 禁用 */
  disabled?: boolean
  /** 占满宽度 */
  block?: boolean
  /** 点击事件 */
  onClick?: () => void
  /** 子元素 */
  children: ReactNode
  /** 自定义类名 */
  className?: string
}

export default function Button({
  type = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  block = false,
  onClick,
  children,
  className = ''
}: ButtonProps) {
  const isDisabled = disabled || loading

  const handleClick = () => {
    if (isDisabled) return
    onClick?.()
  }

  const classes = [
    'cx-button',
    `cx-button--${type}`,
    `cx-button--${size}`,
    block ? 'cx-button--block' : '',
    isDisabled ? 'cx-button--disabled' : '',
    loading ? 'cx-button--loading' : '',
    className
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <View className={classes} onClick={handleClick}>
      {loading ? (
        <View className='cx-button__loading'>
          <View className='cx-button__spinner' />
          <Text className='cx-button__text'>加载中</Text>
        </View>
      ) : (
        <Text className='cx-button__text'>{children}</Text>
      )}
    </View>
  )
}
