<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import AppIcon from './AppIcon.vue'

type TabKey = 'home' | 'class' | 'notice' | 'data' | 'mine'

interface TabItem {
  key: TabKey
  label: string
  icon: string
  url?: string
}

const tabs: TabItem[] = [
  { key: 'home', label: '首页', icon: 'lucide:home', url: '/pages/home/index' },
  { key: 'class', label: '班级', icon: 'lucide:school', url: '/pages/class/index' },
  { key: 'notice', label: '通知', icon: 'lucide:bell', url: '/pages/notice/index' },
  { key: 'data', label: '数据', icon: 'lucide:chart-pie', url: '/pages/data/index' },
  { key: 'mine', label: '我的', icon: 'lucide:user', url: '/pages/settings/personal-center' },
]

// 设计稿中以下子页面底部也显示 TabBar
const extraVisiblePaths = ['/pages/random-draw/list', '/pages/profile/signup']

const tabPaths = [...tabs.map(t => t.url).filter((url): url is string => !!url), ...extraVisiblePaths]

const activeIndex = ref(0)
const visible = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

function getCurrentPath(): string {
  const pages = getCurrentPages()
  if (pages && pages.length > 0) {
    const current = pages[pages.length - 1] as any
    return current?.route || ''
  }
  return ''
}

function normalizePath(path: string): string {
  return path.replace(/^#+\/?/, '').replace(/^\/+/, '')
}

function updateState() {
  const path = getCurrentPath()
  const normalized = normalizePath(path)
  visible.value = tabPaths.some(p => normalized.includes(normalizePath(p)))
  const idx = tabs.findIndex(t => t.url && normalized.includes(normalizePath(t.url)))
  activeIndex.value = idx >= 0 ? idx : 0
}

onMounted(() => {
  updateState()
  timer = setInterval(updateState, 100)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
})

function navigateTo(url: string) {
  uni.redirectTo({
    url,
    fail: (err) => {
      console.error('TabBar redirectTo fail', err)
      uni.navigateTo({
        url,
        fail: (err2) => {
          console.error('TabBar navigateTo fail', err2)
          uni.showToast({ title: '页面跳转失败', icon: 'none' })
        },
      })
    },
  })
}

function onTab(tab: TabItem, index: number) {
  if (activeIndex.value === index) return

  if (tab.url) {
    navigateTo(tab.url)
    return
  }

  uni.showToast({ title: `${tab.label} 功能开发中`, icon: 'none' })
}
</script>

<template>
  <view v-if="visible" class="tab-bar">
    <view class="tab-bar-inner">
      <view
        v-for="(tab, idx) in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ active: activeIndex === idx }"
        @click.stop="onTab(tab, idx)"
      >
        <AppIcon
          :icon="tab.icon"
          size="48rpx"
          :color="activeIndex === idx ? 'var(--accent)' : 'var(--text-muted)'"
          class-name="tab-icon"
        />
        <text class="tab-label">{{ tab.label }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.tab-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  bottom: env(safe-area-inset-bottom);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: calc(112rpx + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  box-sizing: border-box;
  background-color: #FFFFFF;
  border-top: 1rpx solid #E5E7EB;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.05);
  will-change: transform;
}

.tab-bar-inner {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-around;
  width: 100%;
  height: 112rpx;
  padding: 0 16rpx;
  box-sizing: border-box;
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  width: 120rpx;
  height: 80rpx;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.15s ease;
}

.tab-item:active {
  transform: scale(0.95);
}

.tab-icon {
  pointer-events: none;
  flex-shrink: 0;
}

.tab-label {
  font-size: 22rpx;
  font-weight: 500;
  color: var(--text-muted);
  white-space: nowrap;
  line-height: 1;
}

.tab-item.active .tab-label {
  color: var(--accent);
}
</style>
