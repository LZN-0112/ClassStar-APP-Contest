import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar, ListLoading } from '@/components/business'
import { attendanceApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

interface ReportStats {
  total?: number
  checkedCount?: number
  unCheckedCount?: number
  presentCount?: number
  leaveCount?: number
  lateCount?: number
  absentCount?: number
  attendanceRate?: number
  trend?: { date: string; rate: number }[]
}

interface DetailData {
  id: string
  title: string
}

export default function AttendanceReport() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireLogin } = useAuth()

  const [stats, setStats] = useState<ReportStats | null>(null)
  const [detail, setDetail] = useState<DetailData | null>(null)
  const [loading, setLoading] = useState(true)

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

    const load = async () => {
      setLoading(true)
      const s: any = await attendanceApi.getReport(classIdRef.id, idRef.id).catch(() => null)
      setStats(s || null)
      const d: any = await attendanceApi.getDetail(classIdRef.id, idRef.id).catch(() => null)
      setDetail(d || null)
      setLoading(false)
    }
    load()
  })

  const rate = stats?.attendanceRate ?? 0
  const leaveCount = stats?.leaveCount ?? 0
  const absentCount = stats?.absentCount ?? 0
  const trend = stats?.trend || []
  const maxTrend = Math.max(1, ...trend.map((t) => t.rate ?? 0))

  const handleExport = () => {
    const rows = [
      ['考勤报表', detail?.title || ''],
      ['出勤率', `${rate}%`],
      ['请假', String(leaveCount)],
      ['缺勤', String(absentCount)]
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    try {
      const fs = Taro.getFileSystemManager()
      const filePath = `${Taro.env.USER_DATA_PATH}/考勤报表.csv`
      fs.writeFileSync(filePath, `\ufeff${csv}`, 'utf8')
      Taro.showToast({ title: '报表已导出', icon: 'success' })
    } catch {
      Taro.showToast({ title: '导出失败', icon: 'none' })
    }
  }

  return (
    <View className='attreport'>
      <NavBar title='考勤报表' />

      <View className='attreport__body'>
        {loading ? (
          <ListLoading rows={5} />
        ) : (
          <>
            <Text className='attreport__title'>考勤报表</Text>
            <Text className='attreport__subtitle'>
              {detail?.title || '2024-2025 第一学期'}
            </Text>

            <View className='attreport__stats'>
              <View className='attreport__stat'>
                <Text className='attreport__stat-value'>{rate}%</Text>
                <Text className='attreport__stat-label'>出勤率</Text>
              </View>
              <View className='attreport__stat'>
                <Text className='attreport__stat-value'>{leaveCount}</Text>
                <Text className='attreport__stat-label'>请假</Text>
              </View>
              <View className='attreport__stat'>
                <Text className='attreport__stat-value'>{absentCount}</Text>
                <Text className='attreport__stat-label'>缺勤</Text>
              </View>
            </View>

            <View className='attreport__chart'>
              <Text className='attreport__chart-title'>出勤趋势</Text>
              <View className='attreport__bars'>
                {trend.length === 0
                  ? Array.from({ length: 7 }).map((_, i) => (
                      <View className='attreport__bar' key={`ph-${i}`} style={{ height: `${80 + (i % 3) * 20}rpx` }} />
                    ))
                  : trend.map((t, i) => {
                      const h = Math.max(32, Math.round(((t.rate ?? 0) / maxTrend) * 200))
                      return <View className='attreport__bar' key={i} style={{ height: `${h}rpx` }} />
                    })}
              </View>
            </View>

            <View className='attreport__export' onClick={handleExport}>
              <Text className='attreport__export-text'>导出 Excel</Text>
            </View>
          </>
        )}
      </View>
    </View>
  )
}