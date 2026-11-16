// ============================================================
// PageHeader 二级页折叠封面头
// 1:1 对齐 front/src/components/layout/UnifiedHeader.tsx
// 封面 200px（400rpx），滚动时上移淡出，顶栏渐变为白底深色
// ============================================================
import type { CSSProperties, ReactNode } from 'react'
import { useRef, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { usePageScroll } from '@tarojs/taro'

import Icon from '@/components/ui/Icon'
import type { IconName } from '@/constants/icons'
import StatusBar from '../StatusBar'
import './index.scss'

/** 折叠后顶栏高度（px，同 App BAR_H） */
const BAR_H = 56

function clamp01(value: number) {
  return value < 0 ? 0 : value > 1 ? 1 : value
}

interface PageHeaderProps {
  /** 封面大标题 */
  title: string
  /** 封面副标题 */
  subtitle?: string
  /** 封面渐变：a 品牌蓝 / b 天蓝（同 App） */
  variant?: 'a' | 'b'
  /** 是否显示返回按钮，默认 true */
  showBack?: boolean
  /** 返回回调（默认返回上一页，无上级时回首页） */
  onBack?: () => void
  /** 顶栏右侧操作区（滚动时淡出） */
  right?: ReactNode
  /** 封面右下角装饰图标 */
  decor?: IconName
  /** 封面高度（px），默认 200；设置页为 220 */
  coverHeight?: number
  /** 封面标题字号（rpx），默认 56 */
  titleSize?: number
  /** 顶栏补实底色，默认白色（PageLayout 内容白底） */
  barBg?: string
  /** 自定义类名 */
  className?: string
}

export default function PageHeader({
  title,
  subtitle,
  variant = 'a',
  showBack = true,
  onBack,
  right,
  decor,
  coverHeight = 200,
  titleSize = 56,
  barBg = '#FFFFFF',
  className = ''
}: PageHeaderProps) {
  const [progress, setProgress] = useState(0)
  const [darkInk, setDarkInk] = useState(false)
  const progressRef = useRef(0)
  const darkInkRef = useRef(false)

  usePageScroll((event) => {
    const p = clamp01(event.scrollTop / Math.max(coverHeight - BAR_H, 1))
    if (Math.abs(p - progressRef.current) >= 0.004) {
      progressRef.current = p
      setProgress(p)
    }
    const nextDark = darkInkRef.current ? p > 0.38 : p > 0.5
    if (nextDark !== darkInkRef.current) {
      darkInkRef.current = nextDark
      setDarkInk(nextDark)
    }
  })

  const titleAlpha = clamp01((progress - 0.15) / 0.45)
  const solidAlpha = clamp01((progress - 0.55) / 0.2)
  const blurred = progress > 0.2

  const handleBack = () => {
    if (onBack) {
      onBack()
      return
    }
    if (Taro.getCurrentPages().length > 1) Taro.navigateBack()
    else Taro.reLaunch({ url: '/pages/home/index' })
  }

  const bgStyle: CSSProperties = {
    backgroundColor: `rgba(255, 255, 255, ${progress.toFixed(3)})`,
    backdropFilter: blurred ? 'saturate(160%) blur(14px)' : 'none',
    WebkitBackdropFilter: blurred ? 'saturate(160%) blur(14px)' : 'none'
  }

  const coverStyle: CSSProperties = {
    transform: `translate3d(0, ${(-progress * 28).toFixed(1)}px, 0) scale(${(
      1 - progress * 0.03
    ).toFixed(3)})`,
    opacity: 1 - progress * 0.12
  }

  return (
    <View className={`cx-page-header ${className}`}>
      {/* 固定顶栏 */}
      <View className='cx-page-header__bar'>
        <View className='cx-page-header__bar-bg' style={bgStyle} />
        <View
          className='cx-page-header__bar-solid'
          style={{ backgroundColor: `rgba(255, 255, 255, ${solidAlpha.toFixed(3)})` }}
        />
        <View
          className='cx-page-header__bar-shadow'
          style={{ opacity: progress }}
        />
        <StatusBar light={!darkInk} />
        <View className='cx-page-header__bar-row'>
          {showBack ? (
            <View
              className={`cx-page-header__back ${
                darkInk ? 'cx-page-header__back--dark' : ''
              }`}
              onClick={handleBack}
            >
              <Icon
                name='chevron-left'
                size={48}
                color={darkInk ? '#1A1F2C' : '#FFFFFF'}
                strokeWidth={2}
              />
            </View>
          ) : (
            <View className='cx-page-header__side' />
          )}
          <Text
            className='cx-page-header__bar-title'
            style={{ opacity: titleAlpha }}
          >
            {title}
          </Text>
          <View
            className='cx-page-header__right'
            style={{ opacity: 1 - progress }}
          >
            {right}
          </View>
        </View>
      </View>

      {/* 渐变封面 */}
      <View
        className={`cx-page-header__cover cx-page-header__cover--${variant}`}
        style={{ ...coverStyle, height: `${coverHeight * 2}rpx` }}
      >
        <View className='cx-page-header__circle cx-page-header__circle--lg' />
        <View className='cx-page-header__circle cx-page-header__circle--md' />
        <View className='cx-page-header__circle cx-page-header__circle--sm' />
        <View className='cx-page-header__shade' />
        {decor ? (
          <View className='cx-page-header__decor'>
            <Icon name={decor} size={240} color='#FFFFFF' strokeWidth={2} />
          </View>
        ) : null}
        <View className='cx-page-header__cover-title'>
          <Text
            className='cx-page-header__heading'
            style={{ fontSize: `${titleSize}rpx` }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text className='cx-page-header__subtitle'>{subtitle}</Text>
          ) : null}
        </View>
      </View>

      {/* 流内占位：正文从封面下方开始 */}
      <View
        className='cx-page-header__spacer'
        style={{ height: `${coverHeight * 2}rpx`, backgroundColor: barBg }}
      />
    </View>
  )
}