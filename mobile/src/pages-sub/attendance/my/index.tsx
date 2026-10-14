import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad, useDidShow, usePullDownRefresh } from '@tarojs/taro'

import { NavBar } from '@/components/business'
import { attendanceApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

type AttendanceStatus = 'present' | 'leave' | 'absent' | 'late'

interface AttendanceRecord {
  id: string
  day: string
  weekday: string
  status: AttendanceStatus
  title: string
  time: string
}

const FILTER_TABS: { label: string; value: 'all' | AttendanceStatus }[] = [
  { label: '全部', value: 'all' },
  { label: '正常', value: 'present' },
  { label: '缺勤', value: 'absent' },
  { label: '请假', value: 'leave' }
]

const STATUS_META: Record<AttendanceStatus, { title: string; color: string; bg: string }> = {
  present: { title: '正常', color: '#22C55E', bg: '#22C55E1A' },
  leave: { title: '请假', color: '#F59E0B', bg: '#F59E0B1A' },
  absent: { title: '缺勤', color: '#EF4444', bg: '#EF44441A' },
  late: { title: '迟到', color: '#F59E0B', bg: '#F59E0B1A' }
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export default function MyAttendance() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireLogin } = useAuth()

  const [activeFilter, setActiveFilter] = useState<'all' | AttendanceStatus>('all')
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRecords = async () => {
    if (!currentClassId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res: any = await attendanceApi.getList(currentClassId, { pageSize: 100 })
      const list = res?.list || []
      const mapped: AttendanceRecord[] = list
        .filter(Boolean)
        .map((item: any) => {
          const d = new Date(item.startTime)
          const status: AttendanceStatus = item.myRecord?.status || 'absent'
          const location = item.location ? ` · ${item.location}` : ''
          return {
            id: item.id,
            day: String(d.getDate()),
            weekday: WEEKDAYS[d.getDay()],
            status,
            title: item.title,
            time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}${location}`
          }
        })
      setRecords(mapped)
    } catch {
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  useLoad(() => {
    if (!requireLogin()) return
    fetchRecords()
  })

  useDidShow(() => {
    fetchRecords()
  })

  usePullDownRefresh(async () => {
    await fetchRecords()
    Taro.stopPullDownRefresh()
  })

  const filtered =
    activeFilter === 'all'
      ? records
      : records.filter((r) => r.status === activeFilter)

  return (
    <View className='attmy'>
      <NavBar title='我的考勤' showBack={false} />

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
                <Text className={`attmy__tab-text ${active ? 'attmy__tab-text--active' : ''}`}>
                  {tab.label}
                </Text>
              </View>
            )
          })}
        </View>

        <Text className='attmy__section-title'>考勤记录</Text>

        {loading ? (
          <View className='attmy__loading'>
            <Text className='attmy__loading-text'>加载中...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View className='attmy__empty'>
            <Text className='attmy__empty-text'>暂无该状态考勤记录</Text>
          </View>
        ) : (
          filtered.map((record) => {
            const meta = STATUS_META[record.status] || STATUS_META.absent
            return (
              <View
                key={record.id}
                className='attmy__card'
                onClick={() =>
                  Taro.navigateTo({
                    url: `/pages-sub/attendance/detail/index?classId=${currentClassId}&attendanceId=${record.id}`
                  })
                }
              >
                <View className='attmy__date'>
                  <Text className='attmy__day'>{record.day}</Text>
                  <Text className='attmy__weekday'>{record.weekday}</Text>
                </View>
                <View className='attmy__info'>
                  <Text className='attmy__title' style={{ color: meta.color }}>
                    {record.title}
                  </Text>
                  <Text className='attmy__time'>{record.time}</Text>
                  <View className='attmy__tag' style={{ backgroundColor: meta.bg }}>
                    <Text className='attmy__tag-text' style={{ color: meta.color }}>
                      {meta.title}
                    </Text>
                  </View>
                </View>
              </View>
            )
          })
        )}
      </View>
    </View>
  )
}