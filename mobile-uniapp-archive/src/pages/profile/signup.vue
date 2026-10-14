<script setup lang="ts">
import { ref } from 'vue'
import StatusBar from '@/components/StatusBar.vue'
import BackButton from '@/components/BackButton.vue'

interface SignupRecord {
  id: string
  title: string
  time: string
  status: 'passed' | 'pending' | 'rejected'
  statusText: string
}

const records = ref<SignupRecord[]>([
  { id: '1', title: '春季运动会志愿者', time: '03-20 14:30', status: 'passed', statusText: '已通过' },
  { id: '2', title: '计算机学院讲座', time: '03-18 10:15', status: 'pending', statusText: '待审核' },
  { id: '3', title: '校园歌手大赛', time: '03-10 09:00', status: 'rejected', statusText: '未通过' },
])

function statusColor(status: string) {
  const map: Record<string, string> = {
    passed: '#22C55E',
    pending: '#F59E0B',
    rejected: '#EF4444',
  }
  return map[status] || '#6B7280'
}
</script>

<template>
  <view class="page">
    <StatusBar dark />

    <view class="header">
      <BackButton class="back" />
      <text class="title">我的报名</text>
      <view class="action-placeholder" />
    </view>

    <scroll-view scroll-y class="content">
      <text class="section-title">报名记录</text>

      <view
        v-for="item in records"
        :key="item.id"
        class="record-card"
      >
        <view class="record-main">
          <text class="record-title">{{ item.title }}</text>
          <text class="record-time">{{ item.time }}</text>
        </view>
        <text class="record-status" :style="{ color: statusColor(item.status) }">{{ item.statusText }}</text>
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
  background: linear-gradient(180deg, #32C9FD 0%, #DEFCFF 30%, #F8F8F8 30%);
}

.header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  height: 112rpx;
  padding: 0 24rpx;
  box-sizing: border-box;
  background-color: transparent;
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
  color: #FFFFFF;
}

.content {
  flex: 1;
  padding: 32rpx;
  box-sizing: border-box;
}

.section-title {
  display: block;
  margin-bottom: 24rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #1A1A1A;
}

.record-card {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx;
  margin-bottom: 20rpx;
  border-radius: 24rpx;
  background-color: #FFFFFF;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
}

.record-main {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.record-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1A1A1A;
}

.record-time {
  font-size: 24rpx;
  color: #6B7280;
}

.record-status {
  font-size: 26rpx;
  font-weight: 600;
}

.safe-bottom {
  height: 160rpx;
}
</style>
