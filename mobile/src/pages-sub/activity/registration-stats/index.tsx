import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad, useDidShow } from '@tarojs/taro'

import { NavBar, ListEmpty, ListLoading } from '@/components/business'
import { activityApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

interface Registration {
  registrationId: string
  name?: string
  activity?: { title?: string }
  registeredAt?: string
  status: 'pending' | 'registered' | 'rejected'
}

const TOTAL_CLASS = 35

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

export default function RegistrationStats() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireAuth } = useAuth()

  const classIdRef = { id: currentClassId || '' }
  const activityIdRef = { id: '' }

  const [list, setList] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)

  useLoad((o) => {
    if (!requireAuth('committee')) return
    const classId = (o?.classId as string) || currentClassId
    const activityId = o?.activityId as string
    if (!classId || !activityId) {
      Taro.showToast({ title: '参数缺失', icon: 'none' })
      Taro.navigateBack()
      return
    }
    classIdRef.id = classId
    activityIdRef.id = activityId
    fetchList()
  })

  useDidShow(() => {
    if (activityIdRef.id) fetchList()
  })

  const fetchList = async () => {
    if (!classIdRef.id || !activityIdRef.id) return
    setLoading(true)
    try {
      const res: any = await activityApi.registrationStats(classIdRef.id, activityIdRef.id)
      setList(res?.list || [])
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }

  const review = async (registrationId: string, status: 'registered' | 'rejected') => {
    if (!classIdRef.id || !activityIdRef.id) return
    try {
      await activityApi.reviewRegistration(classIdRef.id, activityIdRef.id, registrationId, { status })
      Taro.showToast({ title: status === 'registered' ? '已通过' : '已驳回', icon: 'success' })
      await fetchList()
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : '操作失败', icon: 'none' })
    }
  }

  const total = list.length
  const pending = list.filter((i) => i.status === 'pending').length
  const approved = list.filter((i) => i.status === 'registered').length
  const rate = Math.min(100, Math.round((total / TOTAL_CLASS) * 100))

  return (
    <View className='actstats'>
      <NavBar title='报名统计' />

      <View className='actstats__body'>
        <View className='actstats__stat-row'>
          <View className='actstats__stat-card'>
            <Text className='actstats__stat-num'>{approved + pending}</Text>
            <Text className='actstats__stat-label'>已报名</Text>
          </View>
          <View className='actstats__stat-card'>
            <Text className='actstats__stat-num'>{pending}</Text>
            <Text className='actstats__stat-label'>待审核</Text>
          </View>
          <View className='actstats__stat-card'>
            <Text className='actstats__stat-num'>{rate}%</Text>
            <Text className='actstats__stat-label'>报名率</Text>
          </View>
        </View>

        <Text className='actstats__group-title'>报名人员</Text>

        {loading ? (
          <ListLoading rows={4} />
        ) : list.length === 0 ? (
          <ListEmpty text='暂无报名人员' />
        ) : (
          <View className='actstats__list'>
            {list.map((item) => {
              const isApproved = item.status === 'registered'
              const isRejected = item.status === 'rejected'
              const statusText = isApproved ? '已通过' : isRejected ? '已驳回' : '待审核'
              return (
                <View className='actstats__card' key={item.registrationId}>
                  <View className='actstats__card-head'>
                    <Text className='actstats__name'>{item.name || '未知成员'}</Text>
                    <Text
                      className={`actstats__status ${
                        isApproved
                          ? 'actstats__status--approve'
                          : isRejected
                            ? 'actstats__status--reject'
                            : ''
                      }`}
                    >
                      {statusText}
                    </Text>
                  </View>
                  <Text className='actstats__info'>
                    {item.activity?.title || '活动'} · {formatDate(item.registeredAt)}
                  </Text>
                  {item.status === 'pending' ? (
                    <View className='actstats__actions'>
                      <View className='actstats__btn actstats__btn--approve' onClick={() => review(item.registrationId, 'registered')}>
                        <Text className='actstats__btn-text--approve'>通过</Text>
                      </View>
                      <View className='actstats__btn actstats__btn--reject' onClick={() => review(item.registrationId, 'rejected')}>
                        <Text className='actstats__btn-text--reject'>驳回</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              )
            })}
          </View>
        )}
      </View>
    </View>
  )
}