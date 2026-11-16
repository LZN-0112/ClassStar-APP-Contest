// ============================================================
// 发起投票 — 1:1 对齐 front/src/pages/votes/PublishVote.tsx
// ============================================================
import { useMemo, useState } from 'react'
import { Input, Picker, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { PageHeader } from '@/components/business'
import { Icon } from '@/components/ui'
import { voteApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

type VoteType = 'single' | 'multiple'

const ACCENT = '#3D6BE5'
const MAX_OPTIONS = 20

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function toLocal(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`
}

function fromNow(offsetMs: number) {
  const date = new Date(Date.now() + offsetMs)
  date.setSeconds(0, 0)
  return toLocal(date)
}

function tonight() {
  const date = new Date()
  date.setHours(22, 0, 0, 0)
  if (date.getTime() <= Date.now()) date.setDate(date.getDate() + 1)
  return toLocal(date)
}

function toIso(local: string) {
  const m = local.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{1,2})/)
  if (!m) return ''
  const [, y, mo, d, h, mi] = m.map((v) => parseInt(v, 10))
  return new Date(y, (mo || 1) - 1, d || 1, h || 0, mi || 0).toISOString()
}

const TYPES: { value: VoteType; label: string; desc: string; icon: 'check-circle' | 'check-square' }[] = [
  { value: 'single', label: '单选', desc: '每人只能选 1 项', icon: 'check-circle' },
  { value: 'multiple', label: '多选', desc: '每人可选多项', icon: 'check-square' }
]

export default function PublishVote() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const user = useUserStore((s) => s.userInfo)
  const { requireLogin } = useAuth()

  const [classId, setClassId] = useState('')
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [options, setOptions] = useState<string[]>(['', ''])
  const [deadline, setDeadline] = useState('')
  const [voteType, setVoteType] = useState<VoteType>('single')

  const canManage =
    user?.roleLevel === 'owner' ||
    user?.roleLevel === 'admin' ||
    user?.isCommittee === true

  useLoad((o) => {
    if (!requireLogin()) return
    setClassId((o?.classId as string) || currentClassId || '')
  })

  const presets = useMemo(
    () => [
      { key: '1h', label: '1 小时后', value: fromNow(3600000) },
      { key: 'tonight', label: '今晚 22:00', value: tonight() },
      { key: 'tomorrow', label: '明天此刻', value: fromNow(86400000) },
      { key: '3d', label: '3 天后', value: fromNow(3 * 86400000) },
      { key: '7d', label: '一周后', value: fromNow(7 * 86400000) }
    ],
    []
  )

  const deadlineDate = deadline ? new Date(toIso(deadline)) : null
  const deadlinePast = deadlineDate ? deadlineDate.getTime() <= Date.now() : false
  const emptyOptionIndex = options.findIndex((item) => !item.trim())
  const canSubmit =
    title.trim().length > 0 &&
    deadline.length > 0 &&
    !deadlinePast &&
    emptyOptionIndex === -1 &&
    !loading

  const displayDeadline = deadline
    ? `${deadline.split(' ')[0].replace(/-/g, '/')} ${deadline.split(' ')[1] || ''}`.trim()
    : '未设置'

  const tip = !title.trim()
    ? '请先填写投票标题'
    : emptyOptionIndex !== -1
      ? `请填写选项 ${emptyOptionIndex + 1} 的内容`
      : !deadline
        ? '请选择截止时间'
        : deadlinePast
          ? '截止时间需晚于当前时间'
          : ''

  const handleOptionChange = (index: number, value: string) => {
    setOptions((prev) => prev.map((item, i) => (i === index ? value : item)))
  }

  const addOption = () => {
    if (options.length >= MAX_OPTIONS) {
      Taro.showToast({ title: `最多 ${MAX_OPTIONS} 个选项`, icon: 'none' })
      return
    }
    setOptions((prev) => [...prev, ''])
  }

  const removeOption = (index: number) => {
    if (options.length <= 2) {
      Taro.showToast({ title: '至少需要 2 个选项', icon: 'none' })
      return
    }
    setOptions((prev) => prev.filter((_, i) => i !== index))
  }

  const onDateChange = (value: string) => {
    const time = deadline.split(' ')[1] || '22:00'
    setDeadline(`${value} ${time}`)
  }

  const onTimeChange = (value: string) => {
    const date = deadline.split(' ')[0] || toLocal(new Date()).split(' ')[0]
    setDeadline(`${date} ${value}`)
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    if (!classId) {
      Taro.showToast({ title: '请先加入班级', icon: 'none' })
      return
    }
    setLoading(true)
    try {
      await voteApi.publish(classId, {
        title: title.trim(),
        voteType,
        deadline: toIso(deadline),
        options: options.map((item) => item.trim())
      })
      Taro.showToast({ title: '投票发布成功', icon: 'success' })
      setTimeout(() => {
        if (Taro.getCurrentPages().length > 1) Taro.navigateBack()
        else Taro.redirectTo({ url: '/pages-sub/vote/list/index' })
      }, 600)
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '发布失败，请稍后重试',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  const datePart = deadline.split(' ')[0] || ''
  const timePart = deadline.split(' ')[1] || ''

  return (
    <View className='votepub'>
      <PageHeader title='发起投票' variant='a' decor='bar-chart' />

      <View className='votepub__body'>
        {!canManage ? (
          <View className='votepub__notice'>
            <Text>仅班委可以发起投票，你可以先浏览其他投票。</Text>
          </View>
        ) : null}

        {/* 标题 */}
        <View className='votepub__card'>
          <View className='votepub__card-head'>
            <Text className='votepub__card-label'>投票标题</Text>
            <Text className='votepub__counter'>{title.length}/50</Text>
          </View>
          <Input
            className='votepub__title-input'
            value={title}
            maxlength={50}
            placeholder='例如：本周班会时间投票'
            placeholderClass='votepub__placeholder'
            onInput={(e) => setTitle(e.detail.value)}
          />
        </View>

        {/* 选项 */}
        <View className='votepub__card'>
          <View className='votepub__card-head'>
            <Text className='votepub__card-label'>投票选项</Text>
            <Text className='votepub__hint'>共 {options.length} 个 · 至少 2 个</Text>
          </View>

          <View className='votepub__options'>
            {options.map((option, index) => (
              <View className='votepub__option' key={index}>
                <View className='votepub__option-num'>
                  <Text className='votepub__option-num-text'>{index + 1}</Text>
                </View>
                <Input
                  className='votepub__option-input'
                  value={option}
                  maxlength={40}
                  placeholder={`选项 ${index + 1}`}
                  placeholderClass='votepub__placeholder'
                  onInput={(e) => handleOptionChange(index, e.detail.value)}
                />
                {options.length > 2 ? (
                  <View className='votepub__option-del' onClick={() => removeOption(index)}>
                    <Icon name='trash-2' size={32} color='#94A3B8' strokeWidth={1.8} />
                  </View>
                ) : null}
              </View>
            ))}
          </View>

          {options.length < MAX_OPTIONS ? (
            <View className='votepub__add' onClick={addOption}>
              <Icon name='plus' size={32} color='#64748B' strokeWidth={2} />
              <Text className='votepub__add-text'>添加选项</Text>
            </View>
          ) : null}
        </View>

        {/* 截止时间 */}
        <View className='votepub__card'>
          <View className='votepub__card-head'>
            <View className='votepub__card-label-row'>
              <Icon name='calendar-days' size={28} color='#94A3B8' strokeWidth={1.8} />
              <Text className='votepub__card-label'>截止时间</Text>
            </View>
            <Text
              className={`votepub__deadline-value ${
                deadline ? 'votepub__deadline-value--set' : ''
              }`}
            >
              {displayDeadline}
            </Text>
          </View>

          <View className='votepub__presets'>
            {presets.map((preset) => {
              const active = deadline === preset.value
              return (
                <View
                  key={preset.key}
                  className={`votepub__preset ${
                    active ? 'votepub__preset--active' : ''
                  }`}
                  onClick={() => setDeadline(preset.value)}
                >
                  <Text>{preset.label}</Text>
                </View>
              )
            })}
          </View>

          <View className='votepub__custom'>
            <Text className='votepub__custom-label'>自定义日期与时间</Text>
            <View className='votepub__custom-value'>
              <Picker mode='date' value={datePart} onChange={(e) => onDateChange(e.detail.value)}>
                <Text
                  className={`votepub__custom-part ${datePart ? '' : 'votepub__custom-part--empty'}`}
                >
                  {datePart ? datePart.replace(/-/g, '/') : '选择日期'}
                </Text>
              </Picker>
              <Picker mode='time' value={timePart} onChange={(e) => onTimeChange(e.detail.value)}>
                <Text
                  className={`votepub__custom-part ${timePart ? '' : 'votepub__custom-part--empty'}`}
                >
                  {timePart || '选择时间'}
                </Text>
              </Picker>
            </View>
          </View>
        </View>

        {/* 投票类型 */}
        <View className='votepub__card'>
          <Text className='votepub__card-label'>投票类型</Text>
          <View className='votepub__types'>
            {TYPES.map((item) => {
              const active = voteType === item.value
              return (
                <View
                  key={item.value}
                  className={`votepub__type ${active ? 'votepub__type--active' : ''}`}
                  onClick={() => setVoteType(item.value)}
                >
                  <View
                    className={`votepub__type-head ${
                      active ? 'votepub__type-head--active' : ''
                    }`}
                  >
                    <Icon
                      name={item.icon}
                      size={32}
                      color={active ? ACCENT : '#1E293B'}
                      strokeWidth={1.8}
                    />
                    <Text className='votepub__type-label'>{item.label}</Text>
                  </View>
                  <Text className='votepub__type-desc'>{item.desc}</Text>
                </View>
              )
            })}
          </View>
        </View>

        <View className='votepub__spacer' />

        {tip ? <Text className='votepub__tip'>{tip}</Text> : null}

        <View
          className={`votepub__submit ${canSubmit ? 'votepub__submit--enabled' : ''}`}
          onClick={() => void handleSubmit()}
        >
          <Text>{loading ? '发布中...' : '发布投票'}</Text>
        </View>
      </View>
    </View>
  )
}