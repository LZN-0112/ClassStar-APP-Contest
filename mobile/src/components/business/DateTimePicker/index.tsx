// ============================================================
// DateTimePicker 日期时间选择组件
// 封装 Taro Picker：date / time / datetime
// value 约定为字符串，datetime 格式 "YYYY-MM-DD HH:mm"
// ============================================================
import { View, Text, Picker } from '@tarojs/components'

import Icon from '@/components/ui/Icon'
import './index.scss'

interface DateTimePickerProps {
  /** 模式 */
  mode: 'date' | 'time' | 'datetime'
  /** 当前值 */
  value?: string
  /** 变化回调 */
  onChange: (value: string) => void
  /** 占位文案 */
  placeholder?: string
}

export default function DateTimePicker({
  mode,
  value,
  onChange,
  placeholder = '请选择'
}: DateTimePickerProps) {
  const date = value ? value.slice(0, 10) : ''
  const time = value && value.length > 10 ? value.slice(11, 16) : ''

  const handleDateChange = (e: { detail: { value: string } }) => {
    const d = e.detail.value
    if (mode === 'date') onChange(d)
    else onChange(`${d} ${time || '00:00'}`)
  }

  const handleTimeChange = (e: { detail: { value: string } }) => {
    const t = e.detail.value
    onChange(`${date || new Date().toISOString().slice(0, 10)} ${t}`)
  }

  const display = value || placeholder

  return (
    <View className='cx-datetime'>
      {/* 日期 */}
      {mode !== 'time' ? (
        <Picker mode='date' value={date} onChange={handleDateChange}>
          <View className='cx-datetime__field'>
            <Text className={`cx-datetime__text ${value ? '' : 'cx-datetime__text--placeholder'}`}>
              {date || placeholder}
            </Text>
            <Icon name='calendar' size={32} color='#9ca3af' strokeWidth={2} />
          </View>
        </Picker>
      ) : null}
      {/* 时间：time 与 datetime 均展示 */}
      {mode !== 'date' ? (
        <Picker mode='time' value={time} onChange={handleTimeChange}>
          <View className='cx-datetime__field'>
            <Text className={`cx-datetime__text ${value ? '' : 'cx-datetime__text--placeholder'}`}>
              {mode === 'time' ? display : (time || placeholder)}
            </Text>
            <Icon name='clock' size={32} color='#9ca3af' strokeWidth={2} />
          </View>
        </Picker>
      ) : null}
    </View>
  )
}