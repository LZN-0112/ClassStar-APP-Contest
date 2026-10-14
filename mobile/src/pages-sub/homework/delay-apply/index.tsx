import { useState } from 'react'
import { View, Text, Textarea } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar, FormField, DateTimePicker } from '@/components/business'
import { Button } from '@/components/ui'
import { homeworkApi } from '@/services'
import { useAuth } from '@/utils'
import './index.scss'

function toIso(local: string): string {
  if (!local) return ''
  const m = local.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2})/)
  if (!m) return ''
  const [, y, mo, d, h, mi] = m.map((v) => parseInt(v, 10))
  return new Date(y, (mo || 1) - 1, d || 1, h || 0, mi || 0).toISOString()
}

export default function DelayApply() {
  const { requireLogin } = useAuth()

  const [loading, setLoading] = useState(false)
  const [hwTitle, setHwTitle] = useState('')
  const [reason, setReason] = useState('')
  const [requestedDeadline, setRequestedDeadline] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const paramsRef = { classId: '', homeworkId: '' }

  useLoad((o) => {
    if (!requireLogin()) return
    paramsRef.classId = (o?.classId as string) || ''
    paramsRef.homeworkId = (o?.homeworkId as string) || ''
    fetchTitle()
  })

  const fetchTitle = async () => {
    if (!paramsRef.classId || !paramsRef.homeworkId) return
    try {
      const res: any = await homeworkApi.getDetail(paramsRef.classId, paramsRef.homeworkId)
      const data: any = res?.data ?? res
      if (data?.title) setHwTitle(data.title)
    } catch {
      // 标题获取失败不阻塞表单
    }
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!reason.trim()) errs.reason = '请输入申请原因'
    if (!requestedDeadline) errs.requestedDeadline = '请选择期望延期时间'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate() || loading) return
    if (!paramsRef.classId || !paramsRef.homeworkId) {
      Taro.showToast({ title: '参数缺失', icon: 'none' })
      return
    }
    const requested = toIso(requestedDeadline)
    if (!requested) {
      Taro.showToast({ title: '延期时间格式不正确', icon: 'none' })
      return
    }
    setLoading(true)
    try {
      await homeworkApi.delayApply(paramsRef.classId, paramsRef.homeworkId, {
        reason: reason.trim(),
        requestedDeadline: requested
      })
      Taro.showToast({ title: '延期申请已提交', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 600)
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : '申请失败，请稍后重试', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='hwdl'>
      <NavBar title='延期申请' />

      <View className='hwdl__body'>
        <FormField label='作业'>
          <View className='hwdl__field'>
            <Text className='hwdl__hw-title'>{hwTitle || '未加载到作业标题'}</Text>
          </View>
        </FormField>

        <FormField label='申请延期至' required error={errors.requestedDeadline}>
          <View className='hwdl__field'>
            <DateTimePicker
              mode='datetime'
              value={requestedDeadline}
              onChange={setRequestedDeadline}
              placeholder='请选择期望延期时间'
            />
          </View>
        </FormField>

        <FormField label='申请原因' required error={errors.reason}>
          <View className='hwdl__textarea-wrap'>
            <Textarea
              className='hwdl__textarea'
              value={reason}
              placeholder='请详细说明申请延期的原因...'
              placeholderClass='hwdl__placeholder'
              maxlength={500}
              onInput={(e) => setReason(e.detail.value)}
            />
          </View>
        </FormField>

        <View className='hwdl__tip'>
          <Text className='hwdl__tip-text'>提交后由班委/老师审批，审批结果将通过消息通知。</Text>
        </View>

        <View className='hwdl__spacer' />

        <Button type='primary' size='lg' block loading={loading} onClick={handleSubmit}>
          {loading ? '提交中...' : '提交申请'}
        </Button>
      </View>
    </View>
  )
}