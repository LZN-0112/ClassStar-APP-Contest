import { useCallback, useEffect, useMemo, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useDidShow, useLoad } from '@tarojs/taro'

import { PageHeader } from '@/components/business'
import { Icon } from '@/components/ui'
import { homeworkApi } from '@/services'
import { useAuth } from '@/utils'
import './index.scss'

type FilterTab = '全部' | '待提交' | '已提交' | '已逾期' | '审核中' | '进行中' | '已截止'
type GroupKey = 'urgent' | 'today' | 'week' | 'later' | 'ongoing' | 'archive'

interface HomeworkItem {
  id: string
  title: string
  subject: string
  deadline: string
  submitted: boolean
  mySubmissionStatus: string | null
  myDelayStatus: string | null
  myDelayDeadline: string | null
  pendingDelayCount: number
  submissionCount: number
  totalMembers: number
  publisher: { id: string; name: string } | null
}

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  待提交: { bg: '#EFF6FF', color: '#0062FF' },
  已提交: { bg: '#F0FDF4', color: '#16A34A' },
  已逾期: { bg: '#FEF2F2', color: '#DC2626' },
  审核中: { bg: '#FFFBEB', color: '#D97706' },
  进行中: { bg: '#EFF6FF', color: '#0062FF' },
  已截止: { bg: '#F1F5F9', color: '#64748B' }
}

const SUBJECT_STYLE: Record<string, { color: string; bg: string }> = {
  语文: { bg: '#FEF2F2', color: '#DC2626' },
  数学: { bg: '#EFF6FF', color: '#2563EB' },
  英语: { bg: '#F5F3FF', color: '#7C3AED' },
  物理: { bg: '#ECFEFF', color: '#0891B2' },
  化学: { bg: '#F0FDF4', color: '#16A34A' },
  生物: { bg: '#F0FDFA', color: '#0F766E' },
  历史: { bg: '#FFFBEB', color: '#D97706' },
  地理: { bg: '#F0F9FF', color: '#0284C7' },
  政治: { bg: '#FDF2F8', color: '#DB2777' }
}

const GROUP_META: Record<GroupKey, { title: string; dot: string }> = {
  urgent: { title: '需处理', dot: '#EF4444' },
  today: { title: '今天截止', dot: '#F59E0B' },
  week: { title: '本周内截止', dot: '#0062FF' },
  later: { title: '更晚截止', dot: '#94A3B8' },
  ongoing: { title: '进行中', dot: '#0062FF' },
  archive: { title: '已完成 / 已截止', dot: '#CBD5E1' }
}

