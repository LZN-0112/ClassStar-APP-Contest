import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad, useDidShow } from '@tarojs/taro'

import { NavBar, Chart, ListEmpty, ListLoading, SectionHeader } from '@/components/business'
import { Icon } from '@/components/ui'
import { feeApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

type LedgerType = 'class' | 'group'

interface DayStat {
  date: string
  income: number
  expense: number
  balance: number
}

interface ReportInfo {
  year: number
  month: number
  dailyStats: DayStat[]
  income: number
  expense: number
  balance: number
  budget?: { budgetAmount: number; spentAmount: number; remainingAmount: number; usagePercent: number } | null
}

interface FeeRecordItem {
  id: string
  title?: string
  remark?: string
  amount: number
  type: 'income' | 'expense'
  createTime?: string
  create_time?: string
}

export default function FeeReport() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireLogin } = useAuth()

  const [ledgerType, setLedgerType] = useState<LedgerType>('class')
  const [report, setReport] = useState<ReportInfo | null>(null)
  const [records, setRecords] = useState<FeeRecordItem[]>([])
  const [loading, setLoading] = useState(true)

  const feeType = ledgerType === 'group' ? 'group' : 'class'
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const fetchData = async () => {
    if (!currentClassId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [reportRes, listRes]: any = await Promise.all([
        feeApi.getReport({ classId: currentClassId, feeType, year, month }),
        feeApi.getLedger({ classId: currentClassId, feeType, pageSize: 100 })
      ])
      setReport(reportRes?.income !== undefined ? reportRes : null)
      setRecords(listRes?.list || [])
    } catch {
      setReport(null)
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  useLoad((o) => {
    if (!requireLogin()) return
    const t = (o?.type as string) || ''
    if (t === 'group' || t === 'class') setLedgerType(t)
    fetchData()
  })

  useDidShow(() => {
    fetchData()
  })

  const handleTypeChange = (t: LedgerType) => {
    setLedgerType(t)
  }

  // 汇总每日图表数据（取有记录或最近若干天）
  const chartLabels: string[] = []
  const chartIncome: number[] = []
  const chartExpense: number[] = []
  if (report?.dailyStats?.length) {
    const stats = report.dailyStats
    const firstNonZero = stats.findIndex((s) => s.income || s.expense)
    const start = firstNonZero >= 0 ? Math.max(firstNonZero, stats.length - 7) : Math.max(0, stats.length - 7)
    const slice = stats.slice(start)
    slice.forEach((s) => {
      chartLabels.push(s.date.slice(5).replace('-', '/'))
      chartIncome.push(s.income)
      chartExpense.push(s.expense)
    })
  }

  const goLedger = (type: LedgerType) => {
    Taro.navigateTo({ url: `/pages-sub/fee/ledger/index?type=${type}` })
  }

  const title = ledgerType === 'group' ? '团费收支报表' : '班费收支报表'

  return (
    <View className='feereport'>
      <NavBar title={title} />

      <View className='feereport__body'>
        {/* 班费/团费切换 */}
        <View className='feereport__type'>
          {(
            [
              { value: 'class', label: '班费' },
              { value: 'group', label: '团费' }
            ] as { value: LedgerType; label: string }[]
          ).map((tab) => (
            <View
              key={tab.value}
              className={`feereport__type-item ${ledgerType === tab.value ? 'feereport__type-item--active' : ''}`}
              onClick={() => handleTypeChange(tab.value)}
            >
              <Text className={`feereport__type-label ${ledgerType === tab.value ? 'feereport__type-label--active' : ''}`}>
                {tab.label}
              </Text>
            </View>
          ))}
        </View>

        {loading ? (
          <ListLoading rows={6} />
        ) : !report ? (
          <ListEmpty icon='chart' text='暂无报表数据' />
        ) : (
          <View className='feereport__content'>
            {/* 汇总卡片 */}
            <View className='feereport__stats'>
              <View className='feereport__stat'>
                <Text className='feereport__stat-value feereport__stat-value--income'>
                  ¥{Number(report.income).toLocaleString()}
                </Text>
                <Text className='feereport__stat-label'>总收入</Text>
              </View>
              <View className='feereport__stat'>
                <Text className='feereport__stat-value feereport__stat-value--expense'>
                  ¥{Number(report.expense).toLocaleString()}
                </Text>
                <Text className='feereport__stat-label'>总支出</Text>
              </View>
              <View className='feereport__stat'>
                <Text className='feereport__stat-value'>
                  ¥{Number(report.balance).toLocaleString()}
                </Text>
                <Text className='feereport__stat-label'>结余</Text>
              </View>
            </View>

            {/* 月度收支图表 */}
            <View className='feereport__chart'>
              <Text className='feereport__chart-title'>本月每日收支</Text>
              {chartLabels.length > 0 ? (
                <Chart
                  type='bar'
                  height={340}
                  option={{
                    labels: chartLabels,
                    series: [
                      { name: '收入', data: chartIncome, color: '#004ECC' },
                      { name: '支出', data: chartExpense, color: '#4B83FF' }
                    ]
                  }}
                />
              ) : (
                <ListEmpty icon='bar-chart' text='本月暂无收支记录' />
              )}
            </View>

            {/* 收支明细 */}
            <SectionHeader title='收支明细' />
            {records.length === 0 ? (
              <ListEmpty icon='wallet' text='暂无收支记录' />
            ) : (
              records.map((item, index) => {
                const isIncome = item.type === 'income'
                const itemTitle = item.title || item.remark || '收支记录'
                return (
                  <View key={item.id} className='feereport__item' onClick={() => goLedger(ledgerType)}>
                    <View
                      className={`feereport__item-icon ${isIncome ? 'feereport__item-icon--income' : 'feereport__item-icon--expense'}`}
                    >
                      <Icon name={isIncome ? 'wallet' : 'credit-card'} size={44} color={isIncome ? '#22C55E' : '#EF4444'} strokeWidth={2} />
                    </View>
                    <View className='feereport__item-info'>
                      <Text className='feereport__item-title'>{itemTitle}</Text>
                      {index === records.length - 1 ? null : null}
                    </View>
                    <View className='feereport__item-right'>
                      <Text className={`feereport__item-amount ${isIncome ? 'feereport__item-amount--income' : 'feereport__item-amount--expense'}`}>
                        {isIncome ? '+' : '-'}¥{Math.abs(item.amount)}
                      </Text>
                      <Icon name='chevron-right' size={36} color='#9CA3AF' strokeWidth={2} />
                    </View>
                  </View>
                )
              })
            )}
          </View>
        )}
      </View>
    </View>
  )
}