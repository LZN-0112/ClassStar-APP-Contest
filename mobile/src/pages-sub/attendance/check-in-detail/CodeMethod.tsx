import { useState } from 'react'
import { Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { Icon } from '@/components/ui'
import { attendanceApi } from '@/services'
import './method.scss'

interface Props {
  classId: string
  attendanceId: string
  onSuccess: () => void
}

export default function CodeMethod({ classId, attendanceId, onSuccess }: Props) {
  const [code, setCode] = useState(['', '', '', ''])
  const [focusIndex, setFocusIndex] = useState(-1)
  const [loading, setLoading] = useState(false)

  const handleChange = (index: number, value: string) => {
    const digits = value.replace(/\D/g, '')
    const next = [...code]

    if (!digits) {
      next[index] = ''
      setCode(next)
      if (index > 0) setFocusIndex(index - 1)
      return
    }

    if (digits.length > 1) {
      // 长按粘贴多位数字时依次填入
      for (let i = 0; i < digits.length && index + i < 4; i += 1) {
        next[index + i] = digits[i]
      }
      setCode(next)
      setFocusIndex(Math.min(index + digits.length, 3))
      return
    }

    next[index] = digits
    setCode(next)
    setFocusIndex(index < 3 ? index + 1 : -1)
  }

  const handleCheckIn = async () => {
    const codeStr = code.join('')
    if (codeStr.length !== 4) {
      Taro.showToast({ title: '请输入4位签到口令', icon: 'none' })
      return
    }
    setLoading(true)
    try {
      await attendanceApi.checkIn(classId, attendanceId, { method: 'code', code: codeStr })
      Taro.showToast({ title: '签到成功！', icon: 'success' })
      onSuccess()
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '签到失败',
        icon: 'none'
      })
      // 保留已输入口令，便于用户修正个别数字后重试
      setFocusIndex(3)
    } finally {
      setLoading(false)
    }
  }

  const codeReady = code.join('').length === 4

  return (
    <View className='attmethod'>
      <View className='attmethod__banner attmethod__banner--code'>
        <View className='attmethod__banner-title attmethod__banner-title--code'>
          <Icon name='key-round' size={32} color='#DC2626' />
          <Text>口令签到</Text>
        </View>
        <Text className='attmethod__banner-desc'>请输入发起人公布的4位数字签到口令</Text>
      </View>

      <View className='attmethod__code-panel'>
        <Icon name='key-round' size={96} color='#0062FF' />
        <Text className='attmethod__code-tip'>请输入4位签到口令</Text>
        <View className='attmethod__code-inputs'>
          {code.map((digit, i) => (
            <Input
              key={i}
              className={`attmethod__code-input ${
                focusIndex === i ? 'attmethod__code-input--focus' : ''
              }`}
              type='number'
              maxlength={4}
              value={digit}
              focus={focusIndex === i}
              onInput={(e) => handleChange(i, e.detail.value)}
            />
          ))}
        </View>
      </View>

      <View
        className={`attmethod__primary-btn ${
          loading || !codeReady ? 'attmethod__btn--disabled' : ''
        }`}
        onClick={() => {
          if (!loading && codeReady) void handleCheckIn()
        }}
      >
        <Text>{loading ? '签到中...' : '确认签到'}</Text>
      </View>
    </View>
  )
}