import { useState } from 'react'
import { View, Text, Input, Textarea, Image } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar } from '@/components/business'
import { Button, Icon } from '@/components/ui'
import { feeApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import { chooseImage } from '@/utils/native'
import { uploadImage } from '@/utils/upload'
import './index.scss'

type FeeType = 'income' | 'expense'

export default function FeeRecord() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireLogin } = useAuth()

  const [type, setType] = useState<FeeType>('income')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [billUrl, setBillUrl] = useState<string | null>(null)
  const [billPreview, setBillPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)

  const classIdRef = { id: currentClassId || '' }

  useLoad((o) => {
    if (!requireLogin()) return
    const cid = (o?.classId as string) || currentClassId
    classIdRef.id = cid || ''
  })

  const selectBill = async () => {
    try {
      const paths = await chooseImage(1)
      if (!paths || paths.length === 0) return
      setBillPreview(paths[0])
      setUploading(true)
      const res = await uploadImage(paths[0])
      setBillUrl(res.url)
      Taro.showToast({ title: '凭证上传成功', icon: 'success' })
    } catch {
      Taro.showToast({ title: '凭证上传失败', icon: 'none' })
      setBillPreview(null)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
    const amountNum = Number(amount)
    if (!amountNum || amountNum <= 0) {
      Taro.showToast({ title: '请输入有效金额', icon: 'none' })
      return
    }
    if (!classIdRef.id) return
    setLoading(true)
    try {
      await feeApi.createPayment({
        classId: classIdRef.id,
        feeType: 'class',
        type,
        amount: amountNum,
        remark: note.trim() || undefined,
        billUrl: billUrl || undefined
      })
      Taro.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 600)
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : '保存失败，请稍后重试', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='feerecord'>
      <NavBar title='班费记账' />

      <View className='feerecord__body'>
        <View className='feerecord__switch'>
          <View
            className={`feerecord__switch-item ${type === 'income' ? 'feerecord__switch-item--active' : ''}`}
            onClick={() => setType('income')}
          >
            <Text className={`feerecord__switch-label ${type === 'income' ? 'feerecord__switch-label--income' : ''}`}>
              收入
            </Text>
          </View>
          <View
            className={`feerecord__switch-item ${type === 'expense' ? 'feerecord__switch-item--active' : ''}`}
            onClick={() => setType('expense')}
          >
            <Text className={`feerecord__switch-label ${type === 'expense' ? 'feerecord__switch-label--expense' : ''}`}>
              支出
            </Text>
          </View>
        </View>

        <View className='feerecord__field'>
          <View className='feerecord__amount-wrap'>
            <View className='feerecord__native-wrap'>
              <Input
                className='feerecord__native'
                type='digit'
                value={amount}
                placeholder='请输入金额'
                placeholderClass='feerecord__placeholder'
                onInput={(e) => setAmount(e.detail.value)}
              />
            </View>
          </View>
        </View>

        <View className='feerecord__field feerecord__field--area'>
          <Textarea
            className='feerecord__area'
            value={note}
            placeholder='请输入备注...'
            placeholderClass='feerecord__placeholder'
            maxlength={500}
            onInput={(e) => setNote(e.detail.value)}
          />
        </View>

        <View className='feerecord__upload' onClick={selectBill}>
          {billPreview ? (
            <View className='feerecord__bill-preview'>
              <Image src={billPreview} className='feerecord__bill-img' mode='aspectFill' />
              {uploading ? (
                <View className='feerecord__bill-mask'>
                  <Text className='feerecord__bill-mask-text'>上传中...</Text>
                </View>
              ) : (
                <View className='feerecord__bill-remove' onClick={(e) => { e.stopPropagation(); setBillUrl(null); setBillPreview(null) }}>
                  <Icon name='x' size={28} color='#fff' strokeWidth={3} />
                </View>
              )}
            </View>
          ) : (
            <>
              <Icon name='camera' size={56} color='#94A3B8' strokeWidth={2} />
              <Text className='feerecord__upload-tip'>上传凭证</Text>
            </>
          )}
        </View>

        <View className='feerecord__spacer' />

        <Button type='primary' size='lg' block loading={loading} onClick={handleSubmit}>
          {loading ? '保存中...' : '保存记录'}
        </Button>
      </View>
    </View>
  )
}