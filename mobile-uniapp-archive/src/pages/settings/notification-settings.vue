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
      <text class="title">消息通知</text>
      <text class="subtitle">管理各类消息提醒</text>
      <view class="spacer-40"></view>

      <view class="card">
        <text class="card-label">班级通知</text>
        <view class="spacer" />
        <switch :checked="settings.message" @change="toggle('message', $event)" color="#0062FF" />
      </view>
      <view class="card">
        <text class="card-label">作业提醒</text>
        <view class="spacer" />
        <switch :checked="settings.homework" @change="toggle('homework', $event)" color="#0062FF" />
      </view>
      <view class="card">
        <text class="card-label">考勤提醒</text>
        <view class="spacer" />
        <switch :checked="settings.attendance" @change="toggle('attendance', $event)" color="#0062FF" />
      </view>
      <view class="card">
        <text class="card-label">班费变动</text>
        <view class="spacer" />
        <switch :checked="settings.fee" @change="toggle('fee', $event)" color="#0062FF" />
      </view>

      <view class="bottom-safe" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import { getSettings, updateSettings } from '@/common/api/settings'

const settings = reactive({
  message: true,
  homework: true,
  attendance: true,
  fee: true,
})

async function loadSettings() {
  try {
    const data = await getSettings()
    const ns = data.notificationSettings || {}
    settings.message = ns.message !== false
    settings.homework = ns.homework !== false
    settings.attendance = ns.attendance !== false
    settings.fee = ns.fee !== false
  } catch (err) {
    // ignore
  }
}

async function toggle(key: keyof typeof settings, e: any) {
  settings[key] = e.detail.value
  try {
    await updateSettings({ notificationSettings: { ...settings } })
  } catch (err) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
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

.bottom-safe {
  height: 24px;
  flex-shrink: 0;
}
</style>
