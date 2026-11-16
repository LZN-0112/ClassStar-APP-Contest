import { useMemo, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useDidShow, useLoad } from '@tarojs/taro'

import { PageHeader } from '@/components/business'
import { Icon } from '@/components/ui'
import { voteApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

type FilterKey = 'all' | 'pending' | 'open' | 'ended'

interface Vote {
  id: string
  title: string
  voteType: 'single' | 'multiple'
  deadline: string
  status: 'published' | 'closed'
  participantCount: number
  participationRate: number
  options: { id: string; label: string; sortOrder: number }[]
  hasVoted?: boolean
}

const ACCENT = '#3D6BE5'
const PAGE_SIZE = 20

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待我投' },
  { key: 'open', label: '进行中' },
  { key: 'ended', label: '已结束' }
]

const isEnded = (vote: Vote) =>
  vote.status === 'closed' || new Date(vote.deadline).getTime() <= Date.now()

function formatDeadline(deadline: string) {
  const d = new Date(deadline)
  if (Number.isNaN(d.getTime())) return '时间待定'
  const diff = d.getTime() - Date.now()
  if (diff <= 0) return '已截止'
  const days = Math.floor(diff / 86400000)
  if (days > 0) return `${days}天后截止`
  const hours = Math.floor(diff / 3600000)
  if (hours > 0) return `${hours}小时后截止`
  const minutes = Math.max(1, Math.floor(diff / 60000))
  return `${minutes}分钟后截止`
}

