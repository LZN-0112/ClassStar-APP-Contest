import { useState } from 'react'
import { Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { SettingsHeader } from '@/components/business'
import { Icon } from '@/components/ui'
import { authApi } from '@/services'
import { useUserStore } from '@/stores'
import './index.scss'

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,20}$/

interface PasswordFieldProps {
  label: string
  value: string
  placeholder: string
  onChange: (value: string) => void
}

function PasswordField({ label, value, placeholder, onChange }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <View className='chp__field'>
      <Text className='chp__label'>{label}</Text>
      <View className='chp__input-box'>
        <Input
          className='chp__input'
          type='text'
          password={!visible}
          value={value}
          onInput={(e) => onChange(e.detail.value)}
          placeholder={placeholder}
          placeholderClass='chp__placeholder'
        />
        <View className='chp__eye' onClick={() => setVisible((v) => !v)}>
          <Icon
            name='eye'
            size={48}
            color={visible ? '#0062FF' : '#4B5563'}
            strokeWidth={2}
          />
        </View>
      </View>
    </View>
  )
}

export default function ChangePassword() {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const validate = () => {
    if (!oldPassword) {
      Taro.showToast({ title: '请输入旧密码', icon: 'none' })
      return false
    }
    if (!PASSWORD_REGEX.test(newPassword)) {
      Taro.showToast({ title: '新密码需 8-20 位且同时包含字母和数字', icon: 'none' })
      return false
    }
    if (newPassword !== confirmPassword) {
      Taro.showToast({ title: '两次输入的新密码不一致', icon: 'none' })
      return false
    }
    return true
  }

  const handleSubmit = async () => {
    if (loading || !validate()) return

    setLoading(true)
    try {
      await authApi.changePassword({ oldPassword, newPassword, confirmPassword })
      Taro.showToast({ title: '密码修改成功，请重新登录', icon: 'success' })
      useUserStore.getState().logout()
      setTimeout(() => Taro.reLaunch({ url: '/pages/auth/login/index' }), 800)
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '修改失败，请稍后重试',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='chp'>
      <SettingsHeader title='修改密码' />
      <View className='chp__body'>
        <PasswordField
          label='旧密码'
          value={oldPassword}
          placeholder='请输入旧密码'
          onChange={setOldPassword}
        />
        <PasswordField
          label='新密码'
          value={newPassword}
          placeholder='请输入新密码'
          onChange={setNewPassword}
        />
        <PasswordField
          label='确认新密码'
          value={confirmPassword}
          placeholder='请再次输入新密码'
          onChange={setConfirmPassword}
        />

        <Text className='chp__hint'>密码需 8-20 位，且同时包含字母和数字</Text>

        <View
          className={`chp__submit ${loading ? 'chp__submit--disabled' : ''}`}
          onClick={handleSubmit}
        >
          {loading ? '提交中...' : '确认修改'}
        </View>
      </View>
    </View>
  )
}