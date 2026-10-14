import { useState } from 'react'
import { View, Text, Input as TaroInput } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { register as registerApi } from '@/services/auth'
import { Button, Icon } from '@/components/ui'
import { NavBar } from '@/components/business'
import './index.scss'

export default function Register() {
  const [phone, setPhone] = useState('')
  const [studentId, setStudentId] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const validate = () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      Taro.showToast({ title: '请输入正确的 11 位手机号', icon: 'none' })
      return false
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,20}$/.test(password)) {
      Taro.showToast({ title: '密码需 8-20 位且同时包含字母和数字', icon: 'none' })
      return false
    }
    if (password !== confirmPassword) {
      Taro.showToast({ title: '两次输入的密码不一致', icon: 'none' })
      return false
    }
    return true
  }

  const handleRegister = async () => {
    if (!agreed) {
      Taro.showToast({ title: '请先勾选同意《用户协议》和《隐私政策》', icon: 'none' })
      return
    }
    if (!validate() || loading) return

    setLoading(true)
    try {
      await registerApi({
        phone,
        name: phone,
        password,
        confirmPassword,
        studentId
      })
      Taro.showToast({ title: '注册成功，请登录', icon: 'success' })
      setTimeout(() => {
        Taro.reLaunch({ url: '/pages/auth/login/index' })
      }, 800)
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '注册失败，请检查信息后重试',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='register'>
      <NavBar title='注册' showBack onBack={() => Taro.navigateBack()} />

      <View className='register__content'>
        <Text className='register__title'>注册账号</Text>
        <Text className='register__subtitle'>创建账号后继续管理班级事务</Text>

        <View className='register__card'>
          <View className='register__field'>
            <TaroInput
              className='register__input'
              type='number'
              value={phone}
              maxlength={11}
              placeholder='请输入手机号'
              placeholderClass='register__placeholder'
              onInput={(e) => setPhone(e.detail.value)}
            />
          </View>

          <View className='register__field'>
            <TaroInput
              className='register__input'
              type='number'
              value={studentId}
              placeholder='请输入学号'
              placeholderClass='register__placeholder'
              onInput={(e) => setStudentId(e.detail.value)}
            />
          </View>

          <View className='register__field'>
            <TaroInput
              className='register__input'
              password={!showPassword}
              value={password}
              placeholder='请输入密码（需包含字母和数字）'
              placeholderClass='register__placeholder'
              confirmType='done'
              onInput={(e) => setPassword(e.detail.value)}
            />
            <View
              className='register__eye'
              onClick={() => setShowPassword((v) => !v)}
            >
              <Icon name='eye' size={44} color='#4B5563' />
            </View>
          </View>

          <View className='register__field register__field--last'>
            <TaroInput
              className='register__input'
              password={!showConfirm}
              value={confirmPassword}
              placeholder='请再次输入密码'
              placeholderClass='register__placeholder'
              confirmType='done'
              onInput={(e) => setConfirmPassword(e.detail.value)}
            />
            <View
              className='register__eye'
              onClick={() => setShowConfirm((v) => !v)}
            >
              <Icon name='eye' size={44} color='#4B5563' />
            </View>
          </View>
        </View>

        <Button type='primary' size='lg' block loading={loading} onClick={handleRegister}>
          注册
        </Button>

        <View
          className='register__login-link'
          onClick={() => Taro.navigateBack()}
        >
          <Text className='register__login-text'>已有账号？</Text>
          <Text className='register__login-primary'>登录</Text>
        </View>

        <View className='register__agreement'>
          <View
            className={`register__checkbox ${agreed ? 'register__checkbox--checked' : ''}`}
            onClick={() => setAgreed((v) => !v)}
          >
            {agreed && <Icon name='check' size={20} color='#FFFFFF' strokeWidth={3} />}
          </View>
          <Text className='register__agreement-text'>
            已阅读并同意
            <Text
              className='register__agreement-link'
              onClick={() =>
                Taro.navigateTo({ url: '/pages/auth/user-agreement/index' })
              }
            >
              《用户协议》
            </Text>
            和
            <Text
              className='register__agreement-link'
              onClick={() =>
                Taro.navigateTo({ url: '/pages/auth/privacy-policy/index' })
              }
            >
              《隐私政策》
            </Text>
          </Text>
        </View>
      </View>
    </View>
  )
}