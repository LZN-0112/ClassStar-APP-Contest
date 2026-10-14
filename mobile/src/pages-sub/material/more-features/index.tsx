import { View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar } from '@/components/business'
import { Icon } from '@/components/ui'
import { useAuth } from '@/utils'
import './index.scss'

interface Feature {
  label: string
  icon: string
  color: string
  url: string
}

const FEATURES: Feature[] = [
  {
    label: '班费记账',
    icon: 'wallet',
    color: '#22C55E',
    url: '/pages-sub/fee/ledger/index'
  },
  {
    label: '抽签',
    icon: 'dices',
    color: '#F97316',
    url: '/pages-sub/vote/random-draw/index'
  },
  {
    label: '投票',
    icon: 'vote',
    color: '#3B82F6',
    url: '/pages-sub/vote/list/index'
  },
  {
    label: '番茄钟',
    icon: 'clock',
    color: '#EF4444',
    url: '/pages-sub/material/pomodoro/index'
  }
]

export default function MoreFeatures() {
  const { requireLogin } = useAuth()

  useLoad(() => {
    requireLogin()
  })

  const go = (url: string) => {
    Taro.navigateTo({ url })
  }

  const row1 = FEATURES.slice(0, 2)
  const row2 = FEATURES.slice(2, 4)
  const renderRow = (items: Feature[]) => (
    <View className='mfeat__row'>
      {items.map((item) => (
        <View key={item.label} className='mfeat__item' onClick={() => go(item.url)}>
          <View className='mfeat__icon' style={{ backgroundColor: item.color }}>
            <Icon name={item.icon} size={44} color='#fff' strokeWidth={2} />
          </View>
          <Text className='mfeat__label'>{item.label}</Text>
        </View>
      ))}
    </View>
  )

  return (
    <View className='mfeat'>
      <NavBar title='更多功能' />

      <View className='mfeat__body'>
        <View className='mfeat__card'>
          {renderRow(row1)}
          {renderRow(row2)}
        </View>
      </View>
    </View>
  )
}