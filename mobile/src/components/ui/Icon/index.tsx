// ============================================================
// Icon 通用图标组件
// 微信小程序不支持内联 <svg> 标签，因此把 lucide 图标序列化为
// base64 SVG 作为 background-image 渲染，保证真机可见
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
  /** 图标颜色，默认 #333333 */
  color?: string
  /** 描边宽度，默认 2（与 lucide 一致） */
  strokeWidth?: number
  /** 填充色（品牌类实心图标，如微信） */
  fill?: string
  /** 自定义类名 */
  className?: string
}

const SIZE_ALIAS: Record<'sm' | 'md' | 'lg', number> = {
  sm: 32,
  md: 40,
  lg: 48
}

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/** 纯 ASCII 字符串转 base64（小程序无 btoa） */
function toBase64(input: string): string {
  let result = ''
  for (let i = 0; i < input.length; i += 3) {
    const c1 = input.charCodeAt(i)
    const c2 = input.charCodeAt(i + 1)
    const c3 = input.charCodeAt(i + 2)
    const has2 = !Number.isNaN(c2)
    const has3 = !Number.isNaN(c3)
    result += B64_CHARS[c1 >> 2]
    result += B64_CHARS[((c1 & 3) << 4) | (has2 ? c2 >> 4 : 0)]
    result += has2 ? B64_CHARS[((c2 & 15) << 2) | (has3 ? c3 >> 6 : 0)] : '='
    result += has3 ? B64_CHARS[c3 & 63] : '='
  }
  return result
}

export default function Icon({
  name,
  size = 'lg',
  color = '#333333',
  strokeWidth = 2,
  fill,
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

  const pathMarkup = paths
    .split(' M')
    .map((d, i) => `<path d='${i === 0 ? d : `M${d}`}' />`)
    .join('')
  const svg = fill
    ? `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='${fill}' stroke='none'>${pathMarkup}</svg>`
    : `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' ` +
      `stroke='${color}' stroke-width='${strokeWidth}' stroke-linecap='round' ` +
      `stroke-linejoin='round'>${pathMarkup}</svg>`
  const backgroundImage = `url("data:image/svg+xml;base64,${toBase64(svg)}")`

  return (
    <View
      className={`cx-icon ${className}`}
      style={{
        width: `${resolvedSize}rpx`,
        height: `${resolvedSize}rpx`,
        backgroundImage,
        backgroundRepeat: 'no-repeat',
        backgroundSize: '100% 100%'
      }}
    />
  )
}