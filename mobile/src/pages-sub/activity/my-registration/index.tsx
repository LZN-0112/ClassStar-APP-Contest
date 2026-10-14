import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import { useLoad, useDidShow } from '@tarojs/taro'

import { NavBar, ListEmpty, ListLoading } from '@/components/business'
import { Icon } from '@/components/ui'
import { activityApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

interface Item {
  registrationId: string
  activity: { title?: string }
  registeredAt?: string
  status: 'pending' | 'registered' | 'rejected'
}

const STATUS_LABEL: Record<string, string> = {
  registered: '已通过',
  pending: '待审核',
  rejected: '未通过'
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${month}月${day}日 ${hh}:${mm}`
}

export default function MyRegistration() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireLogin } = useAuth()

  const [list, setList] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  const classIdRef = { id: currentClassId || '' }

  useLoad(() => {
    if (!requireLogin()) return
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
      const res: any = await activityApi.myRegistration(classIdRef.id, { pageSize: 100 })
      setList(res?.list || [])
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='actmyreg'>
      <NavBar title='我的报名' />

      <View className='actmyreg__body'>
        <Text className='actmyreg__group-title'>报名记录</Text>

        {loading ? (
          <ListLoading rows={4} />
        ) : list.length === 0 ? (
          <ListEmpty text='暂无报名记录' />
        ) : (
          <View className='actmyreg__list'>
            {list.map((item) => {
              const statusLabel = STATUS_LABEL[item.status] || '待审核'
              const isApproved = item.status === 'registered'
              const isRejected = item.status === 'rejected'
              return (
                <View className='actmyreg__card' key={item.registrationId}>
                  <View className='actmyreg__icon'>
                    <Icon name='users' size={48} color='#0062FF' strokeWidth={2} />
                  </View>
                  <View className='actmyreg__info'>
                    <Text className='actmyreg__title'>{item.activity?.title || '未知活动'}</Text>
                    <Text className='actmyreg__time'>{formatDate(item.registeredAt)}</Text>
                    <View
                      className={`actmyreg__status ${
                        isRejected ? 'actmyreg__status--reject' : isApproved ? 'actmyreg__status--approve' : ''
                      }`}
                    >
                      <Text
                        className={`actmyreg__status-text ${
                          isRejected
                            ? 'actmyreg__status-text--reject'
                            : isApproved
                              ? 'actmyreg__status-text--approve'
                              : ''
                        }`}
                      >
                        {statusLabel}
                      </Text>
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