<script setup lang="ts">
import StatusBar from '@/components/StatusBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import AppButton from '@/components/AppButton.vue'
import BackButton from '@/components/BackButton.vue'

const metrics = [
  { label: '考勤签到率', value: '96%', icon: 'lucide:calendar-check', color: '#22C55E' },
  { label: '活动参与率', value: '88%', icon: 'lucide:flag', color: '#EF4444' },
  { label: '作业提交率', value: '92%', icon: 'lucide:file-check', color: '#F97316' },
  { label: '班费结余', value: '¥1,280', icon: 'lucide:wallet', color: '#3B82F6' },
]

const trendBars = [
  { day: '周一', value: 80 },
  { day: '周二', value: 95 },
  { day: '周三', value: 70 },
  { day: '周四', value: 100 },
  { day: '周五', value: 90 },
  { day: '周六', value: 60 },
  { day: '周日', value: 85 },
]

function onReport() {
  uni.navigateTo({ url: '/pages/data/report' })
}
</script>

<template>
  <view class="page">
    <StatusBar dark />

    <view class="header">
      <BackButton class="back" />
      <text class="title">数据看板</text>
      <view class="action-placeholder" />
    </view>

    <scroll-view scroll-y class="content">
      <view class="metric-grid">
        <view
          v-for="item in metrics"
          :key="item.label"
          class="metric-card"
        >
          <view class="metric-icon" :style="{ backgroundColor: item.color + '1A' }">
            <AppIcon :icon="item.icon" size="40rpx" :color="item.color" />
          </view>
          <view class="metric-text">
            <text class="metric-value">{{ item.value }}</text>
            <text class="metric-label">{{ item.label }}</text>
          </view>
        </view>
      </view>

      <view class="trend-card">
        <text class="trend-title">出勤趋势</text>
        <view class="trend-bars">
          <view
            v-for="bar in trendBars"
            :key="bar.day"
            class="bar-item"
          >
            <view class="bar-track">
              <view class="bar-fill" :style="{ height: `${bar.value}%` }" />
            </view>
            <text class="bar-day">{{ bar.day }}</text>
          </view>
        </view>
      </view>

      <view class="action-wrap">
        <AppButton type="primary" @click="onReport">生成学期报表</AppButton>
      </view>

      <view class="safe-bottom" />
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
  font-size: 40rpx;
  font-weight: 700;
  color: #1A1A1A;
}

.content {
  flex: 1;
  padding: 32rpx;
  box-sizing: border-box;
}

.metric-grid {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 24rpx;
}

.metric-card {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 20rpx;
  width: calc(50% - 12rpx);
  padding: 28rpx;
  border-radius: 24rpx;
  background-color: #FFFFFF;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
  box-sizing: border-box;
}

.metric-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
}

.metric-text {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.metric-value {
  font-size: 36rpx;
  font-weight: 700;
  color: #1A1A1A;
}

.metric-label {
  font-size: 24rpx;
  color: #6B7280;
}

.trend-card {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  margin-top: 32rpx;
  padding: 28rpx;
  border-radius: 24rpx;
  background-color: rgba(0, 98, 255, 0.05);
}

.trend-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1A1A1A;
}

.trend-bars {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  justify-content: space-between;
  height: 240rpx;
  padding: 0 8rpx;
}

.bar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  flex: 1;
}

.bar-track {
  width: 32rpx;
  height: 180rpx;
  border-radius: 9999rpx;
  background-color: rgba(0, 98, 255, 0.1);
  overflow: hidden;
  display: flex;
  align-items: flex-end;
}

.bar-fill {
  width: 100%;
  border-radius: 9999rpx;
  background-color: #0062FF;
}

.bar-day {
  font-size: 22rpx;
  color: #6B7280;
}

.action-wrap {
  margin-top: 40rpx;
}

.safe-bottom {
  height: 160rpx;
}
</style>
