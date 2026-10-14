// ============================================================
// PrimaryButton 主操作按钮组件（对应 front common/PrimaryButton）
// 实心 / 描边两种，支持 loading / disabled / 按压反馈
// ============================================================
import { View, Text } from '@tarojs/components'
import type { ReactNode } from 'react'

import './index.scss'

export type PrimaryButtonVariant = 'solid' | 'outline'

interface PrimaryButtonProps {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: PrimaryButtonVariant
  loading?: boolean
  className?: string
}

export default function PrimaryButton({
  children,
  onClick,
  disabled = false,
  variant = 'solid',
  loading = false,
  className = ''
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading

  const handleClick = () => {
    if (isDisabled) return
    onClick?.()
  }

  const classes = [
    'cx-primary-btn',
    `cx-primary-btn--${variant}`,
    isDisabled ? 'cx-primary-btn--disabled' : '',
    loading ? 'cx-primary-btn--loading' : '',
    // 非禁用时启用按压反馈（禁用态由 --disabled 控制 opacity）
    !isDisabled ? 'press-opacity' : '',
    className
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <View className={classes} onClick={handleClick}>
      {loading ? (
        <>
          <View className='cx-primary-btn__spinner' />
          <Text>加载中</Text>
        </>
      ) : (
        <Text>{children}</Text>
      )}
    </View>
  )
}