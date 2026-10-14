<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import StatusBar from '@/components/StatusBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import BackButton from '@/components/BackButton.vue'
import { getCurrentOrg } from '@/common/utils/class'

const orgType = ref('class')

const feeLabel = computed(() => orgType.value === 'class' ? '班费记账' : '会费记账')

const featureGrid = computed(() => [
  { label: feeLabel.value, icon: 'lucide:wallet', color: '#22C55E', path: '/pages/fee/add' },
  { label: '抽签', icon: 'lucide:dices', color: '#F97316', path: '/pages/random-draw/list' },
  { label: '投票', icon: 'lucide:vote', color: '#2563EB', path: '/pages/vote/list' },
  { label: '番茄钟', icon: 'lucide:timer', color: '#EF4444', path: '/pages/tomato/index' },
])

function onItem(item: { label: string; icon: string; color: string; path: string }) {
  uni.navigateTo({ url: item.path })
}

onMounted(() => {
  const org = getCurrentOrg()
  if (org) orgType.value = org.orgType || 'class'
})
</script>

<template>
  <view class="page">
    <StatusBar dark />

    <view class="header">
      <BackButton class="back" />
      <text class="title">更多功能</text>
      <view class="action-placeholder" />
    </view>

    <scroll-view scroll-y class="content">
      <view class="feature-card">
        <view class="feature-row">
          <view
            v-for="item in featureGrid.slice(0, 2)"
            :key="item.label"
            class="feature-item"
            @click="onItem(item)"
          >
            <view class="feature-icon" :style="{ backgroundColor: item.color }">
              <AppIcon :icon="item.icon" size="44rpx" color="#FFFFFF" />
            </view>
            <text class="feature-label">{{ item.label }}</text>
          </view>
        </view>
        <view class="feature-row">
          <view
            v-for="item in featureGrid.slice(2, 4)"
            :key="item.label"
            class="feature-item"
            @click="onItem(item)"
          >
            <view class="feature-icon" :style="{ backgroundColor: item.color }">
              <AppIcon :icon="item.icon" size="44rpx" color="#FFFFFF" />
            </view>
            <text class="feature-label">{{ item.label }}</text>
          </view>
        </view>
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
  font-size: 36rpx;
  font-weight: 600;
  color: #1A1A1A;
}

.content {
  flex: 1;
  padding: 32rpx;
  box-sizing: border-box;
}

.feature-card {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
  padding: 32rpx;
  border-radius: 24rpx;
  background-color: #FFFFFF;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
}

.feature-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 80rpx;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  width: 170rpx;
  height: 170rpx;
  padding-top: 24rpx;
  border-radius: 16rpx;
  background-color: #FFFFFF;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.feature-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 84rpx;
  height: 84rpx;
  border-radius: 24rpx;
}

.feature-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #1A1A1A;
}

.safe-bottom {
  height: 160rpx;
}
</style>
