// ============================================================
// FormField 表单项容器组件
// 用途：包裹表单输入控件，展示 label / 必填标记 / 错误提示
// ============================================================
import { View, Text } from '@tarojs/components'
import type { ReactNode } from 'react'

import './index.scss'

interface FormFieldProps {
  /** 字段标签 */
  label: string
  /** 是否必填，显示红色星号 */
  required?: boolean
  /** 错误提示文案（非空时展示红色提示） */
  error?: string
  /** 表单控件 */
  children: ReactNode
}

export default function FormField({ label, required = false, error, children }: FormFieldProps) {
  return (
    <View className='cx-form-field'>
      <View className='cx-form-field__label'>
        {required ? <Text className='cx-form-field__star'>*</Text> : null}
        <Text className='cx-form-field__label-text'>{label}</Text>
      </View>
      <View className='cx-form-field__control'>{children}</View>
      {error ? <Text className='cx-form-field__error'>{error}</Text> : null}
    </View>
  )
}