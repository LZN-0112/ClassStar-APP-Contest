<script setup lang="ts">
import { ref, onMounted } from 'vue'
import StatusBar from '@/components/StatusBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import BackButton from '@/components/BackButton.vue'
import AppButton from '@/components/AppButton.vue'
import { checkIn, getAttendanceDetail, getAttendanceList, type AttendanceDetail, type CheckInData } from '@/common/api/attendances'
import { getCurrentClassId } from '@/common/utils/class'

const loading = ref(false)
const checking = ref(false)
const attendance = ref<AttendanceDetail | null>(null)
const locationText = ref('定位中...')
const latitude = ref<number | undefined>()
const longitude = ref<number | undefined>()
const errorMsg = ref('')

function formatTime(time?: string) {
  if (!time) return ''
  const d = new Date(time)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function loadDetail(id: string) {
  const classId = getCurrentClassId()
  if (!classId) return
  loading.value = true
  try {
    attendance.value = await getAttendanceDetail(classId, id)
  } catch (err) {
    const message = err instanceof Error ? err.message : '加载失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function loadLatestOngoing() {
  const classId = getCurrentClassId()
  if (!classId) return
  loading.value = true
  try {
    const res = await getAttendanceList(classId, { status: 'ongoing', page: 1, pageSize: 1 })
    const list = res.list || []
    if (list.length > 0) {
      await loadDetail(list[0].id)
    } else {
      uni.showToast({ title: '暂无进行中签到', icon: 'none' })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : '加载失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    loading.value = false
  }
}

function getLocation() {
  locationText.value = '定位中...'
  errorMsg.value = ''
  uni.getLocation({
    type: 'gcj02',
    isHighAccuracy: true,
    success: (res) => {
      latitude.value = res.latitude
      longitude.value = res.longitude
      locationText.value = `已定位：${res.latitude.toFixed(4)}, ${res.longitude.toFixed(4)}`
    },
    fail: () => {
      locationText.value = '定位失败，请检查权限'
      errorMsg.value = '无法获取当前位置，请确认已授权位置权限'
    },
  })
}

async function onCheckIn() {
  if (!attendance.value) return
  const classId = getCurrentClassId()
  if (!classId) {
    uni.showToast({ title: '未选择班级', icon: 'none' })
    return
  }
  if (latitude.value === undefined || longitude.value === undefined) {
    uni.showToast({ title: '请等待定位完成', icon: 'none' })
    return
  }
  checking.value = true
  try {
    const data: CheckInData = {
      method: 'gps',
      latitude: latitude.value,
      longitude: longitude.value,
    }
    await checkIn(classId, attendance.value.id, data)
    uni.showToast({ title: '签到成功', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack({ delta: 1 })
    }, 1200)
  } catch (err) {
    const message = err instanceof Error ? err.message : '签到失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    checking.value = false
  }
}

onMounted(() => {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1] as any
  const id = current?.options?.id || current?.$page?.options?.id
  if (id) {
    loadDetail(id)
  } else {
    loadLatestOngoing()
  }
  getLocation()
})
</script>

<template>
  <view class="page">
    <StatusBar dark />

    <view class="header">
      <BackButton class="back" />
      <text class="title">{{ attendance?.title || '班会签到' }}</text>
      <view class="action-placeholder" />
    </view>

    <scroll-view scroll-y class="content">
      <view class="location-card">
        <view class="location-icon">
          <AppIcon icon="lucide:map-pin" size="64rpx" color="#0062FF" />
        </view>
        <text class="location-title">请在指定地点范围内完成签到</text>
        <text class="location-status">{{ locationText }}</text>
        <view class="location-hint" @click="getLocation">
          <AppIcon icon="lucide:refresh-cw" size="24rpx" color="#0062FF" />
          <text class="hint-text">重新定位</text>
        </view>
      </view>

      <view v-if="attendance" class="info-card">
        <view class="info-row">
          <text class="info-label">签到时间</text>
          <text class="info-value">{{ formatTime(attendance.startTime) }} - {{ formatTime(attendance.endTime) }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">签到地点</text>
          <text class="info-value">{{ attendance.location || '未指定' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">签到方式</text>
          <text class="info-value">定位签到</text>
        </view>
      </view>

      <view class="action-wrap">
        <AppButton type="primary" :loading="checking" @click="onCheckIn">
          {{ checking ? '签到中...' : '立即签到' }}
        </AppButton>
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
  background-color: var(--bg);
}

.header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  height: 112rpx;
  padding: 0 24rpx;
  box-sizing: border-box;
  background-color: var(--surface);
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
  font-size: var(--text-size-subhead);
  font-weight: 600;
  color: var(--text-primary);
}

.content {
  flex: 1;
  padding: 32rpx;
  box-sizing: border-box;
}

.location-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
  padding: 48rpx 32rpx;
  border-radius: var(--rounded-lg);
  background-color: var(--surface);
  box-shadow: var(--shadow-soft);
}

.location-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 120rpx;
  height: 120rpx;
  border-radius: 9999rpx;
  background-color: rgba(0, 98, 255, 0.1);
}

.location-title {
  font-size: var(--text-size-subhead);
  font-weight: 600;
  color: var(--text-primary);
}

.location-status {
  font-size: var(--text-size-body);
  color: var(--text-secondary);
}

.location-hint {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8rpx;
  margin-top: 8rpx;
}

.hint-text {
  font-size: var(--text-size-caption);
  color: var(--accent);
}

.info-card {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  margin-top: 32rpx;
  padding: 32rpx;
  border-radius: var(--rounded-lg);
  background-color: var(--surface);
  box-shadow: var(--shadow-soft);
}

.info-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.info-label {
  font-size: var(--text-size-body);
  color: var(--text-secondary);
}

.info-value {
  font-size: var(--text-size-body);
  font-weight: 500;
  color: var(--text-primary);
}

.action-wrap {
  margin-top: 48rpx;
}

.safe-bottom {
  height: 48rpx;
}
</style>
