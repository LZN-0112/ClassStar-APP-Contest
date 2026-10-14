<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import StatusBar from '@/components/StatusBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import BackButton from '@/components/BackButton.vue'
import AppButton from '@/components/AppButton.vue'
import {
  getActivityDetail,
  registerActivity,
  cancelActivityRegistration,
  type ActivityDetail,
} from '@/common/api/activities'
import { getCurrentClassId } from '@/common/utils/class'

const activityId = ref('')
const loading = ref(false)
const actionLoading = ref(false)
const activity = ref<ActivityDetail | null>(null)

const isRegistered = computed(() => {
  return activity.value?.registration?.status === 'registered'
})

function formatDate(date?: string) {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

function formatDeadline(deadline?: string) {
  if (!deadline) return '暂无截止'
  const d = new Date(deadline)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function statusColor(status?: string) {
  const map: Record<string, string> = {
    registering: '#10B981',
    ongoing: '#F59E0B',
    ended: '#6B7280',
    closed: '#6B7280',
    cancelled: '#EF4444',
  }
  return map[status || ''] || '#6B7280'
}

async function loadDetail() {
  const classId = getCurrentClassId()
  if (!classId) {
    uni.showToast({ title: '未选择班级', icon: 'none' })
    return
  }
  if (!activityId.value) return
  loading.value = true
  try {
    activity.value = await getActivityDetail(classId, activityId.value)
  } catch (err) {
    const message = err instanceof Error ? err.message : '加载失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function onRegister() {
  const classId = getCurrentClassId()
  if (!classId || !activityId.value) return
  actionLoading.value = true
  try {
    await registerActivity(classId, activityId.value)
    uni.showToast({ title: '报名成功', icon: 'success' })
    await loadDetail()
  } catch (err) {
    const message = err instanceof Error ? err.message : '报名失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    actionLoading.value = false
  }
}

async function onCancel() {
  const classId = getCurrentClassId()
  if (!classId || !activityId.value) return
  actionLoading.value = true
  try {
    await cancelActivityRegistration(classId, activityId.value)
    uni.showToast({ title: '已取消报名', icon: 'success' })
    await loadDetail()
  } catch (err) {
    const message = err instanceof Error ? err.message : '取消报名失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    actionLoading.value = false
  }
}

onLoad((query) => {
  activityId.value = query?.id || ''
  loadDetail()
})
</script>

<template>
  <view class="page">
    <StatusBar dark />

    <view class="header">
      <BackButton class="back" />
      <text class="title">活动详情</text>
      <view class="action-placeholder" />
    </view>

    <scroll-view scroll-y class="content">
      <view v-if="!activity && loading" class="loading">
        <text>加载中...</text>
      </view>

      <view v-else-if="!activity" class="empty">
        <AppIcon icon="lucide:calendar-x" size="96rpx" color="var(--text-muted)" />
        <text class="empty-text">活动不存在</text>
      </view>

      <template v-else>
        <view class="detail-card">
          <view class="detail-header">
            <text class="detail-title">{{ activity.title }}</text>
            <view
              class="status-tag"
              :style="{ backgroundColor: statusColor(activity.status) + '1A', color: statusColor(activity.status) }"
            >
              <text>{{ activity.displayStatus || activity.status }}</text>
            </view>
          </view>

          <view class="info-list">
            <view class="info-item">
              <AppIcon icon="lucide:calendar" size="32rpx" color="var(--accent)" />
              <view class="info-body">
                <text class="info-label">活动日期</text>
                <text class="info-value">{{ formatDate(activity.eventDate) }}</text>
              </view>
            </view>

            <view v-if="activity.eventTime" class="info-item">
              <AppIcon icon="lucide:clock" size="32rpx" color="var(--accent)" />
              <view class="info-body">
                <text class="info-label">活动时间</text>
                <text class="info-value">{{ activity.eventTime }}</text>
              </view>
            </view>

            <view v-if="activity.location" class="info-item">
              <AppIcon icon="lucide:map-pin" size="32rpx" color="var(--accent)" />
              <view class="info-body">
                <text class="info-label">活动地点</text>
                <text class="info-value">{{ activity.location }}</text>
              </view>
            </view>

            <view class="info-item">
              <AppIcon icon="lucide:users" size="32rpx" color="var(--accent)" />
              <view class="info-body">
                <text class="info-label">报名人数</text>
                <text class="info-value">{{ activity.registeredCount || 0 }} / {{ activity.capacity || '不限' }}</text>
              </view>
            </view>

            <view class="info-item">
              <AppIcon icon="lucide:hourglass" size="32rpx" color="var(--accent)" />
              <view class="info-body">
                <text class="info-label">报名截止</text>
                <text class="info-value">{{ formatDeadline(activity.deadline) }}</text>
              </view>
            </view>
          </view>
        </view>

        <view class="action-bar">
          <AppButton
            v-if="isRegistered"
            :loading="actionLoading"
            @click="onCancel"
          >
            取消报名
          </AppButton>
          <AppButton
            v-else
            :loading="actionLoading"
            @click="onRegister"
          >
            报名
          </AppButton>
        </view>
      </template>

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
  padding: 24rpx;
  box-sizing: border-box;
}

.loading,
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;
  gap: 24rpx;
}

.empty-text {
  font-size: var(--text-size-body);
  color: var(--text-muted);
}

.detail-card {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  background-color: var(--surface);
  border-radius: var(--rounded-lg);
  box-shadow: var(--shadow-soft);
}

.detail-header {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.detail-title {
  flex: 1;
  font-size: var(--text-size-title);
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
}

.status-tag {
  flex-shrink: 0;
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  font-size: var(--text-size-caption);
  font-weight: 600;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.info-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 20rpx;
}

.info-body {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.info-label {
  font-size: var(--text-size-caption);
  color: var(--text-muted);
}

.info-value {
  font-size: var(--text-size-body);
  font-weight: 500;
  color: var(--text-primary);
}

.action-bar {
  margin-top: 24rpx;
}

.safe-bottom {
  height: 48rpx;
}
</style>
