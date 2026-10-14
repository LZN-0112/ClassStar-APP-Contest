<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import TabBar from '@/components/TabBar.vue'
import { checkAndHandleShareFiles } from '@/common/plugins/share-receiver'

onLaunch(async () => {
  console.log('App Launch')

  // 检查是否有外部应用分享的文件
  // #ifdef APP-PLUS
  const hasShareFiles = await checkAndHandleShareFiles()
  if (hasShareFiles) {
    // 有待处理文件，跳转到文件接收中转页
    setTimeout(() => {
      uni.redirectTo({
        url: '/pages/material/share-inbox'
      })
    }, 500)
  }
  // #endif
})
onShow(() => {
  console.log('App Show')
})
onHide(() => {
  console.log('App Hide')
})
</script>

<template>
  <view class="app-root">
    <view class="app-mobile">
      <slot />
      <!-- App/小程序端通过 App.vue 全局渲染保持跨页面静止；H5 端在 main.ts 单独挂载 -->
      <TabBar />
    </view>
  </view>
</template>

<style>
/* ===== Pencil 设计稿全局 Token ===== */
page {
  --accent: #0062FF;
  --accent-glow: #0062FF33;
  --accent-secondary: #0062FF66;
  --accent-tertiary: #0062FF99;
  --accent-50: #0062FF0D;
  --accent-100: #0062FF1A;
  --accent-200: #0062FF33;

  --bg: #FFFFFF;
  --surface: #FFFFFF;
  --surface-elevated: #FFFFFF;

  --text-primary: #1A1A1A;
  --text-secondary: #4B5563;
  --text-muted: #6B7280;
  --text-inverse: #FFFFFF;

  --border: #E5E7EB;
  --border-subtle: #F3F4F6;

  --shadow-soft: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
  --shadow-card: 0 8rpx 32rpx rgba(0, 0, 0, 0.05);

  --font-heading: 'Funnel Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  --font-body: 'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  --font-caption: 'Geist', 'PingFang SC', 'Microsoft YaHei', sans-serif;

  --text-size-caption: 22rpx;
  --text-size-body: 28rpx;
  --text-size-subhead: 32rpx;
  --text-size-title: 40rpx;
  --text-size-display: 56rpx;
  --text-size-hero: 72rpx;

  --rounded-sm: 8rpx;
  --rounded-md: 16rpx;
  --rounded-lg: 16rpx;
  --rounded-xl: 16rpx;
  --rounded-2xl: 16rpx;
  --rounded-3xl: 16rpx;
  --rounded-full: 9999rpx;
  --rounded-device: 80rpx;

  --gap-sm: 16rpx;
  --gap-md: 32rpx;
  --gap-lg: 48rpx;
  --gap-xl: 64rpx;

  background-color: var(--bg);
  color: var(--text-primary);
  font-family: var(--font-body);
}

/* ===== H5 移动端容器 ===== */
.app-root {
  width: 100vw;
  min-height: 100dvh;
  display: flex;
  justify-content: center;
  background-color: #F3F4F6;
}

.app-mobile {
  width: 100%;
  max-width: 430px;
  min-height: 100dvh;
  height: 100dvh;
  position: relative;
  background-color: var(--bg);
  box-shadow: 0 0 40rpx rgba(0, 0, 0, 0.06);
  overflow-x: hidden;
}

/* ===== 修复 scroll-view flex:1 滚动问题 ===== */
scroll-view.content {
  height: 0 !important;
}

/* ===== 通用工具类 ===== */
.flex {
  display: flex;
}

.flex-col {
  display: flex;
  flex-direction: column;
}

.flex-row {
  display: flex;
  flex-direction: row;
}

.items-center {
  align-items: center;
}

.justify-center {
  justify-content: center;
}

.justify-between {
  justify-content: space-between;
}

.flex-1 {
  flex: 1;
}

.text-primary {
  color: var(--text-primary);
}

.text-secondary {
  color: var(--text-secondary);
}

.text-muted {
  color: var(--text-muted);
}

.text-inverse {
  color: var(--text-inverse);
}

.text-accent {
  color: var(--accent);
}

.safe-area-bottom {
  height: constant(safe-area-inset-bottom);
  height: env(safe-area-inset-bottom);
}
</style>
