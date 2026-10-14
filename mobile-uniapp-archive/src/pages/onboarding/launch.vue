<template>
  <view class="page" @click="enterApp">
    <view class="streak streak-1" />
    <view class="streak streak-2" />
    <view class="streak streak-3" />

    <view class="logo">
      <text class="logo-text">班</text>
    </view>
    <text class="app-name">班级助手</text>
    <text class="tagline">智能管理班级事务</text>
    <text class="version">v{{ version }}</text>

    <view class="hint">
      <text class="hint-text">点击任意位置进入</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { secureStorage } from '@/common/storage/secure'

const version = ref('1.0.0')
const entered = ref(false)

function enterApp() {
  if (entered.value) return
  entered.value = true

  const userInfo = secureStorage.get<any>('userInfo')
  const accessToken = secureStorage.get<string>('accessToken')

  if (userInfo && accessToken) {
    const classId = secureStorage.get<string>('currentClassId')
    uni.reLaunch({ url: classId ? '/pages/home/index' : '/pages/auth/identity-select' })
    return
  }

  uni.reLaunch({ url: '/pages/auth/login' })
}

onMounted(() => {
  console.log('[Launch] 启动页加载')

  try {
    const userInfo = secureStorage.get<any>('userInfo')
    const accessToken = secureStorage.get<string>('accessToken')

    console.log('[Launch] 认证状态:', {
      hasUserInfo: !!userInfo,
      hasToken: !!accessToken
    })

    const delay = userInfo && accessToken ? 1500 : 2500

    setTimeout(() => {
      console.log('[Launch] 执行 enterApp')
      enterApp()
    }, delay)
  } catch (error) {
    console.error('[Launch] 启动失败:', error)
    // 失败时直接跳转到登录页
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/auth/login' })
    }, 1000)
  }
})
</script>

<style scoped>
.page {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;
  background-color: var(--bg);
  overflow: hidden;
}

.streak {
  position: absolute;
  left: -100rpx;
  height: 6rpx;
  border-radius: 6rpx;
  filter: blur(16rpx);
}

.streak-1 {
  top: 360rpx;
  width: 1000rpx;
  background-color: var(--accent);
  opacity: 0.5;
  transform: rotate(8deg);
}

.streak-2 {
  top: 900rpx;
  width: 900rpx;
  background-color: var(--accent);
  opacity: 0.45;
  transform: rotate(-5deg);
}

.streak-3 {
  top: 1260rpx;
  width: 860rpx;
  background-color: var(--accent);
  opacity: 0.4;
  transform: rotate(6deg);
}

.logo {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 240rpx;
  height: 240rpx;
  border-radius: var(--rounded-xl);
  background: linear-gradient(135deg, var(--accent) 0%, #3B82F6 100%);
  box-shadow: 0 16rpx 64rpx rgba(0, 98, 255, 0.25);
  margin-bottom: 48rpx;
}

.logo-text {
  font-size: 120rpx;
  font-weight: 700;
  color: var(--text-inverse);
}

.app-name {
  position: relative;
  z-index: 1;
  font-family: var(--font-heading);
  font-size: var(--text-size-hero);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 16rpx;
}

.tagline {
  position: relative;
  z-index: 1;
  font-size: var(--text-size-body);
  color: var(--text-secondary);
  margin-bottom: 24rpx;
}

.version {
  position: relative;
  z-index: 1;
  font-size: var(--text-size-caption);
  color: var(--text-muted);
}

.hint {
  position: absolute;
  bottom: 120rpx;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
}

.hint-text {
  font-size: var(--text-size-body);
  color: var(--text-muted);
}
</style>
