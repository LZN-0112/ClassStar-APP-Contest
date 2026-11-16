// ============================================================
// 数据看板：严格对齐 front/src/pages/data/DataDashboard.tsx
// 设计稿 375px → 小程序 750rpx（1px = 2rpx）
// 折线图用分段 View + clip-path 面积等价实现，不使用 SVG / Canvas
// ============================================================
import { useEffect, useMemo, useState } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { request } from '@/services'
import { useUserStore } from '@/stores'
import { Icon } from '@/components/ui'
import { BottomNav, StatusBar } from '@/components/business'
import type { IconName } from '@/constants/icons'
import './index.scss'

// ---------- 类型（与 App DashboardData 一致） ----------
type RangeDays = 7 | 14 | 30
type TrendKey = 'attendance' | 'homework' | 'activity' | 'fee'

interface RatePoint {
  date: string
  value: number | null
}

interface FeePoint {
  date: string
  value: { income: number; expense: number }
}

interface RankingItem {
  userId: string
  name: string
  role: string
  rank: number
  score: number | null
  attendanceRate: number | null
  homeworkRate: number | null
  activityRate: number | null
  attendanceCount: number
  homeworkCount: number
  activityCount: number
}

interface DashboardData {
  range: number
  period: { startTime: string; endTime: string }
  memberCount: number
  metrics: {
    attendance: { rate: number; present: number; expected: number; sessions: number }
    homework: { rate: number; submitted: number; expected: number; totalHomeworks: number }
    activity: { rate: number; participated: number; expected: number; totalActivities: number }
    fee: { income: number; expense: number; balance: number }
  }
  previous: {
    attendanceRate: number | null
    homeworkSubmitRate: number | null
    activityParticipationRate: number | null
  }
  trends: {
    attendance: RatePoint[]
    homework: RatePoint[]
    activity: RatePoint[]
    fee: FeePoint[]
  }
  memberRanking: {
    total: number
    items: RankingItem[]
    me: RankingItem | null
  }
}

interface StatusChip {
  text: string
  color: string
  bg: string
}

const ACCENT = '#0062FF'

/** 图表绘图区高度（150px）与横向宽度（670rpx 卡片内宽扣除轴标签与间距） */
const CHART_H = 300
const CHART_BASE_Y = (94 / 100) * CHART_H

const RANGE_OPTIONS: { value: RangeDays; label: string }[] = [
  { value: 7, label: '近7天' },
  { value: 14, label: '近14天' },
  { value: 30, label: '近30天' }
]

const TREND_TABS: { key: TrendKey; label: string }[] = [
  { key: 'attendance', label: '出勤率' },
  { key: 'homework', label: '作业提交' },
  { key: 'activity', label: '活动参与' },
  { key: 'fee', label: '班费收支' }
]

const RATE_TREND_META: Record<
  'attendance' | 'homework' | 'activity',
  { color: string; name: string; empty: string }
> = {
  attendance: { color: ACCENT, name: '出勤率', empty: '该周期内暂无签到数据' },
  homework: { color: '#F97316', name: '提交率', empty: '该周期内暂无作业数据' },
  activity: { color: '#7C3AED', name: '参与率', empty: '该周期内暂无活动数据' }
}

const HELP_ROWS: { title: string; desc: string }[] = [
  {
    title: '考勤签到率',
    desc: '统计周期内实到人次 ÷ 应到人次（每次签到 × 班级人数），迟到计入实到。'
  },
  {
    title: '作业提交率',
    desc: '统计周期内已提交份数 ÷ 应交份数（每份作业 × 班级人数），支持补交。'
  },
  {
    title: '活动参与率',
    desc: '统计周期内活动报名人数 ÷ 应报名人数（活动场次 × 班级人数）。'
  },
  {
    title: '班费结余',
    desc: '全部收入减去全部支出，为累计值，不受统计周期影响。'
  },
  {
    title: '综合评分',
    desc: '考勤 40% + 作业 35% + 活动 25%；没有数据的指标不计入权重。'
  },
  {
    title: '成员排行',
    desc: '按成员个人的考勤 40% + 作业 35% + 活动 25% 计算综合分并排序，仅统计当前周期。'
  }
]

const RANK_BADGE = [
  { bg: '#FEF3C7', color: '#B45309' },
  { bg: '#E2E8F0', color: '#475569' },
  { bg: '#FDE68A', color: '#92400E' }
]

const AVATAR_COLORS = ['#0062FF', '#7C3AED', '#F97316', '#2F9E86', '#DB2777', '#0891B2']

type InsightTone = 'good' | 'warn' | 'info'

interface Insight {
  tone: InsightTone
  title: string
  desc: string
}

const TONE_META: Record<InsightTone, { color: string; bg: string; icon: IconName }> = {
  good: { color: '#16A34A', bg: '#DCFCE7', icon: 'sparkles' },
  warn: { color: '#B45309', bg: '#FEF3C7', icon: 'alert-triangle' },
  info: { color: ACCENT, bg: '#EDF1FD', icon: 'info' }
}

