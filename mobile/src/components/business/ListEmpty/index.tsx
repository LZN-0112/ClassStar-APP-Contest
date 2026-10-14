// ============================================================
// ListEmpty 空状态组件
// 用途：列表无数据 / 空内容展示
// ============================================================
import { View, Text } from '@tarojs/components'

import Icon from '@/components/ui/Icon'
import Btn from '@/components/ui/Button'
import './index.scss'

interface ListEmptyProps {
  /** 图标名，对应 constants/icons.ts */
  icon?: string
  /** 空状态文案 */
  text: string
  /** 操作按钮文案（可选） */
  actionText?: string
  /** 操作按钮点击回调 */
  onAction?: () => void
}

export default function ListEmpty({ icon = 'school', text, actionText, onAction }: ListEmptyProps) {
  return (
    <View className='cx-empty'>
      <View className='cx-empty__icon'>
        <Icon name={icon} size={96} color='#c7d2fe' strokeWidth={1.5} />
      </View>
      <Text className='cx-empty__text'>{text}</Text>
      {actionText ? (
        <Btn size='sm' onClick={onAction} className='cx-empty__action'>
          {actionText}
        </Btn>
      ) : null}
    </View>
  )
}