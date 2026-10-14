import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar, ListEmpty, ListLoading } from '@/components/business'
import { attendanceApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

interface LeaveApplication {
  id: string
  studentName?: string
  reason?: string
  status?: 'pending' | 'approved' | 'rejected'
  createdAt?: string
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  pending: { label: '待审批', className: 'badge--pending' },
  approved: { label: '已通过', className: 'badge--approved' },
  rejected: { label: '已拒绝', className: 'badge--rejected' }
}

export default function LeaveApprove() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireLogin } = useAuth()

  const [list, setList] = useState<LeaveApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending')

  const classIdRef = { id: '' }
  const idRef = { id: '' }

  useLoad((options) => {
    if (!requireLogin()) return
    const classId = (options?.classId as string) || currentClassId
    const attendanceId = options?.attendanceId as string
    if (!classId || !attendanceId) {
      Taro.showToast({ title: '参数缺失', icon: 'none' })
      Taro.navigateBack()
      return
    }
    classIdRef.id = classId
    idRef.id = attendanceId
    fetchList()
  })

  const fetchList = async () => {
    setLoading(true)
    try {
      const res: any = await attendanceApi.getDetail(classIdRef.id, idRef.id)
      const leaves: LeaveApplication[] = res?.leaves || []
      setList(leaves)
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (applicationId: string, status: 'approved' | 'rejected') => {
    Taro.showLoading({ title: '处理中' })
    try {
      await attendanceApi.leaveApproval(classIdRef.id, idRef.id, applicationId, { status })
      Taro.hideLoading()
      Taro.showToast({ title: status === 'approved' ? '已通过' : '已拒绝', icon: 'success' })
      fetchList()
    } catch (err) {
      Taro.hideLoading()
      Taro.showToast({
        title: err instanceof Error ? err.message : '操作失败，请重试',
        icon: 'none'
      })
    }
  }

  const filtered = activeTab === 'pending'
    ? list.filter((l) => l.status === 'pending')
    : list

  return (
    <View className='attleave-approve'>
      <NavBar title='请假审批' />

      <View className='attleave-approve__tabs'>
        <View
          className={`attleave-approve__tab ${activeTab === 'pending' ? 'attleave-approve__tab--active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          <Text>待审批</Text>
        </View>
        <View
          className={`attleave-approve__tab ${activeTab === 'all' ? 'attleave-approve__tab--active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <Text>全部</Text>
        </View>
      </View>

      {loading ? (
        <ListLoading />
      ) : filtered.length === 0 ? (
        <ListEmpty text='暂无请假记录' />
      ) : (
        <View className='attleave-approve__list'>
          {filtered.map((item) => {
            const st = STATUS_MAP[item.status || 'pending']
            return (
              <View key={item.id} className='attleave-approve__item'>
                <View className='attleave-approve__item-head'>
                  <Text className='attleave-approve__name'>{item.studentName || '同学'}</Text>
                  {st ? (
                    <Text className={`attleave-approve__badge ${st.className}`}>{st.label}</Text>
                  ) : null}
                </View>
                <Text className='attleave-approve__reason'>{item.reason || '—'}</Text>
                <Text className='attleave-approve__time'>{item.createdAt || ''}</Text>
                {item.status === 'pending' ? (
                  <View className='attleave-approve__actions'>
                    <View
                      className='attleave-approve__btn attleave-approve__btn--reject'
                      onClick={() => handleReview(item.id, 'rejected')}
                    >
                      拒绝
                    </View>
                    <View
                      className='attleave-approve__btn attleave-approve__btn--approve'
                      onClick={() => handleReview(item.id, 'approved')}
                    >
                      通过
                    </View>
                  </View>
                ) : null}
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}