// ---------- 格式化 ----------
function formatPercent(value: number) {
  const rounded = Math.round(value * 10) / 10
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}%`
}

function formatMoney(value: number) {
  const n = Number(value || 0)
  const fixed = Math.round(Math.abs(n) * 100) / 100
  const [intPart, decPart] = String(fixed).split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${n < 0 ? '-' : ''}${grouped}${decPart ? `.${decPart}` : ''}`
}

function shortDate(iso: string) {
  return iso.slice(5)
}

function rateStatus(rate: number, hasData: boolean): StatusChip {
  if (!hasData) return { text: '暂无数据', color: '#94A3B8', bg: '#F1F5F9' }
  if (rate >= 90) return { text: '优秀', color: '#16A34A', bg: '#DCFCE7' }
  if (rate >= 75) return { text: '良好', color: '#1565D8', bg: '#E8F0FF' }
  if (rate >= 60) return { text: '一般', color: '#B45309', bg: '#FEF3C7' }
  return { text: '需关注', color: '#DC2626', bg: '#FEE2E2' }
}

function gradeOf(score: number) {
  if (score >= 90) return { text: '表现优秀', color: '#16A34A' }
  if (score >= 80) return { text: '整体良好', color: ACCENT }
  if (score >= 70) return { text: '基本合格', color: '#B45309' }
  return { text: '需要提升', color: '#DC2626' }
}

function deltaText(delta: number) {
  const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '→'
  return `较上期 ${arrow}${Math.abs(delta).toFixed(1)}%`
}

// ---------- 指标卡 ----------
interface MetricCardProps {
  icon: IconName
  label: string
  value: string
  detail: string
  progress?: number
  status: StatusChip
  delta?: number | null
  accent: string
  onOpen: () => void
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  progress,
  status,
  delta,
  accent,
  onOpen
}: MetricCardProps) {
  return (
    <View className='dash__metric' onClick={onOpen}>
      <View className='dash__metric-head'>
        <View className='dash__metric-icon' style={{ backgroundColor: `${accent}14` }}>
          <Icon name={icon} size={32} color={accent} strokeWidth={2} />
        </View>
        <Text
          className='dash__metric-status'
          style={{ color: status.color, backgroundColor: status.bg }}
        >
          {status.text}
        </Text>
      </View>

      <View>
        <Text className='dash__metric-label'>{label}</Text>
        <Text className='dash__metric-value'>{value}</Text>
      </View>

      {typeof progress === 'number' ? (
        <View className='dash__metric-progress'>
          <View
            className='dash__metric-progress-fill'
            style={{
              width: `${Math.min(Math.max(progress, 0), 100)}%`,
              backgroundColor: accent
            }}
          />
        </View>
      ) : null}

      <Text className='dash__metric-detail'>{detail}</Text>

      <View className='dash__metric-foot'>
        {delta === undefined ? (
          <Text className='dash__metric-delta dash__metric-delta--muted'>累计值</Text>
        ) : delta === null ? (
          <Text className='dash__metric-delta dash__metric-delta--muted'>暂无上期数据</Text>
        ) : (
          <View
            className={`dash__metric-delta ${
              delta >= 0 ? 'dash__metric-delta--up' : 'dash__metric-delta--down'
            }`}
          >
            <Icon
              name={delta >= 0 ? 'arrow-up-right' : 'arrow-down-right'}
              size={24}
              color={delta >= 0 ? '#16A34A' : '#DC2626'}
              strokeWidth={2}
            />
            <Text>{deltaText(delta)}</Text>
          </View>
        )}
        <View className='dash__metric-more' style={{ color: accent }}>
          <Text>明细</Text>
          <Icon name='chevron-right' size={24} color={accent} strokeWidth={2} />
        </View>
      </View>
    </View>
  )
}

// ---------- 趋势图 ----------
interface ChartSeries {
  name: string
  color: string
  values: (number | null)[]
  suffix: string
}

interface TrendChartProps {
  labels: string[]
  series: ChartSeries[]
  scaleMax: number
  axisLabels: [string, string, string]
  axisWidth: number
  hasData: boolean
  emptyText: string
}

