// ============================================================
// 注册账号
// 1:1 对齐 front/src/pages/auth/Register.tsx
// 真实姓名 / 昵称 / 手机号 / 密码 / 确认密码 + 协议勾选
// ============================================================
import { useState } from 'react'
import { View, Text, Input as TaroInput } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { StatusBar } from '@/components/business'
import { Icon } from '@/components/ui'
import { register as registerApi } from '@/services/auth'
import './index.scss'

const PHONE_REGEX = /^1[3-9]\d{9}$/
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,20}$/

export default function Register() {
  const [realName, setRealName] = useState('')
  const [nickname, setNickname] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const validate = () => {
    const trimmedName = realName.trim()
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      Taro.showToast({ title: '请输入真实姓名（2-50 个字）', icon: 'none' })
      return false
    }
    if (nickname.trim().length > 30) {
      Taro.showToast({ title: '昵称最多 30 个字', icon: 'none' })
      return false
    }
    if (!PHONE_REGEX.test(phone)) {
      Taro.showToast({ title: '请输入正确的 11 位手机号', icon: 'none' })
      return false
    }
    if (!PASSWORD_REGEX.test(password)) {
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
        name: realName.trim(),
        nickname: nickname.trim() || undefined,
        password,
        confirmPassword
      })
      Taro.showToast({ title: '注册成功，请登录', icon: 'success' })
      setTimeout(() => {
        Taro.navigateBack()
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
      <StatusBar />
      <View className='register__wave' />

      <View className='register__content'>
        {/* 返回按钮 */}
        <View className='register__back' onClick={() => Taro.navigateBack()}>
          <Icon name='chevron-left' size={48} color='#1A1A1A' strokeWidth={2} />
        </View>

        <Text className='register__title'>注册账号</Text>
        <Text className='register__subtitle'>创建账号后继续管理班级事务</Text>

        <View className='register__form'>
          {/* 真实姓名 */}
          <View className='register__field'>
            <TaroInput
              className='register__input'
              value={realName}
              maxlength={50}
              placeholder='请输入真实姓名（用于班级实名）'
              placeholderClass='register__placeholder'
              onInput={(e) => setRealName(e.detail.value)}
            />
          </View>

          {/* 昵称 */}
          <View className='register__field'>
            <TaroInput
              className='register__input'
              value={nickname}
              maxlength={30}
              placeholder='请输入昵称（选填）'
              placeholderClass='register__placeholder'
              onInput={(e) => setNickname(e.detail.value)}
            />
          </View>

          {/* 手机号 */}
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

          {/* 设置密码 */}
          <View className='register__field'>
            <TaroInput
              className='register__input'
              password={!showPassword}
              value={password}
              placeholder='请输入密码'
              placeholderClass='register__placeholder'
              onInput={(e) => setPassword(e.detail.value)}
            />
            <View className='register__eye' onClick={() => setShowPassword((v) => !v)}>
              <Icon name={showPassword ? 'eye-off' : 'eye'} size={48} color='#4B5563' />
            </View>
          </View>

          {/* 确认密码 */}
          <View className='register__field'>
            <TaroInput
              className='register__input'
              password={!showConfirmPassword}
              value={confirmPassword}
              placeholder='请再次输入密码'
              placeholderClass='register__placeholder'
              confirmType='done'
              onInput={(e) => setConfirmPassword(e.detail.value)}
              onConfirm={handleRegister}
            />
            <View
              className='register__eye'
              onClick={() => setShowConfirmPassword((v) => !v)}
            >
              <Icon name={showConfirmPassword ? 'eye-off' : 'eye'} size={48} color='#4B5563' />
            </View>
          </View>

          {/* 注册按钮 */}
          <View
            className={`register__btn ${loading ? 'register__btn--loading' : ''}`}
            onClick={handleRegister}
          >
            <Text className='register__btn-text'>{loading ? '注册中...' : '注册'}</Text>
          </View>

          {/* 已有账号登录 */}
          <View className='register__login-link' onClick={() => Taro.navigateBack()}>
            <Text className='register__login-text'>已有账号？</Text>
            <Text className='register__login-primary'>登录</Text>
          </View>

          {/* 协议 */}
          <View className='register__agreement'>
            <View
              className={`register__checkbox ${agreed ? 'register__checkbox--checked' : ''}`}
              onClick={() => setAgreed((v) => !v)}
            >
              {agreed ? <Icon name='check' size={20} color='#FFFFFF' strokeWidth={3} /> : null}
            </View>
            <Text className='register__agreement-text'>
              已阅读并同意
              <Text
                className='register__agreement-link'
                onClick={() => Taro.navigateTo({ url: '/pages/auth/user-agreement/index' })}
              >
                《用户协议》
              </Text>
              和
              <Text
                className='register__agreement-link'
                onClick={() => Taro.navigateTo({ url: '/pages/auth/privacy-policy/index' })}
              >
                《隐私政策》
              </Text>
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
}