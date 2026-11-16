import { useCallback, useEffect, useState } from 'react'
import { Image, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { PageHeader } from '@/components/business'
import { Icon } from '@/components/ui'
import { activityApi, resolveFileUrl } from '@/services'
import { useAuth } from '@/utils'
import './index.scss'

interface ActivityDetailData {
  id: string
  title: string
  category?: string | null
  eventDate: string
  eventTime: string | null
  location?: string
  description?: string | null
  capacity?: number
  deadline?: string | null
  coverUrl?: string | null
  images?: string[]
  registeredCount: number
  displayStatus: 'registering' | 'ongoing' | 'ended'
  registrationOpen?: boolean
  registration: {
    id: string
    status: 'pending' | 'registered' | 'approved' | 'rejected'
    registeredAt: string
  } | null
}

type RegisterButtonState =
  | 'loading'
  | 'register'
  | 'cancelRegister'
  | 'registering'
  | 'cancelling'
  | 'inProgress'
  | 'ended'
  | 'full'
  | 'closed'
  | 'rejected'

const STATE_HINTS: Partial<Record<RegisterButtonState, string>> = {
  inProgress: '活动已开始，报名通道已关闭',
  full: '报名名额已满',
  closed: '报名截止时间已过',
  rejected: '报名审核未通过，如有疑问请联系班委'
}

const BUTTON_META: Record<RegisterButtonState, { label: string; disabled: boolean; tone: string }> = {
  loading: { label: '加载中...', disabled: true, tone: 'muted' },
  registering: { label: '报名中...', disabled: true, tone: 'primary-dim' },
  cancelling: { label: '取消中...', disabled: true, tone: 'danger-dim' },
  cancelRegister: { label: '取消报名', disabled: false, tone: 'danger' },
  inProgress: { label: '活动进行中', disabled: true, tone: 'muted' },
  ended: { label: '活动已结束', disabled: true, tone: 'muted' },
  full: { label: '名额已满', disabled: true, tone: 'muted' },
  closed: { label: '报名已截止', disabled: true, tone: 'muted' },
  rejected: { label: '报名未通过', disabled: true, tone: 'muted' },
  register: { label: '报名', disabled: false, tone: 'primary' }
}

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const formatEventDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getMonth() + 1}月${date.getDate()}日 ${WEEK[date.getDay()]}`
}

const formatDeadline = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${date.getMonth() + 1}月${date.getDate()}日 ${hh}:${mm}`
}

function getDeadlineCountdown(deadline?: string | null) {
  if (!deadline) return null
  const diff = new Date(deadline).getTime() - Date.now()
  if (Number.isNaN(diff) || diff <= 0) return null
  const totalMinutes = Math.floor(diff / 60000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) return `距报名截止 ${days} 天 ${hours} 小时`
  if (hours > 0) return `距报名截止 ${hours} 小时 ${minutes} 分`
  return `距报名截止 ${minutes} 分钟`
}

function computeButtonState(activity: ActivityDetailData): RegisterButtonState {
  if (activity.displayStatus === 'ended') return 'ended'
  if (activity.displayStatus === 'ongoing') return 'inProgress'

  const regStatus = activity.registration?.status
  if (regStatus && ['pending', 'registered', 'approved'].includes(regStatus)) {
    return 'cancelRegister'
  }
  if (regStatus === 'rejected') return 'rejected'
  if (activity.registrationOpen === false) return 'closed'
  if (activity.capacity && activity.registeredCount >= activity.capacity) return 'full'
  return 'register'
}

type StepState = 'done' | 'current' | 'failed' | 'todo'

