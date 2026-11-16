// ============================================================
// ConfirmDialog 二次确认弹窗
// 1:1 对齐 front/src/components/ui/ConfirmDialog.tsx
// 图标 + 居中标题说明 + 整宽主按钮 + 文字取消
// ============================================================
import { Text, View } from '@tarojs/components'

import Icon from '@/components/ui/Icon'
import './index.scss'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  cancelText?: string
  confirmText?: string
  danger?: boolean
  loading?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export default function ConfirmDialog({
  open,
  title,
  description,
  cancelText = '取消',
  confirmText = '确定',
  danger = false,
  loading = false,
  onCancel,
  onConfirm
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <View
      className='cx-confirm'
      onClick={() => {
        if (!loading) onCancel()
      }}
    >
      <View className='cx-confirm__mask' />
      <View className='cx-confirm__card' onClick={(e) => e.stopPropagation()}>
        <View className={`cx-confirm__icon ${danger ? 'cx-confirm__icon--danger' : ''}`}>
          <Icon
            name={danger ? 'alert-triangle' : 'help-circle'}
            size={56}
            color={danger ? '#EF4444' : '#0062FF'}
            strokeWidth={1.8}
          />
        </View>
        <Text className='cx-confirm__title'>{title}</Text>
        {description ? <Text className='cx-confirm__desc'>{description}</Text> : null}
        <View className='cx-confirm__actions'>
          <View
            className={`cx-confirm__confirm ${danger ? 'cx-confirm__confirm--danger' : ''} ${
              loading ? 'cx-confirm__confirm--loading' : ''
            }`}
            onClick={() => {
              if (!loading) onConfirm()
            }}
          >
            {loading ? '处理中...' : confirmText}
          </View>
          <View
            className='cx-confirm__cancel'
            onClick={() => {
              if (!loading) onCancel()
            }}
          >
            {cancelText}
          </View>
        </View>
      </View>
    </View>
  )
}