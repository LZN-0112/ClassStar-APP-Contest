<script setup lang="ts">
import StatusBar from '@/components/StatusBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import BackButton from '@/components/BackButton.vue'
</script>

<template>
  <view class="page">
    <StatusBar dark />

    <view class="header">
      <BackButton class="back" />
      <text class="title">活动报名</text>
      <view class="action-placeholder" />
    </view>

    <scroll-view scroll-y class="content">
      <view class="placeholder">
        <AppIcon icon="lucide:construction" size="80rpx" color="#9CA3AF" />
        <text class="tip">活动报名功能开发中</text>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  background-color: #F8F8F8;
}

.header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  height: 112rpx;
  padding: 0 24rpx;
  box-sizing: border-box;
  background-color: #FFFFFF;
}

.back,
.action-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80rpx;
  height: 80rpx;
}

.title {
  font-size: 36rpx;
  font-weight: 600;
  color: #1A1A1A;
}

.content {
  flex: 1;
  padding: 32rpx;
  box-sizing: border-box;
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
  padding: 160rpx 0;
}

.tip {
  font-size: 28rpx;
  color: #6B7280;
}
</style>