export default function ActivityDetail() {
  const { user, requireLogin } = useAuth()

  const [classId, setClassId] = useState('')
  const [activityId, setActivityId] = useState('')
  const [activity, setActivity] = useState<ActivityDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [buttonState, setButtonState] = useState<RegisterButtonState>('loading')
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)

  const fetchActivity = useCallback(
    async (silent = false) => {
      if (!classId || !activityId) return
      if (!silent) {
        setLoading(true)
        setError('')
        setButtonState('loading')
      }
      try {
        const data = (await activityApi.getDetail(classId, activityId)) as any
        if (!data?.id) throw new Error('获取活动详情失败')
        setActivity(data)
        setButtonState(computeButtonState(data))
        setError('')
      } catch (err) {
        if (silent) return
        const message = err instanceof Error ? err.message : '获取活动详情失败'
        setError(message)
        Taro.showToast({ title: message, icon: 'none' })
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [classId, activityId]
  )

  useLoad((options) => {
    if (!requireLogin()) return
    const cid = (options?.classId as string) || ''
    const aid = (options?.activityId as string) || ''
    if (!cid || !aid) {
      Taro.showToast({ title: '缺少活动信息', icon: 'none' })
      Taro.redirectTo({ url: '/pages-sub/activity/list/index' })
      return
    }
    setClassId(cid)
    setActivityId(aid)
  })

  useEffect(() => {
    if (classId && activityId) void fetchActivity()
  }, [classId, activityId, fetchActivity])

  // 活动阶段会随时间变化，每分钟静默刷新一次，避免整页闪烁
  useEffect(() => {
    if (!classId || !activityId) return
    const timer = setInterval(() => {
      void fetchActivity(true)
    }, 60000)
    return () => clearInterval(timer)
  }, [classId, activityId, fetchActivity])

  const handleButtonClick = async () => {
    if (!classId || !activityId) return
    if (buttonState === 'register') {
      setButtonState('registering')
      try {
        await activityApi.register(classId, activityId)
        Taro.showToast({ title: '报名成功', icon: 'success' })
        await fetchActivity(true)
      } catch (err) {
        Taro.showToast({
          title: err instanceof Error ? err.message : '报名失败',
          icon: 'none'
        })
        await fetchActivity(true)
      }
    } else if (buttonState === 'cancelRegister') {
      setButtonState('cancelling')
      try {
        await activityApi.cancel(classId, activityId)
        Taro.showToast({ title: '取消报名成功', icon: 'success' })
        await fetchActivity(true)
      } catch (err) {
        Taro.showToast({
          title: err instanceof Error ? err.message : '取消报名失败',
          icon: 'none'
        })
        await fetchActivity(true)
      }
    }
  }

  const goStats = () =>
    Taro.navigateTo({
      url: `/pages-sub/activity/registration-stats/index?classId=${classId}&activityId=${activityId}`
    })

  const header = (
    <PageHeader
      title='活动详情'
      variant='b'
      right={
        user?.roleLevel === 'owner' || user?.roleLevel === 'admin' ? (
          <View className='actdetail__stats' onClick={goStats}>
            <Text>报名统计</Text>
          </View>
        ) : undefined
      }
    />
  )

  if (loading) {
    return (
      <View className='actdetail'>
        {header}
        <View className='actdetail__loading'>
          <Text className='actdetail__loading-text'>加载中...</Text>
        </View>
      </View>
    )
  }

  if (error || !activity) {
    return (
      <View className='actdetail'>
        {header}
        <View className='actdetail__error'>
          <Text className='actdetail__error-text'>{error || '活动不存在或已被删除'}</Text>
          <View className='actdetail__retry' onClick={() => void fetchActivity()}>
            <Text>重新加载</Text>
          </View>
        </View>
      </View>
    )
  }

  const capacityText = activity.capacity
    ? `${activity.registeredCount}/${activity.capacity}`
    : `${activity.registeredCount}/不限`
  const countdown =
    activity.displayStatus === 'registering' ? getDeadlineCountdown(activity.deadline) : null
  const remaining = activity.capacity
    ? Math.max(activity.capacity - activity.registeredCount, 0)
    : null
  const progress = activity.capacity
    ? Math.min(100, Math.round((activity.registeredCount / activity.capacity) * 100))
    : 0
  const galleryImages = activity.images ?? []

  const badge =
    activity.displayStatus === 'ended'
      ? { label: '已结束', color: '#64748B', bg: '#F1F5F9' }
      : activity.displayStatus === 'ongoing'
        ? { label: '进行中', color: '#0369A1', bg: '#E0F2FE' }
        : countdown && !countdown.includes('天')
          ? { label: '即将截止', color: '#B45309', bg: '#FEF3C7' }
          : { label: '报名中', color: '#1D4ED8', bg: '#DBEAFE' }

  const registration = activity.registration
  const regStatus = registration?.status
  const registrationMeta =
    regStatus === 'pending'
      ? { label: '待审核', color: '#B45309', bg: '#FEF3C7' }
      : regStatus === 'registered' || regStatus === 'approved'
        ? { label: '已报名', color: '#15803D', bg: '#DCFCE7' }
        : regStatus === 'rejected'
          ? { label: '未通过', color: '#B91C1C', bg: '#FEE2E2' }
          : null

  const reviewState: StepState =
    regStatus === 'registered' || regStatus === 'approved'
      ? 'done'
      : regStatus === 'rejected'
        ? 'failed'
        : 'current'

  const steps: { title: string; desc: string; state: StepState }[] = registration
    ? [
        {
          title: '报名已提交',
          desc: `${formatDeadline(registration.registeredAt)} 提交`,
          state: 'done'
        },
        {
          title:
            regStatus === 'rejected'
              ? '报名未通过'
              : regStatus === 'pending'
                ? '等待班委审核'
                : '审核已通过',
          desc:
            regStatus === 'pending'
              ? '审核结果会通过消息通知你，请留意'
              : regStatus === 'rejected'
                ? '如有疑问可联系班委了解原因'
                : '请按时参加活动',
          state: reviewState
        },
        {
          title: '参加活动',
          desc: `${formatEventDate(activity.eventDate)}${
            activity.eventTime ? ` ${activity.eventTime}` : ''
          } · ${activity.location || '待定'}`,
          state:
            activity.displayStatus === 'ended' || activity.displayStatus === 'ongoing'
              ? 'done'
              : 'todo'
        }
      ]
    : []

  const infoItems = [
    {
      icon: 'calendar-days' as const,
      label: '活动时间',
      value: `${formatEventDate(activity.eventDate)}${
        activity.eventTime ? ` ${activity.eventTime}` : ''
      }`
    },
    {
      icon: 'map-pin' as const,
      label: '活动地点',
      value: activity.location || '待定'
    },
    {
      icon: 'timer' as const,
      label: '报名截止',
      value: activity.deadline ? formatDeadline(activity.deadline) : '活动开始前'
    },
    {
      icon: 'users' as const,
      label: '报名人数',
      value: capacityText
    }
  ]

  const buttonMeta = BUTTON_META[buttonState]
  const hint = STATE_HINTS[buttonState]

  return (
    <View className='actdetail'>
      {header}

      <View className='actdetail__body'>
        {/* 封面 */}
        <View className='actdetail__cover'>
          {activity.coverUrl ? (
            <Image
              className='actdetail__cover-img'
              src={resolveFileUrl(activity.coverUrl)}
              mode='aspectFill'
            />
          ) : (
            <Icon name='image' size={128} color='#4B83FF' strokeWidth={2} />
          )}
          <View
            className='actdetail__badge'
            style={{ color: badge.color, backgroundColor: badge.bg }}
          >
            <Text>{badge.label}</Text>
          </View>
          {countdown ? (
            <View
              className='actdetail__countdown'
              style={{ color: countdown.includes('天') ? '#475569' : '#B45309' }}
            >
              <Text>{countdown}</Text>
            </View>
          ) : null}
        </View>

        {/* 基本信息 */}
        <View className='actdetail__info'>
          <View className='actdetail__title-row'>
            <Text className='actdetail__title'>{activity.title}</Text>
            {activity.category ? (
              <View className='actdetail__category'>
                <Text>{activity.category}</Text>
              </View>
            ) : null}
          </View>

          {registrationMeta ? (
            <View
              className='actdetail__reg-pill'
              style={{ color: registrationMeta.color, backgroundColor: registrationMeta.bg }}
            >
              <Text>我的报名：{registrationMeta.label}</Text>
            </View>
          ) : null}

          <View className='actdetail__grid'>
            {infoItems.map((item) => (
              <View key={item.label} className='actdetail__grid-item'>
                <View className='actdetail__grid-label'>
                  <Icon name={item.icon} size={32} color='#0062FF' />
                  <Text>{item.label}</Text>
                </View>
                <Text className='actdetail__grid-value'>{item.value}</Text>
              </View>
            ))}
          </View>

          {activity.capacity ? (
            <View className='actdetail__capacity'>
              <View className='actdetail__progress'>
                <View
                  className='actdetail__progress-fill'
                  style={{ width: `${progress}%` }}
                />
              </View>
              <View className='actdetail__capacity-caption'>
                <Text>已报名 {activity.registeredCount} 人</Text>
                <Text
                  style={remaining !== null && remaining <= 5 ? { color: '#B45309' } : undefined}
                >
                  余 {remaining ?? 0} 席
                </Text>
              </View>
            </View>
          ) : (
            <Text className='actdetail__capacity-caption'>
              已报名 {activity.registeredCount} 人 · 不限名额
            </Text>
          )}
        </View>

        {/* 我的报名进度 */}
        {registration ? (
          <View className='actdetail__card actdetail__progress-card'>
            <View className='actdetail__card-head'>
              <Text className='actdetail__card-label'>我的报名进度</Text>
              {registrationMeta ? (
                <View
                  className='actdetail__reg-pill actdetail__reg-pill--head'
                  style={{ color: registrationMeta.color, backgroundColor: registrationMeta.bg }}
                >
                  <Text>{registrationMeta.label}</Text>
                </View>
              ) : null}
            </View>

            <View className='actdetail__steps'>
              {steps.map((step) => (
                <View key={step.title} className='actdetail__step'>
                  <View
                    className={`actdetail__step-dot actdetail__step-dot--${step.state}`}
                  >
                    {step.state === 'done' ? (
                      <Icon name='check-circle' size={32} color='#FFFFFF' strokeWidth={2} />
                    ) : step.state === 'failed' ? (
                      <Icon name='x-circle' size={32} color='#FFFFFF' strokeWidth={2} />
                    ) : (
                      <Icon
                        name='hourglass'
                        size={28}
                        color={step.state === 'current' ? '#FFFFFF' : '#94A3B8'}
                        strokeWidth={2}
                      />
                    )}
                  </View>
                  <View className='actdetail__step-body'>
                    <Text
                      className={`actdetail__step-title ${
                        step.state === 'todo' ? 'actdetail__step-title--todo' : ''
                      }`}
                    >
                      {step.title}
                    </Text>
                    <Text className='actdetail__step-desc'>{step.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* 活动照片 */}
        {galleryImages.length > 0 ? (
          <View className='actdetail__card actdetail__gallery'>
            <View className='actdetail__card-head'>
              <Text className='actdetail__card-label'>活动照片</Text>
              <Text className='actdetail__gallery-count'>{galleryImages.length} 张</Text>
            </View>
            <View className='actdetail__gallery-grid'>
              {galleryImages.map((url, index) => (
                <View
                  key={`${url}-${index}`}
                  className='actdetail__gallery-item'
                  onClick={() => setPreviewIndex(index)}
                >
                  <Image
                    className='actdetail__gallery-img'
                    src={resolveFileUrl(url)}
                    mode='aspectFill'
                  />
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* 活动介绍 */}
        <View className='actdetail__card actdetail__desc'>
          <Text className='actdetail__card-label'>活动介绍</Text>
          {activity.description ? (
            <Text className='actdetail__desc-text'>{activity.description}</Text>
          ) : (
            <Text className='actdetail__desc-empty'>班委还没有填写活动介绍</Text>
          )}
        </View>

        {/* 吸底操作栏 */}
        <View className='actdetail__footer'>
          {countdown || remaining !== null ? (
            <View className='actdetail__footer-meta'>
              <Text>{remaining !== null ? `剩余 ${remaining} 个名额` : '不限名额'}</Text>
              {countdown ? (
                <Text
                  style={
                    (remaining !== null && remaining <= 5) ||
                    countdown.includes('分钟') ||
                    countdown.includes('小时')
                      ? { color: '#B45309' }
                      : undefined
                  }
                >
                  {countdown}
                </Text>
              ) : null}
            </View>
          ) : null}

          {hint ? <Text className='actdetail__footer-hint'>{hint}</Text> : null}

          <View
            className={`actdetail__register actdetail__register--${buttonMeta.tone}`}
            onClick={() => {
              if (!buttonMeta.disabled) void handleButtonClick()
            }}
          >
            <Text>{buttonMeta.label}</Text>
          </View>
        </View>

        {/* 图片预览 */}
        {previewIndex !== null && galleryImages[previewIndex] ? (
          <View
            className='actdetail__preview'
            onClick={() => setPreviewIndex(null)}
          >
            <View
              className='actdetail__preview-close'
              onClick={(e) => {
                e.stopPropagation()
                setPreviewIndex(null)
              }}
            >
              <Icon name='x' size={40} color='#FFFFFF' strokeWidth={2} />
            </View>

            {galleryImages.length > 1 ? (
              <View
                className='actdetail__preview-nav actdetail__preview-nav--prev'
                onClick={(e) => {
                  e.stopPropagation()
                  setPreviewIndex(
                    (previewIndex - 1 + galleryImages.length) % galleryImages.length
                  )
                }}
              >
                <Icon name='chevron-left' size={48} color='#FFFFFF' strokeWidth={2} />
              </View>
            ) : null}

            <Image
              className='actdetail__preview-img'
              src={resolveFileUrl(galleryImages[previewIndex])}
              mode='aspectFit'
              onClick={(e) => e.stopPropagation()}
            />

            {galleryImages.length > 1 ? (
              <View
                className='actdetail__preview-nav actdetail__preview-nav--next'
                onClick={(e) => {
                  e.stopPropagation()
                  setPreviewIndex((previewIndex + 1) % galleryImages.length)
                }}
              >
                <Icon name='chevron-right' size={48} color='#FFFFFF' strokeWidth={2} />
              </View>
            ) : null}

            <View className='actdetail__preview-counter'>
              <Text>
                {previewIndex + 1} / {galleryImages.length}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  )
}