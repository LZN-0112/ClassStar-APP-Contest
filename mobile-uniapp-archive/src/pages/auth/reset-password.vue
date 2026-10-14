<script setup lang="ts">
import { ref } from 'vue'
import StatusBar from '@/components/StatusBar.vue'
import BackButton from '@/components/BackButton.vue'
import AppInput from '@/components/AppInput.vue'
import AppButton from '@/components/AppButton.vue'
import { validatePhone, validatePassword, validateConfirmPassword } from '@/common/utils/validate'
import { resetPassword } from '@/common/api/auth'

const phone = ref('')
const oldPassword = ref('')
const newPassword = ref('')
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
  if (!oldPassword.value) {
    uni.showToast({ title: '请输入旧密码', icon: 'none' })
    return false
  }
  const pwdRes = validatePassword(newPassword.value)
  if (!pwdRes.valid) {
    uni.showToast({ title: pwdRes.message, icon: 'none' })
    return false
  }
  const confirmRes = validateConfirmPassword(newPassword.value, confirmPassword.value)
  if (!confirmRes.valid) {
    uni.showToast({ title: confirmRes.message, icon: 'none' })
    return false
  }
  return true
}

async function handleReset() {
  if (!validate() || loading.value) return
  loading.value = true
  try {
    await resetPassword({
      phone: phone.value,
      oldPassword: oldPassword.value,
      newPassword: newPassword.value,
      confirmPassword: confirmPassword.value,
    })
    uni.showToast({ title: '密码重置成功，请重新登录', icon: 'success' })
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/auth/login' })
    }, 800)
  } catch (err) {
    const message = err instanceof Error ? err.message : '重置失败，请检查信息后重试'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <view class="page">
    <StatusBar />
    <BackButton @click="handleBack" />
    <view class="content">
      <view class="header">
        <text class="title">重置密码</text>
        <text class="subtitle">验证手机号后设置新密码</text>
      </view>

      <view class="form">
        <AppInput
          v-model="phone"
          type="tel"
          placeholder="请输入手机号"
          :maxlength="11"
        />
        <AppInput
          v-model="oldPassword"
          type="password"
          placeholder="请输入旧密码"
          password
        />
        <AppInput
          v-model="newPassword"
          type="password"
          placeholder="请输入新密码"
          password
        />
        <AppInput
          v-model="confirmPassword"
          type="password"
          placeholder="请确认新密码"
          password
          @confirm="handleReset"
        />
        <AppButton
          :loading="loading"
          @click="handleReset"
        >
          确认重置
        </AppButton>
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
</style>
