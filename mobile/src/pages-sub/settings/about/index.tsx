import { View, Text } from '@tarojs/components'

import { NavBar } from '@/components/business'
import { Icon } from '@/components/ui'
import './index.scss'

export default function About() {
  return (
    <View className='abt'>
      <NavBar title='关于' />

      <View className='abt__body'>
        <View className='abt__hero'>
          <View className='abt__logo'>
            <Icon name='school' size={80} color='#FFFFFF' strokeWidth={2} />
          </View>
          <Text className='abt__name'>班务星</Text>
          <Text className='abt__version'>版本 v1.0.0</Text>
        </View>

        <Text className='abt__intro'>
          班务星，专注校园班级事务智能管理。
          集通知发布、作业布置、考勤签到、活动报名、
          班费记账与投票抽签于一体，让班级管理更简单高效。
        </Text>
      </View>

      <Text className='abt__copyright'>© 2026 班务星 · 保留所有权利</Text>
    </View>
  )
}