// ============================================================
// Tabs 分类标签页组件
// 用途：列表页顶部切换分类
// ============================================================
import { View, Text } from '@tarojs/components'

import './index.scss'

export interface TabItem {
  key: string
  label: string
}

interface TabsProps {
  /** 标签数组 */
  tabs: TabItem[]
  /** 当前激活 key */
  activeKey: string
  /** 切换回调 */
  onChange: (key: string) => void
}

export default function Tabs({ tabs, activeKey, onChange }: TabsProps) {
  return (
    <View className='cx-tabs'>
      {tabs.map((tab) => {
        const active = tab.key === activeKey
        return (
          <View
            key={tab.key}
            className={`cx-tabs__item ${active ? 'cx-tabs__item--active' : ''}`}
            onClick={() => onChange(tab.key)}
          >
            <Text className='cx-tabs__label'>{tab.label}</Text>
          </View>
        )
      })}
    </View>
  )
}