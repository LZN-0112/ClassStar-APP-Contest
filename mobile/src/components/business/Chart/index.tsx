// ============================================================
// Chart 轻量图表组件（自定义 SVG 绘制，无第三方依赖）
// 用途：bar 柱状 / line 折线 / pie 饼图
// 依据方案决策：用 SVG 自绘，避免引入 echarts-for-weixin（不兼容 Taro React）
// ============================================================
import { View, Text } from '@tarojs/components'

import './index.scss'

export interface BarLineChartOption {
  labels: string[]
  series: { name: string; data: number[]; color?: string }[]
}

export interface PieChartOption {
  data: { name: string; value: number; color?: string }[]
}

export type ChartOption = BarLineChartOption | PieChartOption

interface ChartProps {
  /** 图表类型 */
  type?: 'bar' | 'line' | 'pie'
  /** 图表数据 */
  option: ChartOption
  /** 高度（rpx） */
  height?: number
}

const CHART_COLORS = ['#0062ff', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#10b981']

export default function Chart({ type = 'bar', option, height = 320 }: ChartProps) {
  if (type === 'pie') {
    return <PieChart option={option as PieChartOption} />
  }
  return <BarLineChart type={type} option={option as BarLineChartOption} height={height} />
}

// ---------- 柱状/折线 ----------
const CW = 300
const CH = 200
const PAD_L = 28
const PAD_B = 24
const PAD_T = 12

function BarLineChart({
  type,
  option,
  height
}: {
  type: 'bar' | 'line'
  option: BarLineChartOption
  height: number
}) {
  const { labels, series } = option
  const maxV = Math.max(
    1,
    ...series.flatMap((s) => s.data),
    1
  )
  const n = labels.length
  const innerW = CW - PAD_L - 8
  const innerH = CH - PAD_T - PAD_B
  const step = n > 1 ? innerW / n : innerW
  const y = (v: number) => PAD_T + innerH * (1 - v / maxV)

  // 网格线
  const grid = Array.from({ length: 5 }).map((_, i) => {
    const yy = PAD_T + (innerH * i) / 4
    return { yy, v: maxV * (1 - i / 4) }
  })

  return (
    <View className='cx-chart' style={{ height: `${height}rpx` }}>
      <View className='cx-chart__legend'>
        {series.map((s, i) => (
          <View className='cx-chart__legend-item' key={i}>
            <View
              className='cx-chart__legend-dot'
              style={{ backgroundColor: s.color || CHART_COLORS[i % CHART_COLORS.length] }}
            />
            <Text className='cx-chart__legend-text'>{s.name}</Text>
          </View>
        ))}
      </View>
      <svg width='100%' height='200' viewBox={`0 0 ${CW} ${CH}`} preserveAspectRatio='none'>
        {grid.map((g, i) => (
          <line
            key={i}
            x1={PAD_L}
            y1={g.yy}
            x2={CW - 4}
            y2={g.yy}
            stroke='#e5e7eb'
            strokeWidth='1'
          />
        ))}
        {labels.map((_, i) => {
          const cx = PAD_L + step * i + (n > 1 ? step / 2 : innerW / 2)
          if (type === 'bar') {
            return series.map((s, si) => {
              const bw = (step / series.length) * 0.6
              const bx = cx - (step / 2) + (si * step) / series.length + (step / series.length - bw) / 2
              const v = s.data[i] || 0
              const bh = innerH * (v / maxV)
              const color = s.color || CHART_COLORS[si % CHART_COLORS.length]
              return <rect key={`${i}-${si}`} x={bx} y={y(v)} width={bw} height={bh} rx='2' fill={color} />
            })
          }
          return null
        })}
        {type === 'line' && n > 0
          ? series.map((s, si) => {
              const color = s.color || CHART_COLORS[si % CHART_COLORS.length]
              const pts = labels
                .map((_, i) => {
                  const cx = PAD_L + step * i + (n > 1 ? step / 2 : innerW / 2)
                  return `${cx},${y(s.data[i] || 0)}`
                })
                .join(' ')
              return <polyline key={si} points={pts} fill='none' stroke={color} strokeWidth='2' strokeLinejoin='round' strokeLinecap='round' />
            })
          : null}
      </svg>
      <View className='cx-chart__xaxis'>
        {labels.map((l, i) => (
          <Text className='cx-chart__xaxis-label' key={i}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  )
}

// ---------- 饼图 ----------
function PieChart({ option }: { option: PieChartOption }) {
  const total = option.data.reduce((sum, d) => sum + d.value, 0) || 1
  let acc = 0
  const R = 80
  const C = 2 * Math.PI * R

  return (
    <View className='cx-chart cx-chart__pie'>
      <svg width='180' height='180' viewBox='0 0 200 200'>
        <g transform='rotate(-90 100 100)'>
          {option.data.map((d, i) => {
            const frac = d.value / total
            const offset = acc * C
            acc += frac
            const color = d.color || CHART_COLORS[i % CHART_COLORS.length]
            return (
              <circle
                key={i}
                cx='100'
                cy='100'
                r={R}
                fill='none'
                stroke={color}
                strokeWidth='30'
                strokeDasharray={`${frac * C} ${C}`}
                strokeDashoffset={-offset}
              />
            )
          })}
        </g>
      </svg>
      <View className='cx-chart__legend'>
        {option.data.map((d, i) => (
          <View className='cx-chart__legend-item' key={i}>
            <View
              className='cx-chart__legend-dot'
              style={{ backgroundColor: d.color || CHART_COLORS[i % CHART_COLORS.length] }}
            />
            <Text className='cx-chart__legend-text'>
              {d.name} {d.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}