<template>
  <view class="page">
    <view class="content">
      <text class="icon">¯\_(ツ)_/¯</text>
      <text class="title">页面不存在</text>
      <text class="subtitle">您访问的页面已迷路，请返回首页</text>
      <view class="back-btn" @click="goBack">
        <text class="back-text">返回上一页</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
    return
  }
  uni.reLaunch({ url: '/pages/onboarding/launch' })
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;
  background-color: #FFFFFF;
  padding: 0 48rpx;
  box-sizing: border-box;
}

.content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.icon {
  font-size: 80rpx;
  color: #4B5563;
  margin-bottom: 32rpx;
}

.title {
  font-size: 40rpx;
  font-weight: 700;
  color: #1A1A1A;
  margin-bottom: 16rpx;
}

.subtitle {
  font-size: 28rpx;
  color: #6B7280;
  text-align: center;
  margin-bottom: 64rpx;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  padding: 0 64rpx;
  background-color: #0062FF;
  border-radius: 44rpx;
}

.back-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #FFFFFF;
}
</style>
