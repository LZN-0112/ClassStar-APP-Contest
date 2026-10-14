<script setup lang="ts">
import { ref } from 'vue'
import StatusBar from '@/components/StatusBar.vue'
import AppInput from '@/components/AppInput.vue'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/AppIcon.vue'
import { validatePhone, validatePassword } from '@/common/utils/validate'
import { login } from '@/common/api/auth'
import { setTokens } from '@/common/api/request'
import { secureStorage } from '@/common/storage/secure'

const phone = ref('')
const password = ref('')
const loading = ref(false)

function validate(): boolean {
  const phoneRes = validatePhone(phone.value)
  if (!phoneRes.valid) {
    uni.showToast({ title: phoneRes.message, icon: 'none' })
    return false
  }
  const pwdRes = validatePassword(password.value)
  if (!pwdRes.valid) {
    uni.showToast({ title: pwdRes.message, icon: 'none' })
    return false
  }
  return true
}

async function handleLogin() {
  if (loading.value) return
  if (!validate()) return

  loading.value = true
  try {
    const res = await login({
      phone: phone.value,
      password: password.value,
      loginType: 'password',
    })
    setTokens(res.accessToken, res.refreshToken)
    secureStorage.set('userInfo', res.user)
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => {
      const classId = secureStorage.get<string>('currentClassId')
      if (classId) {
        uni.redirectTo({ url: '/pages/home/index' })
      } else {
        uni.redirectTo({ url: '/pages/auth/identity-select' })
      }
    }, 800)
  } catch (err) {
    const message = err instanceof Error ? err.message : '登录失败，请检查信息后重试'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    loading.value = false
  }
}

function goRegister() {
  uni.navigateTo({ url: '/pages/auth/register' })
}

function goReset() {
  uni.navigateTo({ url: '/pages/auth/reset-password' })
}

function wechatLogin() {
  uni.showToast({ title: '微信登录暂未开放', icon: 'none' })
}
</script>

<template>
  <view class="page">
    <StatusBar />
    <view class="content">
      <view class="header">
        <text class="title">欢迎回来</text>
        <text class="subtitle">登录后继续管理班级事务</text>
      </view>

      <view class="form">
        <AppInput
          v-model="phone"
          type="tel"
          placeholder="请输入手机号"
          :maxlength="11"
        />
        <view class="password-row">
          <AppInput
            v-model="password"
            class="password-input"
            type="password"
            placeholder="请输入密码"
            password
            @confirm="handleLogin"
          />
        </view>
        <AppButton
          :loading="loading"
          @click="handleLogin"
        >
          登录 / 注册
        </AppButton>
      </view>

      <view class="link-row">
        <text
          class="link-text"
          @click="goReset"
        >忘记密码</text>
        <text class="link-divider">|</text>
        <text
          class="link-text"
          @click="goRegister"
        >注册账号</text>
      </view>

      <view class="divider">
        <text class="divider-text">或使用以下方式登录</text>
      </view>

      <view class="social">
        <view
          class="social-item"
          @click="wechatLogin"
        >
          <view class="social-icon">
            <AppIcon
              icon="mdi:wechat"
              size="48rpx"
              color="#07C160"
            />
          </view>
          <text class="social-label">微信</text>
        </view>
      </view>

      <view class="agreement">
        <text>登录即表示同意《用户协议》和《隐私政策》</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100vh;
  background-color: var(--bg);
}

.content {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 0 48rpx;
  box-sizing: border-box;
}

.header {
  margin-top: 160rpx;
  margin-bottom: 64rpx;
}

.title {
  display: block;
  font-family: var(--font-heading);
  font-size: var(--text-size-hero);
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
  margin-bottom: 16rpx;
}

.subtitle {
  display: block;
  font-size: var(--text-size-body);
  color: var(--text-secondary);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.password-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 24rpx;
}

.password-input {
  flex: 1;
}

.link-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  gap: 16rpx;
  margin-top: 24rpx;
}

.link-text {
  font-size: var(--text-size-caption);
  color: var(--text-secondary);
}

.link-divider {
  font-size: var(--text-size-caption);
  color: var(--border);
}

.divider {
  display: flex;
  justify-content: center;
  margin-top: 80rpx;
}

.divider-text {
  font-size: var(--text-size-body);
  color: var(--text-muted);
}

.social {
  display: flex;
  flex-direction: row;
  justify-content: center;
  margin-top: 32rpx;
}

.social-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.social-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 112rpx;
  height: 112rpx;
  border-radius: var(--rounded-full);
  background-color: var(--surface);
  box-shadow: var(--shadow-soft);
}

.social-label {
  font-size: var(--text-size-caption);
  color: var(--text-secondary);
}

.agreement {
  display: flex;
  justify-content: center;
  margin-top: auto;
  margin-bottom: 48rpx;
  padding-top: 32rpx;
}

.agreement text {
  font-size: var(--text-size-caption);
  color: var(--text-muted);
}
</style>
