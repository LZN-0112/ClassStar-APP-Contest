import { useCallback, useEffect, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { ConfirmDialog, PageHeader } from '@/components/business'
import { Icon } from '@/components/ui'
import { attendanceApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import CodeMethod from './CodeMethod'
import FaceMethod from './FaceMethod'
import GpsMethod from './GpsMethod'
import QrCodeView from './QrCodeView'
import QrMethod from './QrMethod'
import './index.scss'

interface AttendanceDetail {
  id: string
  title: string
  type?: string
  startTime: string
  endTime: string
  method: string
  location?: string
  latitude: number | null
  longitude: number | null
  checkRadius?: number
  status: string
  publisher: { id: string; name: string }
  myRecord: { id: string; status: string; checkInAt: string } | null
  myLeaveApplication: {
    id: string
    status: string
    reason?: string
    createdAt: string
    reviewedAt?: string | null
  } | null
  createdAt: string
}

interface Statistics {
  total: number
  presentCount: number
  absentCount: number
  leaveCount: number
  hiddenCount?: number
  presentList: { userId: string; name: string; checkInAt: string; method: string }[]
  absentList: { userId: string; name: string }[]
  leaveList: { userId: string; name: string }[]
}

interface LeaveApplication {
  id: string
  student: { id: string; name: string; studentId?: string; avatar?: string }
  reason: string
  status: string
  createdAt: string
  reviewedAt?: string | null
}

type BoardTab = 'present' | 'absent' | 'leave'

const METHOD_ICONS: Record<string, { name: string; color: string }> = {
  gps: { name: 'map-pin', color: '#2563EB' },
  qr: { name: 'qrcode', color: '#22C55E' },
  face: { name: 'camera', color: '#F97316' },
  code: { name: 'key-round', color: '#EF4444' },
  normal: { name: 'map-pin', color: '#0062FF' }
}

const METHOD_LABELS: Record<string, string> = {
  gps: '定位签到',
  qr: '二维码签到',
  face: '拍照签到',
  code: '口令签到',
  normal: '普通签到'
}

const LEAVE_STATUS_LABELS: Record<string, { text: string; className: string }> = {
  pending: { text: '待审批', className: 'attdetail__leave-pill--pending' },
  approved: { text: '已通过', className: 'attdetail__leave-pill--approved' },
  rejected: { text: '已驳回', className: 'attdetail__leave-pill--rejected' }
}

const METHOD_HINTS: Record<string, string> = {
  gps: '先获取定位，确认在签到范围内后再提交',
  qr: '扫描班委在现场展示的二维码即可完成签到',
  face: '拍摄一张带时间水印的照片，确认后提交',
  code: '输入班委公布的 4 位数字签到口令',
  normal: '点击下方按钮即可完成签到'
}

/** 月-日 时:分 */
function formatTime(iso: string) {
  const d = new Date(iso)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 只取 HH:mm */
function formatClock(iso: string) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 倒计时：小于 1 小时显示 mm:ss，否则 hh:mm:ss */
function formatCountdown(ms: number) {
  const total = Math.max(Math.floor(ms / 1000), 0)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

/** 时长描述：2 小时 15 分 */
function formatDuration(ms: number) {
  const total = Math.max(Math.floor(ms / 60000), 1)
  const d = Math.floor(total / 1440)
  const h = Math.floor((total % 1440) / 60)
  const m = total % 60
  if (d > 0) return `${d} 天 ${h} 小时`
  if (h > 0) return `${h} 小时 ${m} 分`
  return `${total} 分钟`
}

export default function CheckInDetail() {
  const { user, isCommittee } = useAuth()
  const [classId, setClassId] = useState('')
  const [attendanceId, setAttendanceId] = useState('')
  const [detail, setDetail] = useState<AttendanceDetail | null>(null)
  const [stats, setStats] = useState<Statistics | null>(null)
  const [leaves, setLeaves] = useState<LeaveApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [boardTab, setBoardTab] = useState<BoardTab>('absent')
  const [actionLoading, setActionLoading] = useState(false)
  const [normalLoading, setNormalLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [confirmClose, setConfirmClose] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  // 实时倒计时
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const isManager = Boolean(
    isCommittee || (detail && user?.id === detail.publisher?.id)
  )

  const fetchStats = useCallback(async (cid: string, aid: string) => {
    try {
      const data: any = await attendanceApi.getReport(cid, aid)
      setStats(data || null)
    } catch {
      setStats(null)
    }
  }, [])

  const fetchLeaves = useCallback(async (cid: string, aid: string) => {
    try {
      const data: any = await attendanceApi.getLeaves(cid, aid)
      setLeaves(Array.isArray(data) ? data : [])
    } catch {
      setLeaves([])
    }
  }, [])

  const loadDetail = useCallback(
    async (cid: string, aid: string) => {
      setLoading(true)
      setLoadError('')
      try {
        const data: any = await attendanceApi.getDetail(cid, aid)
        if (!data?.id || !data?.startTime || !data?.endTime) {
          throw new Error('签到数据异常')
        }
        if (
          Number.isNaN(new Date(data.startTime).getTime()) ||
          Number.isNaN(new Date(data.endTime).getTime())
        ) {
          throw new Error('签到时间数据异常')
        }
        setDetail(data)
        await fetchStats(cid, aid)
        const currentUser = useUserStore.getState().userInfo
        if (
          currentUser?.isCommittee ||
          currentUser?.roleLevel === 'owner' ||
          currentUser?.roleLevel === 'admin' ||
          currentUser?.id === data.publisher?.id
        ) {
          await fetchLeaves(cid, aid)
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : '获取签到详情失败')
      } finally {
        setLoading(false)
      }
    },
    [fetchLeaves, fetchStats]
  )

  useLoad((options) => {
    const cid = options.classId || ''
    const aid = options.attendanceId || ''
    if (!cid || !aid) {
      setLoading(false)
      setLoadError('缺少签到参数')
      return
    }
    setClassId(cid)
    setAttendanceId(aid)
    void loadDetail(cid, aid)
  })

  const refreshAll = async () => {
    if (!classId || !attendanceId) return
    try {
      const data: any = await attendanceApi.getDetail(classId, attendanceId)
      if (data?.id) setDetail(data)
      await fetchStats(classId, attendanceId)
      if (isManager) await fetchLeaves(classId, attendanceId)
    } catch {
      // 忽略刷新失败，保留当前数据
    }
  }

  const handleClose = async () => {
    if (!classId || !attendanceId) return
    setActionLoading(true)
    try {
      await attendanceApi.close(classId, attendanceId)
      Taro.showToast({ title: '签到已结束', icon: 'success' })
      await refreshAll()
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '结束签到失败',
        icon: 'none'
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleRemind = async () => {
    if (!classId || !attendanceId) return
    setActionLoading(true)
    try {
      const res: any = await attendanceApi.remind(classId, attendanceId)
      const reminded = res?.reminded ?? 0
      Taro.showToast({
        title: reminded > 0 ? `已提醒 ${reminded} 位未签到成员` : '所有成员均已签到或请假',
        icon: 'none'
      })
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '催签失败',
        icon: 'none'
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleReviewLeave = async (applicationId: string, status: 'approved' | 'rejected') => {
    if (!classId || !attendanceId) return
    setActionLoading(true)
    try {
      await attendanceApi.leaveApproval(classId, attendanceId, applicationId, { status })
      Taro.showToast({
        title: status === 'approved' ? '已同意请假' : '已驳回请假',
        icon: 'success'
      })
      await refreshAll()
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '审批失败',
        icon: 'none'
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleNormalCheckIn = async () => {
    if (!classId || !attendanceId) return
    setNormalLoading(true)
    try {
      await attendanceApi.checkIn(classId, attendanceId, { method: 'normal' })
      Taro.showToast({ title: '签到成功！', icon: 'success' })
      await refreshAll()
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '签到失败',
        icon: 'none'
      })
    } finally {
      setNormalLoading(false)
    }
  }

  const goApplyLeave = () => {
    Taro.navigateTo({
      url: `/pages-sub/attendance/leave-apply/index?classId=${classId}&attendanceId=${attendanceId}`
    })
  }

  const goBack = () => {
    Taro.navigateBack()
  }

  if (loading) {
    return (
      <View className='attdetail'>
        <PageHeader title='签到详情' variant='a' barBg='#F5F7FA' showBack onBack={goBack} />
        <View className='attdetail__state'>
          <Text className='attdetail__state-text'>加载中...</Text>
        </View>
      </View>
    )
  }

  if (loadError) {
    return (
      <View className='attdetail'>
        <PageHeader title='签到详情' variant='a' barBg='#F5F7FA' showBack onBack={goBack} />
        <View className='attdetail__error'>
          <Icon name='x-circle' size={80} color='#CBD5E1' strokeWidth={1.5} />
          <Text className='attdetail__error-text'>{loadError}</Text>
          <View className='attdetail__retry' onClick={() => void loadDetail(classId, attendanceId)}>
            <Text>重新加载</Text>
          </View>
        </View>
      </View>
    )
  }

  if (!detail) {
    return (
      <View className='attdetail'>
        <PageHeader title='签到详情' variant='a' barBg='#F5F7FA' showBack onBack={goBack} />
        <View className='attdetail__state'>
          <Text className='attdetail__state-text'>签到不存在</Text>
        </View>
      </View>
    )
  }

  const startMs = new Date(detail.startTime).getTime()
  const endMs = new Date(detail.endTime).getTime()
  const timeState: 'upcoming' | 'ongoing' | 'ended' =
    detail.status === 'closed' || now > endMs ? 'ended' : now < startMs ? 'upcoming' : 'ongoing'

  const hasCheckedIn = detail.myRecord != null
  const leaveStatus = detail.myLeaveApplication?.status
  const canCheckIn = !hasCheckedIn && timeState === 'ongoing' && leaveStatus !== 'approved'
  const canApplyLeave =
    !hasCheckedIn && timeState !== 'ended' && !detail.myLeaveApplication && leaveStatus !== 'approved'

  const remainMs = Math.max(endMs - now, 0)
  const totalMs = Math.max(endMs - startMs, 1)
  const remainPercent = Math.min(Math.max(Math.round((remainMs / totalMs) * 100), 0), 100)
  const isUrgent = timeState === 'ongoing' && remainMs <= 5 * 60 * 1000

  const methodLabel = METHOD_LABELS[detail.method] || '普通签到'
  const methodIcon = METHOD_ICONS[detail.method] || METHOD_ICONS.normal

  const total = stats?.total || 0
  const presentCount = stats?.presentCount || 0
  const absentCount = stats?.absentCount || 0
  const leaveCount = stats?.leaveCount || 0
  const presentPct = total > 0 ? (presentCount / total) * 100 : 0
  const leavePct = total > 0 ? (leaveCount / total) * 100 : 0
  const absentPct = total > 0 ? (absentCount / total) * 100 : 0

  const boardItems =
    boardTab === 'present'
      ? (stats?.presentList ?? []).map((p) => ({
          id: p.userId,
          name: p.name,
          meta: formatClock(p.checkInAt)
        }))
      : boardTab === 'absent'
        ? (stats?.absentList ?? []).map((a) => ({ id: a.userId, name: a.name, meta: '未签到' }))
        : (stats?.leaveList ?? []).map((l) => ({ id: l.userId, name: l.name, meta: '请假' }))

  return (
    <View className='attdetail'>
      <PageHeader title={detail.title} variant='a' barBg='#F5F7FA' showBack onBack={goBack} />

      <View className='attdetail__body'>
        {/* 状态英雄区 */}
        {hasCheckedIn ? (
          <View className='attdetail__signed'>
            <View className='attdetail__signed-head'>
              <View className='attdetail__signed-icon'>
                <View className='attdetail__signed-ring' />
                <Icon name='check-circle' size={72} color='#16A34A' strokeWidth={2.5} />
              </View>
              <Text className='attdetail__signed-title'>签到成功</Text>
              <Text className='attdetail__signed-sub'>已记录本次考勤，无需其他操作</Text>
            </View>
            <View className='attdetail__signed-stats'>
              <View className='attdetail__signed-stat'>
                <Text className='attdetail__signed-label'>签到时间</Text>
                <Text className='attdetail__signed-value attdetail__num'>
                  {formatClock(detail.myRecord!.checkInAt)}
                </Text>
              </View>
              <View className='attdetail__signed-stat'>
                <Text className='attdetail__signed-label'>签到方式</Text>
                <Text className='attdetail__signed-value'>{methodLabel}</Text>
              </View>
            </View>
          </View>
        ) : timeState === 'ongoing' ? (
          /* 进行中：倒计时 + 一句话指引 */
          <View className='attdetail__ongoing'>
            <View className='attdetail__ongoing-decor' />
            <View className='attdetail__ongoing-top'>
              <View className='attdetail__ongoing-pill'>
                <View className='attdetail__ping'>
                  <View className='attdetail__ping-wave' />
                  <View className='attdetail__ping-dot' />
                </View>
                进行中
              </View>
              <Text className='attdetail__ongoing-method'>{methodLabel}</Text>
            </View>

            <View className='attdetail__ongoing-main'>
              <View className='attdetail__countdown'>
                <Text className='attdetail__countdown-label'>距离签到结束还有</Text>
                <Text
                  className={`attdetail__countdown-value attdetail__num ${
                    isUrgent ? 'attdetail__countdown-value--urgent' : ''
                  }`}
                >
                  {formatCountdown(remainMs)}
                </Text>
              </View>
              <View className='attdetail__ring-wrap'>
                <View
                  className='attdetail__ring'
                  style={{
                    background: `conic-gradient(#FFFFFF 0 ${remainPercent}%, rgba(255,255,255,0.25) ${remainPercent}% 100%)`
                  }}
                />
                <View className='attdetail__ring-text'>
                  <Text className='attdetail__ring-value attdetail__num'>{remainPercent}%</Text>
                  <Text className='attdetail__ring-label'>剩余</Text>
                </View>
              </View>
            </View>

            <View className='attdetail__ongoing-info'>
              <View className='attdetail__ongoing-info-title'>
                <Icon name='clock' size={28} color='#FFFFFF' />
                <Text>请在 {formatClock(detail.endTime)} 前完成签到</Text>
              </View>
              <View className='attdetail__ongoing-meta'>
                <Text>{formatTime(detail.startTime)} 开始</Text>
                {detail.location ? <Text>· {detail.location}</Text> : null}
                <Text>· 发起人 {detail.publisher?.name || '未知'}</Text>
              </View>
            </View>
          </View>
        ) : timeState === 'upcoming' ? (
          /* 未开始 */
          <View className='attdetail__upcoming'>
            <View className='attdetail__upcoming-top'>
              <View className='attdetail__upcoming-pill'>
                <Icon name='clock' size={24} color='#1D4ED8' />
                <Text>未开始</Text>
              </View>
              <Text className='attdetail__upcoming-method'>{methodLabel}</Text>
            </View>
            <View className='attdetail__upcoming-time'>
              <Text className='attdetail__upcoming-clock'>{formatClock(detail.startTime)}</Text>
              <Text className='attdetail__upcoming-tip'>开始签到</Text>
            </View>
            <Text className='attdetail__upcoming-count'>
              {formatDuration(startMs - now)}后开始，请提前到达
            </Text>
            <View className='attdetail__upcoming-meta'>
              <Text>
                {formatTime(detail.startTime)} - {formatClock(detail.endTime)}
              </Text>
              {detail.location ? <Text>· {detail.location}</Text> : null}
              <Text>· 发起人 {detail.publisher?.name || '未知'}</Text>
            </View>
          </View>
        ) : (
          /* 已结束 */
          <View
            className={`attdetail__ended ${
              leaveStatus === 'approved' ? 'attdetail__ended--approved' : ''
            }`}
          >
            <View className='attdetail__ended-head'>
              <Icon
                name={leaveStatus === 'approved' ? 'check-circle' : 'x-circle'}
                size={48}
                color={leaveStatus === 'approved' ? '#16A34A' : '#DC2626'}
              />
              <Text className='attdetail__ended-title'>
                {leaveStatus === 'approved' ? '已请假，无需签到' : '本次签到已结束'}
              </Text>
            </View>
            <Text
              className={`attdetail__ended-sub ${
                leaveStatus === 'approved' ? 'attdetail__ended-sub--approved' : ''
              }`}
            >
              {leaveStatus === 'approved'
                ? '请假申请已通过，本次不计入缺勤'
                : '未在有效时间内完成签到，已记为缺勤'}
            </Text>
            <View className='attdetail__ended-meta'>
              <Text>
                {formatTime(detail.startTime)} - {formatClock(detail.endTime)}
              </Text>
              {detail.location ? <Text>· {detail.location}</Text> : null}
            </View>
          </View>
        )}

        {/* 我的请假状态 */}
        {!hasCheckedIn &&
        detail.myLeaveApplication &&
        !(leaveStatus === 'approved' && timeState === 'ended') ? (
          <View
            className={`attdetail__leave-bar ${
              leaveStatus === 'approved'
                ? 'attdetail__leave-bar--approved'
                : leaveStatus === 'rejected'
                  ? 'attdetail__leave-bar--rejected'
                  : ''
            }`}
          >
            <View className='attdetail__leave-icon'>
              <Icon
                name='clock'
                size={32}
                color={
                  leaveStatus === 'approved'
                    ? '#16A34A'
                    : leaveStatus === 'rejected'
                      ? '#DC2626'
                      : '#B45309'
                }
              />
            </View>
            <View className='attdetail__leave-content'>
              <Text className='attdetail__leave-title'>
                {leaveStatus === 'approved'
                  ? '请假已通过，本次无需签到'
                  : leaveStatus === 'rejected'
                    ? '请假申请被驳回'
                    : '请假申请审核中'}
              </Text>
              <Text className='attdetail__leave-reason'>{detail.myLeaveApplication.reason}</Text>
            </View>
          </View>
        ) : null}

        {/* 签到操作区 */}
        {canCheckIn ? (
          <View className='attdetail__ops'>
            <View className='attdetail__hint'>
              <View className='attdetail__hint-icon'>
                <Icon name={methodIcon.name} size={40} color={methodIcon.color} />
              </View>
              <View className='attdetail__hint-text'>
                <Text className='attdetail__hint-title'>{methodLabel} · </Text>
                <Text>{METHOD_HINTS[detail.method] || METHOD_HINTS.normal}</Text>
              </View>
            </View>

            {detail.method === 'gps' ? (
              <GpsMethod
                classId={classId}
                attendanceId={attendanceId}
                attendance={{
                  location: detail.location,
                  latitude: detail.latitude,
                  longitude: detail.longitude,
                  checkRadius: detail.checkRadius
                }}
                onSuccess={refreshAll}
              />
            ) : null}
            {detail.method === 'qr' ? (
              <QrMethod classId={classId} attendanceId={attendanceId} onSuccess={refreshAll} />
            ) : null}
            {detail.method === 'face' ? (
              <FaceMethod classId={classId} attendanceId={attendanceId} onSuccess={refreshAll} />
            ) : null}
            {detail.method === 'code' ? (
              <CodeMethod classId={classId} attendanceId={attendanceId} onSuccess={refreshAll} />
            ) : null}
            {detail.method === 'normal' ? (
              <View
                className={`attdetail__normal-btn ${
                  normalLoading ? 'attdetail__normal-btn--disabled' : ''
                }`}
                onClick={() => {
                  if (!normalLoading) void handleNormalCheckIn()
                }}
              >
                <Text>{normalLoading ? '签到中...' : '立即签到'}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* 申请请假 */}
        {canApplyLeave ? (
          <View className='attdetail__apply-leave' onClick={goApplyLeave}>
            <Icon name='calendar-clock' size={32} color='#475569' />
            <Text>无法参加？申请请假</Text>
          </View>
        ) : null}

        {/* 班委管理 */}
        {isManager ? (
          <View className='attdetail__manager'>
            <View className='attdetail__card-head'>
              <View className='attdetail__card-title'>
                <Icon name='users' size={32} color='#0062FF' />
                <Text>签到管理</Text>
              </View>
              <Text className='attdetail__manager-badge'>仅班委可见</Text>
            </View>

            {detail.method === 'qr' && timeState !== 'ended' ? (
              <View className='attdetail__qr'>
                <View className='attdetail__qr-box'>
                  <QrCodeView value={`attendance:${classId}:${attendanceId}`} size={336} />
                </View>
                <Text className='attdetail__qr-tip'>请同学使用「扫一扫」扫描此二维码签到</Text>
              </View>
            ) : null}

            <View className='attdetail__manager-actions'>
              <View
                className={`attdetail__manager-btn attdetail__manager-btn--remind ${
                  actionLoading || timeState === 'ended' ? 'attdetail__manager-btn--disabled' : ''
                }`}
                onClick={() => {
                  if (!actionLoading && timeState !== 'ended') void handleRemind()
                }}
              >
                <Icon name='bell' size={32} color='#0062FF' />
                <Text>一键催签</Text>
              </View>
              <View
                className={`attdetail__manager-btn attdetail__manager-btn--stop ${
                  actionLoading || detail.status !== 'open' ? 'attdetail__manager-btn--disabled' : ''
                }`}
                onClick={() => {
                  if (!actionLoading && detail.status === 'open') setConfirmClose(true)
                }}
              >
                <Icon name='stop-circle' size={32} color='#DC2626' />
                <Text>{detail.status === 'open' ? '结束签到' : '已结束'}</Text>
              </View>
            </View>

            <View className='attdetail__leaves'>
              <View className='attdetail__leaves-head'>
                <Text className='attdetail__leaves-title'>请假申请</Text>
                <Text className='attdetail__leaves-count'>{leaves.length} 条</Text>
              </View>
              {leaves.length === 0 ? (
                <View className='attdetail__leaves-empty'>
                  <Text>暂无请假申请</Text>
                </View>
              ) : (
                <View className='attdetail__leaves-list'>
                  {leaves.map((item) => (
                    <View key={item.id} className='attdetail__leave-item'>
                      <View className='attdetail__leave-item-head'>
                        <View className='attdetail__leave-avatar'>
                          <Text>{(item.student?.name || '?').slice(0, 1)}</Text>
                        </View>
                        <Text className='attdetail__leave-name'>
                          {item.student?.name || '未知成员'}
                        </Text>
                        <Text
                          className={`attdetail__leave-pill ${
                            LEAVE_STATUS_LABELS[item.status]?.className ||
                            'attdetail__leave-pill--default'
                          }`}
                        >
                          {LEAVE_STATUS_LABELS[item.status]?.text || item.status}
                        </Text>
                      </View>
                      <Text className='attdetail__leave-item-reason'>{item.reason}</Text>
                      {item.status === 'pending' ? (
                        <View className='attdetail__leave-item-actions'>
                          <View
                            className={`attdetail__leave-approve ${
                              actionLoading ? 'attdetail__leave-btn--disabled' : ''
                            }`}
                            onClick={() => {
                              if (!actionLoading) void handleReviewLeave(item.id, 'approved')
                            }}
                          >
                            <Text>同意</Text>
                          </View>
                          <View
                            className={`attdetail__leave-reject ${
                              actionLoading ? 'attdetail__leave-btn--disabled' : ''
                            }`}
                            onClick={() => {
                              if (!actionLoading) void handleReviewLeave(item.id, 'rejected')
                            }}
                          >
                            <Text>驳回</Text>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        ) : null}

        {/* 本场考勤看板 */}
        {stats && total > 0 ? (
          <View className='attdetail__board'>
            <View className='attdetail__card-head'>
              <View className='attdetail__card-title'>
                <Icon name='users' size={32} color='#0062FF' />
                <Text>本场考勤</Text>
              </View>
              <View className='attdetail__board-summary'>
                <Text className='attdetail__board-present attdetail__num'>{presentCount}</Text>
                <Text className='attdetail__board-total'> / {total} 人已签到</Text>
              </View>
            </View>

            <View className='attdetail__board-bar'>
              <View className='attdetail__board-seg attdetail__board-seg--present' style={{ width: `${presentPct}%` }} />
              <View className='attdetail__board-seg attdetail__board-seg--leave' style={{ width: `${leavePct}%` }} />
              <View className='attdetail__board-seg attdetail__board-seg--absent' style={{ width: `${absentPct}%` }} />
            </View>

            <View className='attdetail__board-legend'>
              <View className='attdetail__legend-item'>
                <View className='attdetail__dot attdetail__dot--present' />
                <Text>已签到 {presentCount}</Text>
              </View>
              <View className='attdetail__legend-item'>
                <View className='attdetail__dot attdetail__dot--leave' />
                <Text>请假 {leaveCount}</Text>
              </View>
              <View className='attdetail__legend-item'>
                <View className='attdetail__dot attdetail__dot--absent' />
                <Text>未签 {absentCount}</Text>
              </View>
            </View>

            {isManager ? (
              <>
                <View className='attdetail__board-tabs'>
                  <View
                    className={`attdetail__board-tab ${
                      boardTab === 'present' ? 'attdetail__board-tab--present' : ''
                    }`}
                    onClick={() => setBoardTab('present')}
                  >
                    <Text className='attdetail__board-tab-value attdetail__num attdetail__board-tab-value--present'>
                      {presentCount}
                    </Text>
                    <Text className='attdetail__board-tab-label'>已签到</Text>
                  </View>
                  <View
                    className={`attdetail__board-tab ${
                      boardTab === 'absent' ? 'attdetail__board-tab--absent' : ''
                    }`}
                    onClick={() => setBoardTab('absent')}
                  >
                    <Text className='attdetail__board-tab-value attdetail__num attdetail__board-tab-value--absent'>
                      {absentCount}
                    </Text>
                    <Text className='attdetail__board-tab-label'>未签到</Text>
                  </View>
                  <View
                    className={`attdetail__board-tab ${
                      boardTab === 'leave' ? 'attdetail__board-tab--leave' : ''
                    }`}
                    onClick={() => setBoardTab('leave')}
                  >
                    <Text className='attdetail__board-tab-value attdetail__num attdetail__board-tab-value--leave'>
                      {leaveCount}
                    </Text>
                    <Text className='attdetail__board-tab-label'>请假</Text>
                  </View>
                </View>

                <View className='attdetail__board-list'>
                  {boardItems.length === 0 ? (
                    <View className='attdetail__board-empty'>
                      <Text>
                        {boardTab === 'present'
                          ? '还没有人签到'
                          : boardTab === 'absent'
                            ? '全部已签到'
                            : '暂无请假'}
                      </Text>
                    </View>
                  ) : (
                    boardItems.map((item) => (
                      <View key={item.id} className='attdetail__board-item'>
                        <View className='attdetail__board-avatar'>
                          <Text>{item.name.slice(0, 1)}</Text>
                        </View>
                        <Text className='attdetail__board-name'>{item.name}</Text>
                        <Text className='attdetail__board-meta'>{item.meta}</Text>
                      </View>
                    ))
                  )}
                </View>

                {(stats.hiddenCount ?? 0) > 0 ? (
                  <Text className='attdetail__board-hidden'>
                    另有 {stats.hiddenCount} 位成员设置了考勤隐私，未展示明细
                  </Text>
                ) : null}
              </>
            ) : null}
          </View>
        ) : null}
      </View>

      <ConfirmDialog
        open={confirmClose}
        title='结束本次签到？'
        description='结束后成员将无法继续签到，未签到成员会被记为缺勤，该操作不可撤销。'
        confirmText='确认结束'
        danger
        onCancel={() => setConfirmClose(false)}
        onConfirm={() => {
          setConfirmClose(false)
          void handleClose()
        }}
      />
    </View>
  )
}