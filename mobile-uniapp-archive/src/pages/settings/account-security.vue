<template>
  <view class="page">
    <view class="status-bar">
      <text class="status-time">9:41</text>
      <view class="status-icons">
        <text class="status-signal">◉◉◉◉</text>
        <text class="status-battery">100%</text>
      </view>
    </view>
    <view class="back-button" @click="handleBack">
      <text class="back-icon">‹</text>
    </view>

    <scroll-view scroll-y class="content">
      <view class="spacer-60"></view>
      <text class="title">账号与安全</text>
      <text class="subtitle">管理密码、绑定等安全设置</text>
      <view class="spacer-40"></view>

      <view class="card" @click="changePassword">
        <text class="card-label">修改密码</text>
        <view class="spacer" />
        <text class="card-arrow">›</text>
      </view>
      <view class="card" @click="bindPhone">
        <text class="card-label">绑定手机号</text>
        <view class="spacer" />
        <text class="card-value">{{ phone }}</text>
        <text class="card-arrow">›</text>
      </view>
      <view class="card" @click="deleteAccount">
        <text class="card-label">注销账号</text>
        <view class="spacer" />
        <text class="card-arrow">›</text>
      </view>

      <view class="bottom-safe" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getProfile } from '@/common/api/settings'
import { secureStorage } from '@/common/storage/secure'

const phone = ref('')

async function loadProfile() {
  try {
    const userInfo = secureStorage.get<any>('userInfo')
    if (userInfo?.phone) {
      phone.value = maskPhone(userInfo.phone)
      return
    }
    const data = await getProfile()
    phone.value = maskPhone(data.phone)
  } catch (err) {
    // ignore
  }
}

function maskPhone(p: string): string {
  return p.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

function changePassword() {
  uni.navigateTo({ url: '/pages/auth/reset-password' })
}

function bindPhone() {
  uni.showToast({ title: '手机号绑定功能开发中', icon: 'none' })
}

function deleteAccount() {
  uni.showModal({
    title: '注销账号',
    content: '注销后数据无法恢复，确定继续吗？',
    confirmColor: '#DC2626',
    success: (res) => {
      if (res.confirm) {
        uni.showToast({ title: '请联系客服注销', icon: 'none' })
      }
    },
  })
}

function handleBack() {
  uni.navigateBack({ delta: 1 })
}

onMounted(() => {
  loadProfile()
})
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  background-color: #FFFFFF;
}

.status-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 62px;
  padding: 12px 24px 0;
  box-sizing: border-box;
  background-color: #FFFFFF;
}

.status-time {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}

.status-icons {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
}

.status-signal,
.status-battery {
  font-size: 14px;
  color: #1A1A1A;
}

.back-button {
  position: absolute;
  left: 16px;
  top: 74px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.back-icon {
  font-size: 32px;
  color: #1A1A1A;
  line-height: 1;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 24px;
  box-sizing: border-box;
}

.spacer-60 {
  width: 100%;
  height: 60px;
  flex-shrink: 0;
}

.spacer-40 {
  width: 100%;
  height: 40px;
  flex-shrink: 0;
}

.title {
  display: block;
  font-size: 28px;
  font-weight: bold;
  color: #1A1A1A;
  margin-bottom: 8px;
}

.subtitle {
  display: block;
  font-size: 14px;
  color: #4B5563;
}

.card {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  height: 80px;
  padding: 0 16px;
  margin-bottom: 12px;
  box-sizing: border-box;
  background-color: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.card-label {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}

.spacer {
  flex: 1;
}

.card-value {
  font-size: 14px;
  color: #6B7280;
  margin-right: 8px;
}

.card-arrow {
  font-size: 24px;
  color: #4B5563;
}

.bottom-safe {
  height: 24px;
  flex-shrink: 0;
}
</style>
