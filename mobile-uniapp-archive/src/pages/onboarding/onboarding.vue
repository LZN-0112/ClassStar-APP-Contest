<template>
  <view class="page">
    <StatusBar />

    <view class="content">
      <view class="brand">
        <view class="logo" />
        <text class="title">校园班级事务智能管理助手</text>
        <text class="subtitle">去群聊化 · 按事务聚合 · 数据闭环</text>
      </view>

      <view class="features">
        <view v-for="item in features" :key="item.title" class="feature-item">
          <view class="feature-dot" />
          <view class="feature-text">
            <text class="feature-title">{{ item.title }}</text>
            <text class="feature-desc">{{ item.desc }}</text>
          </view>
        </view>
      </view>

      <view class="spacer" />

      <view class="start-btn" @click="enterApp">
        <text class="start-text">开始体验</text>
      </view>

      <view class="bottom-safe" />
    </view>
  </view>
</template>

<script setup lang="ts">
import StatusBar from '@/components/StatusBar.vue'

const features = [
  { title: '通知公告', desc: '重要消息一键发布，全员触达' },
  { title: '考勤签到', desc: '多方式签到，自动统计汇总' },
  { title: '作业收发', desc: '作业发布、提交、批改全闭环' },
  { title: '班费管理', desc: '收支透明，账目清晰可查' },
]

function enterApp() {
  uni.reLaunch({ url: '/pages/auth/login' })
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

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 48rpx;
}

.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 160rpx;
  margin-bottom: 80rpx;
}

.logo {
  width: 240rpx;
  height: 240rpx;
  border-radius: 48rpx;
  background: linear-gradient(135deg, #0062FF 0%, #3B82F6 100%);
  box-shadow: 0 16rpx 64rpx rgba(0, 98, 255, 0.2);
  margin-bottom: 48rpx;
}

.title {
  font-size: 40rpx;
  font-weight: 700;
  color: #1A1A1A;
  text-align: center;
  margin-bottom: 16rpx;
}

.subtitle {
  font-size: 28rpx;
  color: #4B5563;
  text-align: center;
}

.features {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.feature-item {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 20rpx;
}

.feature-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background-color: #0062FF;
  margin-top: 12rpx;
  flex-shrink: 0;
}

.feature-text {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.feature-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1A1A1A;
}

.feature-desc {
  font-size: 26rpx;
  color: #6B7280;
}

.spacer {
  flex: 1;
}

.start-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 104rpx;
  background: linear-gradient(180deg, #0062FF 0%, #3B82F6 100%);
  border-radius: 16rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 98, 255, 0.2);
  margin-bottom: 48rpx;
}

.start-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.bottom-safe {
  height: 48rpx;
}
</style>
