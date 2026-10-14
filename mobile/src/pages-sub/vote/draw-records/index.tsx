import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad, useDidShow } from '@tarojs/taro'

import { NavBar, ListEmpty, ListLoading } from '@/components/business'
import { drawApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

interface DrawRecord {
  id: string
  title: string
  mainCount: number
  backupCount: number
  memberCount: number
  createdAt: string
  createdBy: string | null
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function DrawRecords() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const className = useUserStore((s) => s.userInfo?.className)
  const { requireLogin } = useAuth()

  const [records, setRecords] = useState<DrawRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 10

  const classIdRef = { id: currentClassId || '' }

  useLoad(() => {
    if (!requireLogin()) return
  })

  useDidShow(() => {
    fetchRecords(1)
  })

  const fetchRecords = async (p: number) => {
    if (!classIdRef.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res: any = await drawApi.getDrawRecords(classIdRef.id, { page: p, pageSize })
      setRecords(res?.list || [])
      setTotal(res?.total ?? 0)
      setPage(p)
    } catch {
      setRecords([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const goDetail = (id: string) => {
    Taro.navigateTo({ url: `/pages-sub/vote/draw-detail/index?drawId=${id}` })
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <View className='drawrecs'>
      <NavBar title='中签记录' />

      <View className='drawrecs__body'>
        <View className='drawrecs__summary'>
          <Text className='drawrecs__summary-text'>共 {total} 次抽签</Text>
          <Text className='drawrecs__summary-text'>{className}</Text>
        </View>

        {loading ? (
          <ListLoading rows={4} />
        ) : records.length === 0 ? (
          <ListEmpty text='暂无抽签记录' />
        ) : (
          <View className='drawrecs__list'>
            {records.map((record) => (
              <View className='drawrecs__card' key={record.id} onClick={() => goDetail(record.id)}>
                <View className='drawrecs__card-head'>
                  <Text className='drawrecs__title'>{record.title}</Text>
                  <View className='drawrecs__tag'>
                    <Text className='drawrecs__tag-text'>{record.memberCount || 0}人</Text>
                  </View>
                </View>
                <View className='drawrecs__card-foot'>
                  <Text className='drawrecs__meta'>
                    正选{record.mainCount}人 · 候补{record.backupCount}人
                    {record.createdBy ? ` · ${record.createdBy}` : ''}
                  </Text>
                  <Text className='drawrecs__time'>{formatDateTime(record.createdAt)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {total > pageSize ? (
          <View className='drawrecs__pager'>
            <View className={`drawrecs__page-btn ${page <= 1 ? 'drawrecs__page-btn--disabled' : ''}`} onClick={() => { if (page > 1) fetchRecords(page - 1) }}>
              <Text className='drawrecs__page-text'>上一页</Text>
            </View>
            <Text className='drawrecs__page-num'>{page} / {totalPages}</Text>
            <View className={`drawrecs__page-btn ${page >= totalPages ? 'drawrecs__page-btn--disabled' : ''}`} onClick={() => { if (page < totalPages) fetchRecords(page + 1) }}>
              <Text className='drawrecs__page-text'>下一页</Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  )
}