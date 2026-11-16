import { useCallback, useEffect, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { PageHeader } from '@/components/business'
import { Icon } from '@/components/ui'
import { attendanceApi } from '@/services'
import { useAuth } from '@/utils'
import './index.scss'

type MyStatus = 'present' | 'late' | 'leave' | 'absent' | 'pending' | 'upcoming'

interface ReportSession {
  id: string
  title: string
  method: string
  startTime: string
  endTime: string
  status: 'pending' | 'in-progress' | 'completed'
  presentCount: number
  leaveCount: number
  absentCount: number
  total: number
  myStatus: MyStatus
}

interface ReportData {
  totalSessions: number
  memberCount: number
  myPresent: number
  myLeave: number
  myAbsent: number
  attendanceRate: number
  sessions: ReportSession[]
}

const MY_STATUS: Record<MyStatus, { text: string; color: string; bg: string }> = {
  present: { text: '正常', color: '#16A34A', bg: '#DCFCE7' },
  late: { text: '迟到', color: '#B45309', bg: '#FEF3C7' },
  leave: { text: '请假', color: '#B45309', bg: '#FEF3C7' },
  absent: { text: '缺勤', color: '#DC2626', bg: '#FEE2E2' },
  pending: { text: '待签到', color: '#1D4ED8', bg: '#DBEAFE' },
  upcoming: { text: '未开始', color: '#6B7280', bg: '#F3F4F6' }
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function AttendanceReport() {
  const { user } = useAuth()
  const classId = user?.classId

  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  const fetchReport = useCallback(async () => {
    if (!classId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const raw = (await attendanceApi.getClassReport(classId)) as any
      if (!raw || typeof raw !== 'object') throw new Error('考勤报表数据异常')
      setReport({
        totalSessions: Number(raw.totalSessions) || 0,
        memberCount: Number(raw.memberCount) || 0,
        myPresent: Number(raw.myPresent) || 0,
        myLeave: Number(raw.myLeave) || 0,
        myAbsent: Number(raw.myAbsent) || 0,
        attendanceRate: Number(raw.attendanceRate) || 0,
        sessions: Array.isArray(raw.sessions) ? raw.sessions : []
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取考勤报表失败')
    } finally {
      setLoading(false)
    }
  }, [classId])

  useEffect(() => {
    void fetchReport()
  }, [fetchReport])

  const handleExport = () => {
    if (!report || exporting) return
    setExporting(true)
    try {
      const header = ['日期', '签到标题', '我的状态', '已签到', '请假', '缺勤', '应到']
      const rows = report.sessions.map((s) => [
        formatDate(s.startTime),
        s.title,
        MY_STATUS[s.myStatus]?.text || s.myStatus,
        String(s.presentCount),
        String(s.leaveCount),
        String(s.absentCount),
        String(s.total)
      ])
      const content = [header, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n')
      const fileName = `考勤报表-${new Date().toISOString().slice(0, 10)}.csv`
      const filePath = `${Taro.env.USER_DATA_PATH}/${fileName}`
      Taro.getFileSystemManager().writeFileSync(filePath, `\uFEFF${content}`, 'utf8')
      ;(Taro as any).shareFileMessage({
        filePath,
        fileName,
        success: () => undefined,
        fail: () => {
          Taro.showToast({ title: '考勤报表已导出', icon: 'none' })
        }
      })
    } catch {
      Taro.showToast({ title: '导出失败，请重试', icon: 'none' })
    } finally {
      setExporting(false)
    }
  }

  return (
    <View className='attreport'>
      <PageHeader title='考勤报表' variant='a' />

      <View className='attreport__body'>
        {loading ? (
          <View className='attreport__loading'>
            <Text className='attreport__loading-text'>加载中...</Text>
          </View>
        ) : error || !report ? (
          <View className='attreport__state'>
            <Icon name='trending-up' size={80} color='#CBD5E1' strokeWidth={1.5} />
            <Text className='attreport__state-text'>{error || '暂无考勤数据'}</Text>
            <View className='attreport__retry' onClick={() => void fetchReport()}>
              <Text>重新加载</Text>
            </View>
          </View>
        ) : (
          <>
            <Text className='attreport__summary'>
              已结束 {report.totalSessions} 场 · 明细 {report.sessions.length} 条 · 班级成员{' '}
              {report.memberCount} 人
            </Text>

            {/* 我的考勤概览 */}
            <View className='attreport__stats'>
              <View className='attreport__stat'>
                <Text className='attreport__stat-value attreport__stat-value--rate'>
                  {report.attendanceRate}%
                </Text>
                <Text className='attreport__stat-label'>我的出勤率</Text>
              </View>
              <View className='attreport__stat'>
                <Text className='attreport__stat-value attreport__stat-value--leave'>
                  {report.myLeave}
                </Text>
                <Text className='attreport__stat-label'>请假</Text>
              </View>
              <View className='attreport__stat'>
                <Text className='attreport__stat-value attreport__stat-value--absent'>
                  {report.myAbsent}
                </Text>
                <Text className='attreport__stat-label'>缺勤</Text>
              </View>
            </View>

            {/* 场次明细 */}
            <View className='attreport__sessions'>
              <Text className='attreport__sessions-title'>场次明细</Text>
              {report.sessions.length === 0 ? (
                <View className='attreport__empty'>
                  <Text className='attreport__empty-text'>暂无签到记录</Text>
                </View>
              ) : (
                <View className='attreport__list'>
                  {report.sessions.map((session) => {
                    const meta = MY_STATUS[session.myStatus] || MY_STATUS.upcoming
                    return (
                      <View
                        key={session.id}
                        className='attreport__item'
                        onClick={() =>
                          Taro.navigateTo({
                            url: `/pages-sub/attendance/check-in-detail/index?classId=${classId}&attendanceId=${session.id}`
                          })
                        }
                      >
                        <View className='attreport__item-head'>
                          <View className='attreport__item-title-wrap'>
                            <Text className='attreport__item-title'>{session.title}</Text>
                            <Text className='attreport__item-time'>
                              {formatDate(session.startTime)} {formatTime(session.startTime)}
                            </Text>
                          </View>
                          <Text
                            className='attreport__pill'
                            style={{ color: meta.color, backgroundColor: meta.bg }}
                          >
                            {meta.text}
                          </Text>
                        </View>
                        <View className='attreport__item-stats'>
                          <Text>已签到 {session.presentCount}</Text>
                          <Text>请假 {session.leaveCount}</Text>
                          <Text>缺勤 {session.absentCount}</Text>
                          <Text className='attreport__item-total'>应到 {session.total}</Text>
                        </View>
                      </View>
                    )
                  })}
                </View>
              )}
            </View>

            <View
              className={`attreport__export ${
                report.sessions.length === 0 || exporting ? 'attreport__export--disabled' : ''
              }`}
              onClick={() => {
                if (report.sessions.length > 0 && !exporting) handleExport()
              }}
            >
              <Icon name='download' size={32} color='#FFFFFF' />
              <Text>{exporting ? '导出中...' : '导出 CSV'}</Text>
            </View>
          </>
        )}
      </View>
    </View>
  )
}