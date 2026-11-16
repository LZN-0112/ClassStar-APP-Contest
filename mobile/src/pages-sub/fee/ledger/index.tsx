// ============================================================
// 班费/团费账本
// 1:1 对齐 front/src/pages/finance/FeeLedger.tsx
// 含：余额卡（预算进度）、快捷操作、按日分组明细、
//     记账详情抽屉（编辑/删除）、学期预算抽屉
// ============================================================
import { useEffect, useMemo, useState } from 'react'
import { Input, Picker, Text, Textarea, View } from '@tarojs/components'
import Taro, { useDidShow, useLoad } from '@tarojs/taro'

import { PageHeader } from '@/components/business'
import { Icon } from '@/components/ui'
import { feeApi } from '@/services'
import { resolveFileUrl } from '@/services/request'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

type LedgerType = 'class' | 'group'
type FeeFilter = 'all' | 'month' | 'last'

interface LedgerRecord {
  id: string
  type: 'income' | 'expense'
  amount: number
  remark?: string | null
  billUrl?: string | null
  createTime?: string
  create_time?: string
}

interface Summary {
  income: number
  expense: number
  balance: number
}

interface BudgetInfo {
  budgetAmount: number
  spentAmount: number
  remainingAmount: number
  usagePercent: number
}

const FILTERS: { key: FeeFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'month', label: '本月' },
  { key: 'last', label: '上月' }
]

const ACTION_STYLES = [
  { label: '记账', icon: 'plus', color: '#0062FF', bg: '#EFF6FF' },
  { label: '缴费登记', icon: 'receipt', color: '#16A34A', bg: '#ECFDF5' },
  { label: '预算', icon: 'target', color: '#D97706', bg: '#FFF7ED' },
  { label: '报表', icon: 'file-bar-chart', color: '#7C3AED', bg: '#F5F3FF' }
] as const

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

function recordTime(record: LedgerRecord) {
  return record.createTime || record.create_time || ''
}

