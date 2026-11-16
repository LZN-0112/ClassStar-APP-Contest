import { useEffect, useMemo, useState } from 'react'
import { Canvas, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import qrcode from 'qrcode-generator'

import './method.scss'

interface Props {
  value: string
  /** 二维码边长（rpx），默认 336rpx（= 168px，与 App 的 QRCodeSVG size 168 一致） */
  size?: number
}

/**
 * 小程序端二维码：App 使用 qrcode.react 输出 SVG，小程序禁用内联 SVG，
 * 因此改用 qrcode-generator 生成矩阵，再用 Canvas 绘制。
 * 纠错级别 H、四周留 1 个模块白边，与 App 参数保持一致。
 */
export default function QrCodeView({ value, size = 336 }: Props) {
  const canvasId = useMemo(() => `attqr${Math.random().toString(36).slice(2, 10)}`, [])
  const [canvasSize, setCanvasSize] = useState(0)

  useEffect(() => {
    const info = Taro.getSystemInfoSync()
    const px = Math.round(((info.windowWidth || 375) * size) / 750)
    setCanvasSize(px)
  }, [size])

  useEffect(() => {
    if (!value || canvasSize <= 0) return
    let cancelled = false
    const timer = setTimeout(() => {
      if (cancelled) return
      try {
        const qr = qrcode(0, 'H')
        qr.addData(value)
        qr.make()
        const count = qr.getModuleCount()
        const margin = 1
        const moduleSize = canvasSize / (count + margin * 2)
        const ctx = Taro.createCanvasContext(canvasId)
        ctx.setFillStyle('#FFFFFF')
        ctx.fillRect(0, 0, canvasSize, canvasSize)
        ctx.setFillStyle('#000000')
        for (let r = 0; r < count; r += 1) {
          for (let c = 0; c < count; c += 1) {
            if (qr.isDark(r, c)) {
              ctx.fillRect(
                (c + margin) * moduleSize,
                (r + margin) * moduleSize,
                moduleSize,
                moduleSize
              )
            }
          }
        }
        ctx.draw()
      } catch {
        // 二维码生成失败时保持白底，不影响页面其它操作
      }
    }, 60)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [canvasId, canvasSize, value])

  return (
    <View className='attmethod__qr' style={{ width: `${size}rpx`, height: `${size}rpx` }}>
      <Canvas
        canvasId={canvasId}
        id={canvasId}
        className='attmethod__qr-canvas'
        style={{ width: `${size}rpx`, height: `${size}rpx` }}
      />
    </View>
  )
}