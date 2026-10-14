// ============================================================
// Tag 标签组件
// 用途：状态/分类标签展示
// ============================================================
import { Text } from '@tarojs/components'

import './index.scss'

export type TagColor =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'default'
export type TagType = 'filled' | 'outline' | 'dot'

interface TagProps {
  /** 标签文本 */
  text: string
  /** 标签预设颜色，默认 default */
  color?: TagColor
  /** 展示类型：filled 实底 / outline 描边 / dot 圆点 */
  type?: TagType
  /** 自定义颜色（hex，优先于 color） */
  customColor?: string
}

export default function Tag({
  text,
  color = 'default',
  type = 'filled',
  customColor
}: TagProps) {
  const style = customColor ? { color: customColor } : undefined
  return (
    <Text
      className={`cx-tag cx-tag--${color} cx-tag--${type}`}
      style={style}
    >
      {text}
    </Text>
  )
}