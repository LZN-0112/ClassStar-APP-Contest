import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar, Tag } from '@/components/business'
import { Icon } from '@/components/ui'
import { authApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

interface BindRow {
  label: string
  icon: string
  bound: boolean
}

const BIND_ROWS: BindRow[] = [
  { label: '绑定手机', icon: 'phone', bound: true },
  { label: '绑定邮箱', icon: 'mail', bound: false }
]

export default function AccountSecurity() {
  const { requireLogin } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useLoad(() => {
    requireLogin()
  })

  const handleNotOpen = () => {
    Taro.showToast({ title: '暂未开放', icon: 'none' })
  }

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await authApi.logout()
    } catch {
      /* 服务端登出失败不阻塞本地清理 */
    } finally {
      useUserStore.getState().logout()
      Taro.reLaunch({ url: '/pages/auth/login/index' })
      setIsLoggingOut(false)
    }
  }

  return (
    <View className='asec'>
      <NavBar title='账号与安全' />

      <View className='asec__body'>
        {/* 账号绑定 */}
        <View className='asec__group'>
          <Text className='asec__group-title'>账号绑定</Text>
          <View className='asec__card'>
            <View className='asec__row' onClick={handleNotOpen}>
              <View className='asec__row-icon'>
                <Icon name='lock' size={48} color='#0062FF' strokeWidth={2} />
              </View>
              <Text className='asec__row-label'>修改密码</Text>
              <Icon name='chevron-right' size={48} color='#4B5563' strokeWidth={2} />
            </View>

            {BIND_ROWS.map((row) => (
              <View key={row.label} className='asec__row' onClick={handleNotOpen}>
                <View className='asec__row-icon'>
                  <Icon name={row.icon} size={48} color='#0062FF' strokeWidth={2} />
                </View>
                <Text className='asec__row-label'>{row.label}</Text>
                <View className='asec__row-tag'>
                  <Tag
                    text={row.bound ? '已绑定' : '未绑定'}
                    color='primary'
                    type={row.bound ? 'filled' : 'outline'}
                  />
                </View>
                <Icon name='chevron-right' size={48} color='#4B5563' strokeWidth={2} />
              </View>
            ))}
          </View>
        </View>

        {/* 账号操作 */}
        <View className='asec__group'>
          <Text className='asec__group-title'>账号操作</Text>
          <View className='asec__card asec__card--danger'>
            <View className='asec__row asec__row--danger' onClick={handleLogout}>
              <View className='asec__row-icon asec__row-icon--danger'>
                <Icon name='unlock' size={48} color='#DC2626' strokeWidth={2} />
              </View>
              <Text className='asec__row-label asec__row-label--danger'>
                {isLoggingOut ? '退出中...' : '退出登录'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}