import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad, useDidShow, usePullDownRefresh } from '@tarojs/taro'

import { NavBar, Tabs, ListEmpty, ListLoading } from '@/components/business'
import { Icon } from '@/components/ui'
import { homeworkApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

interface MyHomeworkItem {
  id: string
  title: string
  subject?: string
  deadline?: string
  submitted?: boolean
  graded?: boolean
  status?: string
}

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  待提交: { bg: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' },
  已提交: { bg: 'rgba(34, 197, 94, 0.1)', color: '#22C55E' },
  已批改: { bg: 'rgba(0, 98, 255, 0.1)', color: '#0062FF' },
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
  return `${m}月${day}日 ${hh}:${mm}`
}

function myStatus(item: MyHomeworkItem): string {
  if (item.submitted && item.graded) return '已批改'
  if (item.submitted) return '已提交'
  if (item.status === '已截止') return '已逾期'
  if (item.deadline) {
    const now = Date.now()
    const dl = new Date(item.deadline).getTime()
    if (!Number.isNaN(dl) && now > dl) return '已逾期'
  }
  return '待提交'
}

export default function MyHomework() {
  const { requireLogin } = useAuth()
  const currentClassId = useUserStore((s) => s.currentClassId)

  const tabs = [
    { key: '全部', label: '全部' },
    { key: '待提交', label: '待提交' },
    { key: '已提交', label: '已提交' },
    { key: '已批改', label: '已批改' },
    { key: '已逾期', label: '已逾期' }
  ]

  const [filter, setFilter] = useState('全部')
  const [list, setList] = useState<MyHomeworkItem[]>([])
  const [loading, setLoading] = useState(true)

  const classIdRef = { id: currentClassId || '' }

  useLoad((o) => {
    if (!requireLogin()) return
    const cid = (o?.classId as string) || currentClassId
    classIdRef.id = cid || ''
    fetchList()
  })

  useDidShow(() => {
    fetchList()
  })

  usePullDownRefresh(async () => {
    await fetchList()
    Taro.stopPullDownRefresh()
  })

  const fetchList = async () => {
    if (!classIdRef.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res: any = await homeworkApi.getList(classIdRef.id, { pageSize: 100 })
      const data = res?.list ?? res?.data?.list ?? []
      setList(data)
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }

  const toDetail = (item: MyHomeworkItem) => {
    Taro.navigateTo({
      url: `/pages-sub/homework/detail/index?classId=${classIdRef.id}&homeworkId=${item.id}`
    })
  }

  const displayList =
    filter === '全部' ? list : list.filter((it) => myStatus(it) === filter)

  return (
    <View className='hwmy'>
      <NavBar title='我的作业' />

      <View className='hwmy__tabs'>
        <Tabs tabs={tabs} activeKey={filter} onChange={setFilter} />
      </View>

      <View className='hwmy__body'>
        {loading ? (
          <ListLoading rows={4} />
        ) : displayList.length === 0 ? (
          <ListEmpty icon='file-text' text='暂无作业' />
        ) : (
          <View className='hwmy__group'>
            {displayList.map((item) => {
              const status = myStatus(item)
              const color = STATUS_COLOR[status] || STATUS_COLOR['待提交']
              return (
                <View key={item.id} className='hwmy__card' onClick={() => toDetail(item)}>
                  <View className='hwmy__icon'>
                    <Icon name='file-text' size={48} color='#0062FF' strokeWidth={2} />
                  </View>
                  <View className='hwmy__info'>
                    <Text className='hwmy__title' numberOfLines={1}>{item.title}</Text>
                    <Text className='hwmy__meta' numberOfLines={1}>
                      {item.subject || '未分类'} · {formatDeadline(item.deadline)} 截止
                    </Text>
                    <View className='hwmy__tag' style={{ backgroundColor: color.bg }}>
                      <Text className='hwmy__tag-text' style={{ color: color.color }}>{status}</Text>
                    </View>
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