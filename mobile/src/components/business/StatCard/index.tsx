// ============================================================
// StatCard 统计卡片组件
// 用途：首页/数据页的数字统计展示
// ============================================================
import { View, Text } from '@tarojs/components'

import Icon from '@/components/ui/Icon'
import './index.scss'

interface StatCardProps {
  /** 图标名 */
  icon: string
  /** 数值文案 */
  value: string | number
  /** 标签 */
  label: string
  /** 图标颜色（hex） */
  color?: string
}

export default function StatCard({ icon, value, label, color = '#0062ff' }: StatCardProps) {
  return (
    <View className='cx-stat'>
      <View className='cx-stat__icon' style={{ backgroundColor: `${color}1a` }}>
        <Icon name={icon} size={44} color={color} strokeWidth={2} />
      </View>
      <Text className='cx-stat__value'>{value}</Text>
      <Text className='cx-stat__label'>{label}</Text>
    </View>
  )
}