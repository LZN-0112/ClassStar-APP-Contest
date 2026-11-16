// ============================================================
// BottomSheet 底部弹层
// 1:1 对齐 front/src/components/ui/BottomSheet.tsx
// 顶部圆角 + 拖拽条 + 标题 + 可滚动内容 + 底部操作区
// ============================================================
import type { ReactNode } from 'react'
import { ScrollView, Text, View } from '@tarojs/components'

import Icon from '@/components/ui/Icon'
import './index.scss'

interface BottomSheetProps {
  open: boolean
  title?: string
  subtitle?: string
  children?: ReactNode
  footer?: ReactNode
  /** 标题右侧操作区（对齐 App BottomSheet 的 headerExtra） */
  extra?: ReactNode
  /** 内容最大高度（px），默认 460 */
  maxHeight?: number
  onClose: () => void
}

export default function BottomSheet({
  open,
  title,
  subtitle,
  children,
  footer,
  extra,
  maxHeight = 460,
  onClose
}: BottomSheetProps) {
  if (!open) return null

  return (
    <View className='cx-sheet' catchMove>
      <View className='cx-sheet__mask' onClick={onClose} />
      <View className='cx-sheet__panel' onClick={(e) => e.stopPropagation()}>
        <View className='cx-sheet__handle' />
        {title ? (
          <View className='cx-sheet__head'>
            <View className='cx-sheet__head-text'>
              <Text className='cx-sheet__title'>{title}</Text>
              {subtitle ? <Text className='cx-sheet__subtitle'>{subtitle}</Text> : null}
            </View>
            {extra ? <View className='cx-sheet__extra'>{extra}</View> : null}
            <View className='cx-sheet__close' onClick={onClose}>
              <Icon name='x' size={36} color='#6B7280' strokeWidth={2} />
            </View>
          </View>
        ) : null}
        <ScrollView
          scrollY
          className='cx-sheet__body'
          style={{ maxHeight: `${maxHeight}px` }}
        >
          {children}
        </ScrollView>
        {footer ? <View className='cx-sheet__footer'>{footer}</View> : null}
      </View>
    </View>
  )
}