import { useState } from 'react'
import { View, Text, Input as TaroInput } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { authApi } from '@/services'
import { useUserStore } from '@/stores'
import { Icon } from '@/components/ui'
import './index.scss'

export default function Login() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const validate = () => {
    if (!phone.trim()) {
      Taro.showToast({ title: '请输入手机号', icon: 'none' })
      return false
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      Taro.showToast({ title: '手机号格式不正确', icon: 'none' })
      return false
    }
    if (!password) {
      Taro.showToast({ title: '请输入密码', icon: 'none' })
      return false
    }
    return true
  }

  const handleLogin = async () => {
    if (!agreed) {
      Taro.showToast({ title: '请先勾选同意《用户协议》和《隐私政策》', icon: 'none' })
      return
    }
    if (!validate() || loading) return

    setLoading(true)
    try {
      const res = await authApi.login({
        phone,
        password,
        loginType: 'password'
      })
      useUserStore.getState().setToken(res.accessToken, res.refreshToken)
      Taro.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => {
        Taro.reLaunch({ url: '/pages/home/index' })
      }, 800)
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '登录失败，请检查信息后重试',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleWechatLogin = () => {
    Taro.showToast({ title: '微信登录开发中', icon: 'none' })
  }

  return (
    <View className='login'>
      {/* Status Bar */}
      <View className='login__statusbar'>
        <Text className='login__statusbar-time'>9:41</Text>
        <View className='login__statusbar-icons'>
          <Text className='login__statusbar-signal'>◉◉◉◉</Text>
          <Text className='login__statusbar-battery'>100%</Text>
        </View>
      </View>

      {/* Login Content */}
      <View className='login__content'>
        {/* Title */}
        <Text className='login__title'>欢迎回来</Text>
        <Text className='login__subtitle'>登录后继续管理班级事务</Text>

        {/* Phone Input */}
        <View className='login__input-wrap login__input-wrap--phone'>
          <TaroInput
            className='login__input'
            type='number'
            value={phone}
            maxlength={11}
            placeholder='请输入手机号'
            placeholderClass='login__input-placeholder'
            onInput={(e) => setPhone(e.detail.value)}
          />
        </View>

        {/* Password Input */}
        <View className='login__input-wrap login__input-wrap--password'>
          <TaroInput
            className='login__input'
            password={!showPassword}
            value={password}
            placeholder='请输入密码'
            placeholderClass='login__input-placeholder'
            confirmType='done'
            onInput={(e) => setPassword(e.detail.value)}
            onConfirm={handleLogin}
          />
          <View
            className='login__eye'
            onClick={() => setShowPassword((v) => !v)}
          >
            <Icon name='eye' size={48} color='#4B5563' />
          </View>
        </View>

        {/* Login Button */}
        <View
          className={`login__btn ${loading ? 'login__btn--loading' : ''}`}
          onClick={handleLogin}
        >
          <Text className='login__btn-text'>{loading ? '登录中...' : '登录'}</Text>
        </View>

        {/* Auth Links */}
        <View className='login__links'>
          <View
            className='login__links-left'
            onClick={() => Taro.navigateTo({ url: '/pages/auth/register/index' })}
          >
            <Text className='login__link'>没有账号？</Text>
            <Text className='login__link login__link--primary'>去注册</Text>
          </View>
          <View
            className='login__links-right'
            onClick={() => Taro.navigateTo({ url: '/pages/auth/reset/index' })}
          >
            <Text className='login__forgot'>忘记密码</Text>
          </View>
        </View>

        {/* Or */}
        <Text className='login__or'>或使用以下方式登录</Text>

        {/* Social Login */}
        <View className='login__social'>
          <View className='login__social-item' onClick={handleWechatLogin}>
            <View className='login__social-icon'>
              <svg width='48' height='48' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'>
                <path
                  d='M8.691 2.188c-4.8 0-8.691 3.288-8.691 7.342 0 2.212 1.17 4.203 3.002 5.55a0.59 0.59 0 0 1 0.213 0.665l-0.39 1.48c-0.019 0.07-0.048 0.141-0.048 0.213 0 0.163 0.13 0.295 0.29 0.295a0.33 0.33 0 0 0 0.167-0.054l1.903-1.114a0.86 0.86 0 0 1 0.717-0.098 10.2 10.2 0 0 0 2.837 0.403c0.276 0 0.543-0.027 0.811-0.05-0.857-2.578 0.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-0.576-3.583-4.196-6.348-8.596-6.348m-2.906 3.803c0.642 0 1.162 0.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.179c0-0.651 0.52-1.18 1.162-1.18z m5.813 0c0.642 0 1.162 0.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-0.651 0.52-1.18 1.162-1.18m5.34 2.867c-1.797-0.052-3.746 0.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22 0.942 2.453 3.666 4.229 6.884 4.229 0.826 0 1.622-0.12 2.361-0.336a0.72 0.72 0 0 1 0.598 0.082l1.584 0.926a0.3 0.3 0 0 0 0.14 0.047c0.134 0 0.24-0.111 0.24-0.247 0-0.06-0.023-0.12-0.038-0.177l-0.327-1.233a0.6 0.6 0 0 1-0.023-0.156 0.49 0.49 0 0 1 0.201-0.398c1.526-1.121 2.502-2.781 2.502-4.621 0-3.21-2.931-5.837-6.656-6.088v-0.002c-0.135-0.01-0.27-0.027-0.407-0.03z m-2.53 3.274c0.535 0 0.969 0.44 0.969 0.982a0.976 0.976 0 0 1-0.969 0.983 0.976 0.976 0 0 1-0.969-0.983c0-0.542 0.434-0.982 0.97-0.982z m4.844 0c0.535 0 0.969 0.44 0.969 0.982a0.976 0.976 0 0 1-0.969 0.983 0.976 0.976 0 0 1-0.969-0.983c0-0.542 0.434-0.982 0.969-0.982'
                  fill='#07C160'
                />
              </svg>
            </View>
            <Text className='login__social-label'>微信</Text>
          </View>
        </View>

        {/* Agreement */}
        <View className='login__agreement'>
          <View
            className={`login__checkbox ${agreed ? 'login__checkbox--checked' : ''}`}
            onClick={() => setAgreed((v) => !v)}
          >
            {agreed && <Icon name='check' size={20} color='#FFFFFF' strokeWidth={3} />}
          </View>
          <Text className='login__agreement-text'>
            已阅读并同意
            <Text
              className='login__agreement-link'
              onClick={() => Taro.showToast({ title: '协议页面开发中', icon: 'none' })}
            >
              《用户协议》
            </Text>
            和
            <Text
              className='login__agreement-link'
              onClick={() => Taro.showToast({ title: '协议页面开发中', icon: 'none' })}
            >
              《隐私政策》
            </Text>
          </Text>
        </View>
      </View>
    </View>
  )
}