// ============================================================
// 班费/团费记账表单
// 1:1 对齐 front/src/pages/finance/FeeRecord.tsx
// 班费：record 页；团费：league-record 页
// ============================================================
import { useState } from 'react'
import { Image, Input, Text, Textarea, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { PageHeader } from '@/components/business'
import { Icon } from '@/components/ui'
import { feeApi } from '@/services'
import { resolveFileUrl } from '@/services/request'
import { useUserStore } from '@/stores'
import { chooseImage } from '@/utils/native'
import { uploadFeeBill } from '@/utils/upload'
import './FeeRecordForm.scss'

type FeeRecordType = 'income' | 'expense'

const CATEGORIES: Record<'class' | 'group', Record<FeeRecordType, string[]>> = {
  class: {
    income: ['班费收缴', '活动返款', '其他收入'],
    expense: ['活动支出', '学习用品', '班级建设', '其他支出']
  },
  group: {
    income: ['团费收缴', '活动返款', '其他收入'],
    expense: ['活动支出', '材料采购', '其他支出']
  }
}

interface FeeRecordFormProps {
  feeType: 'class' | 'group'
}

export default function FeeRecordForm({ feeType }: FeeRecordFormProps) {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const user = useUserStore((s) => s.userInfo)

  const isLeague = feeType === 'group'
  const title = isLeague ? '团费' : '班费'
  const categoryOptions = CATEGORIES[feeType]

  const [type, setType] = useState<FeeRecordType>('income')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(categoryOptions.income[0])
  const [note, setNote] = useState('')
  const [billKey, setBillKey] = useState('')
  const [billPreviewUrl, setBillPreviewUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const canManage =
    user?.roleLevel === 'owner' ||
    user?.roleLevel === 'admin' ||
    user?.isCommittee === true

  const backToLedger = () => {
    if (Taro.getCurrentPages().length > 1) {
      Taro.navigateBack()
      return
    }
    Taro.redirectTo({
      url: `/pages-sub/fee/ledger/index?type=${isLeague ? 'league' : 'class'}`
    })
  }

  const switchType = (next: FeeRecordType) => {
    setType(next)
    setCategory(categoryOptions[next][0])
  }

  const handleBillPick = async () => {
    if (uploading) return
    try {
      const paths = await chooseImage(1)
      const filePath = paths?.[0]
      if (!filePath) return
      setUploading(true)
      const res = await uploadFeeBill(filePath, currentClassId)
      if (!res.billKey) throw new Error('上传失败')
      setBillKey(res.billKey)
      setBillPreviewUrl(res.billUrl)
      Taro.showToast({ title: '凭证已上传', icon: 'success' })
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '凭证上传失败，请重试',
        icon: 'none'
      })
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
    if (submitting) return
    if (!currentClassId) {
      Taro.showToast({ title: '未找到班级信息', icon: 'none' })
      return
    }
    const amountNum = Number(amount)
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      Taro.showToast({ title: '请输入大于 0 的金额', icon: 'none' })
      return
    }
    if (amountNum > 999999) {
      Taro.showToast({ title: '单笔金额不能超过 999999 元', icon: 'none' })
      return
    }

    const remarkParts = [category ? `【${category}】` : '', note.trim()].filter(Boolean)
    const remark = remarkParts.join('') || category || undefined

    setSubmitting(true)
    try {
      await feeApi.createPayment({
        classId: currentClassId,
        feeType,
        type,
        amount: Math.round(amountNum * 100) / 100,
        remark,
        billKey: billKey || undefined
      })
      Taro.showToast({
        title: type === 'income' ? `收入已记入${title}账本` : `支出已记入${title}账本`,
        icon: 'success'
      })
      setTimeout(() => backToLedger(), 600)
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '保存失败，请重试',
        icon: 'none'
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!canManage) {
    return (
      <View className='feerecord'>
        <PageHeader title={`${title}记账`} variant='a' decor='wallet' />
        <View className='feerecord__denied'>
          <View className='feerecord__denied-icon'>
            <Icon name='shield-alert' size={64} color='#DC2626' strokeWidth={1.5} />
          </View>
          <View className='feerecord__denied-copy'>
            <Text className='feerecord__denied-title'>仅班委可记账</Text>
            <Text className='feerecord__denied-desc'>
              你可以查看{title}明细，如需记账请联系班委
            </Text>
          </View>
          <View className='feerecord__denied-btn' onClick={backToLedger}>
            <Text className='feerecord__denied-btn-text'>查看班费明细</Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className='feerecord'>
      <PageHeader title={`${title}记账`} variant='a' decor='wallet' />

      <View className='feerecord__body'>
        {/* 收支类型 */}
        <View className='feerecord__types'>
          {(
            [
              {
                value: 'income',
                label: '收入',
                icon: 'arrow-down-left',
                color: '#16A34A'
              },
              {
                value: 'expense',
                label: '支出',
                icon: 'arrow-up-right',
                color: '#DC2626'
              }
            ] as { value: FeeRecordType; label: string; icon: 'arrow-down-left' | 'arrow-up-right'; color: string }[]
          ).map((item) => {
            const active = type === item.value
            return (
              <View
                key={item.value}
                className={`feerecord__type ${active ? 'feerecord__type--active' : ''}`}
                style={active ? { backgroundColor: item.color } : undefined}
                onClick={() => switchType(item.value)}
              >
                <Icon
                  name={item.icon}
                  size={40}
                  color={active ? '#FFFFFF' : '#64748B'}
                  strokeWidth={2.2}
                />
                <Text
                  className={`feerecord__type-label ${
                    active ? 'feerecord__type-label--active' : ''
                  }`}
                >
                  {item.label}
                </Text>
              </View>
            )
          })}
        </View>

        {/* 金额 */}
        <View className='feerecord__card'>
          <Text className='feerecord__label'>
            {type === 'income' ? '收入金额' : '支出金额'}
          </Text>
          <View className='feerecord__amount'>
            <Text className='feerecord__amount-symbol'>¥</Text>
            <Input
              className='feerecord__amount-input'
              type='digit'
              value={amount}
              placeholder='0.00'
              placeholderClass='feerecord__amount-placeholder'
              onInput={(e) => setAmount(e.detail.value)}
            />
            {amount ? (
              <View className='feerecord__amount-clear' onClick={() => setAmount('')}>
                <Icon name='x' size={28} color='#64748B' strokeWidth={2.5} />
              </View>
            ) : null}
          </View>
          <Text className='feerecord__hint'>支持两位小数，保存后可在账本中修改或删除</Text>
        </View>

        {/* 分类 */}
        <View className='feerecord__card feerecord__card--tight'>
          <View className='feerecord__card-head'>
            <Text className='feerecord__card-title'>收支分类</Text>
            <Text className='feerecord__card-extra'>用于账本统计与查找</Text>
          </View>
          <View className='feerecord__chips'>
            {categoryOptions[type].map((item) => {
              const active = category === item
              return (
                <View
                  key={item}
                  className={`feerecord__chip ${active ? 'feerecord__chip--active' : ''}`}
                  onClick={() => setCategory(item)}
                >
                  {active ? (
                    <Icon name='check' size={28} color='#FFFFFF' strokeWidth={2.5} />
                  ) : null}
                  <Text
                    className={`feerecord__chip-label ${
                      active ? 'feerecord__chip-label--active' : ''
                    }`}
                  >
                    {item}
                  </Text>
                </View>
              )
            })}
          </View>
        </View>

        {/* 备注 */}
        <View className='feerecord__card feerecord__card--tight'>
          <Text className='feerecord__card-title'>备注说明</Text>
          <Textarea
            className='feerecord__textarea'
            value={note}
            maxlength={200}
            placeholder={
              type === 'income'
                ? `如：3 月${title}收取，每人 ${isLeague ? 10 : 50} 元`
                : '如：购买运动会物资'
            }
            placeholderClass='feerecord__textarea-placeholder'
            onInput={(e) => setNote(e.detail.value)}
          />
          <Text className='feerecord__counter'>{note.length}/200</Text>
        </View>

        {/* 上传凭证 */}
        <View className='feerecord__card feerecord__card--tight'>
          <View className='feerecord__card-head'>
            <Text className='feerecord__card-title'>收支凭证</Text>
            <Text className='feerecord__card-extra'>选填 · jpg/png ≤ 5MB</Text>
          </View>
          {billKey ? (
            <View className='feerecord__bill'>
              <Image
                className='feerecord__bill-image'
                src={resolveFileUrl(billPreviewUrl)}
                mode='aspectFill'
              />
              <View
                className='feerecord__bill-remove'
                onClick={() => {
                  setBillKey('')
                  setBillPreviewUrl('')
                }}
              >
                <Icon name='x' size={32} color='#FFFFFF' strokeWidth={2.5} />
              </View>
            </View>
          ) : (
            <View
              className={`feerecord__upload ${uploading ? 'feerecord__upload--busy' : ''}`}
              onClick={handleBillPick}
            >
              {uploading ? (
                <>
                  <View className='feerecord__spinner' />
                  <Text className='feerecord__upload-text'>正在上传...</Text>
                </>
              ) : (
                <>
                  <Icon name='camera' size={40} color='#0062FF' strokeWidth={2} />
                  <Text className='feerecord__upload-text'>拍照或从相册选择凭证</Text>
                </>
              )}
            </View>
          )}
        </View>

        <View className='feerecord__gap' />

        <View
          className={`feerecord__submit ${
            submitting || uploading ? 'feerecord__submit--disabled' : ''
          }`}
          onClick={handleSubmit}
        >
          {submitting ? (
            <>
              <View className='feerecord__spinner feerecord__spinner--light' />
              <Text className='feerecord__submit-text'>保存中...</Text>
            </>
          ) : (
            <Text className='feerecord__submit-text'>保存记录</Text>
          )}
        </View>
        <Text className='feerecord__footer'>记录保存后全班可在账本中查看，班委可随时修改</Text>
      </View>
    </View>
  )
}