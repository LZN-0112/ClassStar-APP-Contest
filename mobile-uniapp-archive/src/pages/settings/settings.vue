<script setup lang="ts">
import StatusBar from '@/components/StatusBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import { clearTokens } from '@/common/api/request'
import { secureStorage } from '@/common/storage/secure'

interface SettingGroup {
  title: string
  items: SettingItem[]
}

interface SettingItem {
  label: string
  icon: string
  iconColor: string
  boxColor: string
  path: string
}

const settingGroups: SettingGroup[] = [
  {
    title: '账号与安全',
    items: [
      { label: '账号与安全', icon: 'lucide:shield', iconColor: '#076CAB', boxColor: '#E0F2FE', path: '/pages/settings/account-security' },
      { label: '隐私设置', icon: 'lucide:lock', iconColor: '#076CAB', boxColor: '#E0F2FE', path: '/pages/settings/privacy-settings' },
    ],
  },
  {
    title: '通知设置',
    items: [
      { label: '消息通知设置', icon: 'lucide:bell', iconColor: '#1986E6', boxColor: '#E0F2FE', path: '/pages/settings/notification-settings' },
      { label: '再次提醒设置', icon: 'lucide:clock', iconColor: '#1986E6', boxColor: '#E0F2FE', path: '/pages/notice/reminder' },
    ],
  },
  {
    title: '通用设置',
    items: [
      { label: '通用设置', icon: 'lucide:settings', iconColor: '#64748B', boxColor: '#F1F5F9', path: '/pages/settings/general-settings' },
      { label: '关于', icon: 'lucide:info', iconColor: '#64748B', boxColor: '#F1F5F9', path: '/pages/settings/about' },
    ],
  },
  {
    title: '帮助反馈',
    items: [
      { label: '帮助与反馈', icon: 'lucide:help-circle', iconColor: '#D97706', boxColor: '#FEF3C7', path: '/pages/settings/help-feedback' },
    ],
  },
]

function handleBack() {
  uni.navigateBack({ delta: 1 })
}

function goPage(url: string) {
  uni.navigateTo({ url })
}

function handleLogout() {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        clearTokens()
        secureStorage.clear()
        uni.reLaunch({ url: '/pages/auth/login' })
      }
    },
  })
}
</script>

<template>
  <view class="page">
    <view class="header">
      <StatusBar dark />
      <view class="nav-bar">
        <view class="back-btn" @click="handleBack">
          <AppIcon icon="lucide:chevron-left" size="48rpx" color="#FFFFFF" />
        </view>
      </view>
      <view class="header-title-row">
        <text class="header-title">设置</text>
        <view class="header-deco">
          <AppIcon icon="lucide:settings" size="112rpx" color="#FFFFFF" />
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="content">
      <view class="body">
        <view
          v-for="group in settingGroups"
          :key="group.title"
          class="group"
        >
          <text class="group-title">{{ group.title }}</text>
          <view class="group-content">
            <view
              v-for="item in group.items"
              :key="item.label"
              class="list-item"
              @click="goPage(item.path)"
            >
              <view class="icon-box" :style="{ backgroundColor: item.boxColor }">
                <AppIcon :icon="item.icon" size="44rpx" :color="item.iconColor" />
              </view>
              <text class="item-label">{{ item.label }}</text>
              <view class="spacer" />
              <AppIcon icon="lucide:chevron-right" size="40rpx" color="#9CA3AF" />
            </view>
          </view>
        </view>

        <view class="group">
          <text class="group-title">账号操作</text>
          <view class="logout-card" @click="handleLogout">
            <view class="logout-row">
              <view class="logout-icon-box">
                <AppIcon icon="lucide:log-out" size="44rpx" color="#DC2626" />
              </view>
              <text class="logout-text">退出登录</text>
              <view class="spacer" />
            </view>
          </view>
        </view>
      </view>
      <view class="bottom-safe" />
    </scroll-view>
  </view>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  background-color: #ffffff;
}

.header {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 480rpx;
  background: linear-gradient(180deg, #076CAB 0%, #32C9FD 55%, #DEFCFF 100%);
  border-radius: 0 0 48rpx 48rpx;
  padding: 0 32rpx;
  box-sizing: border-box;
}

.nav-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  margin-top: 80rpx;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80rpx;
  height: 80rpx;
  margin-left: -16rpx;
}

.header-title-row {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-top: 24rpx;
  flex: 1;
}

.header-title {
  font-size: 64rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.header-deco {
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.12;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.body {
  display: flex;
  flex-direction: column;
  gap: 40rpx;
  padding: 32rpx 40rpx 40rpx;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.group-title {
  font-size: 24rpx;
  font-weight: 600;
  color: #6B7280;
}

.group-content {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.list-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 128rpx;
  padding: 0 32rpx;
  background-color: #FFFFFF;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
}

.icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80rpx;
  height: 80rpx;
  border-radius: 16rpx;
  margin-right: 24rpx;
}

.item-label {
  font-size: 28rpx;
  font-weight: 600;
  color: #1A1A1A;
}

.spacer {
  flex: 1;
}

.logout-card {
  display: flex;
  flex-direction: column;
  padding: 8rpx;
  background-color: #FEF2F2;
  border: 1rpx solid #FECACA;
  border-radius: 24rpx;
}

.logout-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 112rpx;
  padding: 0 24rpx;
  gap: 12rpx;
}

.logout-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
  background-color: #FEE2E2;
}

.logout-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #991B1B;
}

.bottom-safe {
  height: 48rpx;
}
</style>
