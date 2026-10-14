import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad, useDidShow, usePullDownRefresh, useReachBottom } from '@tarojs/taro'

import { NavBar, Tabs, ListEmpty, ListLoading } from '@/components/business'
import { Icon } from '@/components/ui'
import { homeworkApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

interface HomeworkItem {
  id: string
  title: string
  subject?: string
  deadline?: string
  status?: string
  submitCount?: number
  totalCount?: number
  submitted?: boolean
}

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  待提交: { bg: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' },
  已提交: { bg: 'rgba(34, 197, 94, 0.1)', color: '#22C55E' },
  已批改: { bg: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' },
  已逾期: { bg: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }
}

function formatDeadline(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${m}-${day} ${hh}:${mm}`
}

function myStatus(item: HomeworkItem): string {
  if (item.submitted) return '已提交'
  if (item.status === '已截止') return '已逾期'
  if (item.deadline) {
    const now = Date.now()
    const dl = new Date(item.deadline).getTime()
    if (!Number.isNaN(dl) && now > dl) return '已逾期'
  }
  return '待提交'
}

export default function HomeworkList() {
  const { requireAuth, isCommittee } = useAuth()
  const currentClassId = useUserStore((s) => s.currentClassId)

  const tabs = [
    { key: 'all', label: '全部' },
    { key: '未提交', label: '未提交' },
    { key: '已提交', label: '已提交' },
    { key: '已批改', label: '已批改' }
  ]

  const [filter, setFilter] = useState('all')
  const [list, setList] = useState<HomeworkItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const classIdRef = { id: currentClassId || '' }

  useLoad((o) => {
    if (!requireAuth('student')) return
    const cid = (o?.classId as string) || currentClassId
    classIdRef.id = cid || ''
    fetchList(1, false)
  })

  useDidShow(() => {
    if (list.length === 0) fetchList(1, false)
    else fetchList(1, false)
  })

  usePullDownRefresh(async () => {
    await fetchList(1, false)
    Taro.stopPullDownRefresh()
  })

  useReachBottom(() => {
    fetchList(page + 1, true)
  })

  const fetchList = async (nextPage: number, append: boolean) => {
    if (!classIdRef.id) {
      setLoading(false)
      return
    }
    append ? setLoadingMore(true) : setLoading(true)
    try {
      const res: any = await homeworkApi.getList(classIdRef.id, {
        page: nextPage,
        pageSize: PAGE_SIZE,
        status: filter === 'all' ? undefined : filter
      })
      const data = res?.list ?? res?.data?.list ?? []
      const merged = append ? list.concat(data) : data
      setList(merged)
      setPage(nextPage)
      const total = res?.total ?? res?.data?.total
      if (total != null) setHasMore(merged.length < total)
      else setHasMore(data.length >= PAGE_SIZE)
    } catch {
      if (!append) setList([])
    } finally {
      append ? setLoadingMore(false) : setLoading(false)
    }
  }

  const toDetail = (item: HomeworkItem) => {
    Taro.navigateTo({
      url: `/pages-sub/homework/detail/index?classId=${classIdRef.id}&homeworkId=${item.id}`
    })
  }

  const displayList =
    filter === 'all' ? list : list.filter((it) => myStatus(it) === filter)

  return (
    <View className='hwlist'>
      <NavBar
        title='作业'
        showBack={false}
        right={
          isCommittee ? (
            <View
              className='hwlist__publish'
              onClick={() => Taro.navigateTo({ url: '/pages-sub/homework/publish/index' })}
            >
              <Icon name='plus' size={36} color='#FFFFFF' strokeWidth={3} />
            </View>
          ) : null
        }
      />

      <View className='hwlist__tabs'>
        <Tabs tabs={tabs} activeKey={filter} onChange={setFilter} />
      </View>

      <View className='hwlist__body'>
        {loading ? (
          <ListLoading rows={4} />
        ) : displayList.length === 0 ? (
          <ListEmpty icon='file-text' text='暂无作业' />
        ) : (
          <View className='hwlist__group'>
            {displayList.map((item) => {
              const status = myStatus(item)
              const color = STATUS_COLOR[status] || STATUS_COLOR['待提交']
              const done = status === '已提交' || status === '已批改'
              return (
                <View key={item.id} className='hwlist__card' onClick={() => toDetail(item)}>
                  <View className='hwlist__icon'>
                    <Icon
                      name={done ? 'check-circle' : 'file-text'}
                      size={48}
                      color={done ? '#22C55E' : '#076CAB'}
                      strokeWidth={2}
                    />
                  </View>
                  <View className='hwlist__info'>
                    <Text className='hwlist__title' numberOfLines={1}>{item.title}</Text>
                    <Text className='hwlist__meta' numberOfLines={1}>
                      {item.subject || '未分类'} · 提交 {item.submitCount ?? 0}/{item.totalCount ?? 0}
                    </Text>
                    <View className='hwlist__row'>
                      <Text className='hwlist__deadline' numberOfLines={1}>{formatDeadline(item.deadline)} 截止</Text>
                      <View className='hwlist__tag' style={{ backgroundColor: color.bg }}>
                        <Text className='hwlist__tag-text' style={{ color: color.color }}>{status}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )
            })}
          </View>
        )}
        {loadingMore ? <ListLoading rows={2} /> : null}
        {!hasMore && list.length > 0 ? <Text className='hwlist__end'>没有更多了</Text> : null}
      </View>
    </View>
  )
}