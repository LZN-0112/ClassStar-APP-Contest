import { useState, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { NavBar } from '@/components/business'
import { archiveApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth, formatRelativeTime } from '@/utils'
import './index.scss'

interface TrendPoint {
  date: string
  value: number
}

interface DashboardData {
  attendanceRate: number
  homeworkSubmitRate: number
  activityParticipationRate: number
  feeBalance: number
  trends?: { attendance?: TrendPoint[] }
  [key: string]: unknown
}

export default function Data() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireLogin } = useAuth()

  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    if (!requireLogin()) return
    if (!currentClassId) return
    archiveApi
      .getDashboard(currentClassId)
      .then((res: any) => setData(res || null))
      .catch(() => setData(null))
  }, [currentClassId])

  const attendanceRate = data?.attendanceRate ?? 0
  const homeworkRate = data?.homeworkSubmitRate ?? 92
  const activityRate = data?.activityParticipationRate ?? 0
  const feeBalance = data?.feeBalance ?? 0
  const trendData = data?.trends?.attendance || []
  const maxTrend = Math.max(1, ...trendData.map((t) => t.value))
  const displayTrend = trendData.length > 0 ? trendData : []

  const handleSemesterReport = () => {
    Taro.showToast({ title: '学期报表功能开发中', icon: 'none' })
  }

  return (
    <View className='datadash'>
      <NavBar title='数据看板' showBack={false} />

      <ScrollView className='datadash__body' scrollY>
        <View className='datadash__grid'>
          <View className='datadash__col'>
            <View className='datadash__card'>
              <View className='datadash__bar' />
              <Text className='datadash__label'>考勤签到率</Text>
              <Text className='datadash__value'>{attendanceRate}%</Text>
            </View>
            <View className='datadash__card'>
              <View className='datadash__bar' />
              <Text className='datadash__label'>作业提交率</Text>
              <Text className='datadash__value'>{homeworkRate}%</Text>
            </View>
          </View>
          <View className='datadash__col'>
            <View className='datadash__card'>
              <View className='datadash__bar' />
              <Text className='datadash__label'>活动参与率</Text>
              <Text className='datadash__value'>{activityRate}%</Text>
            </View>
            <View className='datadash__card'>
              <View className='datadash__bar' />
              <Text className='datadash__label'>班费结余</Text>
              <Text className='datadash__value'>¥{Number(feeBalance).toLocaleString()}</Text>
            </View>
          </View>
        </View>

        <View className='datadash__trend'>
          <Text className='datadash__trend-title'>出勤趋势</Text>
          <View className='datadash__bars'>
            {displayTrend.length > 0
              ? displayTrend.map((item, index) => {
                  const height = Math.max(16, Math.round((item.value / maxTrend) * 220))
                  return (
                    <View className='datadash__bar-item' key={index}>
                      <View
                        className='datadash__bar-fill'
                        style={{ height: `${height}rpx` }}
                      />
                      <Text className='datadash__bar-date'>{item.date.slice(5)}</Text>
                    </View>
                  )
                })
              : Array.from({ length: 6 }).map((_, i) => (
                  <View className='datadash__bar-item' key={`ph-${i}`}>
                    <View className='datadash__bar-fill datadash__bar-fill--ph' />
                  </View>
                ))}
          </View>
          {displayTrend.length > 0 ? (
            <Text className='datadash__trend-time'>
              最近更新：{formatRelativeTime(new Date().toISOString())}
            </Text>
          ) : null}
        </View>

        <View className='datadash__btn press-opacity' onClick={handleSemesterReport}>
          <Text className='datadash__btn-text'>生成学期报表</Text>
        </View>
      </ScrollView>
    </View>
  )
}