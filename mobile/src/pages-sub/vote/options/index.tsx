import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar, ListLoading } from '@/components/business'
import { Button } from '@/components/ui'
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
  participantCount: number
  options: VoteOption[]
}

interface ResultOption {
  id: string
  label: string
  count: number
  rate: number
}

export default function VoteOptions() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireLogin } = useAuth()

  const classIdRef = { id: '' }
  const voteIdRef = { id: '' }
  const readOnlyRef = { value: false }

  const [vote, setVote] = useState<VoteDetail | null>(null)
  const [results, setResults] = useState<ResultOption[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useLoad((o) => {
    if (!requireLogin()) return
    const classId = (o?.classId as string) || currentClassId
    const voteId = o?.voteId as string
    if (!classId || !voteId) {
      Taro.showToast({ title: '参数缺失', icon: 'none' })
      Taro.navigateBack()
      return
    }
    classIdRef.id = classId
    voteIdRef.id = voteId
    readOnlyRef.value = o?.readOnly === '1' || o?.readOnly === 'true' || o?.readOnly === true
    fetchData()
  })

  const fetchData = async () => {
    if (!classIdRef.id || !voteIdRef.id) return
    try {
      const detailRes: any = await voteApi.getDetail(classIdRef.id, voteIdRef.id)
      setVote(detailRes?.data || detailRes)
      const resultRes: any = await voteApi.getResults(classIdRef.id, voteIdRef.id)
      const rdata = resultRes?.data || resultRes
      if (rdata?.options) setResults(rdata.options)
    } catch {
      setVote(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (optionId: string) => {
    if (!vote || vote.hasVoted || readOnlyRef.value) return
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
    if (!vote || !classIdRef.id || submitting) return
    if (selected.size === 0) {
      Taro.showToast({ title: '请至少选择一个选项', icon: 'none' })
      return
    }
    setSubmitting(true)
    try {
      await voteApi.submitVote(classIdRef.id, voteIdRef.id, { optionIds: Array.from(selected) })
      Taro.showToast({ title: '投票成功', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 600)
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : '投票失败，请稍后重试', icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <View className='voteopt'>
        <NavBar title='参与投票' />
        <ListLoading rows={4} />
      </View>
    )
  }

  if (!vote) {
    return (
      <View className='voteopt'>
        <NavBar title='参与投票' />
        <View className='voteopt__empty'>
          <Text className='voteopt__empty-text'>未找到投票信息</Text>
          <View className='voteopt__back' onClick={() => Taro.navigateBack()}>
            <Text className='voteopt__back-text'>返回列表</Text>
          </View>
        </View>
      </View>
    )
  }

  const isEnded = vote.status === 'closed' || new Date(vote.deadline) <= new Date()
  const showResults = readOnlyRef.value || vote.hasVoted || isEnded
  const canSubmit = selected.size > 0 && !vote.hasVoted && vote.isOpen && !submitting && !readOnlyRef.value

  const getResult = (optionId: string) => results.find((r) => r.id === optionId)

  return (
    <View className='voteopt'>
      <NavBar title={showResults ? '投票结果' : '参与投票'} />

      <View className='voteopt__body'>
        <View className='voteopt__title-card'>
          <Text className='voteopt__label'>投票标题</Text>
          <Text className='voteopt__title'>{vote.title}</Text>
          <Text className='voteopt__sub'>
            {vote.voteType === 'single' ? '单选' : '多选'} · {vote.participantCount || 0}人参与
          </Text>
        </View>

        <View className='voteopt__card'>
          <Text className='voteopt__label'>{showResults ? '投票结果' : vote.voteType === 'single' ? '请选择一项' : '请选择多项'}</Text>
          {vote.options.map((option) => {
            const isSelected = selected.has(option.id)
            const result = getResult(option.id)
            return (
              <View
                key={option.id}
                className={`voteopt__option ${isSelected ? 'voteopt__option--selected' : ''}`}
                onClick={() => handleSelect(option.id)}
              >
                <View className='voteopt__option-row'>
                  <View className='voteopt__option-left'>
                    {!showResults ? (
                      <View className={`voteopt__radio ${isSelected ? 'voteopt__radio--on' : ''}`}>
                        {isSelected ? <View className='voteopt__radio-dot' /> : null}
                      </View>
                    ) : null}
                    <Text className='voteopt__option-label'>{option.label}</Text>
                  </View>
                  {showResults && result ? (
                    <Text className='voteopt__result-num'>{result.count}票 ({result.rate}%)</Text>
                  ) : null}
                </View>
                {showResults && result ? (
                  <View className='voteopt__result-track'>
                    <View className='voteopt__result-fill' style={{ width: `${Math.min(result.rate, 100)}%` }} />
                  </View>
                ) : null}
              </View>
            )
          })}
        </View>

        {showResults ? (
          <View className='voteopt__bottom' onClick={() => Taro.navigateBack()}>
            <Text className='voteopt__bottom-text--muted'>返回列表</Text>
          </View>
        ) : (
          <Button
            type='primary'
            size='lg'
            block
            loading={submitting}
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {submitting ? '提交中...' : '提交投票'}
          </Button>
        )}
      </View>
    </View>
  )
}