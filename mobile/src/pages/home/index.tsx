import { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, Image, Swiper, SwiperItem } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { classesApi, attendanceApi, request } from '@/services'
import { useUserStore } from '@/stores'
import { Icon } from '@/components/ui'
import { BottomNav, StatusBar } from '@/components/business'
import type { IconName } from '@/constants/icons'
import type { MessageItem } from '@/types/classes'
import { formatRelativeTime, getTodayDateStr, getGreeting } from '@/utils'
import './index.scss'

// ---------- 通知类型映射（与 front StudentHome 的 TYPE_META 一致） ----------
interface TypeConfig {
  icon: IconName
  color: string
  label: string
}

const TYPE_META: Record<string, TypeConfig> = {
  notice: { icon: 'bell', color: '#2563EB', label: '通知' },
  attendance: { icon: 'check-circle', color: '#16A34A', label: '签到' },
  homework: { icon: 'file-text', color: '#F97316', label: '作业' },
  activity: { icon: 'flag', color: '#EF4444', label: '活动' },
  deadline_reminder: { icon: 'bell', color: '#EA580C', label: '提醒' },
  homework_urge: { icon: 'file-text', color: '#F97316', label: '催交' },
  activity_start: { icon: 'flag', color: '#3B82F6', label: '活动' },
  activity_result: { icon: 'flag', color: '#6366F1', label: '结果' },
  default: { icon: 'bell', color: '#64748B', label: '动态' }
}

// ---------- 常用功能（16 项 / 2 屏，顺序、渐变、图标对齐 front） ----------
interface QuickItem {
  key: string
  label: string
  icon: IconName
  gradient: string
  path: string
  tab?: boolean
}

const QUICK_ITEMS: QuickItem[] = [
  {
    key: 'attendance',
    label: '签到',
    icon: 'check-circle',
    gradient: 'linear-gradient(145deg, #4ADE80, #16A34A)',
    path: '/pages-sub/attendance/list/index'
  },
  {
    key: 'homework',
    label: '作业',
    icon: 'file-text',
    gradient: 'linear-gradient(145deg, #FDBA74, #F97316)',
    path: '/pages-sub/homework/list/index'
  },
  {
    key: 'activity',
    label: '活动',
    icon: 'flag',
    gradient: 'linear-gradient(145deg, #FB7185, #E11D48)',
    path: '/pages-sub/activity/list/index'
  },
  {
    key: 'material',
    label: '资料',
    icon: 'folder',
    gradient: 'linear-gradient(145deg, #5EEAD4, #0D9488)',
    path: '/pages-sub/material/library/index'
  },
  {
    key: 'notice',
    label: '通知',
    icon: 'bell',
    gradient: 'linear-gradient(145deg, #60A5FA, #2563EB)',
    path: '/pages/notice/index'
  },
  {
    key: 'vote',
    label: '投票',
    icon: 'vote',
    gradient: 'linear-gradient(145deg, #A5B4FC, #6366F1)',
    path: '/pages-sub/vote/list/index'
  },
  {
    key: 'draw',
    label: '抽签',
    icon: 'dices',
    gradient: 'linear-gradient(145deg, #FCD34D, #F59E0B)',
    path: '/pages-sub/vote/random-draw/index'
  },
  {
    key: 'pomodoro',
    label: '番茄钟',
    icon: 'clock',
    gradient: 'linear-gradient(145deg, #FDA4AF, #E11D48)',
    path: '/pages-sub/material/pomodoro/index'
  },
  {
    key: 'dashboard',
    label: '数据',
    icon: 'bar-chart',
    gradient: 'linear-gradient(145deg, #C4B5FD, #7C3AED)',
    path: '/pages/data/index',
    tab: true
  },
  {
    key: 'task-board',
    label: '任务看板',
    icon: 'file-check',
    gradient: 'linear-gradient(145deg, #818CF8, #4F46E5)',
    path: '/pages-sub/material/task-board/index'
  },
  {
    key: 'my-attendance',
    label: '我的考勤',
    icon: 'calendar',
    gradient: 'linear-gradient(145deg, #6EE7B7, #059669)',
    path: '/pages-sub/attendance/my/index'
  },
  {
    key: 'my-activities',
    label: '我的活动',
    icon: 'award',
    gradient: 'linear-gradient(145deg, #FDE68A, #D97706)',
    path: '/pages-sub/activity/my/index'
  },
  {
    key: 'my-registration',
    label: '我的报名',
    icon: 'file-check',
    gradient: 'linear-gradient(145deg, #67E8F9, #0891B2)',
    path: '/pages-sub/activity/my-registration/index'
  },
  {
    key: 'member-list',
    label: '班级成员',
    icon: 'users',
    gradient: 'linear-gradient(145deg, #7DD3FC, #0284C7)',
    path: '/pages-sub/settings/member-list/index'
  },
  {
    key: 'class-archive',
    label: '班级档案',
    icon: 'folder',
    gradient: 'linear-gradient(145deg, #CBD5E1, #64748B)',
    path: '/pages-sub/archive/class-archive/index'
  },
  {
    key: 'all',
    label: '全部',
    icon: 'more-horizontal',
    gradient: 'linear-gradient(145deg, #94A3B8, #475569)',
    path: '/pages-sub/material/more-features/index'
  }
]