function TrendChart({
  labels,
  series,
  scaleMax,
  axisLabels,
  axisWidth,
  hasData,
  emptyText
}: TrendChartProps) {
  const [active, setActive] = useState<number | null>(null)
  const total = labels.length
  /** 卡片内宽 606rpx = 轴标签 + 12rpx 间距 + 绘图区 */
  const plotW = 606 - 12 - axisWidth

  const xFor = (index: number) => (total > 1 ? 2 + (index / (total - 1)) * 96 : 50)
  const yFor = (value: number) =>
    6 + (1 - Math.min(Math.max(value, 0), scaleMax) / scaleMax) * 88

  if (total === 0 || !hasData) {
    return (
      <View className='dash__chart-empty'>
        <Icon name='bar-chart' size={56} color='#CBD5E1' strokeWidth={1.6} />
        <Text className='dash__chart-empty-text'>{emptyText}</Text>
      </View>
    )
  }

  const areas: {
    key: string
    left: number
    top: number
    width: number
    height: number
    clip: string
    color: string
  }[] = []
  const segments: {
    key: string
    left: number
    top: number
    width: number
    angle: number
    color: string
  }[] = []
  const dots: { key: string; left: number; top: number; color: string }[] = []

  series.forEach((item) => {
    item.values.forEach((value, index) => {
      if (value === null) return
      dots.push({
        key: `d-${item.name}-${index}`,
        left: xFor(index),
        top: yFor(value),
        color: item.color
      })
    })

    for (let i = 0; i < item.values.length - 1; i += 1) {
      const current = item.values[i]
      const next = item.values[i + 1]
      if (current === null || next === null) continue

      const x1 = (xFor(i) / 100) * plotW
      const x2 = (xFor(i + 1) / 100) * plotW
      const y1 = (yFor(current) / 100) * CHART_H
      const y2 = (yFor(next) / 100) * CHART_H
      const topY = Math.min(y1, y2)
      const areaH = Math.max(CHART_BASE_Y - topY, 0.5)
      const p1 = ((y1 - topY) / areaH) * 100
      const p2 = ((y2 - topY) / areaH) * 100

      areas.push({
        key: `a-${item.name}-${i}`,
        left: x1,
        top: topY,
        width: Math.max(x2 - x1, 0.5),
        height: areaH,
        clip: `polygon(0 ${p1}%, 100% ${p2}%, 100% 100%, 0 100%)`,
        color: item.color
      })

      const dx = x2 - x1
      const dy = y2 - y1
      segments.push({
        key: `l-${item.name}-${i}`,
        left: x1,
        top: y1 - 2,
        width: Math.sqrt(dx * dx + dy * dy),
        angle: (Math.atan2(dy, dx) * 180) / Math.PI,
        color: item.color
      })
    }
  })

  const activeLabel = active !== null ? labels[active] : null
  const activeX = active !== null ? xFor(active) : 0
  const activeValue =
    active !== null
      ? series.reduce<number | null>((found, item) => {
          if (found !== null) return found
          return item.values[active] ?? null
        }, null)
      : null
  const activeY = activeValue !== null ? yFor(activeValue) : 50
  const step = Math.max(1, Math.ceil(total / 4))

  return (
    <View className='dash__chart'>
      <View className='dash__chart-axis' style={{ width: `${axisWidth}rpx` }}>
        <Text>{axisLabels[0]}</Text>
        <Text>{axisLabels[1]}</Text>
        <Text>{axisLabels[2]}</Text>
      </View>

      <View className='dash__chart-main'>
        <View className='dash__chart-plot'>
          <View className='dash__grid'>
            {[0, 1, 2].map((i) => (
              <View key={i} className='dash__grid-line' />
            ))}
          </View>

          {areas.map((item) => (
            <View
              key={item.key}
              className='dash__area'
              style={{
                left: `${item.left}rpx`,
                top: `${item.top}rpx`,
                width: `${item.width}rpx`,
                height: `${item.height}rpx`,
                clipPath: item.clip,
                backgroundColor: item.color
              }}
            />
          ))}

          {segments.map((item) => (
            <View
              key={item.key}
              className='dash__seg'
              style={{
                left: `${item.left}rpx`,
                top: `${item.top}rpx`,
                width: `${item.width}rpx`,
                transform: `rotate(${item.angle}deg)`,
                backgroundColor: item.color
              }}
            />
          ))}

          {active !== null ? (
            <View className='dash__guide' style={{ left: `${activeX}%` }} />
          ) : null}

          {dots.map((item) => (
            <View
              key={item.key}
              className='dash__dot'
              style={{
                left: `${item.left}%`,
                top: `${item.top}%`,
                backgroundColor: item.color
              }}
            />
          ))}

          <View className='dash__hits'>
            {labels.map((label, index) => (
              <View
                key={`${label}-${index}`}
                className='dash__hit'
                onClick={() => setActive(active === index ? null : index)}
              />
            ))}
          </View>

          {active !== null && activeLabel ? (
            <View
              className='dash__tooltip'
              style={{
                left: `${Math.min(Math.max(activeX, 16), 84)}%`,
                top: `${activeY}%`,
                transform: `translate(-50%, ${
                  activeY > 30 ? 'calc(-100% - 16rpx)' : '16rpx'
                })`
              }}
            >
              <Text className='dash__tooltip-date'>{shortDate(activeLabel)}</Text>
              {series.map((item) => {
                const value = item.values[active]
                return (
                  <View key={item.name} className='dash__tooltip-row'>
                    <View
                      className='dash__tooltip-dot'
                      style={{ backgroundColor: item.color }}
                    />
                    <Text>
                      {value === null
                        ? '无数据'
                        : item.suffix === '%'
                          ? formatPercent(value)
                          : `¥${formatMoney(value)}`}
                    </Text>
                  </View>
                )
              })}
            </View>
          ) : null}
        </View>

        <View className='dash__xlabels'>
          {labels.map((label, index) => {
            if (index % step !== 0 && index !== total - 1) return null
            return (
              <Text
                key={`${label}-${index}`}
                className='dash__xlabel'
                style={{
                  left: `${xFor(index)}%`,
                  transform:
                    index === 0
                      ? 'translateX(0)'
                      : index === total - 1
                        ? 'translateX(-100%)'
                        : 'translateX(-50%)'
                }}
              >
                {shortDate(label)}
              </Text>
            )
          })}
        </View>
      </View>
    </View>
  )
}

