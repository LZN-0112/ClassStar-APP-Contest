import { useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar, ListLoading } from '@/components/business'
import { Icon } from '@/components/ui'
import { activityApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

interface ActivityDetail {
  id: string
  title: string
  eventDate: string
  eventTime?: string | null
  location?: string
  capacity?: number
  deadline?: string | null
  coverUrl?: string | null
  registeredCount: number
  displayStatus: 'registering' | 'ongoing' | 'ended'
  registration?: { id: string; status: 'pending' | 'registered' | 'rejected'; registeredAt: string } | null
}

type BtnState = 'loading' | 'ended' | 'inProgress' | 'register' | 'registering' | 'cancelRegister' | 'cancelling'

function computeState(a: ActivityDetail): BtnState {
  if (a.displayStatus === 'ended') return 'ended'
  if (a.displayStatus === 'ongoing') return 'inProgress'
  if (a.registration && ['pending', 'registered'].includes(a.registration.status)) return 'cancelRegister'
  return 'register'
}

export default function ActivityDetail() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireLogin } = useAuth()

  const [activity, setActivity] = useState<ActivityDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [btnState, setBtnState] = useState<BtnState>('loading')

  const classIdRef = { id: '' }
  const idRef = { id: '' }

  useLoad((o) => {
    if (!requireLogin()) return
    const classId = (o?.classId as string) || currentClassId
    const activityId = o?.activityId as string
    if (!classId || !activityId) {
      Taro.showToast({ title: '参数缺失', icon: 'none' })
      Taro.navigateBack()
      return
    }
    classIdRef.id = classId
    idRef.id = activityId
    fetchActivity()
  })

  const fetchActivity = async () => {
    if (!classIdRef.id || !idRef.id) return
    setLoading(true)
    setBtnState('loading')
    try {
      const res: any = await activityApi.getDetail(classIdRef.id, idRef.id)
      const data = res?.data || res
      setActivity(data)
      setBtnState(computeState(data))
    } catch {
      setBtnState('ended')
    } finally {
      setLoading(false)
    }
  }

  const goRegisterForm = () => {
    Taro.navigateTo({
      url: `/pages-sub/activity/registration-form/index?classId=${classIdRef.id}&activityId=${idRef.id}`
    })
  }

  const handleBtn = async () => {
    if (!classIdRef.id || !idRef.id) return
    if (btnState === 'register') {
      setBtnState('registering')
      try {
        await activityApi.register(classIdRef.id, idRef.id)
        Taro.showToast({ title: '报名成功', icon: 'success' })
        await fetchActivity()
      } catch (err) {
        Taro.showToast({ title: err instanceof Error ? err.message : '报名失败', icon: 'none' })
        await fetchActivity()
      }
    } else if (btnState === 'cancelRegister') {
      setBtnState('cancelling')
      try {
        await activityApi.cancel(classIdRef.id, idRef.id)
        Taro.showToast({ title: '取消报名成功', icon: 'success' })
        await fetchActivity()
      } catch (err) {
        Taro.showToast({ title: err instanceof Error ? err.message : '取消报名失败', icon: 'none' })
        await fetchActivity()
      }
    } else if (btnState === 'inProgress' || btnState === 'ended') {
      // 进行中/已结束：进入报名表单不可行，无操作
    }
  }

  if (loading || !activity) {
    return (
      <View className='actdetail'>
        <NavBar title='活动详情' />
        <ListLoading rows={4} />
      </View>
    )
  }

  const capacityText = activity.capacity
    ? `${activity.registeredCount}/${activity.capacity}`
    : `${activity.registeredCount}/不限`

  return (
    <View className='actdetail'>
      <NavBar title='活动详情' />

      <View className='actdetail__body'>
        <View className='actdetail__cover'>
          {activity.coverUrl ? (
            <Image src={activity.coverUrl} className='actdetail__cover-img' mode='aspectFill' />
          ) : (
            <Icon name='image' size={128} color='#4B83FF' strokeWidth={2} />
          )}
        </View>

        <View className='actdetail__info'>
          <Text className='actdetail__title'>{activity.title}</Text>
          <Text className='actdetail__row'>时间：{activity.eventDate} {activity.eventTime ?? ''}</Text>
          <Text className='actdetail__row'>地点：{activity.location || '待定'}</Text>
          <Text className='actdetail__row--blue'>报名人数：{capacityText}</Text>
        </View>

        {btnState === 'register' || btnState === 'registering' ? (
          <View className='actdetail__btn' onClick={goRegisterForm}>
            <Text className='actdetail__btn-text'>{btnState === 'registering' ? '报名中...' : '我要报名'}</Text>
          </View>
        ) : btnState === 'cancelRegister' || btnState === 'cancelling' ? (
          <View className='actdetail__btn actdetail__btn--ghost' onClick={handleBtn}>
            <Text className='actdetail__btn-text--dark'>
              {btnState === 'cancelling' ? '取消中...' : '取消报名'}
            </Text>
          </View>
        ) : btnState === 'inProgress' ? (
          <View className='actdetail__tip'>
            <Text className='actdetail__tip-text'>活动进行中</Text>
          </View>
        ) : (
          <View className='actdetail__tip actdetail__tip--ended'>
            <Text className='actdetail__tip-text--muted'>活动已结束</Text>
          </View>
        )}
      </View>
    </View>
  )
}