const QUICK_PAGES = Math.ceil(QUICK_ITEMS.length / 8)

// ---------- 今日待办数据 ----------
interface HomeTask {
  id: string
  title: string
  progress?: number
  status?: string
  deadline?: string | null
}

interface AttendanceRaw {
  id: string
  title: string
  method: string
  startTime: string
  endTime: string
  status: string
  myRecord?: { id: string; status: string; checkInAt?: string } | null
  myLeaveApplication?: { id: string; status: string } | null
}

interface AttendanceCard {
  state: 'ongoing' | 'upcoming' | 'done' | 'leave'
  id: string
  title: string
  startTime: string
  endTime: string
  checkedAt?: string
}

/** 只取 HH:mm */
function formatClock(iso: string) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 时间线用：拆出 HH:mm 与「今天 / 明天 / 11-09」 */
function formatScheduleParts(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const startOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const diffDay = Math.round((startOfDay(d) - startOfDay(now)) / 86400000)
  const day =
    diffDay === 0
      ? '今天'
      : diffDay === 1
        ? '明天'
        : `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { time: formatClock(iso), day }
}

/** 从考勤列表里挑一条最该展示在首页的记录（与 front 逻辑一致） */
function pickHomeAttendance(list: AttendanceRaw[]): AttendanceCard | null {
  const now = Date.now()
  const startOf = (item: AttendanceRaw) => new Date(item.startTime).getTime()
  const endOf = (item: AttendanceRaw) => new Date(item.endTime).getTime()
  const base = (item: AttendanceRaw, state: AttendanceCard['state']): AttendanceCard => ({
    state,
    id: item.id,
    title: item.title,
    startTime: item.startTime,
    endTime: item.endTime,
    checkedAt: item.myRecord?.checkInAt
  })

  const ongoing = list.find(
    (item) => item.status === 'open' && startOf(item) <= now && now <= endOf(item)
  )
  if (ongoing) return base(ongoing, 'ongoing')

  const upcoming = list
    .filter((item) => item.status === 'open' && startOf(item) > now && startOf(item) - now <= 86400000)
    .sort((a, b) => startOf(a) - startOf(b))[0]
  if (upcoming) return base(upcoming, 'upcoming')

  const today = new Date()
  const endedToday = list
    .filter((item) => {
      const start = new Date(item.startTime)
      const sameDay =
        start.getFullYear() === today.getFullYear() &&
        start.getMonth() === today.getMonth() &&
        start.getDate() === today.getDate()
      return sameDay && (item.status === 'closed' || now > endOf(item))
    })
    .sort((a, b) => endOf(b) - endOf(a))[0]

  if (endedToday) {
    if (endedToday.myRecord) return base(endedToday, 'done')
    if (endedToday.myLeaveApplication?.status === 'approved') return base(endedToday, 'leave')
  }
  return null
}

/** 实时倒计时 */
function AttendanceCountdown({ endTime, onExpire }: { endTime: string; onExpire?: () => void }) {
  const endMs = new Date(endTime).getTime()
  const [remain, setRemain] = useState(() => Math.max(endMs - Date.now(), 0))
  const firedRef = useRef(false)

  useEffect(() => {
    firedRef.current = false
    const tick = () => {
      const ms = Math.max(endMs - Date.now(), 0)
      setRemain(ms)
      if (ms <= 0 && !firedRef.current) {
        firedRef.current = true
        onExpire?.()
      }
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [endMs, onExpire])

  const total = Math.floor(remain / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  const text = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`

  return <Text className='home__countdown'>{text}</Text>
}

