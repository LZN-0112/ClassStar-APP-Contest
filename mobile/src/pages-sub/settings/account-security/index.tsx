import { useEffect, useState } from 'react'
import { Input, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { BottomSheet, ConfirmDialog, SettingsHeader } from '@/components/business'
import { Icon } from '@/components/ui'
import { authApi } from '@/services'
import { useUserStore } from '@/stores'
import type { UserInfo } from '@/types/user'
import { useAuth } from '@/utils'
import './index.scss'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** 邮箱脱敏展示：ab***@qq.com */
function maskEmail(email: string): string {
  const at = email.indexOf('@')
  if (at <= 0) return email
  const name = email.slice(0, at)
  const domain = email.slice(at)
  return `${name.slice(0, 2)}***${domain}`
}

export default function AccountSecurity() {
  const { requireLogin } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [maskedPhone, setMaskedPhone] = useState('')
  const [hasWechat, setHasWechat] = useState(false)
  const [isWechatLoading, setIsWechatLoading] = useState(false)
  const [showUnbindWechatConfirm, setShowUnbindWechatConfirm] = useState(false)
  const [email, setEmail] = useState('')
  const [showEmailSheet, setShowEmailSheet] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [codeInput, setCodeInput] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [isBindingEmail, setIsBindingEmail] = useState(false)

  useLoad(() => {
    requireLogin()
    authApi
      .getUserInfo()
      .then((data: UserInfo) => {
        setMaskedPhone(data.phone || '')
        setEmail(data.email || '')
        setHasWechat(!!data.hasWechat)
      })
      .catch(() => setMaskedPhone(''))
  })

  // 获取验证码后的 60 秒倒计时
  useEffect(() => {
    if (countdown <= 0) return undefined
    const timer = setTimeout(() => setCountdown((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const handleWechatClick = async () => {
    if (isWechatLoading) return
    if (hasWechat) {
      setShowUnbindWechatConfirm(true)
      return
    }
    setIsWechatLoading(true)
    try {
      const { code } = await Taro.login()
      if (!code) throw new Error('获取微信授权失败')
      await authApi.bindWechat(code)
      setHasWechat(true)
      Taro.showToast({ title: '微信绑定成功', icon: 'success' })
    } catch (error) {
      Taro.showToast({
        title: error instanceof Error ? error.message : '微信绑定失败，请重试',
        icon: 'none'
      })
    } finally {
      setIsWechatLoading(false)
    }
  }

  const handleUnbindWechat = async () => {
    if (isWechatLoading) return
    setIsWechatLoading(true)
    try {
      await authApi.unbindWechat()
      setHasWechat(false)
      setShowUnbindWechatConfirm(false)
      Taro.showToast({ title: '已解除微信绑定', icon: 'success' })
    } catch (error) {
      Taro.showToast({
        title: error instanceof Error ? error.message : '解除绑定失败，请重试',
        icon: 'none'
      })
    } finally {
      setIsWechatLoading(false)
    }
  }

  const openEmailSheet = () => {
    setEmailInput(email)
    setCodeInput('')
    setShowEmailSheet(true)
  }

  const closeEmailSheet = () => {
    if (isBindingEmail) return
    setShowEmailSheet(false)
  }

  const handleSendEmailCode = async () => {
    if (isSendingCode || countdown > 0) return
    const target = emailInput.trim()
    if (!EMAIL_REGEX.test(target)) {
      Taro.showToast({ title: '请输入正确的邮箱', icon: 'none' })
      return
    }
    setIsSendingCode(true)
    try {
      const result = await authApi.sendEmailCode(target, 'bind_email')
      setCountdown(60)
      if (result.devCode) {
        setCodeInput(result.devCode)
        Taro.showToast({ title: '测试环境验证码已自动填入', icon: 'none' })
      } else {
        Taro.showToast({ title: '验证码已发送，请查收邮箱', icon: 'none' })
      }
    } catch {
      // request 层已统一提示后端错误信息
    } finally {
      setIsSendingCode(false)
    }
  }

  const handleBindEmail = async () => {
    if (isBindingEmail) return
    const target = emailInput.trim()
    if (!EMAIL_REGEX.test(target)) {
      Taro.showToast({ title: '请输入正确的邮箱', icon: 'none' })
      return
    }
    const code = codeInput.trim()
    if (!/^\d{6}$/.test(code)) {
      Taro.showToast({ title: '请输入 6 位邮箱验证码', icon: 'none' })
      return
    }
    setIsBindingEmail(true)
    try {
      const result = await authApi.bindEmail(target, code)
      const boundEmail = result.email || target
      setEmail(boundEmail)
      // 同步 store 中的用户信息，避免其他页面读到旧邮箱
      const storeUser = useUserStore.getState().userInfo
      if (storeUser) {
        useUserStore.getState().setUserInfo({ ...storeUser, email: boundEmail })
      }
      setShowEmailSheet(false)
      setCountdown(0)
      setCodeInput('')
      Taro.showToast({ title: '邮箱绑定成功', icon: 'success' })
    } catch {
      // request 层已统一提示后端错误信息
    } finally {
      setIsBindingEmail(false)
    }
  }

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await authApi.logout()
    } catch {
      // 即使接口失败也继续清理本地状态
    } finally {
      useUserStore.getState().logout()
      setIsLoggingOut(false)
      Taro.reLaunch({ url: '/pages/auth/login/index' })
    }
  }

  return (
    <View className='asec'>
      <SettingsHeader title='账号与安全' />

      <View className='asec__body'>
        {/* 账号绑定 */}
        <View className='asec__group'>
          <Text className='asec__group-title'>账号绑定</Text>
          <View className='asec__card'>
            <View
              className='asec__row'
              onClick={() => Taro.navigateTo({ url: '/pages-sub/settings/change-password/index' })}
            >
              <View className='asec__row-icon'>
                <Icon name='lock' size={48} color='#0062FF' strokeWidth={2} />
              </View>
              <Text className='asec__row-label'>修改密码</Text>
              <Icon name='chevron-right' size={48} color='#4B5563' strokeWidth={2} />
            </View>

            <View
              className='asec__row'
              onClick={() =>
                Taro.showToast({ title: '手机号暂不支持自行修改，如需更换请联系班主任', icon: 'none' })
              }
            >
              <View className='asec__row-icon'>
                <Icon name='device-mobile' size={48} color='#0062FF' strokeWidth={2} />
              </View>
              <Text className='asec__row-label'>绑定手机</Text>
              <View className='asec__row-right'>
                <Text className='asec__row-value'>{maskedPhone}</Text>
                <View className='asec__tag asec__tag--primary'>
                  <Text className='asec__tag-text'>已绑定</Text>
                </View>
                <Icon name='chevron-right' size={48} color='#4B5563' strokeWidth={2} />
              </View>
            </View>

            <View
              className={`asec__row ${isWechatLoading ? 'asec__row--disabled' : ''}`}
              onClick={handleWechatClick}
            >
              <View className='asec__row-icon'>
                <Icon name='wechat' size={48} fill='#07C160' />
              </View>
              <Text className='asec__row-label'>微信</Text>
              <View className='asec__row-right'>
                <View
                  className={`asec__tag ${hasWechat ? 'asec__tag--primary' : 'asec__tag--muted'}`}
                >
                  <Text
                    className={`asec__tag-text ${
                      hasWechat ? '' : 'asec__tag-text--muted'
                    }`}
                  >
                    {hasWechat ? '已绑定' : '未绑定'}
                  </Text>
                </View>
                <Text className='asec__row-action'>
                  {isWechatLoading ? '处理中...' : hasWechat ? '解除' : '去绑定'}
                </Text>
                <Icon name='chevron-right' size={48} color='#4B5563' strokeWidth={2} />
              </View>
            </View>

            <View className='asec__row' onClick={openEmailSheet}>
              <View className='asec__row-icon'>
                <Icon name='mail' size={48} color='#0062FF' strokeWidth={2} />
              </View>
              <View className='asec__row-text'>
                <Text className='asec__row-title'>绑定邮箱</Text>
                {email ? <Text className='asec__row-email'>{maskEmail(email)}</Text> : null}
              </View>
              <View className='asec__row-right'>
                <View
                  className={`asec__tag ${email ? 'asec__tag--primary' : 'asec__tag--muted'}`}
                >
                  <Text
                    className={`asec__tag-text ${email ? '' : 'asec__tag-text--muted'}`}
                  >
                    {email ? '已绑定' : '未绑定'}
                  </Text>
                </View>
                <Text className='asec__row-action'>{email ? '更换' : '去绑定'}</Text>
                <Icon name='chevron-right' size={48} color='#4B5563' strokeWidth={2} />
              </View>
            </View>
          </View>
        </View>

        {/* 账号操作 */}
        <View className='asec__group asec__group--auto'>
          <Text className='asec__group-title'>账号操作</Text>
          <View className='asec__card asec__card--danger'>
            <View
              className='asec__row'
              onClick={() => {
                if (!isLoggingOut) setShowLogoutConfirm(true)
              }}
            >
              <View className='asec__row-icon asec__row-icon--danger'>
                <Icon name='log-out' size={48} color='#DC2626' strokeWidth={2} />
              </View>
              <Text className='asec__row-label asec__row-label--danger'>
                {isLoggingOut ? '退出中...' : '退出登录'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ConfirmDialog
        open={showLogoutConfirm}
        title='退出登录'
        description='退出后需要重新登录才能查看班级消息、考勤与作业，确定要退出吗？'
        confirmText='确认退出'
        danger
        loading={isLoggingOut}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
      />
      <ConfirmDialog
        open={showUnbindWechatConfirm}
        title='解除微信绑定'
        description='解除后将无法使用微信一键登录，仍可用手机号和密码登录，确定要解除吗？'
        confirmText='确认解除'
        danger
        loading={isWechatLoading}
        onCancel={() => setShowUnbindWechatConfirm(false)}
        onConfirm={handleUnbindWechat}
      />

      <BottomSheet
        open={showEmailSheet}
        title={email ? '更换邮箱' : '绑定邮箱'}
        onClose={closeEmailSheet}
        footer={
          <View
            className={`asec__submit ${isBindingEmail ? 'asec__submit--disabled' : ''}`}
            onClick={handleBindEmail}
          >
            <Text className='asec__submit-text'>
              {isBindingEmail ? '提交中...' : email ? '确认更换' : '确认绑定'}
            </Text>
          </View>
        }
      >
        <View className='asec__sheet'>
          <View className='asec__sheet-tip'>
            <Text className='asec__sheet-tip-text'>
              邮箱可用于接收验证码与重要通知，请填写常用邮箱并完成验证码校验。
            </Text>
          </View>

          <View className='asec__field'>
            <Text className='asec__field-label'>邮箱地址</Text>
            <View className='asec__input-box'>
              <Input
                className='asec__input'
                type='text'
                value={emailInput}
                onInput={(e) => setEmailInput(e.detail.value)}
                placeholder='请输入邮箱地址'
                placeholderClass='asec__placeholder'
              />
            </View>
          </View>

          <View className='asec__field'>
            <Text className='asec__field-label'>邮箱验证码</Text>
            <View className='asec__input-box'>
              <Input
                className='asec__input'
                type='number'
                maxlength={6}
                value={codeInput}
                onInput={(e) => setCodeInput(e.detail.value.replace(/\D/g, '').slice(0, 6))}
                placeholder='6 位验证码'
                placeholderClass='asec__placeholder'
              />
              <View
                className={`asec__code-btn ${
                  isSendingCode || countdown > 0 ? 'asec__code-btn--disabled' : ''
                }`}
                onClick={handleSendEmailCode}
              >
                <Text className='asec__code-btn-text'>
                  {isSendingCode
                    ? '发送中...'
                    : countdown > 0
                      ? `${countdown}s 后重发`
                      : '获取验证码'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </BottomSheet>
    </View>
  )
}