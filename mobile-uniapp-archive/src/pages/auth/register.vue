<script setup lang="ts">
import { ref } from 'vue'
import StatusBar from '@/components/StatusBar.vue'
import BackButton from '@/components/BackButton.vue'
import AppInput from '@/components/AppInput.vue'
import AppButton from '@/components/AppButton.vue'
import { validatePhone, validatePassword, validateConfirmPassword } from '@/common/utils/validate'
import { register } from '@/common/api/auth'

const phone = ref('')
const studentId = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)

function handleBack() {
  uni.navigateBack({ delta: 1 })
}

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
  const confirmRes = validateConfirmPassword(password.value, confirmPassword.value)
  if (!confirmRes.valid) {
    uni.showToast({ title: confirmRes.message, icon: 'none' })
    return false
  }
  return true
}

async function handleRegister() {
  if (!validate() || loading.value) return
  loading.value = true
  try {
    await register({
      phone: phone.value,
      name: phone.value,
      password: password.value,
      confirmPassword: confirmPassword.value,
    })
    uni.showToast({ title: '注册成功，请登录', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack({ delta: 1 })
    }, 800)
  } catch (err) {
    const message = err instanceof Error ? err.message : '注册失败，请检查信息后重试'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    loading.value = false
  }
}

function goLogin() {
  uni.navigateBack({ delta: 1 })
}
</script>

<template>
  <view class="page">
    <StatusBar />
    <BackButton @click="handleBack" />
    <view class="content">
      <view class="header">
        <text class="title">注册账号</text>
        <text class="subtitle">创建账号后继续管理班级事务</text>
      </view>

      <view class="form">
        <AppInput
          v-model="phone"
          type="tel"
          placeholder="请输入手机号"
          :maxlength="11"
        />
        <AppInput
          v-model="studentId"
          type="text"
          placeholder="请输入学号（选填）"
          :maxlength="30"
        />
        <AppInput
          v-model="password"
          type="password"
          placeholder="请输入密码"
          password
        />
        <AppInput
          v-model="confirmPassword"
          type="password"
          placeholder="请再次输入密码"
          password
          @confirm="handleRegister"
        />
        <AppButton
          :loading="loading"
          @click="handleRegister"
        >
          注册
        </AppButton>
      </view>

      <view class="link-row">
        <text class="link-text">已有账号？</text>
        <text
          class="link-primary"
          @click="goLogin"
        >登录</text>
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
  margin-top: 40rpx;
  margin-bottom: 80rpx;
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

.link-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  margin-top: 32rpx;
}

.link-text {
  font-size: var(--text-size-caption);
  color: var(--text-secondary);
}

.link-primary {
  font-size: var(--text-size-caption);
  color: var(--accent);
}

.agreement {
  display: flex;
  justify-content: center;
  margin-top: auto;
  margin-bottom: 48rpx;
}

.agreement text {
  font-size: var(--text-size-caption);
  color: var(--text-muted);
}
</style>
