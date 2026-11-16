// ============================================================
// 投票详情 / 投票结果 — 1:1 对齐 front/src/pages/votes/VoteOptions.tsx
// ============================================================
import { useEffect, useMemo, useState } from 'react'
import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { PageHeader } from '@/components/business'
import { Icon } from '@/components/ui'
import { voteApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

interface VoteOption {
  id: string
  label: string
  sortOrder: number
  voteCount?: number
  percentage?: number
}

interface VoteDetail {
  id: string
  title: string
  voteType: 'single' | 'multiple'
  deadline: string
  status: 'published' | 'closed'
  isOpen: boolean
  hasVoted: boolean
  myOptionIds?: string[]
  participantCount: number
  options: VoteOption[]
}

interface ResultOption {
  id: string
  label: string
  count: number
  rate: number
}

interface ResultSummary {
  totalParticipants: number
  participationRate: number
}

function formatRemaining(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now()
  if (Number.isNaN(diff)) return '时间待定'
  if (diff <= 0) return '已截止'
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  if (days > 0) return `剩余 ${days} 天 ${hours} 小时`
  if (hours > 0) return `剩余 ${hours} 小时 ${minutes} 分`
  return `剩余 ${Math.max(1, minutes)} 分钟`
}

export default function VoteOptions() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireLogin } = useAuth()

  const [classId, setClassId] = useState('')
  const [voteId, setVoteId] = useState('')
  const [readOnly, setReadOnly] = useState(false)

  const [vote, setVote] = useState<VoteDetail | null>(null)
  const [results, setResults] = useState<ResultOption[]>([])
  const [summary, setSummary] = useState<ResultSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [, setTick] = useState(0)

  useLoad((o) => {
    if (!requireLogin()) return
    const cid = (o?.classId as string) || currentClassId || ''
    const vid = (o?.voteId as string) || ''
    if (!cid || !vid) {
      Taro.showToast({ title: '参数缺失', icon: 'none' })
      setTimeout(() => Taro.navigateBack(), 400)
      return
    }
    setClassId(cid)
    setVoteId(vid)
    setReadOnly(o?.readOnly === '1' || o?.readOnly === 'true')
  })

  const loadVote = async () => {
    if (!classId || !voteId) return
    try {
      const [detailRes, resultRes]: any[] = await Promise.all([
        voteApi.getDetail(classId, voteId),
        voteApi.getResults(classId, voteId)
      ])
      const detail: VoteDetail = detailRes?.data || detailRes
      setVote(detail)
      if (detail?.myOptionIds?.length) setSelected(new Set(detail.myOptionIds))

      const rdata = resultRes?.data || resultRes
      if (rdata?.options) {
        setResults(rdata.options)
        setSummary({
          totalParticipants: Number(rdata.totalParticipants) || 0,
          participationRate: Number(rdata.participationRate) || 0
        })
      }
    } catch (err) {
      setVote(null)
      Taro.showToast({
        title: err instanceof Error ? err.message : '获取投票信息失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (classId && voteId) void loadVote()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, voteId])

  // 每 30 秒刷新剩余时间文案
  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 30000)
    return () => clearInterval(timer)
  }, [])

  const backToList = () => {
    if (Taro.getCurrentPages().length > 1) Taro.navigateBack()
    else Taro.redirectTo({ url: '/pages-sub/vote/list/index' })
  }

  const handleSelect = (optionId: string) => {
    if (!vote || vote.hasVoted || !vote.isOpen || readOnly) return
    if (vote.voteType === 'single') {
      setSelected(new Set([optionId]))
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(optionId)) next.delete(optionId)
        else next.add(optionId)
        return next
      })
    }
  }

  const handleSubmit = async () => {
    if (!vote || !classId || submitting) return
    if (selected.size === 0) {
      Taro.showToast({ title: '请至少选择一个选项', icon: 'none' })
      return
    }
    setSubmitting(true)
    try {
      await voteApi.submitVote(classId, voteId, { optionIds: Array.from(selected) })
      setConfirmOpen(false)
      Taro.showToast({ title: '投票成功，可在此查看实时结果', icon: 'none' })
      await loadVote()
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '投票失败，请稍后重试',
        icon: 'none'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const isEnded = vote
    ? vote.status === 'closed' || new Date(vote.deadline).getTime() <= Date.now()
    : false
  const showResults = vote ? readOnly || vote.hasVoted || isEnded : false
  const selectable = vote ? !vote.hasVoted && vote.isOpen && !readOnly : false
  const canSubmit = selected.size > 0 && selectable && !submitting
  const isMultiple = vote?.voteType === 'multiple'
  const participation = summary?.participationRate ?? 0
  const totalParticipants = summary?.totalParticipants ?? vote?.participantCount ?? 0

  const myOptionIds = useMemo(() => new Set(vote?.myOptionIds || []), [vote])

  const leaderId = useMemo(
    () =>
      results.reduce<ResultOption | null>((best, item) => {
        if (!best || item.count > best.count) return item.count > 0 ? item : best
        return best
      }, null)?.id,
    [results]
  )

  const selectedLabels = useMemo(
    () =>
      (vote?.options || [])
        .filter((option) => selected.has(option.id))
        .map((option) => option.label),
    [vote, selected]
  )

  // ---------- 加载中 ----------
  if (loading) {
    return (
      <View className='voteopt'>
        <PageHeader title='投票详情' variant='b' />
        <View className='voteopt__body'>
          <View className='voteopt__skeleton voteopt__skeleton--head' />
          <View className='voteopt__skeleton voteopt__skeleton--list' />
        </View>
      </View>
    )
  }

  // ---------- 未找到 ----------
  if (!vote) {
    return (
      <View className='voteopt'>
        <PageHeader title='投票详情' variant='b' />
        <View className='voteopt__missing'>
          <Text className='voteopt__missing-text'>未找到投票信息</Text>
          <View className='voteopt__missing-btn' onClick={backToList}>
            <Text>返回列表</Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className='voteopt'>
      <PageHeader
        title={showResults ? '投票结果' : '参与投票'}
        variant='b'
        decor='bar-chart'
      />

      <View className='voteopt__body'>
        {/* 标题卡 */}
        <View className='voteopt__head'>
          <View className='voteopt__chips'>
            <View className='voteopt__chip voteopt__chip--type'>
              <Text>{isMultiple ? '多选' : '单选'}</Text>
            </View>
            <View
              className={`voteopt__chip ${
                isEnded
                  ? 'voteopt__chip--ended'
                  : vote.hasVoted
                    ? 'voteopt__chip--voted'
                    : 'voteopt__chip--open'
              }`}
            >
              <Text>{isEnded ? '已结束' : vote.hasVoted ? '已投票' : '进行中'}</Text>
            </View>
          </View>

          <Text className='voteopt__title'>{vote.title}</Text>

          <View className='voteopt__meta'>
            <View className='voteopt__meta-item'>
              <Icon name='clock' size={26} color='#94A3B8' strokeWidth={1.8} />
              <Text>{formatRemaining(vote.deadline)}</Text>
            </View>
            <View className='voteopt__meta-item'>
              <Icon name='users' size={26} color='#94A3B8' strokeWidth={1.8} />
              <Text>
                {totalParticipants} 人参与
              </Text>
            </View>
            <Text>
              参与率 {participation}%
            </Text>
          </View>

          <View className='voteopt__track'>
            <View
              className='voteopt__fill'
              style={{ width: `${Math.min(participation, 100)}%` }}
            />
          </View>
        </View>

        {/* 选项 / 结果 */}
        <View className='voteopt__card'>
          <View className='voteopt__card-head'>
            <Text className='voteopt__card-label'>
              {showResults
                ? '投票结果'
                : isMultiple
                  ? '请选择多项（可多选）'
                  : '请选择一项'}
            </Text>
            <Text className='voteopt__card-hint'>
              {showResults
                ? `${totalParticipants} 人已投票`
                : isMultiple
                  ? `已选 ${selected.size} 项`
                  : selected.size > 0
                    ? '已选 1 项'
                    : '未选择'}
            </Text>
          </View>

          <View className='voteopt__options'>
            {vote.options.map((option) => {
              const isSelected = selected.has(option.id)
              const result = results.find((item) => item.id === option.id)
              const rate = result?.rate ?? 0
              const isMine = myOptionIds.has(option.id)

              return (
                <View
                  key={option.id}
                  className={`voteopt__option ${
                    isSelected ? 'voteopt__option--selected' : ''
                  } ${selectable ? '' : 'voteopt__option--static'}`}
                  onClick={() => handleSelect(option.id)}
                >
                  <View className='voteopt__option-row'>
                    {!showResults ? (
                      <View
                        className={`voteopt__checkbox ${
                          isMultiple ? 'voteopt__checkbox--square' : ''
                        } ${isSelected ? 'voteopt__checkbox--on' : ''}`}
                      >
                        {isSelected ? <View className='voteopt__checkbox-mark' /> : null}
                      </View>
                    ) : null}

                    <Text className='voteopt__option-label'>{option.label}</Text>

                    {isMine && showResults ? (
                      <View className='voteopt__mine'>
                        <Text>你的选择</Text>
                      </View>
                    ) : null}
                    {showResults && result && leaderId === option.id && result.count > 0 ? (
                      <Icon name='trophy' size={28} color='#F59E0B' strokeWidth={2} />
                    ) : null}
                    {showResults ? (
                      <Text className='voteopt__count'>{result?.count ?? 0}票</Text>
                    ) : null}
                  </View>

                  {showResults ? (
                    <View className='voteopt__result-row'>
                      <View className='voteopt__result-track'>
                        <View
                          className={`voteopt__result-fill ${
                            isMine ? 'voteopt__result-fill--mine' : ''
                          }`}
                          style={{ width: `${Math.min(rate, 100)}%` }}
                        />
                      </View>
                      <Text className='voteopt__rate'>{rate}%</Text>
                    </View>
                  ) : null}
                </View>
              )
            })}
          </View>
        </View>

        {/* 底部操作 */}
        {showResults ? (
          <>
            {vote.hasVoted ? (
              <View className='voteopt__notice voteopt__notice--success'>
                <Icon name='check-circle' size={28} color='#2F9E86' strokeWidth={2} />
                <Text>你已参与该投票，结果实时更新</Text>
              </View>
            ) : null}
            {!vote.hasVoted && isEnded ? (
              <View className='voteopt__notice voteopt__notice--muted'>
                <Text>投票已截止，以上为最终结果</Text>
              </View>
            ) : null}
            <View className='voteopt__back' onClick={backToList}>
              <Text>返回列表</Text>
            </View>
          </>
        ) : (
          <>
            <Text className='voteopt__tip'>每个账号仅可投票一次，提交后不可修改</Text>
            <View
              className={`voteopt__submit ${canSubmit ? 'voteopt__submit--enabled' : ''}`}
              onClick={() => {
                if (selected.size === 0) {
                  Taro.showToast({ title: '请至少选择一个选项', icon: 'none' })
                  return
                }
                if (canSubmit) setConfirmOpen(true)
              }}
            >
              <Text>
                提交投票{selected.size > 0 ? `（已选 ${selected.size} 项）` : ''}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* 二次确认底部抽屉 */}
      {confirmOpen ? (
        <View className='voteopt__sheet'>
          <View
            className='voteopt__sheet-mask'
            onClick={() => {
              if (!submitting) setConfirmOpen(false)
            }}
          />
          <View className='voteopt__sheet-panel'>
            <View className='voteopt__sheet-handle-wrap'>
              <View className='voteopt__sheet-handle' />
            </View>
            <View className='voteopt__sheet-head'>
              <Text className='voteopt__sheet-title'>确认提交投票？</Text>
              <Text className='voteopt__sheet-sub'>提交后不可修改，请确认你的选择：</Text>
            </View>
            <ScrollView scrollY className='voteopt__sheet-scroll'>
              <View className='voteopt__sheet-selected'>{selectedLabels.join('、')}</View>
            </ScrollView>
            <View className='voteopt__sheet-footer'>
              <View
                className={`voteopt__sheet-btn voteopt__sheet-btn--ghost ${
                  submitting ? 'voteopt__sheet-btn--disabled' : ''
                }`}
                onClick={() => {
                  if (!submitting) setConfirmOpen(false)
                }}
              >
                <Text>再想想</Text>
              </View>
              <View
                className={`voteopt__sheet-btn voteopt__sheet-btn--primary ${
                  submitting ? 'voteopt__sheet-btn--disabled' : ''
                }`}
                onClick={() => void handleSubmit()}
              >
                <Text>{submitting ? '提交中...' : '确认提交'}</Text>
              </View>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  )
}