import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { NavBar } from '@/components/business'
import { Button, Input } from '@/components/ui'
import { resetPassword } from '@/services/auth'

import './index.scss'

export default function ResetPassword() {
  const [phone, setPhone] = useState('')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const validate = () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      Taro.showToast({ title: '请输入正确的 11 位手机号', icon: 'none' })
      return false
    }
    if (!oldPassword) {
      Taro.showToast({ title: '请输入旧密码', icon: 'none' })
      return false
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,20}$/.test(newPassword)) {
      Taro.showToast({ title: '新密码需 8-20 位且同时包含字母和数字', icon: 'none' })
      return false
    }
    if (newPassword !== confirmPassword) {
      Taro.showToast({ title: '两次输入的新密码不一致', icon: 'none' })
      return false
    }
    return true
  }

  const handleReset = async () => {
    if (!validate() || loading) return
    setLoading(true)
    try {
      await resetPassword({ phone, oldPassword, newPassword, confirmPassword })
      Taro.showToast({ title: '密码重置成功，请重新登录', icon: 'success' })
      setTimeout(() => {
        Taro.reLaunch({ url: '/pages/auth/login/index' })
      }, 800)
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '重置失败，请检查信息后重试',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='reset'>
      <NavBar
        title='重置密码'
        showBack
        onBack={() => Taro.navigateBack()}
      />
      <View className='reset__card'>
        <Text className='reset__title'>重置密码</Text>
        <Text className='reset__subtitle'>验证手机号后设置新密码</Text>

        <View className='reset__form'>
          <Input
            value={phone}
            onChange={setPhone}
            type='phone'
            placeholder='请输入手机号'
          />
          <Input
            value={oldPassword}
            onChange={setOldPassword}
            type='password'
            placeholder='请输入旧密码'
          />
          <Input
            value={newPassword}
            onChange={setNewPassword}
            type='password'
            placeholder='请输入新密码'
          />
          <Input
            value={confirmPassword}
            onChange={setConfirmPassword}
            type='password'
            placeholder='请确认新密码'
          />
        </View>

        <View className='reset__button'>
          <Button
            block
            size='lg'
            loading={loading}
            onClick={handleReset}
          >
            确认重置
          </Button>
        </View>
      </View>
    </View>
  )
}