// ---------- 排行榜行 ----------
function RankingRow({ item, isMe }: { item: RankingItem; isMe: boolean }) {
  const badge =
    item.rank <= 3 ? RANK_BADGE[item.rank - 1] : { bg: '#F1F5F9', color: '#94A3B8' }
  const avatarColor =
    AVATAR_COLORS[(item.name.charCodeAt(0) + item.name.length) % AVATAR_COLORS.length]

  return (
    <View className={`dash__rank-row ${isMe ? 'dash__rank-row--me' : ''}`}>
      <View
        className='dash__rank-badge'
        style={{ backgroundColor: badge.bg, color: badge.color }}
      >
        <Text>{item.rank}</Text>
      </View>
      <View
        className='dash__rank-avatar'
        style={{ backgroundColor: avatarColor }}
      >
        <Text>{item.name.slice(0, 1)}</Text>
      </View>
      <View className='dash__rank-body'>
        <View className='dash__rank-line'>
          <Text className='dash__rank-name'>{item.name}</Text>
          {isMe ? <Text className='dash__rank-me'>我</Text> : null}
          {item.role && item.role !== '学生' ? (
            <Text className='dash__rank-role'>{item.role}</Text>
          ) : null}
        </View>
        <View className='dash__rank-meta'>
          <Text>出勤 {item.attendanceRate === null ? '—' : formatPercent(item.attendanceRate)}</Text>
          <Text>作业 {item.homeworkRate === null ? '—' : formatPercent(item.homeworkRate)}</Text>
          <Text>活动 {item.activityRate === null ? '—' : formatPercent(item.activityRate)}</Text>
        </View>
      </View>
      <View className='dash__rank-score'>
        <Text className='dash__rank-score-value'>{item.score ?? '--'}</Text>
        <Text className='dash__rank-score-label'>综合分</Text>
      </View>
    </View>
  )
}

