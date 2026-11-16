// ============================================================
// 班费/团费收支报表
// 1:1 对齐 front/src/pages/finance/FinanceReport.tsx
// ============================================================
import { useEffect, useMemo, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { PageHeader } from '@/components/business'
import { Icon } from '@/components/ui'
import { feeApi } from '@/services'
import { resolveFileUrl } from '@/services/request'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import { downloadFile } from '@/utils/native'
import './index.scss'

type LedgerType = 'class' | 'league'

interface FeeRecordItem {
  id: string
  type: 'income' | 'expense'
  amount: number
  remark?: string | null
  createTime?: string
  create_time?: string
}

interface MonthPoint {
  label: string
  income: number
  expense: number
}

function formatMoney(value: number) {
  const num = Number(value || 0)
  const fixed = Math.abs(num).toFixed(2)
  const [int, dec] = fixed.split('.')
  const separated = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${num < 0 ? '-' : ''}${separated}.${dec}`
}

function splitRemark(remark?: string | null) {
  const text = (remark || '').trim()
  const matched = text.match(/^【(.+?)】([\s\S]*)$/)
  if (matched) return { category: matched[1], note: matched[2].trim() }
  return { category: '', note: text }
}

function recordTime(value?: FeeRecordItem) {
  return value?.createTime || value?.create_time || ''
}

function shortDate(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export default function FinanceReport() {
  const { requireLogin } = useAuth()
  const currentClassId = useUserStore((s) => s.currentClassId)
  const user = useUserStore((s) => s.userInfo)

  const [ledgerType, setLedgerType] = useState<LedgerType>('class')
  const [records, setRecords] = useState<FeeRecordItem[]>([])
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 })
  const [monthly, setMonthly] = useState<MonthPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const isLeague = ledgerType === 'league'
  const feeType = isLeague ? 'group' : 'class'
  // 班费账目仅班委可见，与后端 /fee/list、/fee/export 权限保持一致
  const canManage = user?.roleLevel === 'owner' || user?.roleLevel === 'admin'

  const months = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
      return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        label: `${date.getMonth() + 1}月`
      }
    })
  }, [])

  useLoad((options) => {
    if (!requireLogin()) return
    const initialType = (options?.type as string) || ''
    if (initialType === 'group' || initialType === 'league') setLedgerType('league')
  })

  useEffect(() => {
    if (!currentClassId) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)

    Promise.all([
      feeApi.getLedger({
        classId: currentClassId,
        feeType,
        pageNum: 1,
        pageSize: 100
      }),
      ...months.map((item) =>
        feeApi.getReport({
          classId: currentClassId,
          feeType,
          year: item.year,
          month: item.month
        })
      )
    ])
      .then(([listRes, ...statResList]: any[]) => {
        if (cancelled) return
        setRecords((listRes?.list || []) as FeeRecordItem[])
        setSummary(listRes?.summary || { income: 0, expense: 0, balance: 0 })

        const points = statResList.map((stat: any, index) => ({
          label: months[index].label,
          income: Number(stat?.income || 0),
          expense: Number(stat?.expense || 0)
        }))
        setMonthly(points)
      })
      .catch((err) => {
        if (!cancelled) {
          Taro.showToast({
            title: err instanceof Error ? err.message : '获取财务数据失败',
            icon: 'none'
          })
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentClassId, feeType])

  const maxValue = useMemo(
    () => Math.max(1, ...monthly.flatMap((m) => [m.income, m.expense])),
    [monthly]
  )

  const backToLedger = () => {
    if (Taro.getCurrentPages().length > 1) {
      Taro.navigateBack()
      return
    }
    Taro.redirectTo({
      url: `/pages-sub/fee/ledger/index?type=${ledgerType}`
    })
  }

  const handleExport = async () => {
    if (!currentClassId || exporting) return
    setExporting(true)
    try {
      const data: any = await feeApi.export({ classId: currentClassId, feeType })
      if (!data?.downloadUrl) throw new Error('导出失败')
      await downloadFile(resolveFileUrl(data.downloadUrl))
      Taro.showToast({
        title: `已导出 ${data.total || 0} 条记录`,
        icon: 'success'
      })
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '导出失败，请稍后再试',
        icon: 'none'
      })
    } finally {
      setExporting(false)
    }
  }

  const recentRecords = records.slice(0, 10)
  const pageTitle = isLeague ? '团费收支报表' : '班费收支报表'

  if (!canManage) {
    return (
      <View className='feereport'>
        <PageHeader title={pageTitle} variant='a' />
        <View className='feereport__denied'>
          <Icon name='file-bar-chart' size={80} color='#CBD5E1' strokeWidth={1.5} />
          <Text className='feereport__denied-text'>仅班委可查看收支报表</Text>
        </View>
      </View>
    )
  }

  return (
    <View className='feereport'>
      <PageHeader
        title={pageTitle}
        variant='a'
        decor='file-bar-chart'
        right={
          <View
            className={`feereport__export ${exporting ? 'feereport__export--busy' : ''}`}
            onClick={handleExport}
          >
            {exporting ? (
              <View className='feereport__spinner' />
            ) : (
              <Icon name='download' size={28} color='#FFFFFF' strokeWidth={2} />
            )}
            <Text className='feereport__export-text'>导出 Excel</Text>
          </View>
        }
      />

      <View className='feereport__body'>
        {/* 班费/团费切换 */}
        <View className='feereport__tabs'>
          {(
            [
              { value: 'class', label: '班费' },
              { value: 'league', label: '团费' }
            ] as { value: LedgerType; label: string }[]
          ).map((tab) => {
            const active = ledgerType === tab.value
            return (
              <View
                key={tab.value}
                className={`feereport__tab ${active ? 'feereport__tab--active' : ''}`}
                onClick={() => setLedgerType(tab.value)}
              >
                <Text
                  className={`feereport__tab-label ${
                    active ? 'feereport__tab-label--active' : ''
                  }`}
                >
                  {tab.label}
                </Text>
              </View>
            )
          })}
        </View>

        {/* 汇总 */}
        <View className='feereport__summary'>
          {[
            { label: '总收入', value: summary.income, color: '#16A34A' },
            { label: '总支出', value: summary.expense, color: '#DC2626' },
            { label: '结余', value: summary.balance, color: '#004ECC' }
          ].map((item) => (
            <View key={item.label} className='feereport__summary-card'>
              <Text
                className='feereport__summary-value'
                style={{ color: item.color }}
              >
                ¥{formatMoney(item.value)}
              </Text>
              <Text className='feereport__summary-label'>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* 月度趋势 */}
        <View className='feereport__chart-card'>
          <View className='feereport__chart-head'>
            <Text className='feereport__chart-title'>近 6 个月收支</Text>
            <View className='feereport__legend'>
              <View className='feereport__legend-item'>
                <View className='feereport__legend-dot feereport__legend-dot--income' />
                <Text className='feereport__legend-text'>收入</Text>
              </View>
              <View className='feereport__legend-item'>
                <View className='feereport__legend-dot feereport__legend-dot--expense' />
                <Text className='feereport__legend-text'>支出</Text>
              </View>
            </View>
          </View>

          {loading ? (
            <View className='feereport__chart-skeleton' />
          ) : (
            <View className='feereport__chart'>
              <View className='feereport__bars'>
                {monthly.map((point) => (
                  <View key={point.label} className='feereport__bar-col'>
                    <View className='feereport__bar-pair'>
                      <View
                        className='feereport__bar feereport__bar--income'
                        style={{ height: `${Math.max((point.income / maxValue) * 100, 2)}%` }}
                      />
                      <View
                        className='feereport__bar feereport__bar--expense'
                        style={{ height: `${Math.max((point.expense / maxValue) * 100, 2)}%` }}
                      />
                    </View>
                  </View>
                ))}
              </View>
              <View className='feereport__axis'>
                {monthly.map((point) => (
                  <Text key={point.label} className='feereport__axis-label'>
                    {point.label}
                  </Text>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* 收支明细 */}
        <View className='feereport__recent'>
          <View className='feereport__recent-head'>
            <Text className='feereport__recent-title'>最近收支</Text>
            {records.length > 10 ? (
              <View className='feereport__recent-all' onClick={backToLedger}>
                <Text className='feereport__recent-all-text'>查看全部</Text>
                <Icon name='chevron-right' size={28} color='#0062FF' strokeWidth={2} />
              </View>
            ) : null}
          </View>

          {loading ? (
            <View className='feereport__row-skeleton' />
          ) : recentRecords.length === 0 ? (
            <View className='feereport__empty'>
              <Icon name='receipt' size={64} color='#CBD5E1' strokeWidth={1.5} />
              <Text className='feereport__empty-text'>暂无收支记录</Text>
            </View>
          ) : (
            <View className='feereport__card'>
              {recentRecords.map((item, index) => {
                const isIncome = item.type === 'income'
                const { category, note } = splitRemark(item.remark)
                return (
                  <View
                    key={item.id}
                    className={`feereport__row ${
                      index === recentRecords.length - 1 ? 'feereport__row--last' : ''
                    }`}
                    onClick={backToLedger}
                  >
                    <View
                      className={`feereport__row-icon ${
                        isIncome ? 'feereport__row-icon--income' : 'feereport__row-icon--expense'
                      }`}
                    >
                      <Icon
                        name={isIncome ? 'wallet' : 'receipt'}
                        size={36}
                        color={isIncome ? '#16A34A' : '#DC2626'}
                        strokeWidth={2}
                      />
                    </View>
                    <View className='feereport__row-main'>
                      <Text className='feereport__row-title'>
                        {category || (isIncome ? '班费收入' : '班费支出')}
                      </Text>
                      <Text className='feereport__row-meta'>
                        {shortDate(recordTime(item))}
                        {note ? ` · ${note}` : ''}
                      </Text>
                    </View>
                    <Text
                      className={`feereport__row-amount ${
                        isIncome ? 'feereport__row-amount--income' : 'feereport__row-amount--expense'
                      }`}
                    >
                      {isIncome ? '+' : '-'}¥{formatMoney(item.amount)}
                    </Text>
                  </View>
                )
              })}
            </View>
          )}
        </View>

        <Text className='feereport__footer'>
          报表数据实时统计自本账本，导出为 Excel 表格
        </Text>
      </View>
    </View>
  )
}