function startOfDay(ms: number): number {
  const d = new Date(ms)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** 今天 23:59 / 明天 08:00 / 11月20日 18:00 */
function formatDeadline(dateStr: string, now: number): string {
  const t = new Date(dateStr).getTime()
  const d = new Date(t)
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const diffDay = Math.round((startOfDay(t) - startOfDay(now)) / 86400000)
  if (diffDay === 0) return `今天 ${hm}`
  if (diffDay === 1) return `明天 ${hm}`
  if (diffDay === 2) return `后天 ${hm}`
  if (diffDay === -1) return `昨天 ${hm}`
  return `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`
}

/** 剩余/逾期时间 */
function remainingText(dateStr: string, now: number): string {
  const diff = new Date(dateStr).getTime() - now
  if (diff <= 0) {
    const days = Math.ceil(-diff / 86400000)
    return days <= 1 ? '已逾期' : `已逾期 ${days} 天`
  }
  const hours = diff / 3600000
  if (hours < 1) return `剩 ${Math.max(1, Math.ceil(diff / 60000))} 分钟`
  if (hours < 24) return `剩 ${Math.floor(hours)} 小时`
  return `剩 ${Math.ceil(hours / 24)} 天`
}

function remainingColor(dateStr: string, now: number): string {
  const diff = new Date(dateStr).getTime() - now
  if (diff <= 0) return '#DC2626'
  if (diff <= 86400000) return '#D97706'
  return '#64748B'
}

export default function HomeworkList() {
  const { user, isCommittee, requireLogin } = useAuth()
  const [filter, setFilter] = useState<FilterTab>('全部')
  const [homeworks, setHomeworks] = useState<HomeworkItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showArchive, setShowArchive] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const isManager = isCommittee
  const classId = user?.classId

  const tabs: FilterTab[] = isManager
    ? ['全部', '进行中', '已截止']
    : ['全部', '待提交', '已提交', '已逾期', '审核中']

  useLoad(() => {
    requireLogin()
  })

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(timer)
  }, [])

  const load = useCallback(() => {
    if (!classId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    homeworkApi
      .getList(classId, { pageSize: 100 })
      .then((data: any) => {
        setHomeworks(data?.list || [])
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : '作业加载失败')
      })
      .finally(() => setLoading(false))
  }, [classId])

  useDidShow(() => {
    load()
  })

  /** 延时已通过时，以新的截止时间计算状态 */
  const effectiveDeadline = useCallback((item: HomeworkItem): string => {
    return item.myDelayStatus === 'approved' && item.myDelayDeadline
      ? item.myDelayDeadline
      : item.deadline
  }, [])

  const getStatus = useCallback(
    (item: HomeworkItem): string => {
      if (isManager) {
        return new Date(item.deadline).getTime() > now ? '进行中' : '已截止'
      }
      if (item.submitted) return '已提交'
      if (item.myDelayStatus === 'pending') return '审核中'
      return new Date(effectiveDeadline(item)).getTime() > now ? '待提交' : '已逾期'
    },
    [isManager, now, effectiveDeadline]
  )

  const counts = useMemo(() => {
    const result: Record<string, number> = {
      待提交: 0,
      已提交: 0,
      已逾期: 0,
      审核中: 0,
      进行中: 0,
      已截止: 0
    }
    homeworks.forEach((item) => {
      const status = getStatus(item)
      result[status] = (result[status] || 0) + 1
    })
    return result
  }, [homeworks, getStatus])

  const overview = useMemo(() => {
    if (isManager) {
      const pending = homeworks.reduce((sum, item) => sum + (item.pendingDelayCount || 0), 0)
      return [
        { label: '进行中', value: counts['进行中'] || 0, color: '#0062FF', bg: '#EFF6FF' },
        { label: '待审批延时', value: pending, color: '#D97706', bg: '#FFFBEB' },
        { label: '已截止', value: counts['已截止'] || 0, color: '#475569', bg: '#F1F5F9' }
      ]
    }
    let pending = 0
    let today = 0
    let overdue = 0
    homeworks.forEach((item) => {
      if (item.submitted) return
      const status = getStatus(item)
      // 概览与 Tab 使用同一套状态口径：待提交、已逾期各自独立统计
      if (status === '已逾期') {
        overdue += 1
        return
      }
      if (status !== '待提交') return
      pending += 1
      if (startOfDay(new Date(effectiveDeadline(item)).getTime()) === startOfDay(now)) {
        today += 1
      }
    })
    return [
      { label: '待提交', value: pending, color: '#0062FF', bg: '#EFF6FF' },
      { label: '今天截止', value: today, color: '#D97706', bg: '#FFFBEB' },
      { label: '已逾期', value: overdue, color: '#DC2626', bg: '#FEF2F2' }
    ]
  }, [homeworks, isManager, counts, getStatus, effectiveDeadline, now])

  /** “全部”下的时间分组 */
  const groups = useMemo(() => {
    const buckets: Record<GroupKey, HomeworkItem[]> = {
      urgent: [],
      today: [],
      week: [],
      later: [],
      ongoing: [],
      archive: []
    }

    homeworks.forEach((item) => {
      const status = getStatus(item)
      if (isManager) {
        if ((item.pendingDelayCount || 0) > 0) {
          buckets.urgent.push(item)
        } else if (status === '进行中') {
          buckets.ongoing.push(item)
        } else {
          buckets.archive.push(item)
        }
        return
      }
      if (status === '已提交') {
        buckets.archive.push(item)
        return
      }
      if (status === '已逾期' || status === '审核中') {
        buckets.urgent.push(item)
        return
      }
      const dayDiff = Math.round(
        (startOfDay(new Date(effectiveDeadline(item)).getTime()) - startOfDay(now)) / 86400000
      )
      if (dayDiff <= 0) buckets.today.push(item)
      else if (dayDiff <= 6) buckets.week.push(item)
      else buckets.later.push(item)
    })

    const byDeadlineAsc = (a: HomeworkItem, b: HomeworkItem) =>
      new Date(effectiveDeadline(a)).getTime() - new Date(effectiveDeadline(b)).getTime()
    const byDeadlineDesc = (a: HomeworkItem, b: HomeworkItem) =>
      new Date(b.deadline).getTime() - new Date(a.deadline).getTime()

    ;(['urgent', 'today', 'week', 'later', 'ongoing'] as GroupKey[]).forEach((key) => {
      buckets[key].sort(byDeadlineAsc)
    })
    buckets.archive.sort(byDeadlineDesc)

    const order: GroupKey[] = isManager
      ? ['urgent', 'ongoing', 'archive']
      : ['urgent', 'today', 'week', 'later', 'archive']

    return order
      .map((key) => ({
        key,
        ...GROUP_META[key],
        title: key === 'archive' && isManager ? '已截止' : GROUP_META[key].title,
        items: buckets[key]
      }))
      .filter((group) => group.items.length > 0)
  }, [homeworks, isManager, getStatus, effectiveDeadline, now])

  const filtered = useMemo(() => {
    if (filter === '全部') return homeworks
    const list = homeworks.filter((item) => getStatus(item) === filter)
    const byDeadline = (a: HomeworkItem, b: HomeworkItem) =>
      filter === '已提交' || filter === '已截止'
        ? new Date(b.deadline).getTime() - new Date(a.deadline).getTime()
        : new Date(effectiveDeadline(a)).getTime() - new Date(effectiveDeadline(b)).getTime()
    return [...list].sort(byDeadline)
  }, [filter, homeworks, getStatus, effectiveDeadline])

  const goDetail = (item: HomeworkItem) => {
    Taro.navigateTo({
      url: `/pages-sub/homework/detail/index?classId=${classId}&homeworkId=${item.id}`
    })
  }

  const renderCard = (item: HomeworkItem) => {
    const status = getStatus(item)
    const subjectStyle = SUBJECT_STYLE[item.subject] || { bg: '#F1F5F9', color: '#475569' }
    const statusStyle = STATUS_STYLE[status] || STATUS_STYLE['待提交']
    const deadline = effectiveDeadline(item)
    const total = item.totalMembers || 0
    const submittedCount = item.submissionCount || 0
    const percent = total > 0 ? Math.min(Math.round((submittedCount / total) * 100), 100) : 0
    const pendingDelay = item.pendingDelayCount || 0

    return (
      <View key={item.id} className='hwlist__card' onClick={() => goDetail(item)}>
        <View className='hwlist__card-top'>
          <Text
            className='hwlist__subject'
            style={{ backgroundColor: subjectStyle.bg, color: subjectStyle.color }}
          >
            {item.subject}
          </Text>
          <Text
            className='hwlist__status'
            style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
          >
            {status === '审核中' ? '延时审核中' : status}
          </Text>
        </View>

        <View className='hwlist__title-row'>
          <Text className='hwlist__title'>{item.title}</Text>
          <Icon
            name='chevron-right'
            size={32}
            color='#CBD5E1'
            strokeWidth={2}
            className='hwlist__title-chevron'
          />
        </View>

        <View className='hwlist__meta'>
          <Icon name='clock' size={28} color='#94A3B8' strokeWidth={2} />
          <Text className='hwlist__meta-text'>{formatDeadline(deadline, now)} 截止</Text>
          <Text className='hwlist__meta-dot'>·</Text>
          <Text
            className='hwlist__meta-remaining'
            style={{ color: status === '已提交' ? '#16A34A' : remainingColor(deadline, now) }}
          >
            {status === '已提交' ? '已完成' : remainingText(deadline, now)}
          </Text>
          {item.myDelayStatus === 'approved' && (
            <Text className='hwlist__delay-tag'>已延期</Text>
          )}
        </View>

        <View className='hwlist__footer'>
          <Text className='hwlist__publisher'>
            {item.publisher?.name ? `${item.publisher.name} 发布` : '班级作业'}
          </Text>

          {isManager ? (
            pendingDelay > 0 ? (
              <View
                className='hwlist__action hwlist__action--warn'
                onClick={(e) => {
                  e.stopPropagation()
                  goDetail(item)
                }}
              >
                <Text className='hwlist__action-text hwlist__action-text--warn'>
                  待审批 {pendingDelay} · 去审批
                </Text>
              </View>
            ) : (
              <Text className='hwlist__muted-action'>查看详情</Text>
            )
          ) : status === '已提交' ? (
            <View className='hwlist__done'>
              <Icon name='check-circle' size={28} color='#16A34A' strokeWidth={2} />
              <Text className='hwlist__done-text'>查看提交</Text>
            </View>
          ) : status === '审核中' ? (
            <View className='hwlist__action hwlist__action--muted'>
              <Icon name='clock' size={28} color='#94A3B8' strokeWidth={2} />
              <Text className='hwlist__action-text hwlist__action-text--muted'>审核中</Text>
            </View>
          ) : status === '已逾期' ? (
            <View
              className='hwlist__action hwlist__action--danger'
              onClick={(e) => {
                e.stopPropagation()
                Taro.navigateTo({
                  url: `/pages-sub/homework/delay-apply/index?classId=${classId}&homeworkId=${item.id}`
                })
              }}
            >
              <Icon name='clock' size={28} color='#DC2626' strokeWidth={2} />
              <Text className='hwlist__action-text hwlist__action-text--danger'>申请延时</Text>
            </View>
          ) : (
            <View
              className='hwlist__action hwlist__action--primary'
              onClick={(e) => {
                e.stopPropagation()
                Taro.navigateTo({
                  url: `/pages-sub/homework/submit/index?classId=${classId}&homeworkId=${item.id}`
                })
              }}
            >
              <Icon name='send' size={28} color='#FFFFFF' strokeWidth={2} />
              <Text className='hwlist__action-text hwlist__action-text--primary'>去提交</Text>
            </View>
          )}
        </View>

        {isManager && (
          <View className='hwlist__progress'>
            <View className='hwlist__progress-info'>
              <Text className='hwlist__progress-label'>
                已交 <Text className='hwlist__progress-count'>{submittedCount}</Text>
                <Text className='hwlist__progress-total'>/{total}</Text>
              </Text>
              <Text className='hwlist__progress-percent'>{percent}%</Text>
            </View>
            <View className='hwlist__progress-bar'>
              <View
                className={`hwlist__progress-fill ${
                  percent >= 100 ? 'hwlist__progress-fill--done' : ''
                }`}
                style={{ width: `${percent}%` }}
              />
            </View>
          </View>
        )}
      </View>
    )
  }

  return (
    <View className='hwlist'>
      <PageHeader
        title='作业列表'
        decor='file-text'
        right={
          isManager ? (
            <View className='hwlist__head-actions'>
              <View
                className='hwlist__head-btn'
                onClick={() =>
                  Taro.navigateTo({
                    url: `/pages-sub/homework/offline-check/index?classId=${classId}`
                  })
                }
              >
                <Icon name='clipboard-check' size={32} color='#FFFFFF' strokeWidth={2} />
                <Text className='hwlist__head-btn-text'>离线核对</Text>
              </View>
              <View
                className='hwlist__head-btn'
                onClick={() =>
                  Taro.navigateTo({
                    url: `/pages-sub/homework/publish/index?classId=${classId}`
                  })
                }
              >
                <Icon name='plus' size={32} color='#FFFFFF' strokeWidth={2} />
                <Text className='hwlist__head-btn-text'>发布</Text>
              </View>
            </View>
          ) : null
        }
      />

      <View className='hwlist__body'>
        {/* 概览 */}
        <View className='hwlist__overview'>
          {overview.map((item) => (
            <View
              key={item.label}
              className='hwlist__overview-item'
              style={{ backgroundColor: item.bg }}
            >
              <Text className='hwlist__overview-value' style={{ color: item.color }}>
                {item.value}
              </Text>
              <Text className='hwlist__overview-label' style={{ color: item.color }}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>

        {/* 筛选 */}
        <View className='hwlist__tabs'>
          {tabs.map((tab) => {
            const active = filter === tab
            const count = tab === '全部' ? homeworks.length : counts[tab] || 0
            return (
              <View
                key={tab}
                className={`hwlist__tab ${active ? 'hwlist__tab--active' : ''}`}
                onClick={() => setFilter(tab)}
              >
                <Text
                  className={`hwlist__tab-text ${
                    active ? 'hwlist__tab-text--active' : ''
                  }`}
                >
                  {tab}
                </Text>
                {count > 0 && (
                  <View
                    className={`hwlist__tab-count ${
                      active ? 'hwlist__tab-count--active' : ''
                    }`}
                  >
                    <Text
                      className={`hwlist__tab-count-text ${
                        active ? 'hwlist__tab-count-text--active' : ''
                      }`}
                    >
                      {count > 99 ? '99+' : count}
                    </Text>
                  </View>
                )}
              </View>
            )
          })}
        </View>

        {loading ? (
          <View className='hwlist__skeletons'>
            {[0, 1, 2].map((i) => (
              <View key={i} className='hwlist__skeleton' />
            ))}
          </View>
        ) : error ? (
          <View className='hwlist__error'>
            <Icon
              name='alert-circle'
              size={64}
              color='#B91C1C'
              strokeWidth={2}
              className='hwlist__error-icon'
            />
            <Text className='hwlist__error-text'>{error}</Text>
            <View className='hwlist__retry' onClick={load}>
              <Icon name='refresh' size={28} color='#B91C1C' strokeWidth={2} />
              <Text className='hwlist__retry-text'>重新加载</Text>
            </View>
          </View>
        ) : !classId ? (
          <View className='hwlist__empty'>
            <Icon
              name='file-text'
              size={96}
              color='#9CA3AF'
              strokeWidth={1.5}
              className='hwlist__empty-icon'
            />
            <Text className='hwlist__empty-title'>尚未加入班级</Text>
            <Text className='hwlist__empty-desc'>加入班级后即可查看和提交作业</Text>
          </View>
        ) : homeworks.length === 0 ? (
          <View className='hwlist__empty'>
            <Icon
              name='file-text'
              size={96}
              color='#9CA3AF'
              strokeWidth={1.5}
              className='hwlist__empty-icon'
            />
            <Text className='hwlist__empty-title'>暂无作业</Text>
            {isManager && (
              <View
                className='hwlist__empty-btn'
                onClick={() =>
                  Taro.navigateTo({
                    url: `/pages-sub/homework/publish/index?classId=${classId}`
                  })
                }
              >
                <Text className='hwlist__empty-btn-text'>发布第一份作业</Text>
              </View>
            )}
          </View>
        ) : filter === '全部' ? (
          <View className='hwlist__groups'>
            {groups.map((group) => {
              const collapsible = group.key === 'archive' && groups.length > 1
              if (collapsible && !showArchive) {
                return (
                  <View
                    key={group.key}
                    className='hwlist__archive-toggle'
                    onClick={() => setShowArchive(true)}
                  >
                    <Text className='hwlist__archive-toggle-text'>
                      {group.title} {group.items.length} 份
                    </Text>
                    <Icon name='chevron-down' size={28} color='#94A3B8' strokeWidth={2} />
                  </View>
                )
              }
              return (
                <View key={group.key} className='hwlist__group'>
                  <View className='hwlist__group-head'>
                    <View
                      className='hwlist__group-dot'
                      style={{ backgroundColor: group.dot }}
                    />
                    <Text className='hwlist__group-title'>{group.title}</Text>
                    <Text className='hwlist__group-count'>{group.items.length}</Text>
                    {collapsible && (
                      <View
                        className='hwlist__group-collapse'
                        onClick={() => setShowArchive(false)}
                      >
                        <Text className='hwlist__group-collapse-text'>收起</Text>
                        <Icon
                          name='chevron-down'
                          size={28}
                          color='#94A3B8'
                          strokeWidth={2}
                          className='hwlist__chevron-up'
                        />
                      </View>
                    )}
                  </View>
                  {group.items.map(renderCard)}
                </View>
              )
            })}
          </View>
        ) : filtered.length === 0 ? (
          <View className='hwlist__empty'>
            <Icon
              name='file-text'
              size={96}
              color='#9CA3AF'
              strokeWidth={1.5}
              className='hwlist__empty-icon'
            />
            <Text className='hwlist__empty-title'>该分类下暂无作业</Text>
          </View>
        ) : (
          <View className='hwlist__group'>
            <Text className='hwlist__filtered-count'>共 {filtered.length} 份</Text>
            {filtered.map(renderCard)}
          </View>
        )}
      </View>
    </View>
  )
}