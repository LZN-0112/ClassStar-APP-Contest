import { useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useDidShow, useLoad } from '@tarojs/taro'

import { PageHeader } from '@/components/business'
import { Icon } from '@/components/ui'
import { activityApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

interface RegistrationItem {
  registrationId: string
  activityId: string
  activity: string
  time: string
  status: string
}

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  approved: { label: '已通过', bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' },
  registered: { label: '已通过', bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' },
  pending: { label: '待审核', bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' },
  rejected: { label: '未通过', bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }
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

  const [registrations, setRegistrations] = useState<RegistrationItem[]>([])
  const [loading, setLoading] = useState(true)

  useLoad(() => {
    requireLogin()
  })

  useDidShow(() => {
    void fetchList()
  })

  const fetchList = async () => {
    if (!currentClassId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res: any = await activityApi.myRegistration(currentClassId, { pageSize: 100 })
      const list: any[] = res?.list || []
      setRegistrations(
        list.map((item) => ({
          registrationId: item.registrationId,
          activityId: item.activity?.id,
          activity: item.activity?.title || '未知活动',
          time: item.registeredAt ? formatDate(item.registeredAt) : '',
          status: item.status
        }))
      )
    } catch {
      setRegistrations([])
    } finally {
      setLoading(false)
    }
  }

  const goDetail = (activityId: string) => {
    if (!activityId) return
    Taro.navigateTo({
      url: `/pages-sub/activity/detail/index?classId=${currentClassId}&activityId=${activityId}`
    })
  }

  return (
    <View className='actmyreg'>
      <PageHeader title='我的报名' variant='b' />

      <View className='actmyreg__body'>
        <View className='actmyreg__group'>
          <Text className='actmyreg__group-title'>报名记录</Text>

          <View className='actmyreg__list'>
            {loading ? (
              <View className='actmyreg__placeholder'>
                <Text>加载中...</Text>
              </View>
            ) : registrations.length === 0 ? (
              <View className='actmyreg__placeholder'>
                <Text>暂无报名记录</Text>
              </View>
            ) : (
              registrations.map((item) => {
                const meta = STATUS_META[item.status] || STATUS_META.pending
                return (
                  <View
                    key={item.registrationId}
                    className='actmyreg__card'
                    onClick={() => goDetail(item.activityId)}
                  >
                    <View className='actmyreg__icon'>
                      <Icon
                        name='clipboard-list'
                        size={48}
                        color='#0062FF'
                        strokeWidth={2}
                      />
                    </View>
                    <View className='actmyreg__info'>
                      <Text className='actmyreg__title'>{item.activity}</Text>
                      <Text className='actmyreg__time'>报名于 {item.time}</Text>
                      <View
                        className='actmyreg__status'
                        style={{ background: meta.bg }}
                      >
                        <Text
                          className='actmyreg__status-text'
                          style={{ color: meta.color }}
                        >
                          {meta.label}
                        </Text>
                      </View>
                    </View>
                  </View>
                )
              })
            )}
          </View>
        </View>
      </View>
    </View>
  )
}