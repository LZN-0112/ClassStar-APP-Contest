// ============================================================
// SettingsHeader 设置模块统一头图
// 1:1 对齐 front/src/components/layout/SettingsHeader.tsx
// 静态渐变封面：返回按钮 + 大标题 + 副标题 + 光晕装饰
// ============================================================
import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import Icon from '@/components/ui/Icon'
import StatusBar from '../StatusBar'
import './index.scss'

interface SettingsHeaderProps {
  title: string
  subtitle?: string
}

export default function SettingsHeader({ title, subtitle }: SettingsHeaderProps) {
  const handleBack = () => {
    if (Taro.getCurrentPages().length > 1) Taro.navigateBack()
    else Taro.reLaunch({ url: '/pages/profile/index' })
  }

  return (
    <View className='cx-settings-header'>
      <StatusBar light />
      <View className='cx-settings-header__circle cx-settings-header__circle--lg' />
      <View className='cx-settings-header__circle cx-settings-header__circle--md' />
      <View className='cx-settings-header__circle cx-settings-header__circle--sm' />

      <View className='cx-settings-header__bar'>
        <View className='cx-settings-header__back' onClick={handleBack}>
          <Icon name='chevron-left' size={40} color='#FFFFFF' strokeWidth={2} />
        </View>
      </View>

      <View className='cx-settings-header__title-wrap'>
        <Text className='cx-settings-header__title'>{title}</Text>
        {subtitle ? <Text className='cx-settings-header__subtitle'>{subtitle}</Text> : null}
      </View>
    </View>
  )
}