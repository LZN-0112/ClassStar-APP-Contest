import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad, useDidShow } from '@tarojs/taro'

import { NavBar, ListEmpty, ListLoading } from '@/components/business'
import { voteApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

interface Vote {
  id: string
  title: string
  voteType: 'single' | 'multiple'
  deadline: string
  status: 'published' | 'closed'
  participantCount: number
  participationRate: number
  hasVoted?: boolean
  isOpen?: boolean
}

export default function VoteList() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireLogin, isCommittee: isCommitteeFlag } = useAuth()

  const [list, setList] = useState<Vote[]>([])
  const [loading, setLoading] = useState(true)

  const classIdRef = { id: currentClassId || '' }

  useLoad((o) => {
    if (!requireLogin()) return
    const cid = (o?.classId as string) || currentClassId
    classIdRef.id = cid || ''
  })

  useDidShow(() => {
    fetchList()
  })

  const fetchList = async () => {
    if (!classIdRef.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res: any = await voteApi.getList(classIdRef.id)
      setList(res?.list || [])
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }

  const formatDeadline = (deadline: string) => {
    const d = new Date(deadline)
    if (!deadline || Number.isNaN(d.getTime())) return '已截止'
    const now = new Date()
    const diff = d.getTime() - now.getTime()
    if (diff <= 0) return '已截止'
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days > 0) return `${days}天后截止`
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours > 0) return `${hours}小时后截止`
    const minutes = Math.floor(diff / (1000 * 60))
    return `${minutes}分钟后截止`
  }

  const goPublish = () => {
    Taro.navigateTo({ url: '/pages-sub/vote/publish/index' })
  }

  const goOptions = (vote: Vote) => {
    const isEnded = vote.status === 'closed' || new Date(vote.deadline) <= new Date()
    if (isEnded || vote.hasVoted) {
      Taro.navigateTo({
        url: `/pages-sub/vote/options/index?classId=${classIdRef.id}&voteId=${vote.id}&readOnly=1`
      })
    } else {
      Taro.navigateTo({
        url: `/pages-sub/vote/options/index?classId=${classIdRef.id}&voteId=${vote.id}`
      })
    }
  }

  return (
    <View className='votelist'>
      <NavBar
        title='投票列表'
        right={
          isCommitteeFlag ? (
            <View className='votelist__publish' onClick={goPublish}>
              <Text className='votelist__publish-text'>发布投票</Text>
            </View>
          ) : undefined
        }
      />

      <View className='votelist__body'>
        <Text className='votelist__group-title'>投票列表</Text>

        {loading ? (
          <ListLoading rows={4} />
        ) : list.length === 0 ? (
          <ListEmpty text='暂无投票' />
        ) : (
          <View className='votelist__list'>
            {list.map((vote) => {
              const isEnded = vote.status === 'closed' || new Date(vote.deadline) <= new Date()
              const percent = vote.participationRate || 0
              const hasVoted = vote.hasVoted || false
              const actionText = isEnded ? '查看结果' : hasVoted ? '已投票' : '去投票'
              return (
                <View className='votelist__card' key={vote.id} onClick={() => goOptions(vote)}>
                  <View className='votelist__card-head'>
                    <Text className='votelist__title'>{vote.title}</Text>
                    <Text className='votelist__deadline'>{formatDeadline(vote.deadline)}</Text>
                  </View>
                  <Text className='votelist__meta'>{vote.participantCount || 0}人参与</Text>
                  <View className='votelist__track'>
                    <View
                      className={`votelist__fill ${isEnded ? 'votelist__fill--end' : ''}`}
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </View>
                  <View className='votelist__action' onClick={(e) => { e.stopPropagation(); goOptions(vote) }}>
                    <Text className='votelist__action-text'>{actionText}</Text>
                  </View>
                </View>
              )
            })}
          </View>
        )}
      </View>
    </View>
  )
}