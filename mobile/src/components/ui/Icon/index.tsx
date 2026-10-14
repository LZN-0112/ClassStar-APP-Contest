// ============================================================
// Icon 通用图标组件
// 内联 SVG 实现，对应 lucide-react 图标集
// 不引入第三方图标库，保持小程序可编译
// Props: name(图标名)、size(尺寸，单位 rpx)、color(颜色)
// ============================================================
import { View } from '@tarojs/components'

import { ICON_PATHS } from '@/constants/icons'
import './index.scss'

interface IconProps {
  /** 图标名称，对应 constants/icons.ts 中的 key */
  name: string
  /**
   * 图标尺寸：
   * - number：单位 rpx（如 48 → 48rpx / 24px）
   * - 快捷值：'sm'=32rpx、'md'=40rpx、'lg'=48rpx
   */
  size?: number | 'sm' | 'md' | 'lg'
  /** 图标颜色，默认继承父级颜色 */
  color?: string
  /** 描边宽度，默认 2（与 lucide 一致） */
  strokeWidth?: number
  /** 自定义类名 */
  className?: string
}

const SIZE_ALIAS: Record<'sm' | 'md' | 'lg', number> = {
  sm: 32,
  md: 40,
  lg: 48
}

export default function Icon({
  name,
  size = 'lg',
  color = 'currentColor',
  strokeWidth = 2,
  className = ''
}: IconProps) {
  const paths = ICON_PATHS[name]
  const resolvedSize = typeof size === 'number' ? size : SIZE_ALIAS[size]

  if (!paths) {
    // 图标不存在时返回空占位，避免崩溃
    return (
      <View
        className={`cx-icon ${className}`}
        style={{ width: `${resolvedSize}rpx`, height: `${resolvedSize}rpx` }}
      />
    )
  }

  return (
    <View
      className={`cx-icon ${className}`}
      style={{ width: `${resolvedSize}rpx`, height: `${resolvedSize}rpx` }}
    >
      <svg
        width={`${resolvedSize}rpx`}
        height={`${resolvedSize}rpx`}
        viewBox='0 0 24 24'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
      >
        {paths.split(' M').map((d, i) => (
          <path
            key={i}
            d={i === 0 ? d : `M${d}`}
            fill='none'
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        ))}
      </svg>
    </View>
  )
}
