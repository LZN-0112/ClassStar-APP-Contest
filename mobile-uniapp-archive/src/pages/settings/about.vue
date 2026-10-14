<template>
  <view class="page">
    <view class="header">
      <StatusBar dark />
      <view class="nav-bar">
        <BackButton dark @click="handleBack" />
      </view>
      <view class="header-title-row">
        <text class="header-title">关于</text>
        <text class="header-icon">ⓘ</text>
      </view>
    </view>

    <scroll-view scroll-y class="content">
      <view class="body">
        <view class="app-info">
          <view class="logo">
            <text class="logo-text">班</text>
          </view>
          <text class="app-name">校园班级事务智能管理助手</text>
          <text class="app-version">v{{ version }}</text>
        </view>

        <view class="group">
          <view
            v-for="item in menuItems"
            :key="item.label"
            class="list-item"
            @click="handleItem(item)"
          >
            <view class="icon-box" :style="{ backgroundColor: item.bg }">
              <text class="icon-text" :style="{ color: item.color }">{{ item.icon }}</text>
            </view>
            <text class="item-label">{{ item.label }}</text>
            <view class="spacer" />
            <text v-if="item.extra" class="item-extra">{{ item.extra }}</text>
            <text class="item-arrow">›</text>
          </view>
        </view>

        <view class="footer">
          <text class="copyright">© 2025 校园班级事务智能管理助手</text>
          <text class="slogan">去群聊化 · 按事务聚合 · 数据闭环</text>
        </view>

        <view class="bottom-safe" />
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import StatusBar from '@/components/StatusBar.vue'
import BackButton from '@/components/BackButton.vue'

const version = ref('1.0.0')

const menuItems = [
  { label: '用户协议', icon: '📄', bg: '#F3F4F6', color: '#4B5563', action: 'agreement' },
  { label: '隐私政策', icon: '🔒', bg: '#F3F4F6', color: '#4B5563', action: 'privacy' },
  { label: '版本更新', icon: '↻', bg: '#F3F4F6', color: '#4B5563', action: 'update', extra: '已是最新' },
  { label: '给我们评分', icon: '★', bg: '#FEF3C7', color: '#D97706', action: 'rate' },
]

function handleBack() {
  uni.navigateBack({ delta: 1 })
}

function handleItem(item: typeof menuItems[0]) {
  if (item.action === 'update') {
    uni.showToast({ title: '已是最新版本', icon: 'success' })
    return
  }
  if (item.action === 'rate') {
    uni.showToast({ title: '感谢您的支持', icon: 'none' })
    return
  }
  if (item.action === 'agreement' || item.action === 'privacy') {
    uni.showToast({ title: `${item.label} 页面暂未开放`, icon: 'none' })
    return
  }
  uni.showToast({ title: `${item.label} 功能暂未开放`, icon: 'none' })
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  background-color: #FFFFFF;
}

.header {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 540rpx;
  background: linear-gradient(180deg, #004ECC 0%, #4B83FF 55%, #DEFCFF 100%);
  border-radius: 0 0 48rpx 48rpx;
  padding: 0 48rpx;
  box-sizing: border-box;
}

.nav-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  margin-top: 16rpx;
}

.header-title-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-top: 40rpx;
}

.header-title {
  font-size: 56rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.header-icon {
  font-size: 112rpx;
  color: rgba(255, 255, 255, 0.2);
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
  padding: 48rpx 40rpx 0;
}

.app-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 160rpx;
  height: 160rpx;
  border-radius: 32rpx;
  background: linear-gradient(135deg, #0062FF 0%, #3B82F6 100%);
  box-shadow: 0 8rpx 32rpx rgba(0, 98, 255, 0.2);
}

.logo-text {
  font-size: 80rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.app-name {
  font-size: 32rpx;
  font-weight: 700;
  color: #1A1A1A;
}

.app-version {
  font-size: 26rpx;
  color: #6B7280;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 16rpx;
  background-color: #FFFFFF;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
}

.list-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 112rpx;
  padding: 0 16rpx;
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

.icon-text {
  font-size: 36rpx;
}

.item-label {
  font-size: 30rpx;
  font-weight: 600;
  color: #1A1A1A;
}

.spacer {
  flex: 1;
}

.item-extra {
  font-size: 26rpx;
  color: #6B7280;
  margin-right: 12rpx;
}

.item-arrow {
  font-size: 40rpx;
  color: #9CA3AF;
}

.footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  margin-top: 48rpx;
}

.copyright {
  font-size: 24rpx;
  color: #9CA3AF;
}

.slogan {
  font-size: 24rpx;
  color: #9CA3AF;
}

.bottom-safe {
  height: 48rpx;
}
</style>
