import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar, ListLoading } from '@/components/business'
import { Icon } from '@/components/ui'
import { attendanceApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import GpsMethod from './GpsMethod'
import QrMethod from './QrMethod'
import FaceMethod from './FaceMethod'
import CodeMethod from './CodeMethod'
import './index.scss'

interface AttendanceDetail {
  id: string
  title: string
  method: string
  location?: string
  latitude?: number | null
  longitude?: number | null
  checkRadius?: number
  status: string
  startTime?: string
  endTime?: string
  myRecord?: { id: string; status: string; checkInAt?: string } | null
}

interface Stats {
  total?: number
  presentCount?: number
  absentCount?: number
  leaveCount?: number
  presentList?: { userId: string; name: string; checkInAt?: string; method?: string }[]
  absentList?: { userId: string; name: string }[]
  leaveList?: { userId: string; name: string }[]
}

const METHOD_LABEL: Record<string, string> = {
  gps: '定位签到',
  qr: '二维码签到',
  face: '拍照签到',
  code: '口令签到',
  normal: '普通签到'
}

function formatTime(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${mm}-${dd} ${hh}:${min}`
}

export default function CheckInDetail() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireLogin } = useAuth()

  const [detail, setDetail] = useState<AttendanceDetail | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showStats, setShowStats] = useState(false)

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
    fetchData()
  })

  const fetchData = async () => {
    if (!classIdRef.id || !idRef.id) return
    setLoading(true)
    try {
      const [d, s] = await Promise.all([
        attendanceApi.getDetail(classIdRef.id, idRef.id),
        attendanceApi.getReport(classIdRef.id, idRef.id)
      ])
      setDetail((d as any)?.data || (d as any) || null)
      setStats((s as any)?.data || (s as any) || null)
    } catch {
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }

  const handleNormalCheckIn = async () => {
    try {
      await attendanceApi.checkIn(classIdRef.id, idRef.id, { method: 'normal' } as never)
      Taro.showToast({ title: '签到成功', icon: 'success' })
      fetchData()
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '签到失败',
        icon: 'none'
      })
    }
  }

  if (loading) {
    return (
      <View className='attdetail'>
        <NavBar title='签到详情' />
        <ListLoading rows={4} />
      </View>
    )
  }

  if (!detail) {
    return (
      <View className='attdetail'>
        <NavBar title='签到详情' />
        <View className='attdetail__empty'>
          <Text className='attdetail__empty-text'>签到不存在</Text>
        </View>
      </View>
    )
  }

  const hasCheckedIn = detail.myRecord != null
  const isClosed = detail.status !== 'open'
  const method = detail.method || 'normal'
  const presentList = stats?.presentList || []
  const absentList = stats?.absentList || []
  const leaveList = stats?.leaveList || []

  const goLeave = () => {
    Taro.navigateTo({
      url: `/pages-sub/attendance/leave-apply/index?classId=${classIdRef.id}&attendanceId=${idRef.id}`
    })
  }

  return (
    <View className='attdetail'>
      <NavBar title={detail.title} />

      <View className='attdetail__body'>
        {/* 签到信息卡片 */}
        <View className='attdetail__info'>
          <View className='attdetail__info-head'>
            <Icon name={method === 'gps' ? 'map-pin' : method === 'code' ? 'lock' : 'camera'} size={40} color='#0062FF' strokeWidth={2} />
            <Text className='attdetail__info-title'>{METHOD_LABEL[method] || '普通签到'}</Text>
            <View className={`attdetail__badge ${isClosed ? 'attdetail__badge--closed' : ''}`}>
              {isClosed ? '已结束' : '进行中'}
            </View>
          </View>
          <View className='attdetail__info-meta'>
            <Text className='attdetail__info-row'>{formatTime(detail.startTime)} ~ {formatTime(detail.endTime)}</Text>
            {detail.location ? <Text className='attdetail__info-row'>地点：{detail.location}</Text> : null}
            {detail.checkRadius ? <Text className='attdetail__info-row'>范围：{detail.checkRadius} 米</Text> : null}
          </View>
        </View>

        {/* 已签到状态 */}
        {hasCheckedIn ? (
          <View className='attdetail__done'>
            <Icon name='check-circle' size={40} color='#16A34A' strokeWidth={2} />
            <Text className='attdetail__done-text'>您已完成签到</Text>
            {detail.myRecord?.checkInAt ? (
              <Text className='attdetail__done-time'>{formatTime(detail.myRecord.checkInAt)}</Text>
            ) : null}
          </View>
        ) : null}

        {/* 签到操作区 */}
        {!hasCheckedIn && !isClosed ? (
          <View className='attdetail__ops'>
            {method === 'gps' ? (
              <GpsMethod
                classId={classIdRef.id}
                attendanceId={idRef.id}
                attendance={{ location: detail.location, latitude: detail.latitude, longitude: detail.longitude, checkRadius: detail.checkRadius }}
                onSuccess={fetchData}
              />
            ) : null}
            {method === 'qr' ? (
              <QrMethod classId={classIdRef.id} attendanceId={idRef.id} onSuccess={fetchData} />
            ) : null}
            {method === 'face' ? (
              <FaceMethod classId={classIdRef.id} attendanceId={idRef.id} onSuccess={fetchData} />
            ) : null}
            {method === 'code' ? (
              <CodeMethod classId={classIdRef.id} attendanceId={idRef.id} onSuccess={fetchData} />
            ) : null}
            {method === 'normal' ? (
              <View className='attdetail__btn' onClick={handleNormalCheckIn}>
                <Text className='attdetail__btn-text'>立即签到</Text>
              </View>
            ) : null}
            <View className='attdetail__btn attdetail__btn--leave' onClick={goLeave}>
              <Text className='attdetail__btn-text--blue'>请假</Text>
            </View>
          </View>
        ) : null}

        {/* 已结束提示 */}
        {isClosed && !hasCheckedIn ? (
          <View className='attdetail__closed'>
            <Icon name='alert-circle' size={40} color='#DC2626' strokeWidth={2} />
            <Text className='attdetail__closed-text'>签到已结束</Text>
          </View>
        ) : null}

        {/* 统计信息 */}
        {stats ? (
          <View className='attdetail__stats'>
            <View className='attdetail__stats-toggle' onClick={() => setShowStats(!showStats)}>
              <Text className='attdetail__stats-title'>考勤统计</Text>
              <Text className='attdetail__stats-hint'>{showStats ? '收起' : '展开'}</Text>
            </View>

            {showStats ? (
              <View className='attdetail__stats-body'>
                <View className='attdetail__stat-grid'>
                  <View className='attdetail__stat attdetail__stat--present'>
                    <Text className='attdetail__stat-num'>{stats.presentCount ?? 0}</Text>
                    <Text className='attdetail__stat-label'>已签到</Text>
                  </View>
                  <View className='attdetail__stat attdetail__stat--absent'>
                    <Text className='attdetail__stat-num'>{stats.absentCount ?? 0}</Text>
                    <Text className='attdetail__stat-label'>未签到</Text>
                  </View>
                  <View className='attdetail__stat attdetail__stat--leave'>
                    <Text className='attdetail__stat-num'>{stats.leaveCount ?? 0}</Text>
                    <Text className='attdetail__stat-label'>请假</Text>
                  </View>
                </View>

                {presentList.length > 0 ? (
                  <View className='attdetail__stat-group'>
                    <Text className='attdetail__stat-group-title'>已签到人员</Text>
                    {presentList.map((p) => (
                      <View className='attdetail__stat-person' key={p.userId}>
                        <Icon name='check-circle' size={24} color='#16A34A' strokeWidth={2} />
                        <Text className='attdetail__stat-person-name'>{p.name}</Text>
                        <Text className='attdetail__stat-person-time'>{formatTime(p.checkInAt)}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {absentList.length > 0 ? (
                  <View className='attdetail__stat-group'>
                    <Text className='attdetail__stat-group-title'>未签到人员</Text>
                    {absentList.map((a) => (
                      <View className='attdetail__stat-person' key={a.userId}>
                        <View className='attdetail__dot attdetail__dot--red' />
                        <Text className='attdetail__stat-person-name'>{a.name}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {leaveList.length > 0 ? (
                  <View className='attdetail__stat-group'>
                    <Text className='attdetail__stat-group-title'>请假人员</Text>
                    {leaveList.map((l) => (
                      <View className='attdetail__stat-person' key={l.userId}>
                        <Icon name='clock' size={24} color='#D97706' strokeWidth={2} />
                        <Text className='attdetail__stat-person-name'>{l.name}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  )
}