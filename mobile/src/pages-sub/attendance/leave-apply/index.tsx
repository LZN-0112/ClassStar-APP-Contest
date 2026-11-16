import { useState } from 'react'
import { Text, Textarea, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { PageHeader } from '@/components/business'
import { Icon } from '@/components/ui'
import { attendanceApi } from '@/services'
import './index.scss'

interface AttendanceBrief {
  id: string
  title: string
  startTime: string
  endTime: string
  location?: string
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(
    2,
    '0'
  )} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function LeaveApply() {
  const [classId, setClassId] = useState('')
  const [attendanceId, setAttendanceId] = useState('')
  const [attendance, setAttendance] = useState<AttendanceBrief | null>(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [reasonFocused, setReasonFocused] = useState(false)

  useLoad((options) => {
    const cid = (options?.classId as string) || ''
    const aid = (options?.attendanceId as string) || ''
    setClassId(cid)
    setAttendanceId(aid)
    if (!cid || !aid) return

    setLoading(true)
    attendanceApi
      .getDetail(cid, aid)
      .then((res: any) => {
        if (!res?.id || !res?.startTime || !res?.endTime) {
          throw new Error('签到信息不存在或已删除')
        }
        setAttendance({
          id: res.id,
          title: res.title || '签到',
          startTime: res.startTime,
          endTime: res.endTime,
          location: res.location
        })
      })
      .catch((err) => {
        Taro.showToast({
          title: err instanceof Error ? err.message : '获取签到信息失败',
          icon: 'none'
        })
      })
      .finally(() => setLoading(false))
  })

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Taro.showToast({ title: '请填写请假原因', icon: 'none' })
      return
    }
    if (!classId || !attendanceId || submitting) return
    setSubmitting(true)
    try {
      await attendanceApi.leaveApply(classId, attendanceId, { reason: reason.trim() })
      Taro.showToast({ title: '请假申请已提交，等待班委审批', icon: 'none' })
      setTimeout(() => {
        Taro.redirectTo({
          url: `/pages-sub/attendance/check-in-detail/index?classId=${classId}&attendanceId=${attendanceId}`
        })
      }, 600)
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '提交请假申请失败',
        icon: 'none'
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!classId || !attendanceId) {
    return (
      <View className='attleave'>
        <PageHeader title='请假申请' variant='a' />
        <View className='attleave__empty'>
          <Icon name='calendar-clock' size={96} color='#CBD5E1' strokeWidth={1.5} />
          <Text className='attleave__empty-text'>请从签到详情页发起请假申请</Text>
          <View
            className='attleave__empty-btn'
            onClick={() => Taro.navigateTo({ url: '/pages-sub/attendance/list/index' })}
          >
            <Text className='attleave__empty-btn-text'>前往考勤列表</Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className='attleave'>
      <PageHeader title='请假申请' variant='a' />

      <View className='attleave__body'>
        {/* 签到任务 */}
        <View className='attleave__card'>
          <Text className='attleave__card-label'>签到任务</Text>
          {loading ? (
            <Text className='attleave__card-muted'>加载中...</Text>
          ) : attendance ? (
            <>
              <Text className='attleave__card-title'>{attendance.title}</Text>
              <Text className='attleave__card-desc'>
                时间：{formatTime(attendance.startTime)} ~ {formatTime(attendance.endTime)}
              </Text>
              {attendance.location ? (
                <Text className='attleave__card-desc'>地点：{attendance.location}</Text>
              ) : null}
            </>
          ) : (
            <Text className='attleave__card-muted'>签到信息获取失败</Text>
          )}
        </View>

        {/* 请假原因 */}
        <View className='attleave__field'>
          <Text className='attleave__label'>请假原因</Text>
          <Textarea
            className={`attleave__textarea ${
              reasonFocused ? 'attleave__textarea--focus' : ''
            }`}
            value={reason}
            maxlength={200}
            placeholder='请说明请假原因，便于班委审批'
            placeholderClass='attleave__placeholder'
            onFocus={() => setReasonFocused(true)}
            onBlur={() => setReasonFocused(false)}
            onInput={(e) => setReason(e.detail.value.slice(0, 200))}
          />
          <Text className='attleave__counter'>{reason.length}/200</Text>
        </View>

        <View
          className={`attleave__submit ${
            submitting || loading || !attendance ? 'attleave__submit--disabled' : ''
          }`}
          onClick={() => {
            if (!submitting && !loading && attendance) void handleSubmit()
          }}
        >
          <Icon name='send' size={32} color='#FFFFFF' />
          <Text>{submitting ? '提交中...' : '提交申请'}</Text>
        </View>
      </View>
    </View>
  )
}