function parseDate(value?: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function dayKey(value?: string) {
  const date = parseDate(value)
  if (!date) return 'unknown'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

function dayLabel(key: string) {
  if (key === 'unknown') return '较早记录'
  const [year, month, day] = key.split('-').map(Number)
  const target = new Date(year, month - 1, day)
  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diff = Math.round((startOfToday.getTime() - target.getTime()) / 86400000)
  const weekYmd = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  if (diff === 0) return `今天 · ${weekYmd[target.getDay()]}`
  if (diff === 1) return `昨天 · ${weekYmd[target.getDay()]}`
  return `${month}月${day}日 · ${weekYmd[target.getDay()]}`
}

function clock(value?: string) {
  const date = parseDate(value)
  if (!date) return ''
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatDateTime(value?: string) {
  const date = parseDate(value)
  if (!date) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes()
  ).padStart(2, '0')}`
}

export default function FeeLedger() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const user = useUserStore((s) => s.userInfo)
  const { requireLogin } = useAuth()

  const [classId, setClassId] = useState('')
  const [ledgerType, setLedgerType] = useState<LedgerType>('class')
  const [filter, setFilter] = useState<FeeFilter>('all')
  const [records, setRecords] = useState<LedgerRecord[]>([])
  const [summary, setSummary] = useState<Summary>({ income: 0, expense: 0, balance: 0 })
  const [monthStat, setMonthStat] = useState<{
    income: number
    expense: number
    budget: BudgetInfo | null
  }>({ income: 0, expense: 0, budget: null })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [budgetOpen, setBudgetOpen] = useState(false)
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [activeRecord, setActiveRecord] = useState<LedgerRecord | null>(null)

  const classIdValue = classId || currentClassId || ''
  const isLeague = ledgerType === 'group'
  const feeType = isLeague ? 'group' : 'class'
  const canManage = user?.roleLevel === 'owner' || user?.roleLevel === 'admin'

  const now = new Date()
  const statBase = filter === 'last' ? new Date(now.getFullYear(), now.getMonth() - 1, 1) : now
  const statYear = statBase.getFullYear()
  const statMonth = statBase.getMonth() + 1
  const monthTag = filter === 'last' ? '上月' : '本月'

  useLoad((options) => {
    if (!requireLogin()) return
    const initialType = options?.type as string | undefined
    if (initialType === 'league' || initialType === 'group') setLedgerType('group')
    setClassId((options?.classId as string) || currentClassId || '')
  })

  useDidShow(() => {
    if (classIdValue) void fetchData(filter, ledgerType)
  })

  const fetchData = async (nextFilter: FeeFilter, nextType: LedgerType) => {
    if (!classIdValue) {
      setLoading(false)
      return
    }
    const base =
      nextFilter === 'last' ? new Date(now.getFullYear(), now.getMonth() - 1, 1) : now
    const reqFeeType = nextType === 'group' ? 'group' : 'class'
    setLoading(true)
    setLoadError(false)
    try {
      const [listRes, statRes]: any = await Promise.all([
        feeApi.getLedger({
          classId: classIdValue,
          feeType: reqFeeType,
          pageNum: 1,
          pageSize: 100
        }),
        feeApi.getReport({
          classId: classIdValue,
          feeType: reqFeeType,
          year: base.getFullYear(),
          month: base.getMonth() + 1
        })
      ])
      setRecords(listRes?.list || [])
      setSummary(listRes?.summary || { income: 0, expense: 0, balance: 0 })
      setMonthStat({
        income: Number(statRes?.income || 0),
        expense: Number(statRes?.expense || 0),
        budget: statRes?.budget || null
      })
    } catch (err) {
      setLoadError(true)
      Taro.showToast({
        title: err instanceof Error ? err.message : '加载账本数据失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredRecords = useMemo(() => {
    if (filter === 'all') return records
    return records.filter((item) => {
      const date = parseDate(recordTime(item))
      if (!date) return false
      return date.getFullYear() === statYear && date.getMonth() + 1 === statMonth
    })
  }, [filter, records, statYear, statMonth])

  const groupedRecords = useMemo(() => {
    const groups = new Map<string, LedgerRecord[]>()
    filteredRecords.forEach((item) => {
      const key = dayKey(recordTime(item))
      const list = groups.get(key) || []
      list.push(item)
      groups.set(key, list)
    })
    return Array.from(groups.entries())
  }, [filteredRecords])

  const handleTypeChange = (next: LedgerType) => {
    if (next === ledgerType) return
    setLedgerType(next)
    setFilter('all')
    setActiveRecord(null)
    void fetchData('all', next)
  }

  const handleFilterChange = (next: FeeFilter) => {
    if (next === filter) return
    setFilter(next)
    void fetchData(next, ledgerType)
  }

  const goRecord = () => {
    Taro.navigateTo({
      url: isLeague
        ? '/pages-sub/fee/league-record/index'
        : '/pages-sub/fee/record/index'
    })
  }

  const goRegister = () => {
    Taro.navigateTo({
      url: isLeague
        ? '/pages-sub/fee/league-register/index'
        : '/pages-sub/fee/payment-register/index'
    })
  }

  const goReport = () => {
    Taro.navigateTo({
      url: `/pages-sub/fee/report/index?type=${ledgerType}`
    })
  }

  const handleAction = (label: string) => {
    if (label === '记账') return goRecord()
    if (label === '缴费登记') return goRegister()
    if (label === '预算') return setBudgetOpen(true)
    if (label === '报表') return goReport()
  }

  const title = isLeague ? '团费账本' : '班费账本'

  return (
    <View className='feeledger'>
      <PageHeader title={title} variant='a' decor='wallet' />

      <View className='feeledger__body'>
        {!classIdValue ? (
          <View className='feeledger__join'>
            <Icon name='wallet' size={80} color='#CBD5E1' strokeWidth={3} />
            <Text className='feeledger__join-text'>加入班级后可查看账本</Text>
          </View>
        ) : (
          <>
            {/* 班费/团费切换 */}
            <View className='feeledger__type'>
              {(
                [
                  { value: 'class', label: '班费' },
                  { value: 'group', label: '团费' }
                ] as { value: LedgerType; label: string }[]
              ).map((tab) => {
                const active = ledgerType === tab.value
                return (
                  <View
                    key={tab.value}
                    className={`feeledger__type-item ${
                      active ? 'feeledger__type-item--active' : ''
                    }`}
                    onClick={() => handleTypeChange(tab.value)}
                  >
                    <Text className='feeledger__type-label'>{tab.label}</Text>
                  </View>
                )
              })}
            </View>

            {/* 余额卡 */}
            <View className='feeledger__balance'>
              <View className='feeledger__balance-circle' />
              <View className='feeledger__balance-top'>
                <View className='feeledger__balance-info'>
                  <View className='feeledger__balance-label-row'>
                    <Text className='feeledger__balance-label'>
                      当前{isLeague ? '团费' : '班费'}余额
                    </Text>
                    <View
                      className='feeledger__balance-eye'
                      onClick={() => setBalanceVisible((v) => !v)}
                    >
                      <Icon
                        name={balanceVisible ? 'eye' : 'eye-off'}
                        size={28}
                        color='rgba(255,255,255,0.7)'
                        strokeWidth={2}
                      />
                    </View>
                  </View>
                  <Text className='feeledger__balance-value'>
                    ¥{balanceVisible ? formatMoney(summary.balance) : '****'}
                  </Text>
                </View>
                <View className='feeledger__balance-badge'>
                  <Text className='feeledger__balance-badge-text'>全部收支结余</Text>
                </View>
              </View>

              <View className='feeledger__stats'>
                <View className='feeledger__stat'>
                  <Text className='feeledger__stat-label'>{monthTag}收入</Text>
                  <Text className='feeledger__stat-value'>
                    +¥{formatMoney(monthStat.income)}
                  </Text>
                </View>
                <View className='feeledger__stat'>
                  <Text className='feeledger__stat-label'>{monthTag}支出</Text>
                  <Text className='feeledger__stat-value'>
                    -¥{formatMoney(monthStat.expense)}
                  </Text>
                </View>
              </View>

              {monthStat.budget ? (
                <View className='feeledger__budget'>
                  <View className='feeledger__budget-row'>
                    <Text className='feeledger__budget-text'>
                      学期预算 ¥{formatMoney(monthStat.budget.budgetAmount)}
                    </Text>
                    <Text className='feeledger__budget-text'>
                      已用 {Number(monthStat.budget.usagePercent).toFixed(1)}%
                    </Text>
                  </View>
                  <View className='feeledger__budget-track'>
                    <View
                      className='feeledger__budget-fill'
                      style={{
                        width: `${Math.min(Number(monthStat.budget.usagePercent), 100)}%`
                      }}
                    />
                  </View>
                  <View className='feeledger__budget-row feeledger__budget-row--weak'>
                    <Text className='feeledger__budget-text feeledger__budget-text--weak'>
                      剩余 ¥{formatMoney(monthStat.budget.remainingAmount)}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>

            {/* 快捷操作 */}
            {canManage ? (
              <View className='feeledger__actions'>
                {ACTION_STYLES.map((action) => (
                  <View
                    key={action.label}
                    className='feeledger__action'
                    onClick={() => handleAction(action.label)}
                  >
                    <View
                      className='feeledger__action-icon'
                      style={{ backgroundColor: action.bg }}
                    >
                      <Icon
                        name={action.icon}
                        size={40}
                        color={action.color}
                        strokeWidth={2}
                      />
                    </View>
                    <Text className='feeledger__action-label'>{action.label}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* 月份筛选 */}
            <View className='feeledger__filter-row'>
              <View className='feeledger__filters'>
                {FILTERS.map((tab) => {
                  const active = filter === tab.key
                  return (
                    <View
                      key={tab.key}
                      className={`feeledger__filter ${
                        active ? 'feeledger__filter--active' : ''
                      }`}
                      onClick={() => handleFilterChange(tab.key)}
                    >
                      <Text className='feeledger__filter-label'>{tab.label}</Text>
                    </View>
                  )
                })}
              </View>
              <Text className='feeledger__count'>共 {filteredRecords.length} 笔</Text>
            </View>

            {/* 收支明细 */}
            {loading ? (
              <View className='feeledger__skeletons'>
                {[0, 1, 2].map((i) => (
                  <View key={i} className='feeledger__skeleton' />
                ))}
              </View>
            ) : loadError ? (
              <View className='feeledger__state'>
                <View className='feeledger__state-icon feeledger__state-icon--error'>
                  <Icon name='refresh-cw' size={40} color='#DC2626' strokeWidth={2} />
                </View>
                <Text className='feeledger__state-desc'>账本加载失败</Text>
                <View
                  className='feeledger__state-btn'
                  onClick={() => void fetchData(filter, ledgerType)}
                >
                  <Text>重新加载</Text>
                </View>
              </View>
            ) : groupedRecords.length === 0 ? (
              <View className='feeledger__state feeledger__state--empty'>
                <View className='feeledger__state-icon feeledger__state-icon--empty'>
                  <Icon name='receipt' size={48} color='#0062FF' strokeWidth={2} />
                </View>
                <View className='feeledger__state-copy'>
                  <Text className='feeledger__state-title'>
                    {filter === 'all' ? '还没有收支记录' : `${monthTag}没有收支记录`}
                  </Text>
                  <Text className='feeledger__state-hint'>
                    {canManage
                      ? '记录班费收支，全班都能看到'
                      : '班委记账后会显示在这里'}
                  </Text>
                </View>
                {canManage ? (
                  <View
                    className='feeledger__state-btn feeledger__state-btn--row'
                    onClick={goRecord}
                  >
                    <Icon name='plus' size={28} color='#FFFFFF' strokeWidth={3} />
                    <Text>记一笔</Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <View className='feeledger__groups'>
                {groupedRecords.map(([key, items]) => {
                  const dayIncome = items
                    .filter((i) => i.type === 'income')
                    .reduce((sum, i) => sum + Number(i.amount || 0), 0)
                  const dayExpense = items
                    .filter((i) => i.type === 'expense')
                    .reduce((sum, i) => sum + Number(i.amount || 0), 0)
                  return (
                    <View key={key} className='feeledger__group'>
                      <View className='feeledger__group-head'>
                        <Text className='feeledger__group-day'>{dayLabel(key)}</Text>
                        {dayIncome > 0 || dayExpense > 0 ? (
                          <Text className='feeledger__group-sum'>
                            {dayIncome > 0 ? `收 ¥${formatMoney(dayIncome)}` : ''}
                            {dayIncome > 0 && dayExpense > 0 ? ' · ' : ''}
                            {dayExpense > 0 ? `支 ¥${formatMoney(dayExpense)}` : ''}
                          </Text>
                        ) : null}
                      </View>
                      <View className='feeledger__card'>
                        {items.map((item, index) => {
                          const isIncome = item.type === 'income'
                          const { category, note } = splitRemark(item.remark)
                          const itemTitle =
                            category || (isIncome ? '班费收入' : '班费支出')
                          return (
                            <View
                              key={item.id}
                              className={`feeledger__item ${
                                index === items.length - 1
                                  ? ''
                                  : 'feeledger__item--divided'
                              }`}
                              onClick={() => setActiveRecord(item)}
                            >
                              <View
                                className={`feeledger__item-icon ${
                                  isIncome
                                    ? 'feeledger__item-icon--income'
                                    : 'feeledger__item-icon--expense'
                                }`}
                              >
                                <Icon
                                  name={isIncome ? 'wallet' : 'receipt'}
                                  size={36}
                                  color={isIncome ? '#16A34A' : '#DC2626'}
                                  strokeWidth={2}
                                />
                              </View>
                              <View className='feeledger__item-main'>
                                <Text className='feeledger__item-title'>{itemTitle}</Text>
                                <View className='feeledger__item-meta'>
                                  <Text className='feeledger__item-meta-text'>
                                    {clock(recordTime(item))}
                                    {note ? ` · ${note}` : ''}
                                  </Text>
                                  {item.billUrl ? (
                                    <Icon
                                      name='paperclip'
                                      size={24}
                                      color='#94A3B8'
                                      strokeWidth={2}
                                    />
                                  ) : null}
                                </View>
                              </View>
                              <Text
                                className={`feeledger__item-amount ${
                                  isIncome
                                    ? 'feeledger__item-amount--income'
                                    : 'feeledger__item-amount--expense'
                                }`}
                              >
                                {isIncome ? '+' : '-'}¥
                                {formatMoney(Number(item.amount || 0))}
                              </Text>
                              <Icon
                                name='chevron-right'
                                size={32}
                                color='#CBD5E1'
                                strokeWidth={2}
                              />
                            </View>
                          )
                        })}
                      </View>
                    </View>
                  )
                })}
                {filter === 'all' && records.length >= 100 ? (
                  <Text className='feeledger__limit'>仅展示最近 100 笔记录</Text>
                ) : null}
              </View>
            )}
          </>
        )}
      </View>

      {budgetOpen ? (
        <BudgetSheet
          classId={classIdValue}
          feeType={feeType}
          title={isLeague ? '团费' : '班费'}
          year={now.getFullYear()}
          month={now.getMonth() + 1}
          onClose={() => setBudgetOpen(false)}
          onSaved={() => void fetchData(filter, ledgerType)}
        />
      ) : null}

      {activeRecord ? (
        <RecordSheet
          record={activeRecord}
          feeType={feeType}
          canManage={canManage}
          onClose={() => setActiveRecord(null)}
          onChanged={() => void fetchData(filter, ledgerType)}
        />
      ) : null}
    </View>
  )
}

// ============================================================
// 学期预算抽屉
// 1:1 对齐 front/src/pages/finance/BudgetModal.tsx
// ============================================================
interface BudgetSheetProps {
  classId: string
  feeType: 'class' | 'group'
  title: string
  year: number
  month: number
  onClose: () => void
  onSaved: () => void
}

function BudgetSheet({
  classId,
  feeType,
  title,
  year,
  month,
  onClose,
  onSaved
}: BudgetSheetProps) {
  const defaultSemester = month >= 8 ? '2' : '1'
  const defaultAcademicYear =
    month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`

  const [academicYear, setAcademicYear] = useState(defaultAcademicYear)
  const [semester, setSemester] = useState(defaultSemester)
  const [amount, setAmount] = useState('')
  const [remark, setRemark] = useState('')
  const [saving, setSaving] = useState(false)

  const loadBudget = async (nextYear: string, nextSemester: string) => {
    if (!classId) return
    try {
      const res: any = await feeApi.getBudget({
        classId,
        feeType,
        academicYear: nextYear,
        semester: nextSemester
      })
      const list = Array.isArray(res) ? res : res?.list || res?.data
      if (Array.isArray(list) && list.length > 0) {
        setAmount(String(list[0].amount))
        setRemark(list[0].remark || '')
      } else {
        setAmount('')
        setRemark('')
      }
    } catch {
      // 查询失败不阻塞用户操作
    }
  }

  useEffect(() => {
    void loadBudget(defaultAcademicYear, defaultSemester)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async () => {
    const amountNum = Number(amount)
    if (!amountNum || amountNum <= 0) {
      Taro.showToast({ title: '预算金额必须大于0', icon: 'none' })
      return
    }
    setSaving(true)
    try {
      await feeApi.setBudget({
        classId,
        feeType,
        academicYear,
        semester,
        amount: amountNum,
        remark: remark.trim() || undefined
      })
      Taro.showToast({ title: '预算已保存', icon: 'success' })
      onSaved()
      onClose()
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '保存预算失败',
        icon: 'none'
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <View className='fee-sheet'>
      <View className='fee-sheet__mask' onClick={onClose} />
      <View className='fee-sheet__panel'>
        <View className='fee-sheet__handle'>
          <View className='fee-sheet__handle-bar' />
        </View>
        <View className='fee-sheet__head'>
          <Text className='fee-sheet__title'>设置{title}预算</Text>
        </View>

        <View className='fee-sheet__body'>
          <View className='fee-budget-form'>
            <View className='fee-budget-form__field'>
              <Text className='fee-budget-form__label'>学年</Text>
              <View className='fee-budget-form__box'>
                <Input
                  className='fee-budget-form__input'
                  value={academicYear}
                  placeholder='如：2024-2025'
                  placeholderClass='fee-budget-form__placeholder'
                  onInput={(e) => setAcademicYear(e.detail.value)}
                />
              </View>
            </View>

            <View className='fee-budget-form__field'>
              <Text className='fee-budget-form__label'>学期</Text>
              <Picker
                mode='selector'
                range={['第一学期', '第二学期']}
                value={semester === '2' ? 1 : 0}
                onChange={(e) => {
                  const next = Number(e.detail.value) === 1 ? '2' : '1'
                  setSemester(next)
                  void loadBudget(academicYear, next)
                }}
              >
                <View className='fee-budget-form__box fee-budget-form__picker'>
                  <Text className='fee-budget-form__picker-text'>
                    {semester === '2' ? '第二学期' : '第一学期'}
                  </Text>
                  <Icon name='chevron-down' size={28} color='#9CA3AF' strokeWidth={2} />
                </View>
              </Picker>
            </View>

            <View className='fee-budget-form__field'>
              <Text className='fee-budget-form__label'>预算金额（元）</Text>
              <View className='fee-budget-form__box'>
                <Input
                  className='fee-budget-form__input'
                  type='digit'
                  value={amount}
                  placeholder='请输入预算金额'
                  placeholderClass='fee-budget-form__placeholder'
                  onInput={(e) => setAmount(e.detail.value)}
                />
              </View>
            </View>

            <View className='fee-budget-form__field'>
              <Text className='fee-budget-form__label'>备注（可选）</Text>
              <View className='fee-budget-form__box fee-budget-form__box--area'>
                <Textarea
                  className='fee-budget-form__area'
                  value={remark}
                  placeholder='预算用途说明'
                  placeholderClass='fee-budget-form__placeholder'
                  maxlength={120}
                  onInput={(e) => setRemark(e.detail.value)}
                />
              </View>
            </View>
          </View>
        </View>

        <View className='fee-sheet__footer fee-sheet__footer--row'>
          <View className='fee-sheet__btn fee-sheet__btn--neutral' onClick={onClose}>
            <Text>取消</Text>
          </View>
          <View
            className={`fee-sheet__btn fee-sheet__btn--primary ${
              saving ? 'fee-sheet__btn--disabled' : ''
            }`}
            onClick={() => {
              if (!saving) void handleSave()
            }}
          >
            <Text>{saving ? '保存中...' : '保存'}</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

// ============================================================
// 记账详情抽屉（查看/编辑/删除）
// 1:1 对齐 front/src/pages/finance/FeeRecordSheet.tsx
// ============================================================
interface RecordSheetProps {
  record: LedgerRecord
  feeType: 'class' | 'group'
  canManage: boolean
  onClose: () => void
  onChanged: () => void
}

function RecordSheet({
  record,
  feeType,
  canManage,
  onClose,
  onChanged
}: RecordSheetProps) {
  const { category, note } = splitRemark(record.remark)
  const isIncome = record.type === 'income'

  const [editing, setEditing] = useState(false)
  const [type, setType] = useState<'income' | 'expense'>(record.type)
  const [amount, setAmount] = useState(String(record.amount))
  const [remark, setRemark] = useState(note)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSave = async () => {
    const amountNum = Number(amount)
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      Taro.showToast({ title: '请输入大于 0 的金额', icon: 'none' })
      return
    }
    const nextRemark = [category ? `【${category}】` : '', remark.trim()]
      .filter(Boolean)
      .join('')
    setSaving(true)
    try {
      await feeApi.update(record.id, feeType, {
        type,
        amount: Math.round(amountNum * 100) / 100,
        remark: nextRemark || undefined
      })
      Taro.showToast({ title: '记录已更新', icon: 'success' })
      setTimeout(() => {
        onChanged()
        onClose()
      }, 600)
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '更新失败，请重试',
        icon: 'none'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    const res = await Taro.showModal({
      title: '删除记录',
      content: '删除后不可恢复，确认删除这条记录吗？',
      confirmText: '删除',
      confirmColor: '#DC2626'
    })
    if (!res.confirm) return
    setDeleting(true)
    try {
      await feeApi.remove(record.id, feeType)
      Taro.showToast({ title: '记录已删除', icon: 'success' })
      setTimeout(() => {
        onChanged()
        onClose()
      }, 600)
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '删除失败，请重试',
        icon: 'none'
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleBill = () => {
    if (!record.billUrl) return
    const url = resolveFileUrl(record.billUrl)
    Taro.previewImage({
      urls: [url],
      fail: () => {
        Taro.showToast({ title: '暂不支持预览该凭证', icon: 'none' })
      }
    })
  }

  return (
    <View className='fee-sheet'>
      <View className='fee-sheet__mask' onClick={onClose} />
      <View className='fee-sheet__panel'>
        <View className='fee-sheet__handle'>
          <View className='fee-sheet__handle-bar' />
        </View>
        <View className='fee-sheet__head'>
          <View className='fee-sheet__head-main'>
            <Text className='fee-sheet__title'>
              {editing ? '编辑记录' : category || (isIncome ? '班费收入' : '班费支出')}
            </Text>
            <Text className='fee-sheet__subtitle'>
              {formatDateTime(record.createTime || record.create_time)}
            </Text>
          </View>
          <View className='fee-sheet__close' onClick={onClose}>
            <Icon name='x' size={32} color='#64748B' strokeWidth={3} />
          </View>
        </View>

        <View className='fee-sheet__body'>
          {editing ? (
            <View className='fee-record-form'>
              <View className='fee-record-form__types'>
                <View
                  className={`fee-record-form__type ${
                    type === 'income' ? 'fee-record-form__type--income' : ''
                  }`}
                  onClick={() => setType('income')}
                >
                  <Icon
                    name='arrow-down-left'
                    size={32}
                    color={type === 'income' ? '#FFFFFF' : '#64748B'}
                    strokeWidth={2}
                  />
                  <Text className='fee-record-form__type-text'>收入</Text>
                </View>
                <View
                  className={`fee-record-form__type ${
                    type === 'expense' ? 'fee-record-form__type--expense' : ''
                  }`}
                  onClick={() => setType('expense')}
                >
                  <Icon
                    name='arrow-up-right'
                    size={32}
                    color={type === 'expense' ? '#FFFFFF' : '#64748B'}
                    strokeWidth={2}
                  />
                  <Text className='fee-record-form__type-text'>支出</Text>
                </View>
              </View>

              <View className='fee-record-form__amount'>
                <Text className='fee-record-form__symbol'>¥</Text>
                <Input
                  className='fee-record-form__input'
                  type='digit'
                  value={amount}
                  onInput={(e) => setAmount(e.detail.value)}
                />
              </View>

              <Textarea
                className='fee-record-form__remark'
                value={remark}
                placeholder='备注说明'
                placeholderClass='fee-record-form__placeholder'
                maxlength={120}
                onInput={(e) => setRemark(e.detail.value)}
              />
            </View>
          ) : (
            <View className='fee-record-view'>
              <View className='fee-record-view__card'>
                <Text className='fee-record-view__label'>金额</Text>
                <Text
                  className={`fee-record-view__amount ${
                    isIncome
                      ? 'fee-record-view__amount--income'
                      : 'fee-record-view__amount--expense'
                  }`}
                >
                  {isIncome ? '+' : '-'} ¥{formatMoney(record.amount)}
                </Text>
                {note ? (
                  <Text className='fee-record-view__note'>{note}</Text>
                ) : null}
              </View>

              {record.billUrl ? (
                <View className='fee-record-view__bill' onClick={handleBill}>
                  <Text className='fee-record-view__bill-text'>查看收支凭证</Text>
                  <Icon name='external-link' size={32} color='#0062FF' strokeWidth={2} />
                </View>
              ) : null}

              {!canManage ? (
                <Text className='fee-record-view__hint'>仅班委可修改账目</Text>
              ) : null}
            </View>
          )}
        </View>

        {editing ? (
          canManage ? (
            <View className='fee-sheet__footer'>
              <View
                className={`fee-sheet__btn fee-sheet__btn--primary ${
                  saving ? 'fee-sheet__btn--disabled' : ''
                }`}
                onClick={() => {
                  if (!saving) void handleSave()
                }}
              >
                <Text>{saving ? '保存中...' : '保存修改'}</Text>
              </View>
            </View>
          ) : null
        ) : canManage ? (
          <View className='fee-sheet__footer fee-sheet__footer--row'>
            <View
              className='fee-sheet__btn fee-sheet__btn--neutral'
              onClick={() => setEditing(true)}
            >
              <Text>编辑</Text>
            </View>
            <View
              className={`fee-sheet__btn fee-sheet__btn--danger ${
                deleting ? 'fee-sheet__btn--disabled' : ''
              }`}
              onClick={() => {
                if (!deleting) void handleDelete()
              }}
            >
              <Icon name='trash-2' size={32} color='#DC2626' strokeWidth={2} />
              <Text>删除</Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  )
}