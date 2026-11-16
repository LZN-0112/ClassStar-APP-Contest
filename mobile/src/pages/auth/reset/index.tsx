// ============================================================
// 重置密码
// 1:1 对齐 front/src/pages/auth/ResetPassword.tsx
// 邮箱 + 邮箱验证码 + 旧密码 + 新密码 + 确认新密码（密码可切换明文）
// 安全要求：必须同时通过「邮箱验证码」和「旧密码」校验才能重置
// ============================================================
import { useEffect, useState } from 'react'
import { View, Text, Input as TaroInput } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { StatusBar } from '@/components/business'
import { Icon } from '@/components/ui'
import { resetPassword, sendResetPasswordCode } from '@/services/auth'
import './index.scss'

export default function ResetPassword() {
  const [email, setEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [sendingCode, setSendingCode] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown((v) => v - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  /** 发送邮箱验证码：验证码会发送到输入的注册邮箱 */
  const handleSendCode = async () => {
    if (sendingCode || countdown > 0) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Taro.showToast({ title: '请输入正确的邮箱', icon: 'none' })
      return
    }
    setSendingCode(true)
    try {
      const data = await sendResetPasswordCode(email.trim())
      if (data?.devCode) {
        // 测试环境未配置 SMTP，后端回传验证码并自动填入
        setEmailCode(String(data.devCode))
        Taro.showToast({ title: '测试环境验证码已自动填入', icon: 'none' })
      } else {
        Taro.showToast({
          title: `验证码已发送至 ${data?.email || email.trim()}`,
          icon: 'none'
        })
      }
      setCountdown(60)
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '验证码发送失败，请稍后重试',
        icon: 'none'
      })
    } finally {
      setSendingCode(false)
    }
  }

  const validate = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Taro.showToast({ title: '请输入正确的邮箱', icon: 'none' })
      return false
    }
    if (!/^\d{6}$/.test(emailCode)) {
      Taro.showToast({ title: '请输入 6 位邮箱验证码', icon: 'none' })
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
      await resetPassword({ email: email.trim(), emailCode, oldPassword, newPassword, confirmPassword })
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
      <StatusBar />
      <View className='reset__wave' />

      <View className='reset__content'>
        {/* 返回按钮 */}
        <View className='reset__back' onClick={() => Taro.navigateBack()}>
          <Icon name='chevron-left' size={48} color='#1A1A1A' strokeWidth={2} />
        </View>

        <Text className='reset__title'>重置密码</Text>
        <Text className='reset__subtitle'>验证邮箱和旧密码后设置新密码</Text>

        {/* 邮箱 */}
        <View className='reset__field reset__field--email'>
          <TaroInput
            className='reset__input'
            type='text'
            value={email}
            placeholder='请输入注册邮箱'
            placeholderClass='reset__placeholder'
            onInput={(e) => setEmail(e.detail.value)}
          />
        </View>

        {/* 邮箱验证码 */}
        <View className='reset__field reset__field--code'>
          <TaroInput
            className='reset__input'
            type='number'
            value={emailCode}
            maxlength={6}
            placeholder='请输入邮箱收到的验证码'
            placeholderClass='reset__placeholder'
            onInput={(e) => setEmailCode(e.detail.value)}
          />
          <View
            className={`reset__code-btn ${sendingCode || countdown > 0 ? 'reset__code-btn--disabled' : ''}`}
            onClick={handleSendCode}
          >
            <Text className='reset__code-btn-text'>
              {countdown > 0 ? `${countdown}s 后重发` : sendingCode ? '发送中...' : '获取验证码'}
            </Text>
          </View>
        </View>

        {/* 旧密码 */}
        <View className='reset__field reset__field--old'>
          <TaroInput
            className='reset__input'
            password={!showOldPassword}
            value={oldPassword}
            placeholder='请输入旧密码'
            placeholderClass='reset__placeholder'
            onInput={(e) => setOldPassword(e.detail.value)}
          />
          <View className='reset__eye' onClick={() => setShowOldPassword((v) => !v)}>
            <Icon name={showOldPassword ? 'eye-off' : 'eye'} size={48} color='#4B5563' />
          </View>
        </View>

        {/* 新密码 */}
        <View className='reset__field reset__field--new'>
          <TaroInput
            className='reset__input'
            password={!showNewPassword}
            value={newPassword}
            placeholder='请输入新密码'
            placeholderClass='reset__placeholder'
            onInput={(e) => setNewPassword(e.detail.value)}
          />
          <View className='reset__eye' onClick={() => setShowNewPassword((v) => !v)}>
            <Icon name={showNewPassword ? 'eye-off' : 'eye'} size={48} color='#4B5563' />
          </View>
        </View>

        {/* 确认新密码 */}
        <View className='reset__field reset__field--confirm'>
          <TaroInput
            className='reset__input'
            password={!showConfirmPassword}
            value={confirmPassword}
            placeholder='请确认新密码'
            placeholderClass='reset__placeholder'
            confirmType='done'
            onInput={(e) => setConfirmPassword(e.detail.value)}
            onConfirm={handleReset}
          />
          <View className='reset__eye' onClick={() => setShowConfirmPassword((v) => !v)}>
            <Icon name={showConfirmPassword ? 'eye-off' : 'eye'} size={48} color='#4B5563' />
          </View>
        </View>

        {/* 确认重置 */}
        <View
          className={`reset__btn ${loading ? 'reset__btn--loading' : ''}`}
          onClick={handleReset}
        >
          <Text className='reset__btn-text'>{loading ? '处理中...' : '确认重置'}</Text>
        </View>
      </View>
    </View>
  )
}