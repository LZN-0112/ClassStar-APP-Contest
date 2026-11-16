import { useCallback, useEffect, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { PageHeader } from '@/components/business'
import { attendanceApi } from '@/services'
import { useAuth } from '@/utils'
import './index.scss'

type AttendanceStatus = 'present' | 'leave' | 'absent' | 'late' | 'pending' | 'upcoming'

interface AttendanceRecord {
  id: string
  day: string
  weekday: string
  status: AttendanceStatus
  title: string
  statusTitle: string
  time: string
  color: string
  bgColor: string
}

const FILTER_TABS: { label: string; value: 'all' | AttendanceStatus }[] = [
  { label: '全部', value: 'all' },
  { label: '正常', value: 'present' },
  { label: '迟到', value: 'late' },
  { label: '缺勤', value: 'absent' },
  { label: '请假', value: 'leave' }
]

const STATUS_MAP: Record<string, { title: string; color: string; bgColor: string }> = {
  present: { title: '正常', color: '#22C55E', bgColor: '#22C55E1A' },
  leave: { title: '请假', color: '#F59E0B', bgColor: '#F59E0B1A' },
  absent: { title: '缺勤', color: '#EF4444', bgColor: '#EF44441A' },
  late: { title: '迟到', color: '#F59E0B', bgColor: '#F59E0B1A' },
  pending: { title: '待签到', color: '#2563EB', bgColor: '#DBEAFE' },
  upcoming: { title: '未开始', color: '#6B7280', bgColor: '#F3F4F6' }
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function formatTime(date: Date): string {
  const d = new Date(date)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function MyAttendance() {
  const { user } = useAuth()
  const classId = user?.classId

  const [activeFilter, setActiveFilter] = useState<'all' | AttendanceStatus>('all')
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchRecords = useCallback(async () => {
    if (!classId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = (await attendanceApi.getList(classId, { pageSize: 100 })) as any
      const list = Array.isArray(data?.list) ? data.list : []
      const mapped: AttendanceRecord[] = list
        .filter(Boolean)
        .map((item: any) => {
          const start = new Date(item.startTime)
          const now = Date.now()
          const ended = item.status === 'closed' || now > new Date(item.endTime).getTime()
          const started = now >= new Date(item.startTime).getTime()
          let status: AttendanceStatus
          if (item.myRecord) {
            status = item.myRecord.status === 'late' ? 'late' : 'present'
          } else if (item.myLeaveApplication?.status === 'approved') {
            status = 'leave'
          } else if (ended) {
            status = 'absent'
          } else {
            status = started ? 'pending' : 'upcoming'
          }
          const statusInfo = STATUS_MAP[status] || STATUS_MAP.absent
          const location = item.location ? ` · ${item.location}` : ''
          return {
            id: item.id,
            day: String(start.getDate()),
            weekday: WEEKDAYS[start.getDay()],
            status,
            title: item.title,
            statusTitle: statusInfo.title,
            time: `${formatTime(start)}${location}`,
            color: statusInfo.color,
            bgColor: statusInfo.bgColor
          }
        })
      setRecords(mapped)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取考勤记录失败')
    } finally {
      setLoading(false)
    }
  }, [classId])

  useEffect(() => {
    void fetchRecords()
  }, [fetchRecords])

  const filteredRecords =
    activeFilter === 'all' ? records : records.filter((record) => record.status === activeFilter)

  return (
    <View className='attmy'>
      <PageHeader title='我的考勤' variant='a' decor='clock' />

      <View className='attmy__body'>
        {/* 筛选 Tabs */}
        <View className='attmy__tabs'>
          {FILTER_TABS.map((tab) => {
            const active = activeFilter === tab.value
            return (
              <View
                key={tab.value}
                className={`attmy__tab ${active ? 'attmy__tab--active' : ''}`}
                onClick={() => setActiveFilter(tab.value)}
              >
                <Text
                  className={`attmy__tab-text ${active ? 'attmy__tab-text--active' : ''}`}
                >
                  {tab.label}
                </Text>
              </View>
            )
          })}
        </View>

        <View className='attmy__group'>
          <Text className='attmy__section-title'>考勤记录</Text>
          <View className='attmy__content'>
            {loading ? (
              <View className='attmy__placeholder'>
                <Text className='attmy__placeholder-text'>加载中...</Text>
              </View>
            ) : error ? (
              <View className='attmy__error'>
                <Text className='attmy__error-text'>{error}</Text>
                <View className='attmy__retry' onClick={() => void fetchRecords()}>
                  <Text>重新加载</Text>
                </View>
              </View>
            ) : filteredRecords.length === 0 ? (
              <View className='attmy__placeholder'>
                <Text className='attmy__placeholder-text'>暂无该状态考勤记录</Text>
              </View>
            ) : (
              filteredRecords.map((record) => (
                <View
                  key={record.id}
                  className='attmy__card'
                  onClick={() =>
                    Taro.navigateTo({
                      url: `/pages-sub/attendance/check-in-detail/index?classId=${classId}&attendanceId=${record.id}`
                    })
                  }
                >
                  <View className='attmy__date'>
                    <Text className='attmy__day'>{record.day}</Text>
                    <Text className='attmy__weekday'>{record.weekday}</Text>
                  </View>
                  <View className='attmy__info'>
                    <Text className='attmy__title' style={{ color: record.color }}>
                      {record.title}
                    </Text>
                    <Text className='attmy__time'>{record.time}</Text>
                    <View className='attmy__tag' style={{ backgroundColor: record.bgColor }}>
                      <Text className='attmy__tag-text' style={{ color: record.color }}>
                        {record.statusTitle}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </View>
    </View>
  )
}