// ---------- 页面 ----------
export default function DataPage() {
  const userInfo = useUserStore((state) => state.userInfo)
  const currentClassId = useUserStore((state) => state.currentClassId)

  const [range, setRange] = useState<RangeDays>(30)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const [trendKey, setTrendKey] = useState<TrendKey>('attendance')
  const [helpOpen, setHelpOpen] = useState(false)

  useEffect(() => {
    if (!currentClassId) {
      setData(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    request
      .get<DashboardData>('/data/dashboard', { classId: currentClassId, range })
      .then((res) => {
        if (cancelled) return
        setData(res)
      })
      .catch(() => {
        // 已有数据时保留旧数据，避免切换周期整块闪白
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [currentClassId, range, reloadKey])

  const summary = useMemo(() => {
    if (!data) return null
    const { attendance, homework, activity } = data.metrics

    const parts: { rate: number; weight: number }[] = []
    if (attendance.expected > 0) parts.push({ rate: attendance.rate, weight: 0.4 })
    if (homework.expected > 0) parts.push({ rate: homework.rate, weight: 0.35 })
    if (activity.expected > 0) parts.push({ rate: activity.rate, weight: 0.25 })

    const weightSum = parts.reduce((sum, item) => sum + item.weight, 0)
    const score =
      weightSum > 0
        ? Math.round(parts.reduce((sum, item) => sum + item.rate * item.weight, 0) / weightSum)
        : null

    const prevParts: number[] = []
    if (attendance.expected > 0 && data.previous.attendanceRate !== null) {
      prevParts.push(data.previous.attendanceRate)
    }
    if (homework.expected > 0 && data.previous.homeworkSubmitRate !== null) {
      prevParts.push(data.previous.homeworkSubmitRate)
    }
    if (activity.expected > 0 && data.previous.activityParticipationRate !== null) {
      prevParts.push(data.previous.activityParticipationRate)
    }
    const prevScore =
      prevParts.length > 0
        ? Math.round(prevParts.reduce((sum, value) => sum + value, 0) / prevParts.length)
        : null

    return {
      score,
      prevScore,
      grade: score !== null ? gradeOf(score) : { text: '暂无数据', color: '#94A3B8' },
      scoreDelta: score !== null && prevScore !== null ? score - prevScore : null
    }
  }, [data])

  const rankingPreview = useMemo(() => {
    if (!data) return { items: [] as RankingItem[], me: null as RankingItem | null }
    const items = data.memberRanking.items.filter((item) => (item.score ?? 0) > 0)
    const me =
      data.memberRanking.me && (data.memberRanking.me.score ?? 0) > 0
        ? data.memberRanking.me
        : null
    return { items, me }
  }, [data])

  const insights = useMemo(() => {
    if (!data) return [] as Insight[]
    const list: Insight[] = []

    const attendanceValues = data.trends.attendance
      .map((point) => point.value)
      .filter((value): value is number => value !== null)
    if (attendanceValues.length > 0) {
      const low = attendanceValues.filter((value) => value < 80)
      if (low.length > 0) {
        list.push({
          tone: 'warn',
          title: `${low.length} 天出勤率低于 80%`,
          desc: `最低 ${formatPercent(Math.min(...low))}，建议在班级群提醒按时签到。`
        })
      } else {
        const average =
          attendanceValues.reduce((sum, value) => sum + value, 0) / attendanceValues.length
        list.push({
          tone: 'good',
          title: '出勤表现稳定',
          desc: `近 ${data.range} 天平均出勤率 ${formatPercent(average)}。`
        })
      }
    }

    const homeworkValues = data.trends.homework
      .map((point) => point.value)
      .filter((value): value is number => value !== null)
    if (homeworkValues.length > 0) {
      const low = homeworkValues.filter((value) => value < 80)
      if (low.length > 0) {
        list.push({
          tone: 'warn',
          title: `${low.length} 天作业提交率不足`,
          desc: `当前周期提交率 ${formatPercent(data.metrics.homework.rate)}，可提醒未交同学补交。`
        })
      } else {
        list.push({
          tone: 'good',
          title: '作业提交情况良好',
          desc: `当前周期提交率 ${formatPercent(data.metrics.homework.rate)}。`
        })
      }
    }

    const fee = data.metrics.fee
    if (fee.balance < 0) {
      list.push({
        tone: 'warn',
        title: '班费已经超支',
        desc: `当前结余 -¥${formatMoney(Math.abs(fee.balance))}，建议暂停非必要支出。`
      })
    } else {
      list.push({
        tone: fee.expense > fee.income ? 'warn' : 'info',
        title: '班费收支',
        desc: `近 ${data.range} 天收入 ¥${formatMoney(fee.income)}，支出 ¥${formatMoney(fee.expense)}，结余 ¥${formatMoney(fee.balance)}。`
      })
    }

    if (data.metrics.activity.totalActivities > 0) {
      list.push({
        tone: 'info',
        title: `举办 ${data.metrics.activity.totalActivities} 场活动`,
        desc: `平均参与率 ${formatPercent(data.metrics.activity.rate)}。`
      })
    } else {
      list.push({
        tone: 'info',
        title: '暂无活动数据',
        desc: '发布并组织活动后，这里会展示参与情况。'
      })
    }

    return list.slice(0, 4)
  }, [data])

  const trendConfig = useMemo(() => {
    if (!data) return null
    if (trendKey === 'fee') {
      const points = data.trends.fee
      const labels = points.map((point) => point.date)
      const income = points.map((point) => Number(point.value?.income || 0))
      const expense = points.map((point) => Number(point.value?.expense || 0))
      const maxValue = Math.max(...income, ...expense, 1)
      const incomeTotal = income.reduce((sum, value) => sum + value, 0)
      const expenseTotal = expense.reduce((sum, value) => sum + value, 0)
      return {
        labels,
        series: [
          { name: '收入', color: '#2F9E86', values: income, suffix: '元' },
          { name: '支出', color: '#EF4444', values: expense, suffix: '元' }
        ] as ChartSeries[],
        scaleMax: maxValue,
        axisLabels: [
          `¥${formatMoney(maxValue)}`,
          `¥${formatMoney(Math.round(maxValue / 2))}`,
          '¥0'
        ] as [string, string, string],
        axisWidth: 72,
        hasData: incomeTotal > 0 || expenseTotal > 0,
        emptyText: '该周期内暂无班费收支记录',
        summary: `收入 ¥${formatMoney(incomeTotal)} · 支出 ¥${formatMoney(expenseTotal)}`
      }
    }

    const points = data.trends[trendKey]
    const labels = points.map((point) => point.date)
    const values = points.map((point) => point.value)
    const valid = values.filter((value): value is number => value !== null)
    const average =
      valid.length > 0 ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0
    const meta = RATE_TREND_META[trendKey]
    return {
      labels,
      series: [
        {
          name: meta.name,
          color: meta.color,
          values,
          suffix: '%'
        }
      ] as ChartSeries[],
      scaleMax: 100,
      axisLabels: ['100%', '50%', '0%'] as [string, string, string],
      axisWidth: 48,
      hasData: valid.length > 0,
      emptyText: meta.empty,
      summary:
        valid.length > 0
          ? `平均 ${formatPercent(average)} · 最高 ${formatPercent(Math.max(...valid))} · 最低 ${formatPercent(Math.min(...valid))}`
          : '暂无数据'
    }
  }, [data, trendKey])

  const rangeLabel = RANGE_OPTIONS.find((option) => option.value === range)?.label ?? ''
  const coverSubtitle =
    [rangeLabel, userInfo?.className].filter(Boolean).join(' · ') || '班级数据一目了然'

  const go = (url: string) => {
    Taro.navigateTo({ url })
  }

  const score = summary?.score ?? null
  const ringDeg = score === null ? 0 : Math.min(Math.max(score, 0), 100) * 3.6
  const ringColor = summary?.grade.color ?? '#94A3B8'

  return (
    <View className='dash'>
      {/* 蓝色封面 + 标题栏（StatusBar 在深色头部内部） */}
      <View className='dash__cover'>
        <View className='dash__circle' />
        <View className='dash__cover-trend'>
          <Icon name='trending-up' size={208} color='rgba(255,255,255,0.22)' strokeWidth={1.5} />
        </View>
        <View className='dash__cover-shade' />

        <View className='dash__cover-inner'>
          <StatusBar light />

          <View className='dash__topbar'>
            <View className='dash__help press-opacity' onClick={() => setHelpOpen(true)}>
              <Icon name='help-circle' size={28} color='#ffffff' strokeWidth={2} />
              <Text className='dash__help-text'>指标说明</Text>
            </View>
          </View>

          <View className='dash__cover-title'>
            <Text className='dash__cover-h1'>数据看板</Text>
            <Text className='dash__cover-sub'>{coverSubtitle}</Text>
          </View>
        </View>
      </View>

      <View className='dash__main'>
        {!currentClassId ? (
          <View className='dash__state dash__state--class'>
            <View className='dash__state-icon dash__state-icon--accent'>
              <Icon name='school' size={64} color={ACCENT} strokeWidth={1.6} />
            </View>
            <Text className='dash__state-title'>还没有加入班级</Text>
            <Text className='dash__state-desc'>加入班级后即可查看考勤、作业、活动与班费数据</Text>
            <View
              className='dash__state-btn press-opacity'
              style={{ backgroundColor: ACCENT }}
              onClick={() => go('/pages/auth/join-class/index')}
            >
              <Text>去加入班级</Text>
            </View>
          </View>
        ) : !data || !summary || !trendConfig ? (
          loading ? (
            <View className='dash__stack'>
              <View className='dash__sk dash__sk--score' />
              <View className='dash__sk-grid'>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} className='dash__sk dash__sk--metric' />
                ))}
              </View>
              <View className='dash__sk dash__sk--chart' />
            </View>
          ) : (
            <View className='dash__state dash__state--error'>
              <View className='dash__state-icon dash__state-icon--muted'>
                <Icon name='refresh-cw' size={48} color='#94A3B8' strokeWidth={1.8} />
              </View>
              <Text className='dash__state-title dash__state-title--sm'>数据加载失败</Text>
              <Text className='dash__state-desc'>请检查网络后重试</Text>
              <View
                className='dash__state-btn dash__state-btn--sm press-opacity'
                style={{ backgroundColor: ACCENT }}
                onClick={() => setReloadKey((key) => key + 1)}
              >
                <Text>重新加载</Text>
              </View>
            </View>
          )
        ) : (
          <View className='dash__stack'>
            {/* 综合表现 */}
            <View className='dash__score'>
              <View className='dash__score-row'>
                <View className='dash__score-left'>
                  <View className='dash__score-label-row'>
                    <Text className='dash__score-label'>班级综合表现</Text>
                    {loading ? (
                      <View className='dash__spinner'>
                        <Icon name='refresh-cw' size={24} color='#94A3B8' strokeWidth={2} />
                      </View>
                    ) : null}
                  </View>
                  <View className='dash__score-value-row'>
                    <Text className='dash__score-value'>{score ?? '--'}</Text>
                    <Text className='dash__score-total'>/ 100</Text>
                  </View>
                  <View className='dash__score-chips'>
                    <Text
                      className='dash__grade'
                      style={{
                        color: summary.grade.color,
                        backgroundColor: `${summary.grade.color}14`
                      }}
                    >
                      {summary.grade.text}
                    </Text>
                    <Text className='dash__score-delta'>
                      {summary.scoreDelta === null
                        ? '暂无上期对比'
                        : `较上期 ${summary.scoreDelta >= 0 ? '+' : ''}${summary.scoreDelta} 分`}
                    </Text>
                  </View>
                </View>

                <View className='dash__ring'>
                  <View
                    className='dash__ring-track'
                    style={{
                      background: `conic-gradient(from 0deg, ${ringColor} 0deg ${ringDeg}deg, #EEF2F8 ${ringDeg}deg 360deg)`
                    }}
                  />
                  <View className='dash__ring-inner'>
                    <Text className='dash__ring-score' style={{ color: ringColor }}>
                      {score ?? '--'}
                    </Text>
                    <Text className='dash__ring-label'>综合分</Text>
                  </View>
                </View>
              </View>

              <View className='dash__ranges'>
                {RANGE_OPTIONS.map((option) => (
                  <View
                    key={option.value}
                    className={`dash__range ${
                      range === option.value ? 'dash__range--active' : ''
                    }`}
                    onClick={() => setRange(option.value)}
                  >
                    <Text>{option.label}</Text>
                  </View>
                ))}
              </View>

              <View className='dash__period'>
                <View className='dash__period-item'>
                  <Icon name='calendar' size={24} color='#94A3B8' strokeWidth={1.8} />
                  <Text>
                    {data.period.startTime} 至 {data.period.endTime}
                  </Text>
                </View>
                <View className='dash__period-item'>
                  <Icon name='users' size={24} color='#94A3B8' strokeWidth={1.8} />
                  <Text>{data.memberCount} 名成员</Text>
                </View>
              </View>
            </View>

            {/* 核心指标 */}
            <View className='dash__metrics'>
              <MetricCard
                icon='calendar'
                label='考勤签到率'
                value={
                  data.metrics.attendance.expected > 0
                    ? formatPercent(data.metrics.attendance.rate)
                    : '—'
                }
                detail={`${data.metrics.attendance.present}/${data.metrics.attendance.expected} 人次 · ${data.metrics.attendance.sessions} 次签到`}
                progress={data.metrics.attendance.rate}
                status={rateStatus(
                  data.metrics.attendance.rate,
                  data.metrics.attendance.expected > 0
                )}
                delta={
                  data.metrics.attendance.expected > 0
                    ? data.previous.attendanceRate === null
                      ? null
                      : Math.round(
                          (data.metrics.attendance.rate - data.previous.attendanceRate) * 10
                        ) / 10
                    : null
                }
                accent={ACCENT}
                onOpen={() => go('/pages-sub/attendance/report/index')}
              />
              <MetricCard
                icon='book-open'
                label='作业提交率'
                value={
                  data.metrics.homework.expected > 0
                    ? formatPercent(data.metrics.homework.rate)
                    : '—'
                }
                detail={`${data.metrics.homework.submitted}/${data.metrics.homework.expected} 份 · ${data.metrics.homework.totalHomeworks} 次作业`}
                progress={data.metrics.homework.rate}
                status={rateStatus(
                  data.metrics.homework.rate,
                  data.metrics.homework.expected > 0
                )}
                delta={
                  data.metrics.homework.expected > 0
                    ? data.previous.homeworkSubmitRate === null
                      ? null
                      : Math.round(
                          (data.metrics.homework.rate - data.previous.homeworkSubmitRate) * 10
                        ) / 10
                    : null
                }
                accent='#F97316'
                onOpen={() => go('/pages-sub/homework/list/index')}
              />
              <MetricCard
                icon='users'
                label='活动参与率'
                value={
                  data.metrics.activity.expected > 0
                    ? formatPercent(data.metrics.activity.rate)
                    : '—'
                }
                detail={`${data.metrics.activity.participated}/${data.metrics.activity.expected} 人次 · ${data.metrics.activity.totalActivities} 场活动`}
                progress={data.metrics.activity.rate}
                status={rateStatus(
                  data.metrics.activity.rate,
                  data.metrics.activity.expected > 0
                )}
                delta={
                  data.metrics.activity.expected > 0
                    ? data.previous.activityParticipationRate === null
                      ? null
                      : Math.round(
                          (data.metrics.activity.rate - data.previous.activityParticipationRate) *
                            10
                        ) / 10
                    : null
                }
                accent='#7C3AED'
                onOpen={() => go('/pages-sub/activity/list/index')}
              />
              <MetricCard
                icon='wallet'
                label='班费结余'
                value={`¥${formatMoney(data.metrics.fee.balance)}`}
                detail={`近 ${data.range} 天收 ¥${formatMoney(data.metrics.fee.income)} · 支 ¥${formatMoney(data.metrics.fee.expense)}`}
                status={
                  data.metrics.fee.balance < 0
                    ? { text: '已超支', color: '#DC2626', bg: '#FEE2E2' }
                    : data.metrics.fee.balance < 100
                      ? { text: '偏低', color: '#B45309', bg: '#FEF3C7' }
                      : { text: '正常', color: '#16A34A', bg: '#DCFCE7' }
                }
                accent='#2F9E86'
                onOpen={() => go('/pages-sub/fee/report/index')}
              />
            </View>

            {/* 趋势分析 */}
            <View className='dash__card'>
              <View className='dash__section-head'>
                <View>
                  <Text className='dash__section-title'>趋势分析</Text>
                  <Text className='dash__section-sub'>点击图表可查看每日数据</Text>
                </View>
              </View>

              <View className='dash__trend-tabs'>
                {TREND_TABS.map((tab) => (
                  <View
                    key={tab.key}
                    className={`dash__trend-tab ${
                      trendKey === tab.key ? 'dash__trend-tab--active' : ''
                    }`}
                    onClick={() => setTrendKey(tab.key)}
                  >
                    <Text>{tab.label}</Text>
                  </View>
                ))}
              </View>

              <View className='dash__chart-wrap' key={`${trendKey}-${range}`}>
                <TrendChart
                  labels={trendConfig.labels}
                  series={trendConfig.series}
                  scaleMax={trendConfig.scaleMax}
                  axisLabels={trendConfig.axisLabels}
                  axisWidth={trendConfig.axisWidth}
                  hasData={trendConfig.hasData}
                  emptyText={trendConfig.emptyText}
                />
              </View>

              <View className='dash__trend-foot'>
                <Text className='dash__trend-summary'>{trendConfig.summary}</Text>
                {trendConfig.series.length > 1 ? (
                  <View className='dash__legend'>
                    {trendConfig.series.map((item) => (
                      <View key={item.name} className='dash__legend-item'>
                        <View
                          className='dash__legend-dot'
                          style={{ backgroundColor: item.color }}
                        />
                        <Text>{item.name}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>

            {/* 成员排行 */}
            <View className='dash__card'>
              <View className='dash__card-head'>
                <View className='dash__card-head-left'>
                  <Icon name='trophy' size={32} color='#F59E0B' strokeWidth={2} />
                  <Text className='dash__card-title'>成员排行</Text>
                </View>
                <View
                  className='dash__link press-opacity'
                  onClick={() => go('/pages-sub/settings/member-list/index')}
                >
                  <Text>全部成员</Text>
                  <Icon name='chevron-right' size={24} color='#64748B' strokeWidth={2} />
                </View>
              </View>

              {rankingPreview.items.length === 0 ? (
                <View className='dash__rank-empty'>
                  <Text>本周期暂无成员参与记录</Text>
                </View>
              ) : (
                <View className='dash__rank-list'>
                  {rankingPreview.items.slice(0, 5).map((item) => (
                    <RankingRow key={item.userId} item={item} isMe={item.userId === userInfo?.id} />
                  ))}
                  {rankingPreview.me &&
                  !rankingPreview.items
                    .slice(0, 5)
                    .some((item) => item.userId === userInfo?.id) ? (
                    <>
                      <View className='dash__rank-divider' />
                      <RankingRow item={rankingPreview.me} isMe />
                    </>
                  ) : null}
                </View>
              )}

              <View className='dash__rank-note'>
                <Text>仅展示本期有参与记录的成员；综合分 = 考勤 40% + 作业 35% + 活动 25%。</Text>
              </View>
            </View>

            {/* 数据洞察 */}
            <View className='dash__card'>
              <View className='dash__card-head-left'>
                <Icon name='sparkles' size={32} color={ACCENT} strokeWidth={2} />
                <Text className='dash__card-title'>数据洞察</Text>
              </View>
              <View className='dash__insights'>
                {insights.map((item) => {
                  const meta = TONE_META[item.tone]
                  return (
                    <View key={item.title} className='dash__insight'>
                      <View
                        className='dash__insight-icon'
                        style={{ backgroundColor: meta.bg }}
                      >
                        <Icon name={meta.icon} size={28} color={meta.color} strokeWidth={2} />
                      </View>
                      <View className='dash__insight-body'>
                        <Text className='dash__insight-title'>{item.title}</Text>
                        <Text className='dash__insight-desc'>{item.desc}</Text>
                      </View>
                    </View>
                  )
                })}
              </View>
            </View>

            {/* 报表入口 */}
            <View className='dash__actions'>
              <View className='dash__actions-grid'>
                <View
                  className='dash__action-primary press-opacity'
                  onClick={() => go('/pages-sub/archive/semester-report/index')}
                >
                  <Icon name='bar-chart' size={32} color='#ffffff' strokeWidth={2} />
                  <Text className='dash__action-primary-text'>生成学期报表</Text>
                </View>
                <View
                  className='dash__action-ghost press-opacity'
                  onClick={() => go('/pages-sub/archive/class-archive/index')}
                >
                  <Text className='dash__action-ghost-text'>班级档案</Text>
                  <Icon name='chevron-right' size={32} color='#334155' strokeWidth={2} />
                </View>
              </View>
              <Text className='dash__actions-note'>
                报表支持导出 Excel / PDF · 数据每 5 分钟自动刷新
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* 指标说明弹层 */}
      {helpOpen ? (
        <View className='dash__sheet-root'>
          <View className='dash__mask' onClick={() => setHelpOpen(false)} />
          <View className='dash__sheet'>
            <View className='dash__sheet-handle-wrap'>
              <View className='dash__sheet-handle' />
            </View>
            <View className='dash__sheet-head'>
              <Text className='dash__sheet-title'>指标说明</Text>
            </View>
            <ScrollView scrollY className='dash__sheet-body'>
              {HELP_ROWS.map((row) => (
                <View key={row.title} className='dash__help-item'>
                  <Text className='dash__help-title'>{row.title}</Text>
                  <Text className='dash__help-desc'>{row.desc}</Text>
                </View>
              ))}
              <View className='dash__help-note'>
                <Text>
                  统计周期为近 {data?.range ?? range} 天（含今天）。数据每 5 分钟自动刷新一次，签到、提交作业或记账后稍等片刻即可看到变化。
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      ) : null}
      <BottomNav active='data' />
    </View>
  )
}