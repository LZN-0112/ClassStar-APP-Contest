import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { Button, Icon } from '@/components/ui'
import { NavBar } from '@/components/business'
import './index.scss'

export default function Onboarding() {
  return (
    <View className='onboarding'>
      <NavBar
        title='引导页'
        showBack
        onBack={() => {
          const pages = Taro.getCurrentPages()
          if (pages.length > 1) Taro.navigateBack()
          else Taro.reLaunch({ url: '/pages/auth/login/index' })
        }}
      />

      <View className='onboarding__content'>
        <View className='onboarding__logo'>
          <Icon name='school' size={120} color='#0062ff' strokeWidth={1.5} />
        </View>
        <Text className='onboarding__title'>校园班级事务智能管理助手</Text>
        <Text className='onboarding__subtitle'>去群聊化 · 按事务聚合 · 数据闭环</Text>

        <View className='onboarding__action'>
          <Button
            type='primary'
            size='lg'
            block
            onClick={() => Taro.reLaunch({ url: '/pages/auth/login/index' })}
          >
            开始体验
          </Button>
        </View>
      </View>
    </View>
  )
}