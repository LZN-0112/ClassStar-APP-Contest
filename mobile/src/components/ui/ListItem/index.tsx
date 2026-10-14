// ============================================================
// ListItem 统一列表项组件（对应 front data-display/ListItem）
// 图标 + 标题 + 副标题 + 右侧元素 + 箭头
// ============================================================
import { View, Text } from '@tarojs/components'
import type { ReactNode } from 'react'

import { Icon } from '@/components/ui'
import IconBox from '../IconBox'
import type { IconBoxVariant } from '../IconBox'
import './index.scss'

interface ListItemProps {
  /** 标题 */
  title: string
  /** 副标题 */
  subtitle?: ReactNode
  /** 图标（用 Icon 组件传入） */
  icon?: ReactNode
  /** 图标变体（传给 IconBox） */
  iconVariant?: IconBoxVariant
  /** 右侧自定义元素 */
  right?: ReactNode
  /** 显示右侧箭头（默认 true，仅 onCl')->支持点击时显示 */
  showArrow?: boolean
  /** 点击事件 */
  onClick?: () => void
  /** 标题右侧小标签（如角色标签） */
  tag?: ReactNode
  /** 选中态（背景 $accent-50） */
  active?: boolean
  /** 自定义类名 */
  className?: string
}

export default function ListItem({
  title,
  subtitle,
  icon,
  iconVariant = 'primary',
  right,
  showArrow = true,
  onClick,
  tag,
  active = false,
  className = ''
}: ListItemProps) {
  const classes = [
    'cx-list-item',
    onClick ? 'cx-list-item--clickable press-bg' : '',
    active ? 'cx-list-item--active' : '',
    className
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <View className={classes} onClick={onClick}>
      {icon ? <IconBox variant={iconVariant}>{icon}</IconBox> : null}

      <View className='cx-list-item__body'>
        <View className='cx-list-item__title-row'>
          <Text className='cx-list-item__title'>{title}</Text>
          {tag}
        </View>
        {subtitle ? <View className='cx-list-item__subtitle'>{subtitle}</View> : null}
      </View>

      {right}

      {showArrow && onClick ? (
        <View className='cx-list-item__arrow'>
          <Icon name='chevron-right' size={40} strokeWidth={2} />
        </View>
      ) : null}
    </View>
  )
}