<script setup lang="ts">
defineProps<{
  dark?: boolean
}>()
</script>

<template>
  <view
    class="status-bar"
    :class="{ dark }"
  >
    <text class="status-time">9:41</text>
    <view class="status-icons">
      <text class="status-signal">◉◉◉◉</text>
      <text class="status-battery">100%</text>
    </view>
  </view>
</template>

<style scoped>
.status-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 62rpx;
  padding: 0 24rpx;
  box-sizing: border-box;
  background-color: transparent;
}

.status-time {
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.status-icons {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12rpx;
}

.status-signal,
.status-battery {
  font-size: 28rpx;
  color: #1a1a1a;
}

.status-bar.dark .status-time,
.status-bar.dark .status-signal,
.status-bar.dark .status-battery {
  color: #ffffff;
}
</style>
