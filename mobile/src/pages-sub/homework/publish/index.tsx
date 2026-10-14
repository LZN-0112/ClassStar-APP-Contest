import { useState } from 'react'
import { View, Input, Textarea } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar, DateTimePicker, FormField } from '@/components/business'
import { Button } from '@/components/ui'
import { homeworkApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

function toIso(local: string): string {
  if (!local) return ''
  const m = local.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2})/)
  if (!m) return ''
  const [, y, mo, d, h, mi] = m.map((v) => parseInt(v, 10))
  return new Date(y, (mo || 1) - 1, d || 1, h || 0, mi || 0).toISOString()
}

export default function PublishHomework() {
  const { requireAuth } = useAuth()
  const currentClassId = useUserStore((s) => s.currentClassId)

  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [deadline, setDeadline] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const classIdRef = { id: currentClassId || '' }

  useLoad((o) => {
    if (!requireAuth('committee')) return
    const cid = (o?.classId as string) || currentClassId
    classIdRef.id = cid || ''
  })

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!title.trim()) errs.title = '请输入作业名称'
    if (!deadline) errs.deadline = '请选择截止时间'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate() || loading) return
    if (!classIdRef.id) return
    const iso = toIso(deadline)
    if (!iso) {
      Taro.showToast({ title: '截止时间格式不正确', icon: 'none' })
      return
    }
    setLoading(true)
    try {
      await homeworkApi.publish(classIdRef.id, {
        subject: subject.trim() || title.trim(),
        title: title.trim(),
        content: content.trim(),
        deadline: iso,
        submitMethod: 'text'
      })
      Taro.showToast({ title: '作业发布成功', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 600)
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : '发布失败，请稍后重试', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='hwpub'>
      <NavBar title='发布作业' />

      <View className='hwpub__body'>
        <FormField label='作业名称' required error={errors.title}>
          <View className='hwpub__field'>
            <Input
              className='hwpub__input'
              value={title}
              placeholder='请输入作业名称'
              placeholderClass='hwpub__placeholder'
              onInput={(e) => setTitle(e.detail.value)}
            />
          </View>
        </FormField>

        <FormField label='科目'>
          <View className='hwpub__field'>
            <Input
              className='hwpub__input'
              value={subject}
              placeholder='请输入科目（选填）'
              placeholderClass='hwpub__placeholder'
              onInput={(e) => setSubject(e.detail.value)}
            />
          </View>
        </FormField>

        <FormField label='截止时间' required error={errors.deadline}>
          <View className='hwpub__field'>
            <DateTimePicker mode='datetime' value={deadline} onChange={setDeadline} placeholder='请选择截止时间' />
          </View>
        </FormField>

        <FormField label='作业要求'>
          <View className='hwpub__textarea-wrap'>
            <Textarea
              className='hwpub__textarea'
              value={content}
              placeholder='请输入作业要求...'
              placeholderClass='hwpub__placeholder'
              maxlength={2000}
              onInput={(e) => setContent(e.detail.value)}
            />
          </View>
        </FormField>

        <View className='hwpub__spacer' />

        <Button type='primary' size='lg' block loading={loading} onClick={handleSubmit}>
          {loading ? '发布中...' : '发布作业'}
        </Button>
      </View>
    </View>
  )
}