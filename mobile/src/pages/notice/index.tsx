// ============================================================
// 通知：1:1 对齐 front/src/pages/messages/Messages.tsx
// 设计稿 375px → 小程序 750rpx（1px = 2rpx）
// ============================================================
import type { CSSProperties } from 'react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { Input, Text, View } from '@tarojs/components'
import Taro, {
  useDidShow,
  useLoad,
  usePageScroll,
  usePullDownRefresh,
  useReachBottom
} from '@tarojs/taro'

import { StatusBar } from '@/components/business'
import { Icon } from '@/components/ui'
import type { IconName } from '@/constants/icons'
import { messageApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'

import './index.scss'

/** 与 App 一致：首屏取 100 条；若后端还有更多则在触底时继续加载 */
const PAGE_SIZE = 100
/** 封面高度（px）：滚动此距离后顶栏完全落下 */
const COVER_H = 200
/** 标题栏高度（px） */
const BAR_H = 56

const SYSTEM = (() => {
  try {
    const info = Taro.getSystemInfoSync()
    return {
      statusBarHeight: info.statusBarHeight || 0,
      windowWidth: info.windowWidth || 375
    }
  } catch {
    return { statusBarHeight: 0, windowWidth: 375 }
  }
})()

/** 顶栏实际高度（px）：系统状态栏 + StatusBar 内容行（56rpx）+ 标题栏 */
const HEADER_H = SYSTEM.statusBarHeight + (56 * SYSTEM.windowWidth) / 750 + BAR_H
const SCROLL_DISTANCE = Math.max(COVER_H - HEADER_H, 1)

function clamp01(value: number) {
  return value < 0 ? 0 : value > 1 ? 1 : value
}

interface MessageItem {
  id: string
  type: string
  title: string
  content: string
  isRead: boolean
  requireAck: boolean
  status: string
  createdAt: string
  publisher?: { id: string; name: string; avatar?: string }
  ackDeadline?: string | null
  isAcked?: boolean
  ackCount?: number
}

interface MessageListResult {
  list?: MessageItem[]
  memberCount?: number
  pagination?: { total?: number }
}

type FilterKey = 'all' | 'unread' | 'todo'
type BadgeTone = 'signed' | 'muted' | 'pending' | 'dynamic'

interface TypeStyle {
  label: string
  icon: IconName
  bg: string
  color: string
}

const TYPE_STYLES: Record<string, TypeStyle> = {
  notice: { label: '通知', icon: 'bell', bg: '#DBEAFE', color: '#2563EB' },
  reminder: { label: '催办', icon: 'bell-ring', bg: '#FFEDD5', color: '#EA580C' },
  important: { label: '重要', icon: 'bell', bg: '#FEE2E2', color: '#DC2626' },
  homework: { label: '作业', icon: 'file-text', bg: '#DBEAFE', color: '#1986E6' },
  activity: { label: '活动', icon: 'calendar-check', bg: '#DCFCE7', color: '#16A34A' },
  activity_result: { label: '报名结果', icon: 'calendar-check', bg: '#DCFCE7', color: '#16A34A' },
  activity_start: { label: '活动提醒', icon: 'bell-ring', bg: '#FFEDD5', color: '#EA580C' },
  deadline_reminder: { label: '截止提醒', icon: 'bell-ring', bg: '#FFEDD5', color: '#EA580C' },
  homework_urge: { label: '作业催交', icon: 'bell-ring', bg: '#FFEDD5', color: '#EA580C' },
  vote: { label: '投票', icon: 'check-circle', bg: '#FEF3C7', color: '#D97706' },
  attendance: { label: '考勤', icon: 'user-check', bg: '#E0F2FE', color: '#0284C7' },
  random_draw: { label: '抽签', icon: 'ticket', bg: '#F3E8FF', color: '#9333EA' },
  fee: { label: '班费', icon: 'wallet', bg: '#DCFCE7', color: '#16A34A' }
}

const FALLBACK_STYLE: TypeStyle = {
  label: '消息',
  icon: 'inbox',
  bg: '#F3F4F6',
  color: '#4B5563'
}

function formatTime(iso?: string) {
  if (!iso) return '-'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return minutes + '分钟前'
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return hours + '小时前'
  const days = Math.floor(hours / 24)
  if (days < 7) return days + '天前'
  return date.getMonth() + 1 + '月' + date.getDate() + '日'
}

/** 列表按「今天 / 昨天 / 更早」分组，保持接口返回的时间倒序 */
function dayLabel(iso?: string) {
  if (!iso) return '更早'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '更早'
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const time = date.getTime()
  if (time >= startOfToday) return '今天'
  if (time >= startOfToday - 24 * 60 * 60 * 1000) return '昨天'
  return '更早'
}

/** 签收倒计时，仅对设置了截止时间的签收通知展示 */
function deadlineText(deadline?: string | null) {
  if (!deadline) return null
  const diff = new Date(deadline).getTime() - Date.now()
  if (Number.isNaN(diff)) return null
  if (diff <= 0) return '已截止'
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return `${Math.max(1, Math.floor(diff / 60000))} 分钟后截止`
  if (hours < 24) return `${hours} 小时后截止`
  return `${Math.floor(hours / 24)} 天后截止`
}

function statusBadge(message: MessageItem): { text: string; tone: BadgeTone } | null {
  if (message.requireAck) {
    if (message.isAcked) return { text: '已签收', tone: 'signed' }
    if (message.ackDeadline && new Date(message.ackDeadline).getTime() <= Date.now()) {
      return { text: '已截止', tone: 'muted' }
    }
    return { text: '待签收', tone: 'pending' }
  }
  if (message.status === 'ended') return { text: '已结束', tone: 'muted' }
  if (
    message.type !== 'notice' &&
    message.type !== 'reminder' &&
    message.type !== 'deadline_reminder'
  ) {
    return { text: '动态', tone: 'dynamic' }
  }
  return null
}

interface NoticeHeaderProps {
  /** 班委可发布通知 */
  canPublish: boolean
  onPublish: () => void
}

/** 固定顶栏：滚动驱动底色、标题与明暗切换，状态栏跟随反色 */
function NoticeHeader({ canPublish, onPublish }: NoticeHeaderProps) {
  const [progress, setProgress] = useState(0)
  const [darkInk, setDarkInk] = useState(false)
  const progressRef = useRef(0)
  const darkInkRef = useRef(false)

  usePageScroll((event) => {
    const p = clamp01(event.scrollTop / SCROLL_DISTANCE)
    if (Math.abs(p - progressRef.current) >= 0.004) {
      progressRef.current = p
      setProgress(p)
    }
    // 明暗切换加滞回，避免在临界点来回抖动
    const nextDark = darkInkRef.current ? p > 0.5 : p > 0.62
    if (nextDark !== darkInkRef.current) {
      darkInkRef.current = nextDark
      setDarkInk(nextDark)
    }
  })

  const titleAlpha = clamp01((progress - 0.7) / 0.3)
  const solidAlpha = clamp01((progress - 0.86) / 0.14)
  const blurred = progress > 0.2

  const bgStyle: CSSProperties = {
    backgroundColor: `rgba(245, 246, 248, ${progress.toFixed(3)})`,
    backdropFilter: blurred ? 'saturate(160%) blur(14px)' : 'none',
    WebkitBackdropFilter: blurred ? 'saturate(160%) blur(14px)' : 'none'
  }

  return (
    <View className='notice__header'>
      <View className='notice__header-bg' style={bgStyle} />
      <View
        className='notice__header-solid'
        style={{ backgroundColor: `rgba(245, 246, 248, ${solidAlpha.toFixed(3)})` }}
      />
      <View
        className='notice__header-mask'
        style={{ opacity: darkInk ? 0 : 1 }}
      />
      <StatusBar light={!darkInk} />
      <View className='notice__bar'>
        <View
          className='notice__back'
          onClick={() => {
            // 通知页已从原生 Tab 改为普通页面：有上级页面则返回，否则回首页
            if (Taro.getCurrentPages().length > 1) {
              Taro.navigateBack()
            } else {
              Taro.reLaunch({ url: '/pages/home/index' })
            }
          }}
        >
          <Icon name='chevron-left' size={40} color='#0B66FF' strokeWidth={2.2} />
        </View>
        <Text className='notice__bar-title' style={{ opacity: titleAlpha }}>
          消息中心
        </Text>
        {canPublish ? (
          <View className='notice__action' onClick={onPublish}>
            <Icon name='plus' size={30} color='#0B66FF' strokeWidth={2.4} />
            <Text className='notice__action-text'>发布</Text>
          </View>
        ) : null}
      </View>
    </View>
  )
}

function SkeletonCard() {
  return (
    <View className='notice__skeleton'>
      <View className='notice__skeleton-row'>
        <View className='notice__skeleton-icon' />
        <View className='notice__skeleton-body'>
          <View className='notice__skeleton-line notice__skeleton-line--title' />
          <View className='notice__skeleton-line notice__skeleton-line--full' />
          <View className='notice__skeleton-line notice__skeleton-line--short' />
        </View>
      </View>
    </View>
  )
}

export default function Notice() {
  const currentClassId = useUserStore((state) => state.currentClassId)
  const { hasRole } = useAuth()
  const canPublish = hasRole('committee')

  const [messages, setMessages] = useState<MessageItem[]>([])
  const [memberCount, setMemberCount] = useState(0)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [keyword, setKeyword] = useState('')

  const messagesRef = useRef<MessageItem[]>([])
  const firstShowRef = useRef(true)

  const fetchMessages = useCallback(
    async (nextPage: number, showSkeleton: boolean) => {
      const classId = currentClassId
      if (!classId) {
        messagesRef.current = []
        setMessages([])
        setTotal(0)
        setPage(1)
        setLoadError(false)
        setLoading(false)
        setLoadingMore(false)
        return
      }
      if (showSkeleton) setLoading(true)
      if (nextPage > 1) setLoadingMore(true)
      setLoadError(false)
      try {
        const res = (await messageApi.getList(classId, {
          page: nextPage,
          pageSize: PAGE_SIZE
        })) as MessageListResult
        const list = res?.list || []
        const merged = nextPage === 1 ? list : [...messagesRef.current, ...list]
        messagesRef.current = merged
        setMessages(merged)
        setMemberCount(Number(res?.memberCount) || 0)
        const totalCount = Number(res?.pagination?.total)
        setTotal(Number.isFinite(totalCount) ? totalCount : merged.length)
        setPage(nextPage)
      } catch {
        // 列表已有内容时保留旧数据，仅在空列表下展示重试入口
        if (messagesRef.current.length === 0) setLoadError(true)
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [currentClassId]
  )

  useLoad(() => {
    fetchMessages(1, true)
  })

  // 从详情页返回时静默刷新，保持已读 / 签收状态同步
  useDidShow(() => {
    if (firstShowRef.current) {
      firstShowRef.current = false
      return
    }
    fetchMessages(1, false)
  })

  usePullDownRefresh(() => {
    fetchMessages(1, false).finally(() => {
      Taro.stopPullDownRefresh()
    })
  })

  useReachBottom(() => {
    if (loading || loadingMore || messages.length >= total) return
    fetchMessages(page + 1, false)
  })

  /** 待我处理：要求签收且我还没签收的消息 */
  const todoCount = useMemo(
    () => messages.filter((m) => m.requireAck && !m.isAcked).length,
    [messages]
  )
  const unreadCount = useMemo(() => messages.filter((m) => !m.isRead).length, [messages])

  const filteredMessages = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return messages.filter((m) => {
      if (filter === 'unread' && m.isRead) return false
      if (filter === 'todo' && !(m.requireAck && !m.isAcked)) return false
      if (!kw) return true
      const publisher = m.publisher?.name || ''
      return `${m.title} ${m.content} ${publisher}`.toLowerCase().includes(kw)
    })
  }, [messages, filter, keyword])

  const groups = useMemo(() => {
    const order = ['今天', '昨天', '更早']
    const map = new Map<string, MessageItem[]>()
    filteredMessages.forEach((m) => {
      const label = dayLabel(m.createdAt)
      const list = map.get(label)
      if (list) list.push(m)
      else map.set(label, [m])
    })
    return order
      .filter((label) => map.has(label))
      .map((label) => ({ label, items: map.get(label) as MessageItem[] }))
  }, [filteredMessages])

  const filters: Array<{ key: FilterKey; label: string; count: number }> = [
    { key: 'all', label: '全部', count: messages.length },
    { key: 'unread', label: '未读', count: unreadCount },
    { key: 'todo', label: '待我处理', count: todoCount }
  ]

  const emptyText = keyword.trim()
    ? '没有找到相关消息'
    : filter === 'todo'
      ? '所有事项都处理完了'
      : filter === 'unread'
        ? '没有未读消息'
        : '暂无消息'

  const coverSubtitle =
    loading || !currentClassId
      ? '班级通知与动态'
      : `${messages.length} 条消息${unreadCount > 0 ? ` · ${unreadCount} 条未读` : ''}`

  const resetFilters = () => {
    setKeyword('')
    setFilter('all')
  }

  const openMessage = (messageId: string) => {
    Taro.navigateTo({ url: `/pages-sub/message/detail/index?messageId=${messageId}` })
  }

  const openPublish = () => {
    Taro.navigateTo({ url: '/pages-sub/message/publish/index' })
  }

  return (
    <View className='notice'>
      <NoticeHeader canPublish={canPublish} onPublish={openPublish} />

      {/* 封面：随内容自然滚出 */}
      <View className='notice__cover'>
        <View className='notice__cover-circle' />
        <View className='notice__cover-mark'>
          <Icon name='bell-ring' size={208} color='rgba(255,255,255,0.22)' strokeWidth={1.5} />
        </View>
        <View className='notice__cover-shade' />
        {/* 标题块：底边留出 52px = 搜索卡上浮 32px + 20px 间距 */}
        <View className='notice__cover-title'>
          <Text className='notice__cover-heading'>消息中心</Text>
          <Text className='notice__cover-subtitle'>{coverSubtitle}</Text>
        </View>
      </View>
      {/* 流内占位：让正文从封面下方开始 */}
      <View className='notice__cover-spacer' />

      <View className='notice__main'>
        {/* 搜索 / 筛选：浮在封面上的一层白卡 */}
        <View className='notice__search-card'>
          <View className='notice__search'>
            <Icon name='search' size={32} color='#9CA3AF' strokeWidth={2} />
            <Input
              className='notice__search-input'
              value={keyword}
              onInput={(event) => setKeyword(event.detail.value)}
              placeholder='搜索标题、内容或发布人'
              placeholderClass='notice__search-placeholder'
              confirmType='search'
            />
            {keyword ? (
              <View className='notice__search-clear press-opacity' onClick={() => setKeyword('')}>
                <Icon name='x' size={32} color='#9CA3AF' strokeWidth={2} />
              </View>
            ) : null}
          </View>

          <View className='notice__filters'>
            {filters.map((item) => {
              const active = filter === item.key
              return (
                <View
                  key={item.key}
                  className={`notice__filter press-opacity ${active ? 'notice__filter--active' : ''}`}
                  onClick={() => setFilter(item.key)}
                >
                  <Text className='notice__filter-label'>{item.label}</Text>
                  {item.count > 0 ? (
                    <Text className='notice__filter-count'>
                      {item.count > 99 ? '99+' : item.count}
                    </Text>
                  ) : null}
                </View>
              )
            })}
          </View>
        </View>

        {/* 消息列表：跟随整页滚动 */}
        <View className='notice__list'>
          {loading ? (
            <View className='notice__skeletons'>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </View>
          ) : loadError ? (
            <View className='notice__error' onClick={() => fetchMessages(1, true)}>
              <Text className='notice__error-text'>加载失败，点击重试</Text>
            </View>
          ) : groups.length === 0 ? (
            <View className='notice__empty'>
              <View className='notice__empty-icon'>
                <Icon name='inbox' size={56} color='#9CA3AF' strokeWidth={1.6} />
              </View>
              <Text className='notice__empty-text'>{emptyText}</Text>
              {keyword.trim() || filter !== 'all' ? (
                <View className='notice__empty-reset press-opacity' onClick={resetFilters}>
                  <Text className='notice__empty-reset-text'>查看全部消息</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <>
              {groups.map((group) => (
                <View key={group.label} className='notice__group'>
                  <Text className='notice__group-label'>{group.label}</Text>
                  {group.items.map((message) => {
                    const style = TYPE_STYLES[message.type] || FALLBACK_STYLE
                    const badge = statusBadge(message)
                    const deadline = deadlineText(message.ackDeadline)
                    const progress =
                      message.requireAck && memberCount > 0
                        ? Math.min(100, Math.round(((message.ackCount || 0) / memberCount) * 100))
                        : null
                    return (
                      <View
                        key={message.id}
                        className={`notice__card press-opacity ${
                          message.isRead ? 'notice__card--read' : 'notice__card--unread'
                        }`}
                        onClick={() => openMessage(message.id)}
                      >
                        <View className='notice__card-row'>
                          <View
                            className='notice__card-icon'
                            style={{ backgroundColor: style.bg }}
                          >
                            <Icon name={style.icon} size={40} color={style.color} strokeWidth={2} />
                          </View>

                          <View className='notice__card-body'>
                            <View className='notice__card-head'>
                              <View
                                className={`notice__dot ${
                                  message.isRead ? '' : 'notice__dot--on'
                                }`}
                              />
                              <Text
                                className={`notice__title ${
                                  message.isRead ? 'notice__title--read' : 'notice__title--unread'
                                }`}
                              >
                                {message.title}
                              </Text>
                              {badge ? (
                                <Text className={`notice__badge notice__badge--${badge.tone}`}>
                                  {badge.text}
                                </Text>
                              ) : null}
                            </View>

                            <Text className='notice__summary'>{message.content}</Text>

                            <View className='notice__meta'>
                              <Text className='notice__meta-type'>{style.label}</Text>
                              <Text className='notice__meta-sep'>·</Text>
                              <Text className='notice__meta-publisher'>
                                {message.publisher?.name || '未知'}
                              </Text>
                              <Text className='notice__meta-sep'>·</Text>
                              <Text className='notice__meta-time'>
                                {formatTime(message.createdAt)}
                              </Text>
                              {deadline ? (
                                <Text className='notice__meta-sep'>·</Text>
                              ) : null}
                              {deadline ? (
                                <Text className='notice__meta-deadline'>{deadline}</Text>
                              ) : null}
                            </View>

                            {progress !== null ? (
                              <View className='notice__progress'>
                                <View className='notice__progress-track'>
                                  <View
                                    className='notice__progress-fill'
                                    style={{ width: `${progress}%` }}
                                  />
                                </View>
                                <Text className='notice__progress-text'>
                                  已签 {message.ackCount || 0}/{memberCount}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    )
                  })}
                </View>
              ))}
              {filter === 'all' && !keyword.trim() && (loadingMore || messages.length < total) ? (
                <View className='notice__more'>
                  <Text className='notice__more-text'>
                    {loadingMore ? '加载中…' : '上拉加载更多'}
                  </Text>
                </View>
              ) : null}
            </>
          )}
        </View>
      </View>
    </View>
  )
}