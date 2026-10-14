// ============================================================
// Input 通用输入框组件
// 设计规范 8.3
// ============================================================
import { useState } from 'react'
import { View, Text, Input as TaroInput } from '@tarojs/components'
import type { InputProps as TaroInputProps } from '@tarojs/components'

import './index.scss'

export type InputType = 'text' | 'number' | 'password' | 'phone'

interface InputProps {
  /** 当前值 */
  value: string
  /** 值变化回调 */
  onChange: (value: string) => void
  /** 占位文字 */
  placeholder?: string
  /** 输入类型 */
  type?: InputType
  /** 左侧标签 */
  label?: string
  /** 错误提示文字 */
  error?: string
  /** 最大长度 */
  maxLength?: number
  /** 是否禁用 */
  disabled?: boolean
  /** 自定义类名 */
  className?: string
}

/** 组件内部类型 → Taro Input type 映射 */
function mapType(type: InputType): Exclude<TaroInputProps['type'], undefined> {
  switch (type) {
    case 'number':
    case 'phone':
      return 'number'
    default:
      return 'text'
  }
}

export default function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  label,
  error,
  maxLength,
  disabled = false,
  className = ''
}: InputProps) {
  const [focused, setFocused] = useState(false)

  const isPassword = type === 'password'
  const resolvedMaxLength =
    maxLength ?? (type === 'phone' ? 11 : undefined)

  const wrapperClasses = [
    'cx-input',
    focused ? 'cx-input--focused' : '',
    error ? 'cx-input--error' : '',
    disabled ? 'cx-input--disabled' : '',
    className
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <View className={wrapperClasses}>
      {label && <Text className='cx-input__label'>{label}</Text>}
      <View className='cx-input__field'>
        <TaroInput
          className='cx-input__native'
          value={value}
          type={mapType(type)}
          password={isPassword}
          placeholder={placeholder}
          placeholderClass='cx-input__placeholder'
          maxlength={resolvedMaxLength}
          disabled={disabled}
          onInput={(e) => onChange(e.detail.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
      {error && <Text className='cx-input__error'>{error}</Text>}
    </View>
  )
}
