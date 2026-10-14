<template>
  <view class="page">
    <view class="status-bar">
      <text class="status-time">9:41</text>
      <view class="status-icons">
        <text class="status-signal">◉◉◉◉</text>
        <text class="status-battery">100%</text>
      </view>
    </view>
    <view class="back-button" @click="handleBack">
      <text class="back-icon">‹</text>
    </view>

    <scroll-view scroll-y class="content">
      <view class="spacer-60"></view>
      <text class="title">通用设置</text>
      <text class="subtitle">管理主题、语言等通用偏好</text>
      <view class="spacer-40"></view>

      <view class="card">
        <text class="card-label">深色模式</text>
        <view class="spacer" />
        <switch :checked="darkMode" @change="toggleDarkMode" color="#0062FF" />
      </view>

      <view class="card">
        <text class="card-label">省流量模式</text>
        <view class="spacer" />
        <switch :checked="saveData" @change="toggleSaveData" color="#0062FF" />
      </view>

      <view class="card">
        <text class="card-label">清除缓存</text>
        <view class="spacer" />
        <text class="card-value">{{ cacheSize }}</text>
        <text class="card-arrow">›</text>
      </view>

      <view class="bottom-safe" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getSettings, updateSettings } from '@/common/api/settings'

const darkMode = ref(false)
const saveData = ref(false)
const cacheSize = ref('0 MB')

async function loadSettings() {
  try {
    const data = await getSettings()
    const general = data.generalSettings || {}
    darkMode.value = general.darkMode || false
    saveData.value = general.saveData || false
  } catch (err) {
    // ignore
  }
}

async function saveGeneral() {
  try {
    await updateSettings({
      generalSettings: {
        darkMode: darkMode.value,
        saveData: saveData.value,
      },
    })
  } catch (err) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

function toggleDarkMode(e: any) {
  darkMode.value = e.detail.value
  saveGeneral()
}

function toggleSaveData(e: any) {
  saveData.value = e.detail.value
  saveGeneral()
}

function handleBack() {
  uni.navigateBack({ delta: 1 })
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  background-color: #FFFFFF;
}

.status-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 62px;
  padding: 12px 24px 0;
  box-sizing: border-box;
  background-color: #FFFFFF;
}

.status-time {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}

.status-icons {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
}

.status-signal,
.status-battery {
  font-size: 14px;
  color: #1A1A1A;
}

.back-button {
  position: absolute;
  left: 16px;
  top: 74px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.back-icon {
  font-size: 32px;
  color: #1A1A1A;
  line-height: 1;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 24px;
  box-sizing: border-box;
}

.spacer-60 {
  width: 100%;
  height: 60px;
  flex-shrink: 0;
}

.spacer-40 {
  width: 100%;
  height: 40px;
  flex-shrink: 0;
}

.title {
  display: block;
  font-size: 28px;
  font-weight: bold;
  color: #1A1A1A;
  margin-bottom: 8px;
}

.subtitle {
  display: block;
  font-size: 14px;
  color: #4B5563;
}

.card {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  height: 80px;
  padding: 0 16px;
  margin-bottom: 12px;
  box-sizing: border-box;
  background-color: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.card-label {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}

.spacer {
  flex: 1;
}

.card-value {
  font-size: 14px;
  color: #6B7280;
  margin-right: 8px;
}

.card-arrow {
  font-size: 24px;
  color: #4B5563;
}

.bottom-safe {
  height: 24px;
  flex-shrink: 0;
}
</style>