export default function VoteList() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const user = useUserStore((s) => s.userInfo)
  const { requireLogin } = useAuth()

  const [classId, setClassId] = useState('')
  const [votes, setVotes] = useState<Vote[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [failed, setFailed] = useState(false)
  const [filter, setFilter] = useState<FilterKey>('all')

  const classIdValue = classId || currentClassId || ''
  const canPublish =
    user?.roleLevel === 'owner' ||
    user?.roleLevel === 'admin' ||
    user?.isCommittee === true

  useLoad((options) => {
    if (!requireLogin()) return
    setClassId((options?.classId as string) || currentClassId || '')
  })

  useDidShow(() => {
    if (classIdValue) void loadVotes(1)
  })

  const loadVotes = async (nextPage: number, append = false) => {
    if (!classIdValue) {
      setLoading(false)
      return
    }
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
      setFailed(false)
    }
    try {
      const data: any = await voteApi.getList(classIdValue, {
        page: nextPage,
        pageSize: PAGE_SIZE
      })
      const list: Vote[] = data?.list || []
      setVotes((prev) => (append ? [...prev, ...list] : list))
      setTotal(Number(data?.total) || list.length)
      setPage(nextPage)
    } catch (err) {
      if (append) {
        Taro.showToast({ title: '加载更多失败，请稍后重试', icon: 'none' })
      } else {
        setFailed(true)
        Taro.showToast({
          title: err instanceof Error ? err.message : '获取投票列表失败',
          icon: 'none'
        })
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const counts = useMemo(() => {
    const ended = votes.filter(isEnded).length
    return {
      all: votes.length,
      pending: votes.filter((v) => !isEnded(v) && !v.hasVoted).length,
      open: votes.filter((v) => !isEnded(v)).length,
      ended
    } as Record<FilterKey, number>
  }, [votes])

  const filtered = useMemo(() => {
    if (filter === 'pending') return votes.filter((v) => !isEnded(v) && !v.hasVoted)
    if (filter === 'open') return votes.filter((v) => !isEnded(v))
    if (filter === 'ended') return votes.filter(isEnded)
    return votes
  }, [votes, filter])

  const emptyCopy =
    filter === 'pending'
      ? { title: '没有待参与的投票', desc: '新的投票发起后会出现在这里' }
      : filter === 'open'
        ? { title: '暂无进行中的投票', desc: '投票截止后会归类到「已结束」' }
        : filter === 'ended'
          ? { title: '暂无已结束的投票', desc: '投票截止后会自动归档到这里' }
          : { title: '还没有人发起投票', desc: '班委发起投票后，全班同学都会收到' }

  const goPublish = () => {
    Taro.navigateTo({ url: '/pages-sub/vote/publish/index' })
  }

  const openVote = (vote: Vote) => {
    const ended = isEnded(vote)
    Taro.navigateTo({
      url: `/pages-sub/vote/options/index?classId=${classIdValue}&voteId=${vote.id}${
        ended || vote.hasVoted ? '&readOnly=1' : ''
      }`
    })
  }

  return (
    <View className='votelist'>
      <PageHeader
        title='投票列表'
        variant='b'
        decor='bar-chart'
        right={
          canPublish ? (
            <View className='votelist__publish' onClick={goPublish}>
              <Icon name='plus' size={32} color='#FFFFFF' strokeWidth={2} />
              <Text className='votelist__publish-text'>发布投票</Text>
            </View>
          ) : undefined
        }
      />

      <View className='votelist__body'>
        <View className='votelist__filters'>
          {FILTERS.map((item) => {
            const active = filter === item.key
            return (
              <View
                key={item.key}
                className={`votelist__filter ${
                  active ? 'votelist__filter--active' : ''
                }`}
                onClick={() => setFilter(item.key)}
              >
                <Text
                  className={`votelist__filter-label ${
                    active ? 'votelist__filter-label--active' : ''
                  }`}
                >
                  {item.label}
                </Text>
                <Text
                  className={`votelist__filter-count ${
                    active ? 'votelist__filter-count--active' : ''
                  }`}
                >
                  {counts[item.key]}
                </Text>
              </View>
            )
          })}
        </View>

        {loading ? (
          <View className='votelist__skeletons'>
            {[0, 1, 2].map((i) => (
              <View key={i} className='votelist__skeleton' />
            ))}
          </View>
        ) : failed ? (
          <View className='votelist__state'>
            <View className='votelist__state-icon'>
              <Icon name='refresh-cw' size={48} color='#94A3B8' strokeWidth={2} />
            </View>
            <Text className='votelist__state-title'>列表加载失败</Text>
            <Text className='votelist__state-desc'>请检查网络后重试</Text>
            <View
              className='votelist__state-btn'
              onClick={() => void loadVotes(1)}
            >
              <Text>重新加载</Text>
            </View>
          </View>
        ) : filtered.length === 0 ? (
          <View className='votelist__state'>
            <View className='votelist__state-icon votelist__state-icon--vote'>
              <Icon name='vote' size={48} color={ACCENT} strokeWidth={2} />
            </View>
            <Text className='votelist__state-title'>{emptyCopy.title}</Text>
            <Text className='votelist__state-desc'>{emptyCopy.desc}</Text>
            {canPublish && filter === 'all' ? (
              <View
                className='votelist__state-btn votelist__state-btn--row'
                onClick={goPublish}
              >
                <Icon name='plus' size={32} color='#FFFFFF' strokeWidth={2} />
                <Text>发起第一个投票</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View className='votelist__list'>
            {filtered.map((vote) => {
              const ended = isEnded(vote)
              const hasVoted = vote.hasVoted === true
              const pending = !ended && !hasVoted
              const percent = Math.min(Math.max(vote.participationRate || 0, 0), 100)

              const statusChip = ended
                ? { text: '已结束', color: '#64748B', bg: '#F1F5F9', dot: '#CBD5E1' }
                : hasVoted
                  ? { text: '已投票', color: '#2F9E86', bg: '#E8F6F1', dot: '#2F9E86' }
                  : { text: '待投票', color: ACCENT, bg: '#EDF1FD', dot: ACCENT }

              const cta = ended ? '查看结果' : hasVoted ? '已投票' : '去投票'
              const ctaColor = pending ? ACCENT : hasVoted ? '#2F9E86' : '#64748B'
              const ctaBg = pending ? '#EDF1FD' : hasVoted ? '#E8F6F1' : '#F1F5F9'

              return (
                <View
                  key={vote.id}
                  className='votelist__card'
                  onClick={() => openVote(vote)}
                >
                  {pending ? <View className='votelist__accent' /> : null}

                  <View className='votelist__row'>
                    <View
                      className='votelist__chip'
                      style={{ color: statusChip.color, background: statusChip.bg }}
                    >
                      <View
                        className='votelist__chip-dot'
                        style={{ background: statusChip.dot }}
                      />
                      <Text className='votelist__chip-text'>{statusChip.text}</Text>
                    </View>
                    <View className='votelist__type'>
                      <Text className='votelist__type-text'>
                        {vote.voteType === 'single' ? '单选' : '多选'}
                      </Text>
                    </View>
                    <View className='votelist__deadline'>
                      <Icon name='clock' size={24} color='#94A3B8' strokeWidth={2} />
                      <Text className='votelist__deadline-text'>
                        {formatDeadline(vote.deadline)}
                      </Text>
                    </View>
                  </View>

                  <Text className='votelist__title'>{vote.title}</Text>

                  <View className='votelist__bottom'>
                    <View className='votelist__stats'>
                      <Icon name='users' size={26} color='#94A3B8' strokeWidth={2} />
                      <Text className='votelist__stats-text'>
                        <Text className='votelist__stats-num'>
                          {vote.participantCount || 0}
                        </Text>
                        <Text>人参与</Text>
                        <Text className='votelist__stats-divider'>·</Text>
                        <Text>
                          参与率{' '}
                          <Text className='votelist__stats-num'>{percent}%</Text>
                        </Text>
                      </Text>
                    </View>
                    <View
                      className='votelist__cta'
                      style={{ color: ctaColor, background: ctaBg }}
                    >
                      {hasVoted && !ended ? (
                        <Icon
                          name='check-circle'
                          size={28}
                          color={ctaColor}
                          strokeWidth={2}
                        />
                      ) : null}
                      <Text className='votelist__cta-text'>{cta}</Text>
                      <Icon
                        name='chevron-right'
                        size={28}
                        color={ctaColor}
                        strokeWidth={2}
                      />
                    </View>
                  </View>

                  <View className='votelist__track'>
                    <View
                      className={`votelist__fill ${
                        ended ? 'votelist__fill--ended' : ''
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </View>
                </View>
              )
            })}

            {votes.length < total ? (
              <View
                className='votelist__more'
                onClick={() => {
                  if (!loadingMore) void loadVotes(page + 1, true)
                }}
              >
                <Text>
                  {loadingMore
                    ? '加载中...'
                    : `加载更多（${votes.length}/${total}）`}
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </View>
    </View>
  )
}