// ============================================================
// 微信绑定手机号
// 1:1 对齐 front/src/pages/auth/WechatBind.tsx
// 已有账号填手机号+原密码；新用户补充真实姓名并设置密码
// ============================================================
import { useState } from 'react'
import { View, Text, Input as TaroInput } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { StatusBar } from '@/components/business'
import { Icon } from '@/components/ui'
import { bindWechatPhone, getUserInfo } from '@/services/auth'
import { getMyClasses } from '@/services/classes'
import { useUserStore } from '@/stores'
import './index.scss'

const PHONE_REGEX = /^1[3-9]\d{9}$/
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,20}$/
const TICKET_KEY = 'wechatBindTicket'

export default function WechatBind() {
  const [bindTicket, setBindTicket] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  useLoad(() => {
    const ticket = Taro.getStorageSync(TICKET_KEY) || ''
    setBindTicket(ticket)
    if (!ticket) {
      Taro.showToast({ title: '微信绑定已失效，请重新发起微信登录', icon: 'none' })
      setTimeout(() => {
        Taro.reLaunch({ url: '/pages/auth/login/index' })
      }, 800)
    }
  })

  const handleSubmit = async () => {
    if (loading || !bindTicket) return

    const trimmedPhone = phone.trim()
    const trimmedName = name.trim()
    const trimmedNickname = nickname.trim()

    if (!PHONE_REGEX.test(trimmedPhone)) {
      Taro.showToast({ title: '请输入正确的 11 位手机号', icon: 'none' })
      return
    }
    if (!password) {
      Taro.showToast({ title: '请输入密码', icon: 'none' })
      return
    }
    if (trimmedName) {
      if (trimmedName.length < 2) {
        Taro.showToast({ title: '真实姓名至少 2 个字', icon: 'none' })
        return
      }
      if (!PASSWORD_REGEX.test(password)) {
        Taro.showToast({ title: '设置的密码需 8-20 位且同时包含字母和数字', icon: 'none' })
        return
      }
      if (password !== confirmPassword) {
        Taro.showToast({ title: '两次输入的密码不一致', icon: 'none' })
        return
      }
    }

    setLoading(true)
    try {
      const data = await bindWechatPhone({
        bindTicket,
        phone: trimmedPhone,
        password,
        confirmPassword: confirmPassword || undefined,
        name: trimmedName || undefined,
        nickname: trimmedNickname || undefined
      })
      useUserStore.getState().setToken(data.accessToken, data.refreshToken)
      Taro.removeStorageSync(TICKET_KEY)
      Taro.showToast({
        title: data.isNewUser ? '注册成功，微信已绑定' : '微信绑定成功',
        icon: 'none'
      })

      // 登录后立即拉取用户信息，避免新账号显示“同学/未加入班级”
      try {
        const info = await getUserInfo()
        useUserStore.getState().setUserInfo(info)
        if (info?.classId && !useUserStore.getState().currentClassId) {
          useUserStore.getState().setCurrentClass(info.classId)
        }
      } catch {
        // 用户信息拉取失败不阻断登录流程
      }

      let nextPath = '/pages/home/index'
      try {
        const orgs = await getMyClasses()
        if (!Array.isArray(orgs) || orgs.length === 0) nextPath = '/pages/auth/join-class/index'
      } catch {
        // 班级列表获取失败时不阻断登录，首页会展示空班级引导
      }

      setTimeout(() => {
        Taro.reLaunch({ url: nextPath })
      }, 800)
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '绑定失败，请稍后重试',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='wechat-bind'>
      <StatusBar />

      <View className='wechat-bind__header'>
        <View
          className='wechat-bind__back'
          onClick={() => Taro.reLaunch({ url: '/pages/auth/login/index' })}
        >
          <Icon name='chevron-left' size={40} color='#1A1A1A' strokeWidth={2} />
        </View>
        <Text className='wechat-bind__title'>绑定手机号</Text>
      </View>

      <View className='wechat-bind__body'>
        <View className='wechat-bind__notice'>
          <Text className='wechat-bind__notice-title'>微信账号尚未绑定班务星账号</Text>
          <Text className='wechat-bind__notice-text'>
            已注册用户请填写手机号和原登录密码完成绑定；首次使用请补充真实姓名并设置登录密码。
          </Text>
        </View>

        <View className='wechat-bind__form'>
          <View className='wechat-bind__field'>
            <Text className='wechat-bind__label'>手机号</Text>
            <TaroInput
              className='wechat-bind__input'
              type='number'
              value={phone}
              maxlength={11}
              placeholder='请输入手机号'
              placeholderClass='wechat-bind__placeholder'
              onInput={(e) => setPhone(e.detail.value)}
            />
          </View>

          <View className='wechat-bind__field'>
            <Text className='wechat-bind__label'>密码</Text>
            <View className='wechat-bind__input-wrap'>
              <TaroInput
                className='wechat-bind__input wechat-bind__input--inner'
                password={!showPassword}
                value={password}
                placeholder='已有账号填写原密码，新用户设置密码'
                placeholderClass='wechat-bind__placeholder'
                onInput={(e) => setPassword(e.detail.value)}
              />
              <Text
                className='wechat-bind__toggle'
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? '隐藏' : '显示'}
              </Text>
            </View>
          </View>

          <View className='wechat-bind__field'>
            <Text className='wechat-bind__label'>确认密码</Text>
            <TaroInput
              className='wechat-bind__input'
              password
              value={confirmPassword}
              placeholder='新用户再次输入密码，已有账号可留空'
              placeholderClass='wechat-bind__placeholder'
              onInput={(e) => setConfirmPassword(e.detail.value)}
            />
          </View>

          <View className='wechat-bind__field'>
            <Text className='wechat-bind__label'>真实姓名</Text>
            <TaroInput
              className='wechat-bind__input'
              value={name}
              maxlength={50}
              placeholder='已有账号可留空，新用户必填'
              placeholderClass='wechat-bind__placeholder'
              onInput={(e) => setName(e.detail.value)}
            />
          </View>

          <View className='wechat-bind__field'>
            <Text className='wechat-bind__label'>昵称（选填）</Text>
            <TaroInput
              className='wechat-bind__input'
              value={nickname}
              maxlength={30}
              placeholder='班级内展示的昵称'
              placeholderClass='wechat-bind__placeholder'
              confirmType='done'
              onInput={(e) => setNickname(e.detail.value)}
              onConfirm={handleSubmit}
            />
          </View>
        </View>

        <View
          className={`wechat-bind__submit ${loading ? 'wechat-bind__submit--disabled' : ''}`}
          onClick={handleSubmit}
        >
          <Text className='wechat-bind__submit-text'>
            {loading ? '绑定中...' : '完成绑定并登录'}
          </Text>
        </View>
      </View>
    </View>
  )
}