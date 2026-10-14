import { useEffect, useRef } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { useUserStore } from '@/stores'
import logoIcon from '../../../assets/icon.png'
import './index.scss'

export default function Launch() {
  // 防止自动跳转与点击跳转发生重复
  const jumpedRef = useRef(false)

  const go = (url: string) => {
    if (jumpedRef.current) return
    jumpedRef.current = true
    Taro.reLaunch({ url })
  }

  const gotoLogin = () => go('/pages/auth/login/index')
  const gotoHome = () => go('/pages/home/index')

  // 页面加载后 2.5 秒自动跳转；已登录直接进首页，否则进登录页
  useEffect(() => {
    const isLoggedIn = useUserStore.getState().isLoggedIn
    const timer = setTimeout(() => {
      if (isLoggedIn) gotoHome()
      else gotoLogin()
    }, 2500)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <View className='launch' onClick={gotoLogin}>
      {/* 背景层：3 条蓝色渐变条纹 */}
      <View className='launch__bg'>
        <View className='launch__streak launch__streak--1' />
        <View className='launch__streak launch__streak--2' />
        <View className='launch__streak launch__streak--3' />
      </View>

      {/* Logo */}
      <Image
        className='launch__logo'
        src={logoIcon}
        mode='aspectFill'
      />

      {/* App Name */}
      <Text className='launch__name'>班级助手</Text>

      {/* Tagline */}
      <Text className='launch__tagline'>智能管理班级事务</Text>

      {/* Version */}
      <Text className='launch__version'>v1.0.0</Text>
    </View>
  )
}