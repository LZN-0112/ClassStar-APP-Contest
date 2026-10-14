// ============================================================
// ListLoading 骨架屏加载组件
// 用途：列表数据加载中的占位骨架
// ============================================================
import { View } from '@tarojs/components'

import './index.scss'

interface ListLoadingProps {
  /** 骨架行数，默认 5 */
  rows?: number
}

export default function ListLoading({ rows = 5 }: ListLoadingProps) {
  return (
    <View className='cx-skeleton'>
      {Array.from({ length: rows }).map((_, i) => (
        <View className='cx-skeleton__item' key={i}>
          <View className='cx-skeleton__avatar' />
          <View className='cx-skeleton__body'>
            <View className='cx-skeleton__line cx-skeleton__line--w60' />
            <View className='cx-skeleton__line cx-skeleton__line--w40' />
          </View>
        </View>
      ))}
    </View>
  )
}