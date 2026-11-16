import { useRef, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad, useDidShow } from '@tarojs/taro'

import { NavBar, ListEmpty, ListLoading, StatCard } from '@/components/business'
import { Icon } from '@/components/ui'
import { archiveApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

interface SemesterReportData {
  period?: { startTime?: string; endTime?: string }
  memberCount?: number
  attendance?: { totalSessions?: number; expected?: number; present?: number; rate?: number }
  homework?: { totalHomeworks?: number; expected?: number; submitted?: number; rate?: number }
  activity?: { totalActivities?: number; expected?: number; participated?: number; rate?: number }
  fee?: { income?: number; expense?: number; balance?: number }
}

function num(v: any): number {
  const n = Number(v)
  return Number.isNaN(n) ? 0 : n
}

function formatPercent(v: any): string {
  const n = Math.round(num(v) * 10) / 10
  return `${Number.isInteger(n) ? n : n.toFixed(1)}%`
}

function formatMoney(v: any): string {
  return num(v).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

function formatDate(v?: string): string {
  return (v || '').slice(0, 10)
}

export default function SemesterReport() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireLogin } = useAuth()

  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState<SemesterReportData | null>(null)
  const [exporting, setExporting] = useState(false)
  const firstShowRef = useRef(true)

  const fetchData = async () => {
    if (!currentClassId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res: any = await archiveApi.getSemesterReport(currentClassId)
      setReport(res && typeof res === 'object' ? res : null)
    } catch {
      setReport(null)
    } finally {
      setLoading(false)
    }
  }

  useLoad(() => {
    if (!requireLogin()) return
    fetchData()
  })

  useDidShow(() => {
    // 首帧由 useLoad 触发，避免重复请求
    if (firstShowRef.current) {
      firstShowRef.current = false
      return
    }
    fetchData()
  })

  const periodText = `${formatDate(report?.period?.startTime)} 至 ${formatDate(report?.period?.endTime)}`

  const handleExport = () => {
    if (!report || exporting) return
    setExporting(true)
    try {
      const rows: string[][] = [
        ['项目', '数值', '说明'],
        ['统计周期', periodText, ''],
        ['班级人数', String(num(report.memberCount)), ''],
        [
          '考勤签到率',
          formatPercent(report.attendance?.rate),
          `${num(report.attendance?.totalSessions)} 次签到，${num(report.attendance?.present)}/${num(report.attendance?.expected)} 人次`
        ],
        [
          '作业提交率',
          formatPercent(report.homework?.rate),
          `${num(report.homework?.totalHomeworks)} 次作业，${num(report.homework?.submitted)}/${num(report.homework?.expected)} 份`
        ],
        [
          '活动参与率',
          formatPercent(report.activity?.rate),
          `${num(report.activity?.totalActivities)} 场活动，${num(report.activity?.participated)}/${num(report.activity?.expected)} 人次`
        ],
        ['班费收入', `¥${formatMoney(report.fee?.income)}`, ''],
        ['班费支出', `¥${formatMoney(report.fee?.expense)}`, ''],
        ['班费结余', `¥${formatMoney(report.fee?.balance)}`, '']
      ]
      const content =
        '\uFEFF' +
        rows
          .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
          .join('\r\n')
      const fileName = `学期报表-${formatDate(report.period?.endTime) || '班级'}.csv`
      const filePath = `${Taro.env.USER_DATA_PATH}/${fileName}`
      Taro.getFileSystemManager().writeFileSync(filePath, content, 'utf8')
      ;(Taro as any).shareFileMessage({
        filePath,
        fileName,
        success: () => undefined,
        fail: () => {
          Taro.showToast({ title: '报表已导出', icon: 'none' })
        }
      })
    } catch {
      Taro.showToast({ title: '导出失败，请重试', icon: 'none' })
    } finally {
      setExporting(false)
    }
  }

  const statCards = [
    {
      icon: 'check-circle',
      value: formatPercent(report?.attendance?.rate),
      label: '签到率',
      color: '#22C55E'
    },
    {
      icon: 'file-check',
      value: formatPercent(report?.homework?.rate),
      label: '作业提交率',
      color: '#2563EB'
    },
    {
      icon: 'flag',
      value: formatPercent(report?.activity?.rate),
      label: '活动参与率',
      color: '#EF4444'
    },
    {
      icon: 'wallet',
      value: `¥${formatMoney(report?.fee?.balance)}`,
      label: '班费结余',
      color: '#10B981'
    }
  ]

  const financeRows = [
    { label: '班费收入', value: `¥${formatMoney(report?.fee?.income)}`, icon: 'wallet', color: '#10B981' },
    { label: '班费支出', value: `¥${formatMoney(report?.fee?.expense)}`, icon: 'credit-card', color: '#F59E0B' }
  ]

  return (
    <View className='srep'>
      <NavBar title='学期报表' />

      <View className='srep__body'>
        {loading ? (
          <ListLoading rows={5} />
        ) : !report ? (
          <ListEmpty icon='pie-chart' text='暂无报表数据' />
        ) : (
          <>
            {/* 学期信息卡 */}
            <View className='srep__semester'>
              <Text className='srep__semester-title'>班级学期报表</Text>
              <Text className='srep__semester-sub'>统计周期：{periodText}</Text>
              <Text className='srep__semester-sub'>班级人数：{num(report.memberCount)} 人</Text>
            </View>

            {/* 统计卡 */}
            <View className='srep__stats'>
              {statCards.map((s) => (
                <StatCard key={s.label} icon={s.icon} value={s.value} label={s.label} color={s.color} />
              ))}
            </View>

            {/* 收支明细 */}
            <View className='srep__finances'>
              {financeRows.map((row) => (
                <View className='srep__finance' key={row.label}>
                  <View className='srep__finance-icon' style={{ backgroundColor: `${row.color}1a` }}>
                    <Icon name={row.icon} size={40} color={row.color} strokeWidth={2} />
                  </View>
                  <Text className='srep__finance-label'>{row.label}</Text>
                  <Text className='srep__finance-value'>{row.value}</Text>
                </View>
              ))}
            </View>

            {/* 导出选项 */}
            <View className='srep__export' style={{ marginBottom: '40rpx' }}>
              <Text className='srep__export-title'>导出选项</Text>
              <View className='srep__export-item' onClick={handleExport}>
                <View className='srep__export-icon'>
                  <Icon name='bar-chart' size={48} color='#60A5FA' strokeWidth={2} />
                </View>
                <Text className='srep__export-label'>{exporting ? '导出中…' : '导出 CSV 报表'}</Text>
                <Icon name='chevron-right' size={36} color='#4B5563' strokeWidth={2} />
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  )
}