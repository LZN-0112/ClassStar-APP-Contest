import { useState } from 'react'
import { View, Text, Input } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar, DateTimePicker } from '@/components/business'
import { Button } from '@/components/ui'
import { voteApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

type VoteType = 'single' | 'multiple'

export default function PublishVote() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireAuth } = useAuth()

  useLoad((o) => {
    if (!requireAuth('committee')) return
    const cid = (o?.classId as string) || currentClassId
    classIdRef.id = cid || ''
  })

  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [options, setOptions] = useState<string[]>(['', ''])
  const [deadline, setDeadline] = useState('')
  const [voteType, setVoteType] = useState<VoteType>('single')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [showTypePicker, setShowTypePicker] = useState(false)

  const classIdRef = { id: currentClassId || '' }

  const handleOptionChange = (index: number, value: string) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)))
  }

  const addOption = () => {
    if (options.length >= 20) {
      Taro.showToast({ title: '最多20个选项', icon: 'none' })
      return
    }
    setOptions((prev) => [...prev, ''])
  }

  const removeOption = (index: number) => {
    if (options.length <= 2) {
      Taro.showToast({ title: '至少需要2个选项', icon: 'none' })
      return
    }
    setOptions((prev) => prev.filter((_, i) => i !== index))
  }

  const toIso = (local: string) => {
    if (!local) return ''
    const m = local.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2})/)
    if (!m) return null
    const [, y, mo, d, h, mi] = m.map((v) => parseInt(v, 10))
    return new Date(y, (mo || 1) - 1, d || 1, h || 0, mi || 0).toISOString()
  }

  const validate = () => {
    if (!title.trim()) {
      Taro.showToast({ title: '请输入投票标题', icon: 'none' })
      return false
    }
    if (!deadline) {
      Taro.showToast({ title: '请选择截止时间', icon: 'none' })
      return false
    }
    if (options.some((o) => !o.trim())) {
      Taro.showToast({ title: '请填写所有选项内容', icon: 'none' })
      return false
    }
    return true
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
      await voteApi.publish(classIdRef.id, {
        title: title.trim(),
        voteType,
        deadline: iso,
        options: options.map((o) => o.trim())
      })
      Taro.showToast({ title: '投票发布成功', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 600)
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : '发布失败，请稍后重试', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='votepub'>
      <NavBar title='发起投票' />

      <View className='votepub__body'>
        <View className='votepub__title-field'>
          <Input
            className='votepub__title-input'
            value={title}
            placeholder='请输入投票标题'
            placeholderClass='votepub__placeholder'
            onInput={(e) => setTitle(e.detail.value)}
          />
        </View>

        <View className='votepub__card'>
          <Text className='votepub__card-label'>投票选项</Text>
          {options.map((option, index) => (
            <View className='votepub__option' key={index}>
              <Text className='votepub__option-num'>{index + 1}.</Text>
              <Input
                className='votepub__option-input'
                value={option}
                placeholder={`选项${index + 1}`}
                placeholderClass='votepub__placeholder'
                onInput={(e) => handleOptionChange(index, e.detail.value)}
              />
              {options.length > 2 ? (
                <Text className='votepub__option-del' onClick={() => removeOption(index)}>删除</Text>
              ) : null}
            </View>
          ))}
          <View className='votepub__add' onClick={addOption}>
            <Text className='votepub__add-text'>+ 添加选项</Text>
          </View>
        </View>

        <View className='votepub__card votepub__settings'>
          <View className='votepub__setting-row'>
            <Text className='votepub__setting-label'>截止时间</Text>
            <DateTimePicker mode='datetime' value={deadline} onChange={setDeadline} />
          </View>

          <View className='votepub__setting-row'>
            <Text className='votepub__setting-label'>投票类型</Text>
            <View className='votepub__type-wrap'>
              <View className='votepub__type' onClick={() => setShowTypePicker(!showTypePicker)}>
                <Text className='votepub__type-text'>{voteType === 'single' ? '单选' : '多选'}</Text>
                <Text className='votepub__type-caret'>⌄</Text>
              </View>
              {showTypePicker ? (
                <View className='votepub__type-menu'>
                  <View
                    className={`votepub__type-item ${voteType === 'single' ? 'votepub__type-item--active' : ''}`}
                    onClick={() => { setVoteType('single'); setShowTypePicker(false) }}
                  >
                    <Text className='votepub__type-item-text'>单选</Text>
                  </View>
                  <View
                    className={`votepub__type-item ${voteType === 'multiple' ? 'votepub__type-item--active' : ''}`}
                    onClick={() => { setVoteType('multiple'); setShowTypePicker(false) }}
                  >
                    <Text className='votepub__type-item-text'>多选</Text>
                  </View>
                </View>
              ) : null}
            </View>
          </View>

          <View className='votepub__setting-row'>
            <Text className='votepub__setting-label'>是否匿名</Text>
            <View className='votepub__switch' onClick={() => setIsAnonymous(!isAnonymous)}>
              <View className={`votepub__switch-thumb ${isAnonymous ? 'votepub__switch-thumb--on' : ''}`} />
            </View>
          </View>
        </View>

        <View className='votepub__spacer' />

        <Button type='primary' size='lg' block loading={loading} onClick={handleSubmit}>
          {loading ? '发布中...' : '发布投票'}
        </Button>
      </View>
    </View>
  )
}