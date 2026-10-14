import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar, ListLoading } from '@/components/business'
import { Icon } from '@/components/ui'
import { attendanceApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

interface DetailData {
  id: string
  title: string
  startTime: string
  endTime: string
  method: string
  location?: string
  status: string
  requirement?: unknown
  myRecord?: { status?: string; checked?: boolean } | null
}

interface ReportData {
  total?: number
  checkedCount?: number
  unCheckedCount?: number
  checkedList?: { name: string; studentId?: string }[]
  unCheckedList?: { name: string; studentId?: string }[]
}

function formatDateTime(iso?: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

const METHOD_LABEL: Record<string, string> = {
  gps: '定位签到',
  normal: '普通签到',
  qr: '扫码签到',
  face: '拍照签到',
  code: '口令签到'
}

export default function AttendanceDetail() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const user = useUserStore((s) => s.userInfo)
  const { requireLogin } = useAuth()

  const [detail, setDetail] = useState<DetailData | null>(null)
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  const classIdRef = { id: '' }
  const idRef = { id: '' }

  const isCommittee = user?.isCommittee === true
  const myChecked = detail?.myRecord?.checked === true || detail?.myRecord?.status === 'present'

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

    const load = async () => {
      if (!classIdRef.id) return
      setLoading(true)
      try {
        const d: any = await attendanceApi.getDetail(classIdRef.id, idRef.id)
        setDetail(d || null)
      } catch {
        Taro.showToast({ title: '获取考勤详情失败', icon: 'none' })
      } finally {
        setLoading(false)
      }
      try {
        const r: any = await attendanceApi.getReport(classIdRef.id, idRef.id)
        setReport(r || null)
      } catch {
        setReport(null)
      }
    }
    load()
  })

  const handleCheckIn = () => {
    Taro.navigateTo({
      url: `/pages-sub/attendance/check-in-detail/index?classId=${classIdRef.id}&attendanceId=${idRef.id}`
    })
  }

  const handleRemind = () => {
    Taro.showToast({ title: '已发送催签通知', icon: 'success' })
  }

  const handleReport = () => {
    Taro.navigateTo({
      url: `/pages-sub/attendance/report/index?classId=${classIdRef.id}&attendanceId=${idRef.id}`
    })
  }

  const total = report?.total ?? 0
  const checkedCount = report?.checkedCount ?? 0
  const unCheckedCount = report?.unCheckedCount ?? 0
  const unCheckedList = report?.unCheckedList || []

  const isOpen = detail?.status !== 'closed' && new Date(detail?.endTime || 0).getTime() > Date.now()

  return (
    <View className='attdetail'>
      <NavBar title='考勤详情' />

      <View className='attdetail__body'>
        {loading ? (
          <ListLoading rows={5} />
        ) : !detail ? (
          <View className='attdetail__empty'>
            <Text className='attdetail__empty-text'>考勤不存在</Text>
          </View>
        ) : (
          <>
            <Text className='attdetail__title'>{detail.title}</Text>
            <Text className='attdetail__meta'>
              {isOpen ? '进行中' : '已结束'} · {formatDateTime(detail.startTime)}
            </Text>

            <View className='attdetail__info'>
              <View className='attdetail__info-row'>
                <Text className='attdetail__info-label'>签到方式</Text>
                <Text className='attdetail__info-value'>{METHOD_LABEL[detail.method] || detail.method}</Text>
              </View>
              {detail.location ? (
                <View className='attdetail__info-row'>
                  <Text className='attdetail__info-label'>签到地点</Text>
                  <Text className='attdetail__info-value'>{detail.location}</Text>
                </View>
              ) : null}
              <View className='attdetail__info-row'>
                <Text className='attdetail__info-label'>结束时间</Text>
                <Text className='attdetail__info-value'>{formatDateTime(detail.endTime)}</Text>
              </View>
            </View>

            {isCommittee ? (
              <>
                {/* 统计数据 */}
                <View className='attdetail__stats'>
                  <View className='attdetail__stat'>
                    <Text className='attdetail__stat-value'>{total}</Text>
                    <Text className='attdetail__stat-label'>应到</Text>
                  </View>
                  <View className='attdetail__stat'>
                    <Text className='attdetail__stat-value'>{checkedCount}</Text>
                    <Text className='attdetail__stat-label'>已签</Text>
                  </View>
                  <View className='attdetail__stat'>
                    <Text className='attdetail__stat-value'>{unCheckedCount}</Text>
                    <Text className='attdetail__stat-label'>未签</Text>
                  </View>
                </View>

                {/* 未签人员 */}
                <View className='attdetail__section'>
                  <Text className='attdetail__section-title'>未签人员</Text>
                  {unCheckedList.length === 0 ? (
                    <View className='attdetail__none'>
                      <Text className='attdetail__none-text'>全部已签到</Text>
                    </View>
                  ) : (
                    unCheckedList.map((m, i) => (
                      <View className='attdetail__member' key={i}>
                        <Text className='attdetail__member-name'>{m.name}</Text>
                        <Text className='attdetail__member-status'>未签到</Text>
                      </View>
                    ))
                  )}
                </View>

                <View className='attdetail__btn' onClick={handleRemind}>
                  <Text className='attdetail__btn-text'>一键催签</Text>
                </View>
                <View className='attdetail__btn attdetail__btn--ghost' onClick={handleReport}>
                  <Text className='attdetail__btn-text--blue'>查看考勤报表</Text>
                </View>
              </>
            ) : (
              <>
                {/* 学生：未签到则展示签到按钮 */}
                {!myChecked ? (
                  <View className='attdetail__btn' onClick={handleCheckIn}>
                    <Text className='attdetail__btn-text'>立即签到</Text>
                  </View>
                ) : (
                  <View className='attdetail__checked'>
                    <Icon name='check-circle' size={72} color='#22C55E' strokeWidth={1.5} />
                    <Text className='attdetail__checked-text'>已签到</Text>
                  </View>
                )}
              </>
            )}
          </>
        )}
      </View>
    </View>
  )
}