export default function Home() {
  const userInfo = useUserStore((s) => s.userInfo)
  const currentClassId = useUserStore((s) => s.currentClassId)

  const [pendingCount, setPendingCount] = useState(0)
  const [completionRate, setCompletionRate] = useState(0)
  const [taskStatsState, setTaskStatsState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [pendingTasks, setPendingTasks] = useState<HomeTask[]>([])
  const [unreadTotal, setUnreadTotal] = useState(0)
  const [feedItems, setFeedItems] = useState<MessageItem[]>([])
  const [loadingFeed, setLoadingFeed] = useState(true)
  const [greeting, setGreeting] = useState(getGreeting())
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [attendanceCard, setAttendanceCard] = useState<AttendanceCard | null>(null)
  const [quickPage, setQuickPage] = useState(0)
  const [refreshToken, setRefreshToken] = useState(0)
  const greetingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 问候语：每分钟检查一次，时间边界时平滑过渡
  useEffect(() => {
    const updateGreeting = () => {
      const next = getGreeting()
      if (next !== greeting) {
        setIsTransitioning(true)
        setTimeout(() => {
          setGreeting(next)
          setTimeout(() => setIsTransitioning(false), 300)
        }, 300)
      }
    }
    greetingTimerRef.current = setInterval(updateGreeting, 60000)
    return () => {
      if (greetingTimerRef.current) clearInterval(greetingTimerRef.current)
    }
  }, [greeting])

  // 任务统计 + 待办时间线
  const loadTasks = useCallback(() => {
    if (!currentClassId) {
      setTaskStatsState('ready')
      setPendingCount(0)
      setCompletionRate(0)
      setPendingTasks([])
      return
    }
    setTaskStatsState('loading')
    classesApi
      .getClassTasks(currentClassId)
      .then((res) => {
        const stats = res?.stats ?? { todo: 0, inProgress: 0, done: 0 }
        const list = (res?.list ?? []) as HomeTask[]
        const total = stats.todo + stats.inProgress + stats.done
        setPendingCount(stats.todo + stats.inProgress)
        setCompletionRate(total > 0 ? Math.round((stats.done / total) * 100) : 0)
        setPendingTasks(
          list
            .filter((task) => task.status !== 'done')
            .sort((a, b) => {
              if (!a.deadline) return 1
              if (!b.deadline) return -1
              return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
            })
        )
        setTaskStatsState('ready')
      })
      .catch(() => {
        setTaskStatsState('error')
      })
  }, [currentClassId])

  // 未读消息数
  const loadUnread = useCallback(() => {
    if (!currentClassId) {
      setUnreadTotal(0)
      return
    }
    request
      .get<{ total?: number }>(`/classes/${currentClassId}/messages/unread-count`)
      .then((res) => setUnreadTotal(Number(res?.total) || 0))
      .catch(() => {
        // 静默失败，保持上一次结果
      })
  }, [currentClassId])

  // 首页签到卡
  const loadAttendance = useCallback(() => {
    if (!currentClassId) {
      setAttendanceCard(null)
      return
    }
    attendanceApi
      .getList(currentClassId, { page: 1, pageSize: 30 })
      .then((res) => {
        const body = res as unknown as { list?: AttendanceRaw[] }
        setAttendanceCard(pickHomeAttendance(body?.list ?? []))
      })
      .catch(() => setAttendanceCard(null))
  }, [currentClassId])

  // 班级动态
  const loadFeed = useCallback(() => {
    if (!currentClassId) {
      setFeedItems([])
      setLoadingFeed(false)
      return
    }
    setLoadingFeed(true)
    classesApi
      .getClassMessages(currentClassId, 3)
      .then((res) => setFeedItems(res?.list ?? []))
      .catch(() => setFeedItems([]))
      .finally(() => setLoadingFeed(false))
  }, [currentClassId])

  const refreshAll = useCallback(() => {
    loadTasks()
    loadUnread()
    loadAttendance()
    loadFeed()
  }, [loadTasks, loadUnread, loadAttendance, loadFeed])

  useEffect(() => {
    refreshAll()
  }, [refreshAll, refreshToken])

  useDidShow(() => {
    setRefreshToken((token) => token + 1)
  })

  const userName = userInfo?.name || '同学'
  const hasClass = !!currentClassId

  const attendanceStatusText = !attendanceCard
    ? '--'
    : attendanceCard.state === 'ongoing'
      ? '进行中'
      : attendanceCard.state === 'upcoming'
        ? '待开始'
        : attendanceCard.checkedAt
          ? '已签到'
          : attendanceCard.state === 'leave'
            ? '已请假'
            : '已结束'

  const timelineTasks = pendingTasks.slice(0, attendanceCard ? 2 : 3)
  const hasTodo = Boolean(attendanceCard) || timelineTasks.length > 0
  const ringRate = taskStatsState === 'ready' ? completionRate : 0

  const go = (path: string) => {
    Taro.navigateTo({ url: path })
  }

  const goQuick = (item: QuickItem) => {
    if (item.tab) {
      Taro.reLaunch({ url: item.path })
      return
    }
    go(item.path)
  }

  const goAttendance = () => {
    if (!attendanceCard) {
      go('/pages-sub/attendance/list/index')
      return
    }
    go(
      `/pages-sub/attendance/check-in-detail/index?classId=${currentClassId}&attendanceId=${attendanceCard.id}`
    )
  }

  return (
    <View className='home'>
      {/* Hero：与 front 首页一致的蓝色渐变封面（状态栏沉浸到渐变内） */}
      <View className='home__hero'>
        <StatusBar light />
        <View className='home__hero-circle home__hero-circle--top' />
        <View className='home__hero-circle home__hero-circle--bottom' />

        <View className='home__hero-head'>
          <View className='home__hero-left'>
            <Text
              className={`home__greeting ${isTransitioning ? 'home__greeting--hidden' : ''}`}
            >
              {greeting}，{userName}
            </Text>
            <View className='home__org-row'>
              {hasClass ? (
                <View
                  className='home__org-pill'
                  onClick={() => Taro.reLaunch({ url: '/pages/class-home/index' })}
                >
                  <Icon name='school' size={24} color='#0062FF' strokeWidth={2} />
                  <Text className='home__org-name'>{userInfo?.className || '我的班级'}</Text>
                  <Icon name='chevron-down' size={20} color='#0062FF' strokeWidth={2.5} />
                </View>
              ) : (
                <Text className='home__org-empty'>未加入班级</Text>
              )}
            </View>
          </View>

          <View className='home__actions'>
            <View
              className='home__action press-scale'
              onClick={() => Taro.navigateTo({ url: '/pages/notice/index' })}
            >
              <Icon name='bell' size={36} color='#FFFFFF' strokeWidth={2} />
              {unreadTotal > 0 ? <View className='home__action-dot' /> : null}
            </View>
            <View
              className='home__action press-scale'
              onClick={() => go('/pages-sub/material/scan/index')}
            >
              <Icon name='scan-line' size={36} color='#FFFFFF' strokeWidth={2} />
            </View>
            <View
              className='home__avatar press-scale'
              onClick={() => Taro.reLaunch({ url: '/pages/profile/index' })}
            >
              {userInfo?.avatar ? (
                <Image className='home__avatar-img' src={userInfo.avatar} mode='aspectFill' />
              ) : (
                <Icon name='user' size={40} color='#FFFFFF' strokeWidth={2} />
              )}
            </View>
          </View>
        </View>

        {hasClass ? (
          <View className='home__stats'>
            <View className='home__stat'>
              <Text className='home__stat-value'>
                {taskStatsState === 'ready' ? pendingCount : '--'}
              </Text>
              <Text className='home__stat-label'>今日待办</Text>
            </View>
            <View className='home__stat home__stat--divider'>
              <Text className='home__stat-value'>{unreadTotal > 99 ? '99+' : unreadTotal}</Text>
              <Text className='home__stat-label'>未读消息</Text>
            </View>
            <View className='home__stat'>
              <Text className='home__stat-value home__stat-value--sm'>{attendanceStatusText}</Text>
              <Text className='home__stat-label'>今日签到</Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* 内容卡片区 */}
      <View className='home__content'>
        {!hasClass ? (
          <View className='home__no-class'>
            <View className='home__no-class-icon'>
              <Icon name='school' size={80} color='#0062FF' strokeWidth={1.5} />
            </View>
            <Text className='home__no-class-text'>暂无加入班级</Text>
            <View
              className='home__join-btn press-scale'
              onClick={() => go('/pages/auth/join-class/index')}
            >
              <Text className='home__join-btn-text'>去加入/创建班级</Text>
            </View>
          </View>
        ) : (
          <>
            {/* 今日待办 */}
            <View className='home__card home__todo'>
              <View className='home__todo-head'>
                <View className='home__todo-title-wrap'>
                  <Text className='home__card-title'>今日待办</Text>
                  <Text className='home__card-sub'>
                    {getTodayDateStr()} ·{' '}
                    {taskStatsState === 'ready' ? `${pendingCount} 项待完成` : '统计中'}
                  </Text>
                </View>
                <View
                  className='home__ring'
                  style={{
                    background: `conic-gradient(#0B66FF ${ringRate}%, #EEF2F7 0)`
                  }}
                >
                  <View className='home__ring-inner'>
                    <Text className='home__ring-text'>{ringRate}%</Text>
                  </View>
                </View>
              </View>

              <View className='home__todo-list'>
                {attendanceCard ? (
                  <View
                    className={`home__todo-item ${
                      attendanceCard.state === 'ongoing' ? 'home__todo-item--hot' : ''
                    }`}
                    onClick={goAttendance}
                  >
                    <View
                      className={`home__todo-icon ${
                        attendanceCard.checkedAt ? 'home__todo-icon--green' : 'home__todo-icon--blue'
                      }`}
                    >
                      <Icon
                        name={attendanceCard.checkedAt ? 'check-circle' : 'clock'}
                        size={28}
                        color={attendanceCard.checkedAt ? '#16A34A' : '#2563EB'}
                        strokeWidth={2.5}
                      />
                    </View>
                    <View className='home__todo-body'>
                      <View className='home__todo-line'>
                        <Text className='home__tag home__tag--blue'>签到</Text>
                        <Text className='home__todo-name'>{attendanceCard.title}</Text>
                      </View>
                      <View className='home__todo-meta'>
                        {attendanceCard.state === 'ongoing' ? (
                          <Text className='home__todo-meta-text'>
                            剩余
                            <AttendanceCountdown
                              endTime={attendanceCard.endTime}
                              onExpire={() => setRefreshToken((token) => token + 1)}
                            />
                          </Text>
                        ) : (
                          <Text className='home__todo-meta-text'>
                            {attendanceCard.checkedAt
                              ? `${formatClock(attendanceCard.checkedAt)} 已签到`
                              : attendanceCard.state === 'upcoming'
                                ? `${formatScheduleParts(attendanceCard.startTime).day} ${formatClock(
                                    attendanceCard.startTime
                                  )} 开始`
                                : attendanceCard.state === 'leave'
                                  ? '已请假'
                                  : '今日已结束'}
                          </Text>
                        )}
                      </View>
                    </View>
                    {attendanceCard.state === 'ongoing' && !attendanceCard.checkedAt ? (
                      <View className='home__checkin-btn' onClick={goAttendance}>
                        <Text className='home__checkin-text'>去签到</Text>
                      </View>
                    ) : (
                      <Icon name='chevron-right' size={32} color='#CBD5E1' strokeWidth={2} />
                    )}
                  </View>
                ) : null}

                {timelineTasks.map((task, index) => {
                  const parts = task.deadline ? formatScheduleParts(task.deadline) : null
                  const hot = index === 0
                  return (
                    <View
                      key={task.id}
                      className='home__todo-item'
                      onClick={() => go('/pages-sub/material/task-board/index')}
                    >
                      <View
                        className={`home__todo-icon ${
                          hot ? 'home__todo-icon--orange' : 'home__todo-icon--purple'
                        }`}
                      >
                        <Icon
                          name='flag'
                          size={28}
                          color={hot ? '#F97316' : '#7C3AED'}
                          strokeWidth={2.5}
                        />
                      </View>
                      <View className='home__todo-body'>
                        <View className='home__todo-line'>
                          <Text
                            className={`home__tag ${hot ? 'home__tag--orange' : 'home__tag--purple'}`}
                          >
                            待办
                          </Text>
                          <Text className='home__todo-name'>{task.title}</Text>
                        </View>
                        <Text className='home__todo-meta-text'>
                          {parts ? `${parts.day} ${parts.time} 截止` : '无截止时间'}
                        </Text>
                      </View>
                      <Icon name='chevron-right' size={32} color='#CBD5E1' strokeWidth={2} />
                    </View>
                  )
                })}

                {!hasTodo ? (
                  <View className='home__todo-empty'>
                    <Icon name='check-circle' size={32} color='#CBD5E1' strokeWidth={1.5} />
                    <Text className='home__todo-empty-text'>今天暂无待办，休息一下吧</Text>
                  </View>
                ) : null}
              </View>

              <View
                className='home__todo-more'
                onClick={() => go('/pages-sub/material/task-board/index')}
              >
                <Text className='home__todo-more-text'>查看全部待办</Text>
                <Icon name='chevron-right' size={28} color='#0B66FF' strokeWidth={2.5} />
              </View>
            </View>

            {/* 常用功能 */}
            <View className='home__card home__quick'>
              <View className='home__card-head'>
                <Text className='home__card-title home__card-title--sm'>常用功能</Text>
                <View
                  className='home__card-link'
                  onClick={() => go('/pages-sub/material/more-features/index')}
                >
                  <Text className='home__card-link-text'>全部</Text>
                  <Icon name='chevron-right' size={24} color='#94A3B8' strokeWidth={2} />
                </View>
              </View>

              <Swiper
                className='home__quick-swiper'
                current={quickPage}
                onChange={(event) => setQuickPage(event.detail.current)}
              >
                {Array.from({ length: QUICK_PAGES }).map((_, pageIndex) => (
                  <SwiperItem key={pageIndex}>
                    <View className='home__quick-grid'>
                      {QUICK_ITEMS.slice(pageIndex * 8, pageIndex * 8 + 8).map((item) => (
                        <View
                          key={item.key}
                          className='home__quick-item press-scale'
                          onClick={() => goQuick(item)}
                        >
                          <View
                            className='home__quick-icon'
                            style={{ backgroundImage: item.gradient }}
                          >
                            <View className='home__quick-shine' />
                            <Icon name={item.icon} size={42} color='#FFFFFF' strokeWidth={2} />
                          </View>
                          <Text className='home__quick-label'>{item.label}</Text>
                        </View>
                      ))}
                    </View>
                  </SwiperItem>
                ))}
              </Swiper>

              {QUICK_PAGES > 1 ? (
                <View className='home__dots'>
                  {Array.from({ length: QUICK_PAGES }).map((_, index) => (
                    <View
                      key={index}
                      className={`home__dot ${index === quickPage ? 'home__dot--active' : ''}`}
                    />
                  ))}
                </View>
              ) : null}
            </View>

            {/* 班级动态 */}
            <View className='home__card home__feed'>
              <View className='home__card-head'>
                <Text className='home__card-title home__card-title--sm'>班级动态</Text>
                <View
                  className='home__card-link'
                  onClick={() => Taro.navigateTo({ url: '/pages/notice/index' })}
                >
                  <Text className='home__card-link-text'>查看全部</Text>
                  <Icon name='chevron-right' size={24} color='#94A3B8' strokeWidth={2} />
                </View>
              </View>

              <View className='home__feed-list'>
                {loadingFeed ? (
                  <View className='home__skeleton'>
                    {[0, 1, 2].map((index) => (
                      <View key={index} className='home__skeleton-row'>
                        <View className='home__skeleton-icon' />
                        <View className='home__skeleton-body'>
                          <View className='home__skeleton-line home__skeleton-line--wide' />
                          <View className='home__skeleton-line home__skeleton-line--short' />
                        </View>
                      </View>
                    ))}
                  </View>
                ) : feedItems.length === 0 ? (
                  <View className='home__feed-empty'>
                    <View className='home__feed-empty-icon'>
                      <Icon name='bell' size={48} color='#0062FF80' strokeWidth={1.5} />
                    </View>
                    <Text className='home__feed-empty-text'>暂无班级动态</Text>
                  </View>
                ) : (
                  feedItems.map((item) => {
                    const meta = TYPE_META[item.type] || TYPE_META.default
                    return (
                      <View
                        key={item.id}
                        className='home__feed-item'
                        onClick={() => go(`/pages-sub/message/detail/index?messageId=${item.id}`)}
                      >
                        <View
                          className='home__feed-icon'
                          style={{
                            backgroundImage: `linear-gradient(145deg, ${meta.color}F2, ${meta.color}99)`
                          }}
                        >
                          <Icon name={meta.icon} size={40} color='#FFFFFF' strokeWidth={2} />
                        </View>
                        <View className='home__feed-body'>
                          <View className='home__feed-line'>
                            <Text
                              className='home__tag'
                              style={{ backgroundColor: `${meta.color}1A`, color: meta.color }}
                            >
                              {meta.label}
                            </Text>
                            <Text className='home__feed-name'>{item.title}</Text>
                          </View>
                          <Text className='home__feed-meta'>
                            {formatRelativeTime(item.createdAt)} ·{' '}
                            {item.publisher?.name || '未知'}
                          </Text>
                        </View>
                        <Icon name='chevron-right' size={32} color='#CBD5E1' strokeWidth={2} />
                      </View>
                    )
                  })
                )}
              </View>
            </View>
          </>
        )}
      </View>
      <BottomNav active='home' />
    </View>
  )
}