import { useState } from 'react'
import { View, Text, Input as TaroInput, Picker } from '@tarojs/components'
import Taro, { useLoad, useDidShow } from '@tarojs/taro'

import { NavBar, ListEmpty, ListLoading, Modal } from '@/components/business'
import { Button, Icon } from '@/components/ui'
import { feeApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

type LedgerType = 'class' | 'group'
type Filter = 'all' | 'month' | 'last'

interface FeeRecordItem {
  id: string
  title?: string
  remark?: string
  amount: number
  type: 'income' | 'expense'
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

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'month', label: '本月' },
  { key: 'last', label: '上月' }
]

export default function FeeLedger() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { isCommittee, requireLogin } = useAuth()

  const [ledgerType, setLedgerType] = useState<LedgerType>('class')
  const [filter, setFilter] = useState<Filter>('all')
  const [records, setRecords] = useState<FeeRecordItem[]>([])
  const [summary, setSummary] = useState<Summary>({ income: 0, expense: 0, balance: 0 })
  const [budget, setBudget] = useState<BudgetInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [budgetOpen, setBudgetOpen] = useState(false)

  const feeType = ledgerType === 'group' ? 'group' : 'class'
  const canManage = isCommittee
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
      const [listRes, statRes]: any = await Promise.all([
        feeApi.getLedger({ classId: currentClassId, feeType, pageSize: 100 }),
        feeApi.getReport({ classId: currentClassId, feeType, year, month })
      ])
      setRecords(listRes?.list || [])
      setSummary(listRes?.summary || { income: 0, expense: 0, balance: 0 })
      setBudget(statRes?.budget || null)
    } catch {
      setRecords([])
      setSummary({ income: 0, expense: 0, balance: 0 })
      setBudget(null)
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

  const handleTypeChange = (t: LedgerType) => {
    setLedgerType(t)
    setFilter('all')
  }

  const isInMonth = (iso: string | undefined, targetMonth: Date) => {
    if (!iso) return false
    const d = new Date(iso)
    return d.getFullYear() === targetMonth.getFullYear() && d.getMonth() === targetMonth.getMonth()
  }

  const filteredRecords = records.filter((item) => {
    if (filter === 'all') return true
    const nowD = new Date()
    const lastMonth = new Date(nowD.getFullYear(), nowD.getMonth() - 1, 1)
    const target = filter === 'month' ? nowD : lastMonth
    return isInMonth(item.createTime || item.create_time, target)
  })

  const goReport = () => {
    Taro.navigateTo({
      url: `/pages-sub/fee/report/index?type=${ledgerType}`
    })
  }

  const goRegister = () => {
    Taro.navigateTo({
      url: ledgerType === 'group' ? '/pages-sub/fee/league-register/index' : '/pages-sub/fee/payment-register/index'
    })
  }

  const goRecord = () => {
    Taro.navigateTo({
      url: ledgerType === 'group' ? '/pages-sub/fee/league-record/index' : '/pages-sub/fee/record/index'
    })
  }

  const title = ledgerType === 'group' ? '团费账本' : '班费账本'

  return (
    <View className='feeledger'>
      <NavBar
        title={title}
        right={
          canManage ? (
            <View className='feeledger__nav-acts'>
              <Text className='feeledger__nav-act' onClick={goRegister}>
                缴费登记
              </Text>
              <Text className='feeledger__nav-act' onClick={goRecord}>
                记账
              </Text>
              <Text className='feeledger__nav-act' onClick={() => setBudgetOpen(true)}>
                预算
              </Text>
            </View>
          ) : (
            <Text className='feeledger__nav-acts' />
          )
        }
      />

      <View className='feeledger__body'>
        {/* 班费/团费切换 */}
        <View className='feeledger__type'>
          {(
            [
              { value: 'class', label: '班费' },
              { value: 'group', label: '团费' }
            ] as { value: LedgerType; label: string }[]
          ).map((tab) => (
            <View
              key={tab.value}
              className={`feeledger__type-item ${ledgerType === tab.value ? 'feeledger__type-item--active' : ''}`}
              onClick={() => handleTypeChange(tab.value)}
            >
              <Text className={`feeledger__type-label ${ledgerType === tab.value ? 'feeledger__type-label--active' : ''}`}>
                {tab.label}
              </Text>
            </View>
          ))}
        </View>

        {/* 余额卡 */}
        <View className='feeledger__balance'>
          <Text className='feeledger__balance-label'>当前{ledgerType === 'group' ? '团费' : '班费'}余额</Text>
          <Text className='feeledger__balance-value'>¥{summary.balance.toLocaleString()}.00</Text>

          {budget ? (
            <View className='feeledger__budget'>
              <View className='feeledger__budget-row'>
                <Text className='feeledger__budget-text'>
                  学期预算 ¥{Number(budget.budgetAmount).toLocaleString()}
                </Text>
                <Text className='feeledger__budget-text'>已用 {Number(budget.usagePercent).toFixed(1)}%</Text>
              </View>
              <View className='feeledger__budget-track'>
                <View
                  className='feeledger__budget-fill'
                  style={{ width: `${Math.min(Number(budget.usagePercent), 100)}%` }}
                />
              </View>
              <Text className='feeledger__budget-left'>
                剩余 ¥{Number(budget.remainingAmount).toLocaleString()}
              </Text>
            </View>
          ) : null}

          <View className='feeledger__balance-month'>
            <Text className='feeledger__balance-month-t'>本月收入 +¥{summary.income}</Text>
            <Text className='feeledger__balance-month-t'>本月支出 -¥{summary.expense}</Text>
          </View>
        </View>

        {/* 筛选 */}
        <View className='feeledger__filters'>
          {FILTERS.map((f) => (
            <View
              key={f.key}
              className={`feeledger__filter ${filter === f.key ? 'feeledger__filter--active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              <Text className={`feeledger__filter-label ${filter === f.key ? 'feeledger__filter-label--active' : ''}`}>
                {f.label}
              </Text>
            </View>
          ))}
        </View>

        {/* 收支明细 */}
        <View className='feeledger__section'>
          <Text className='feeledger__section-title'>收支明细</Text>
          {loading ? (
            <ListLoading rows={5} />
          ) : filteredRecords.length === 0 ? (
            <ListEmpty icon='wallet' text='暂无收支记录' />
          ) : (
            filteredRecords.map((item) => {
              const isIncome = item.type === 'income'
              const itemTitle = item.title || item.remark || '收支记录'
              return (
                <View key={item.id} className='feeledger__item' onClick={goReport}>
                  <View
                    className={`feeledger__item-icon ${isIncome ? 'feeledger__item-icon--income' : 'feeledger__item-icon--expense'}`}
                  >
                    <Icon name={isIncome ? 'wallet' : 'credit-card'} size={44} color={isIncome ? '#22C55E' : '#EF4444'} strokeWidth={2} />
                  </View>
                  <View className='feeledger__item-info'>
                    <Text className='feeledger__item-title'>{itemTitle}</Text>
                  </View>
                  <View className='feeledger__item-right'>
                    <Text className={`feeledger__item-amount ${isIncome ? 'feeledger__item-amount--income' : 'feeledger__item-amount--expense'}`}>
                      {isIncome ? '+' : '-'}¥{Math.abs(item.amount)}
                    </Text>
                    <Icon name='chevron-right' size={36} color='#9CA3AF' strokeWidth={2} />
                  </View>
                </View>
              )
            })
          )}
        </View>
      </View>

      <BudgetModal
        classId={currentClassId}
        feeType={feeType}
        title={ledgerType === 'group' ? '团费' : '班费'}
        year={year}
        month={month}
        visible={budgetOpen}
        onClose={() => setBudgetOpen(false)}
        onSaved={() => {
          setBudgetOpen(false)
          fetchData()
        }}
      />
    </View>
  )
}

// ============ 页内预算弹窗组件 ============
interface BudgetModalProps {
  classId: string
  feeType: 'class' | 'group'
  title: string
  year: number
  month: number
  visible: boolean
  onClose: () => void
  onSaved: () => void
}

function BudgetModal({ classId, feeType, title, year, month, visible, onClose, onSaved }: BudgetModalProps) {
  const defaultSemester = month >= 8 ? '2' : '1'
  const defaultAcademicYear = month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`

  const [academicYear, setAcademicYear] = useState(defaultAcademicYear)
  const [semester, setSemester] = useState(defaultSemester)
  const [amount, setAmount] = useState('')
  const [remark, setRemark] = useState('')
  const [bLoading, setBLoading] = useState(false)

  const loadBudget = async () => {
    if (!classId) return
    try {
      const res: any = await feeApi.getBudget({ classId, feeType, academicYear, semester })
      const list = Array.isArray(res) ? res : res?.list
      if (list && list.length > 0) {
        const b = list[0]
        setAmount(String(b.amount))
        setRemark(b.remark || '')
      } else {
        setAmount('')
        setRemark('')
      }
    } catch {
      // 查询失败不阻塞
    }
  }

  // visible 打开时加载
  const [prevVisible, setPrevVisible] = useState(visible)
  if (visible !== prevVisible) {
    setPrevVisible(visible)
    if (visible) {
      setAcademicYear(defaultAcademicYear)
      setSemester(defaultSemester)
      loadBudget()
    }
  }

  const handleSave = async () => {
    const amountNum = Number(amount)
    if (!amountNum || amountNum <= 0) {
      Taro.showToast({ title: '预算金额必须大于0', icon: 'none' })
      return
    }
    setBLoading(true)
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
      Taro.showToast({ title: err instanceof Error ? err.message : '保存预算失败', icon: 'none' })
    } finally {
      setBLoading(false)
    }
  }

  return (
    <Modal visible={visible} title={`设置${title}预算`} onClose={onClose}>
      <View className='feeledger__budget-form'>
        <View className='feeledger__bf-row'>
          <Text className='feeledger__bf-label'>学年</Text>
          <View className='feeledger__bf-input'>
            <TaroInput
              className='feeledger__bf-native'
              value={academicYear}
              placeholder='如：2024-2025'
              placeholderClass='feeledger__bf-placeholder'
              onInput={(e) => setAcademicYear(e.detail.value)}
            />
          </View>
        </View>

        <View className='feeledger__bf-row'>
          <Text className='feeledger__bf-label'>学期</Text>
          <Picker
            mode='selector'
            range={['第一学期', '第二学期']}
            value={semester === '2' ? 1 : 0}
            onChange={(e) => setSemester(Number(e.detail.value) === 1 ? '2' : '1')}
          >
            <View className='feeledger__bf-picker'>
              <Text className='feeledger__bf-picker-text'>{semester === '2' ? '第二学期' : '第一学期'}</Text>
              <Icon name='chevron-down' size={32} color='#9CA3AF' strokeWidth={2} />
            </View>
          </Picker>
        </View>

        <View className='feeledger__bf-row'>
          <Text className='feeledger__bf-label'>预算金额（元）</Text>
          <View className='feeledger__bf-input'>
            <TaroInput
              className='feeledger__bf-native'
              type='digit'
              value={amount}
              placeholder='请输入预算金额'
              placeholderClass='feeledger__bf-placeholder'
              onInput={(e) => setAmount(e.detail.value)}
            />
          </View>
        </View>

        <View className='feeledger__bf-field'>
          <TaroInput
            className='feeledger__bf-native'
            value={remark}
            placeholder='备注（预算用途说明）'
            placeholderClass='feeledger__bf-placeholder'
            onInput={(e) => setRemark(e.detail.value)}
          />
        </View>

        <View className='feeledger__bf-actions'>
          <Button type='ghost' size='md' block onClick={onClose}>
            取消
          </Button>
          <Button type='primary' size='md' block loading={bLoading} onClick={handleSave}>
            {bLoading ? '保存中...' : '保存'}
          </Button>
        </View>
      </View>
    </Modal>
  )
}