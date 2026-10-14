// ============================================================
// Modal 弹窗组件
// 用途：确认框/底部弹层/普通弹窗
// ============================================================
import { View, Text } from '@tarojs/components'
import type { ReactNode } from 'react'

import Icon from '@/components/ui/Icon'
import './index.scss'

interface ModalProps {
  /** 是否显示 */
  visible: boolean
  /** 弹窗标题 */
  title?: string
  /** 关闭回调 */
  onClose?: () => void
  /** 内容 */
  children: ReactNode
  /** 弹窗位置：center 居中 / bottom 底部弹层 */
  position?: 'center' | 'bottom'
  /** 是否显示右上角关闭按钮 */
  closable?: boolean
}

export default function Modal({
  visible,
  title,
  onClose,
  children,
  position = 'center',
  closable = true
}: ModalProps) {
  if (!visible) return null

  return (
    <View className='cx-modal' onTouchMove={(e) => e.stopPropagation()}>
      <View className='cx-modal__mask' onClick={onClose} />
      <View className={`cx-modal__box cx-modal__box--${position}`}>
        {closable ? (
          <View className='cx-modal__close' onClick={onClose}>
            <Icon name='x' size={36} color='#9ca3af' strokeWidth={2} />
          </View>
        ) : null}
        {title ? <Text className='cx-modal__title'>{title}</Text> : null}
        <View className='cx-modal__content'>{children}</View>
      </View>
    </View>
  )
}