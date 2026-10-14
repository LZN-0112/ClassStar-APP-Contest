import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad, useDidShow } from '@tarojs/taro'

import { NavBar, ListEmpty, ListLoading, StatCard } from '@/components/business'
import { Icon } from '@/components/ui'
import { archiveApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

interface ReportData {
  semester?: string
  semesterName?: string
  title?: string
  activityCount?: number
  attendanceRate?: number
  income?: number
  expense?: number
  homeworkCompletionRate?: number
  items?: any[]
}

function num(v: any): number {
  const n = Number(v)
  return Number.isNaN(n) ? 0 : n
}

export default function SemesterReport() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireLogin } = useAuth()

  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState<ReportData | null>(null)

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
    fetchData()
  })

  const goExport = (format: 'xlsx' | 'pdf') => {
    Taro.navigateTo({ url: `/pages-sub/archive/export/index?format=${format}` })
  }

  const semesterText =
    report?.semesterName || report?.semester || report?.title || '班级学期报表'

  const statCards = [
    { icon: 'flag', value: num(report?.activityCount), label: '活动次数', color: '#EF4444' },
    { icon: 'check-circle', value: `${num(report?.attendanceRate)}%`, label: '签到率', color: '#22C55E' },
    { icon: 'wallet', value: `¥${num(report?.income)}`, label: '班费收入', color: '#10B981' },
    { icon: 'file-check', value: `${num(report?.homeworkCompletionRate)}%`, label: '作业完成率', color: '#2563EB' }
  ]

  const detailRows = [
    { label: '班费支出', value: `¥${num(report?.expense)}`, icon: 'credit-card', color: '#F59E0B' },
    { label: '收入结余', value: `¥${num(num(report?.income) - num(report?.expense))}`, icon: 'wallet', color: '#0062FF' }
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
              <Text className='srep__semester-title'>{semesterText}</Text>
              <Text className='srep__semester-sub'>按学期聚合的班级运营数据总览</Text>
            </View>

            {/* 统计卡 */}
            <View className='srep__stats'>
              {statCards.map((s) => (
                <StatCard key={s.label} icon={s.icon} value={s.value} label={s.label} color={s.color} />
              ))}
            </View>

            {/* 收支明细 */}
            <View className='srep__finances'>
              {detailRows.map((row) => (
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
            <View className='srep__export'>
              <Text className='srep__export-title'>导出选项</Text>
              <View className='srep__export-item' onClick={() => goExport('xlsx')}>
                <View className='srep__export-icon'>
                  <Icon name='bar-chart' size={48} color='#60A5FA' strokeWidth={2} />
                </View>
                <Text className='srep__export-label'>导出 Excel</Text>
                <Icon name='chevron-right' size={36} color='#4B5563' strokeWidth={2} />
              </View>
              <View className='srep__export-item' onClick={() => goExport('pdf')}>
                <View className='srep__export-icon'>
                  <Icon name='file-text' size={48} color='#60A5FA' strokeWidth={2} />
                </View>
                <Text className='srep__export-label'>导出 PDF</Text>
                <Icon name='chevron-right' size={36} color='#4B5563' strokeWidth={2} />
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  )
}