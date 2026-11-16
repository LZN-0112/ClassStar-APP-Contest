// ============================================================
// 班费/团费缴费登记
// 1:1 对齐 front/src/pages/finance/FeePaymentRegister.tsx
// 班费：payment-register 页；团费：league-register 页
// ============================================================
import { useEffect, useMemo, useState } from 'react'
import { Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { PageHeader } from '@/components/business'
import { Icon } from '@/components/ui'
import { classesApi, feeApi } from '@/services'
import type { ClassMember } from '@/services/classes'
import { useUserStore } from '@/stores'
import './FeePaymentRegisterForm.scss'

interface FeeRecordItem {
  id: string
  type: 'income' | 'expense'
  remark?: string | null
}

interface FeePaymentRegisterFormProps {
  /** class=班费 group=团费 */
  feeType: 'class' | 'group'
  /** 展示名称：班费 / 团费 */
  title: string
  /** 默认每人金额 */
  defaultAmount: number
}

export default function FeePaymentRegisterForm({
  feeType,
  title,
  defaultAmount
}: FeePaymentRegisterFormProps) {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const user = useUserStore((s) => s.userInfo)

  const [members, setMembers] = useState<ClassMember[]>([])
  const [paidNames, setPaidNames] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [amount, setAmount] = useState(String(defaultAmount))
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const canManage =
    user?.roleLevel === 'owner' ||
    user?.roleLevel === 'admin' ||
    user?.isCommittee === true

  const feeRemarkPrefix = `${title}缴纳 - `

  const memberKey = (member: ClassMember) => member.userId || member.id

  const fetchData = async () => {
    if (!currentClassId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(false)
    try {
      const [memberRes, feeRes]: any = await Promise.all([
        classesApi.getMembers(currentClassId, { page: 1, pageSize: 200 }),
        feeApi.getLedger({
          classId: currentClassId,
          feeType,
          pageNum: 1,
          pageSize: 100
        })
      ])
      setMembers(memberRes?.list || [])
      const records: FeeRecordItem[] = feeRes?.list || []
      const paid = new Set<string>()
      records.forEach((record) => {
        if (record.type !== 'income' || !record.remark) return
        const remark = record.remark.trim()
        if (remark.startsWith(feeRemarkPrefix)) {
          paid.add(remark.slice(feeRemarkPrefix.length).trim())
        }
      })
      setPaidNames(paid)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentClassId, feeType])

  const filteredMembers = useMemo(() => {
    const query = keyword.trim()
    if (!query) return members
    return members.filter(
      (m) => m.name?.includes(query) || (m.studentId || '').includes(query)
    )
  }, [members, keyword])

  const unpaidMembers = useMemo(
    () => members.filter((m) => !paidNames.has(m.name)),
    [members, paidNames]
  )

  const selectedMembers = useMemo(
    () => members.filter((m) => selected[memberKey(m)] && !paidNames.has(m.name)),
    [members, selected, paidNames]
  )

  const allSelected =
    unpaidMembers.length > 0 && unpaidMembers.every((m) => selected[memberKey(m)])
  const paidCount = paidNames.size

  const backToLedger = () => {
    if (Taro.getCurrentPages().length > 1) {
      Taro.navigateBack()
      return
    }
    Taro.redirectTo({
      url: `/pages-sub/fee/ledger/index?type=${feeType === 'group' ? 'league' : 'class'}`
    })
  }

  const toggle = (member: ClassMember) => {
    if (paidNames.has(member.name)) {
      Taro.showToast({
        title: `${member.name} 已登记缴费，无需重复登记`,
        icon: 'none'
      })
      return
    }
    const key = memberKey(member)
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleAll = () => {
    if (allSelected) {
      setSelected({})
      return
    }
    const next: Record<string, boolean> = {}
    unpaidMembers.forEach((m) => {
      next[memberKey(m)] = true
    })
    setSelected(next)
  }

  const handleSubmit = async () => {
    if (submitting) return
    if (!currentClassId) {
      Taro.showToast({ title: '未找到班级信息', icon: 'none' })
      return
    }
    const amountNum = Number(amount)
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      Taro.showToast({ title: '请输入大于 0 的缴费金额', icon: 'none' })
      return
    }
    if (selectedMembers.length === 0) {
      Taro.showToast({ title: '请先勾选已缴费的学生', icon: 'none' })
      return
    }

    setSubmitting(true)
    try {
      const res: any = await feeApi.batchAdd({
        classId: currentClassId,
        feeType,
        amount: Math.round(amountNum * 100) / 100,
        payerUserIds: selectedMembers.map(memberKey)
      })
      const created = Number(res?.created || selectedMembers.length)
      Taro.showToast({ title: `已登记 ${created} 人${title}缴费`, icon: 'success' })
      setTimeout(() => backToLedger(), 600)
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '登记失败，请重试',
        icon: 'none'
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!canManage) {
    return (
      <View className='feeregister'>
        <PageHeader title={`${title}缴费登记`} variant='a' decor='credit-card' />
        <View className='feeregister__denied'>
          <View className='feeregister__denied-icon'>
            <Icon name='shield-alert' size={64} color='#DC2626' strokeWidth={1.5} />
          </View>
          <View className='feeregister__denied-copy'>
            <Text className='feeregister__denied-title'>仅班委可登记缴费</Text>
            <Text className='feeregister__denied-desc'>
              你可以查看{title}明细，如需登记请联系班委
            </Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className='feeregister'>
      <PageHeader title={`${title}缴费登记`} variant='a' decor='credit-card' />

      <View className='feeregister__body'>
        {/* 缴费信息卡 */}
        <View className='feeregister__hero'>
          <View className='feeregister__hero-top'>
            <View className='feeregister__hero-info'>
              <Text className='feeregister__hero-label'>本次{title}缴费</Text>
              <Text className='feeregister__hero-title'>
                已缴 {paidCount} / {members.length} 人
              </Text>
            </View>
            <View className='feeregister__hero-icon'>
              <Icon name='users' size={48} color='#FFFFFF' strokeWidth={1.8} />
            </View>
          </View>

          <View className='feeregister__amount'>
            <Text className='feeregister__amount-label'>每人金额</Text>
            <View className='feeregister__amount-main'>
              <Text className='feeregister__amount-symbol'>¥</Text>
              <Input
                className='feeregister__amount-input'
                type='digit'
                value={amount}
                placeholder='0.00'
                placeholderClass='feeregister__amount-placeholder'
                onInput={(e) => setAmount(e.detail.value)}
              />
            </View>
            <Text className='feeregister__amount-hint'>可修改</Text>
          </View>
        </View>

        {/* 搜索 */}
        <View className='feeregister__search'>
          <Icon name='search' size={36} color='#64748B' strokeWidth={2} />
          <Input
            className='feeregister__search-input'
            value={keyword}
            placeholder='搜索姓名或学号'
            placeholderClass='feeregister__search-placeholder'
            onInput={(e) => setKeyword(e.detail.value)}
          />
          {keyword ? (
            <View className='feeregister__search-clear' onClick={() => setKeyword('')}>
              <Icon name='x' size={28} color='#64748B' strokeWidth={2.5} />
            </View>
          ) : null}
        </View>

        {/* 名单 */}
        <View className='feeregister__roster'>
          <View className='feeregister__roster-head'>
            <Text className='feeregister__roster-title'>勾选已缴费学生</Text>
            {unpaidMembers.length > 0 ? (
              <View className='feeregister__select-all' onClick={toggleAll}>
                <View
                  className={`feeregister__check feeregister__check--sm ${
                    allSelected ? 'feeregister__check--on' : ''
                  }`}
                >
                  {allSelected ? (
                    <Icon name='check' size={24} color='#FFFFFF' strokeWidth={3} />
                  ) : null}
                </View>
                <Text className='feeregister__select-all-text'>全选待缴</Text>
              </View>
            ) : null}
          </View>

          {loading ? (
            <View className='feeregister__loading'>
              <View className='feeregister__spinner' />
              <Text className='feeregister__loading-text'>正在加载名单...</Text>
            </View>
          ) : loadError ? (
            <View className='feeregister__error'>
              <Text className='feeregister__error-text'>名单加载失败</Text>
              <View className='feeregister__retry' onClick={() => void fetchData()}>
                <Text className='feeregister__retry-text'>重新加载</Text>
              </View>
            </View>
          ) : filteredMembers.length === 0 ? (
            <View className='feeregister__empty'>
              <Icon name='users' size={64} color='#CBD5E1' strokeWidth={1.5} />
              <Text className='feeregister__empty-text'>
                {keyword.trim() ? '没有找到匹配的学生' : '班级暂无成员'}
              </Text>
            </View>
          ) : (
            <View className='feeregister__card'>
              {filteredMembers.map((member, index) => {
                const isPaid = paidNames.has(member.name)
                const isSelected = !!selected[memberKey(member)] && !isPaid
                return (
                  <View
                    key={memberKey(member)}
                    className={`feeregister__student ${
                      isPaid ? 'feeregister__student--paid' : ''
                    } ${
                      index === filteredMembers.length - 1
                        ? 'feeregister__student--last'
                        : ''
                    }`}
                    onClick={() => toggle(member)}
                  >
                    <View className='feeregister__avatar'>
                      <Text className='feeregister__avatar-text'>
                        {member.name?.charAt(0) || '?'}
                      </Text>
                    </View>
                    <View className='feeregister__student-main'>
                      <Text className='feeregister__student-name'>{member.name}</Text>
                      <Text className='feeregister__student-id'>
                        {member.studentId || '未设置学号'}
                      </Text>
                    </View>
                    {isPaid ? (
                      <View className='feeregister__paid'>
                        <Icon name='check' size={24} color='#16A34A' strokeWidth={2.5} />
                        <Text className='feeregister__paid-text'>已缴</Text>
                      </View>
                    ) : (
                      <View
                        className={`feeregister__check ${
                          isSelected ? 'feeregister__check--on' : ''
                        }`}
                      >
                        {isSelected ? (
                          <Icon name='check' size={24} color='#FFFFFF' strokeWidth={3} />
                        ) : null}
                      </View>
                    )}
                  </View>
                )
              })}
            </View>
          )}
        </View>

        <View className='feeregister__gap' />

        <View
          className={`feeregister__submit ${
            submitting || loading || selectedMembers.length === 0
              ? 'feeregister__submit--disabled'
              : ''
          }`}
          onClick={handleSubmit}
        >
          {submitting ? (
            <>
              <View className='feeregister__spinner feeregister__spinner--light' />
              <Text className='feeregister__submit-text'>登记中...</Text>
            </>
          ) : (
            <Text className='feeregister__submit-text'>
              {selectedMembers.length > 0
                ? `确认登记 ${selectedMembers.length} 人 · ¥${(
                    Number(amount || 0) * selectedMembers.length
                  ).toFixed(2)}`
                : '请选择已缴费学生'}
            </Text>
          )}
        </View>
        <Text className='feeregister__footer'>
          已登记的学生会显示「已缴」，避免重复登记
        </Text>
      </View>
    </View>
  )
}