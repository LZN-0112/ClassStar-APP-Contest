// ============================================================
// SectionHeader 区块标题组件
// 用途：页面内的分组标题 + 可选"更多"链接
// ============================================================
import { View, Text } from '@tarojs/components'

import Icon from '@/components/ui/Icon'
import './index.scss'

interface SectionHeaderProps {
  /** 标题 */
  title: string
  /** 右侧"更多"文案（可选） */
  moreText?: string
  /** "更多"点击回调 */
  onMore?: () => void
}

export default function SectionHeader({ title, moreText, onMore }: SectionHeaderProps) {
  return (
    <View className='cx-section'>
      <Text className='cx-section__title'>{title}</Text>
      {moreText ? (
        <View className='cx-section__more' onClick={onMore}>
          <Text className='cx-section__more-text'>{moreText}</Text>
          <Icon name='chevron-right' size={28} color='#9ca3af' strokeWidth={2} />
        </View>
      ) : null}
    </View>
  )
}