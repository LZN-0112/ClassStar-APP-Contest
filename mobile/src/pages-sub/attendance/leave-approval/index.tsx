import { useCallback, useEffect, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { PageHeader } from '@/components/business'
import { Icon } from '@/components/ui'
import { attendanceApi } from '@/services'
import { useAuth } from '@/utils'
import './index.scss'

interface PendingLeave {
  id: string
  attendance: { id: string; title: string; startTime: string; endTime: string }
  student: { id: string; name: string; studentId?: string; avatar?: string }
  reason: string
  createdAt: string
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(
    2,
    '0'
  )} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function LeaveApproval() {
  const { user } = useAuth()
  const classId = user?.classId

  const [items, setItems] = useState<PendingLeave[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionId, setActionId] = useState('')

  const fetchList = useCallback(async () => {
    if (!classId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = (await attendanceApi.getPendingLeaves(classId)) as any
      const list = Array.isArray(data) ? data : data?.list
      setItems(Array.isArray(list) ? list : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取请假申请失败')
    } finally {
      setLoading(false)
    }
  }, [classId])

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  const handleReview = async (item: PendingLeave, status: 'approved' | 'rejected') => {
    if (!classId || actionId) return
    setActionId(item.id)
    try {
      await attendanceApi.leaveApproval(classId, item.attendance.id, item.id, { status })
      Taro.showToast({ title: status === 'approved' ? '已同意请假' : '已驳回请假', icon: 'none' })
      setItems((prev) => prev.filter((p) => p.id !== item.id))
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '审批失败',
        icon: 'none'
      })
    } finally {
      setActionId('')
    }
  }

  return (
    <View className='attleave-approve'>
      <PageHeader
        title='请假审批'
        variant='a'
        right={
          <View className='attleave-approve__refresh' onClick={() => void fetchList()}>
            <Text>刷新</Text>
          </View>
        }
      />

      <View className='attleave-approve__body'>
        {loading ? (
          <View className='attleave-approve__loading'>
            <Text className='attleave-approve__loading-text'>加载中...</Text>
          </View>
        ) : error ? (
          <View className='attleave-approve__state'>
            <Icon name='x-circle' size={80} color='#CBD5E1' strokeWidth={1.5} />
            <Text className='attleave-approve__state-text'>{error}</Text>
          </View>
        ) : items.length === 0 ? (
          <View className='attleave-approve__state'>
            <Icon name='inbox' size={96} color='#CBD5E1' strokeWidth={1.5} />
            <Text className='attleave-approve__state-text'>暂无待审批的请假申请</Text>
          </View>
        ) : (
          <>
            <Text className='attleave-approve__count'>待审批（{items.length}）</Text>
            {items.map((item) => (
              <View key={item.id} className='attleave-approve__item'>
                <View className='attleave-approve__item-head'>
                  <View className='attleave-approve__student'>
                    <View className='attleave-approve__name-row'>
                      <Text className='attleave-approve__name'>
                        {item.student?.name || '未知成员'}
                      </Text>
                      {item.student?.studentId ? (
                        <Text className='attleave-approve__sid'>{item.student.studentId}</Text>
                      ) : null}
                    </View>
                    <Text className='attleave-approve__meta'>
                      {item.attendance?.title} · {formatTime(item.attendance?.startTime)}
                    </Text>
                  </View>
                  <Text className='attleave-approve__pill'>待审批</Text>
                </View>

                <View className='attleave-approve__reason'>
                  <Text>{item.reason}</Text>
                </View>

                <View className='attleave-approve__actions'>
                  <View
                    className={`attleave-approve__btn attleave-approve__btn--approve ${
                      actionId === item.id ? 'attleave-approve__btn--disabled' : ''
                    }`}
                    onClick={() => {
                      if (actionId !== item.id) void handleReview(item, 'approved')
                    }}
                  >
                    <Icon name='check-circle' size={32} color='#FFFFFF' />
                    <Text>同意</Text>
                  </View>
                  <View
                    className={`attleave-approve__btn attleave-approve__btn--reject ${
                      actionId === item.id ? 'attleave-approve__btn--disabled' : ''
                    }`}
                    onClick={() => {
                      if (actionId !== item.id) void handleReview(item, 'rejected')
                    }}
                  >
                    <Icon name='x-circle' size={32} color='#DC2626' />
                    <Text>驳回</Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}
      </View>
    </View>
  )
}