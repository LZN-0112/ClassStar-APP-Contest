<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import StatusBar from '@/components/StatusBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import BackButton from '@/components/BackButton.vue'
import AppButton from '@/components/AppButton.vue'
import {
  getAttendanceDetail,
  checkIn,
  closeAttendance,
  getAttendanceStatistics,
  type AttendanceDetail,
  type AttendanceStatistics,
} from '@/common/api/attendances'
import { getCurrentClassId } from '@/common/utils/class'
import { secureStorage } from '@/common/storage/secure'

const id = ref('')
const detail = ref<AttendanceDetail | null>(null)
const statistics = ref<AttendanceStatistics | null>(null)
const loading = ref(false)
const processing = ref(false)
const role = computed(() => secureStorage.get<string>('currentIdentity') || '学生')
const isCommittee = computed(() => role.value !== '学生')

const methodLabelMap: Record<string, string> = {
  normal: '普通签到',
  qr: '二维码签到',
  code: '口令签到',
  gps: '定位签到',
  face: '人脸签到',
}

const statusLabelMap: Record<string, string> = {
  open: '进行中',
  active: '进行中',
  ongoing: '进行中',
  closed: '已关闭',
  completed: '已结束',
  ended: '已结束',
}

const statusColorMap: Record<string, string> = {
  open: '#22C55E',
  active: '#22C55E',
  ongoing: '#22C55E',
  closed: '#6B7280',
  completed: '#6B7280',
  ended: '#6B7280',
}

const isOngoing = computed(() => ['open', 'active', 'ongoing'].includes(detail.value?.status || ''))
const isCheckedIn = computed(() => detail.value?.myRecord?.status === 'present')

function formatTime(time?: string) {
  if (!time) return '-'
  const d = new Date(time)
  const month = d.getMonth() + 1
  const date = d.getDate()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${month}月${date}日 ${hours}:${minutes}`
}

function methodLabel(method?: string) {
  return methodLabelMap[method || ''] || method || '普通签到'
}

function statusLabel(status?: string) {
  return statusLabelMap[status || ''] || status || '未知'
}

function statusColor(status?: string) {
  return statusColorMap[status || ''] || '#6B7280'
}

async function loadDetail() {
  const classId = getCurrentClassId()
  if (!classId || !id.value) return
  loading.value = true
  try {
    detail.value = await getAttendanceDetail(classId, id.value)
  } catch (err) {
    const message = err instanceof Error ? err.message : '加载失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function loadStatistics() {
  const classId = getCurrentClassId()
  if (!classId || !id.value || !isCommittee.value) return
  try {
    statistics.value = await getAttendanceStatistics(classId, id.value)
  } catch (err) {
    const message = err instanceof Error ? err.message : '统计加载失败'
    uni.showToast({ title: message, icon: 'none' })
  }
}

async function onCheckIn() {
  const classId = getCurrentClassId()
  if (!classId || !id.value || !detail.value) return
  processing.value = true
  try {
    await checkIn(classId, id.value, { method: detail.value.method })
    uni.showToast({ title: '签到成功', icon: 'success' })
    await loadDetail()
    if (isCommittee.value) {
      await loadStatistics()
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : '签到失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    processing.value = false
  }
}

async function onClose() {
  const classId = getCurrentClassId()
  if (!classId || !id.value) return
  uni.showModal({
    title: '确认关闭',
    content: '关闭后学生将无法继续签到，是否继续？',
    success: async (res) => {
      if (!res.confirm) return
      processing.value = true
      try {
        await closeAttendance(classId, id.value)
        uni.showToast({ title: '已关闭', icon: 'success' })
        await loadDetail()
        if (isCommittee.value) {
          await loadStatistics()
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : '关闭失败'
        uni.showToast({ title: message, icon: 'none' })
      } finally {
        processing.value = false
      }
    },
  })
}

function userName(user: any) {
  return user?.name || user?.student?.name || user?.user?.name || '未知'
}

onLoad((query) => {
  id.value = query?.id || ''
  if (!id.value) {
    uni.showToast({ title: '缺少签到 ID', icon: 'none' })
    return
  }
  loadDetail()
  if (isCommittee.value) {
    loadStatistics()
  }
})
</script>

<template>
  <view class="page">
    <StatusBar dark />

    <view class="header">
      <BackButton class="back" />
      <text class="title">签到详情</text>
      <view class="action-placeholder" />
    </view>

    <scroll-view scroll-y class="content">
      <view v-if="!detail && loading" class="empty">
        <text class="empty-text">加载中...</text>
      </view>

      <template v-else-if="detail">
        <view class="detail-card">
          <view class="detail-header">
            <text class="detail-title">{{ detail.title }}</text>
            <view class="tag" :style="{ backgroundColor: statusColor(detail.status) + '1A', color: statusColor(detail.status) }">
              <text>{{ statusLabel(detail.status) }}</text>
            </view>
          </view>

          <view class="info-row">
            <AppIcon icon="lucide:clock" size="28rpx" color="var(--text-muted)" />
            <text class="info-label">时间范围</text>
            <text class="info-value">{{ formatTime(detail.startTime) }} - {{ formatTime(detail.endTime) }}</text>
          </view>

          <view class="info-row">
            <AppIcon icon="lucide:map-pin" size="28rpx" color="var(--text-muted)" />
            <text class="info-label">地点</text>
            <text class="info-value">{{ detail.location || '未填写' }}</text>
          </view>

          <view class="info-row">
            <AppIcon icon="lucide:scan-line" size="28rpx" color="var(--text-muted)" />
            <text class="info-label">签到方式</text>
            <text class="info-value">{{ methodLabel(detail.method) }}</text>
          </view>

          <view class="info-row">
            <AppIcon icon="lucide:user" size="28rpx" color="var(--text-muted)" />
            <text class="info-label">发布人</text>
            <text class="info-value">{{ detail.publisher?.name || '未知' }}</text>
          </view>
        </view>

        <view v-if="isCheckedIn" class="state-card success">
          <AppIcon icon="lucide:check-circle-2" size="48rpx" color="#22C55E" />
          <text class="state-text">已签到</text>
          <text v-if="detail.myRecord?.checkInAt" class="state-sub">{{ formatTime(detail.myRecord.checkInAt) }}</text>
        </view>

        <view v-else-if="isOngoing" class="action-section">
          <AppButton :loading="processing" @click="onCheckIn">签到</AppButton>
        </view>

        <view v-else class="state-card muted">
          <AppIcon icon="lucide:info" size="48rpx" color="var(--text-muted)" />
          <text class="state-text">签到已结束</text>
        </view>

        <template v-if="isCommittee">
          <view v-if="isOngoing" class="action-section secondary">
            <AppButton :loading="processing" @click="onClose">关闭签到</AppButton>
          </view>

          <view class="section-title">签到统计</view>
          <view class="statistics-card">
            <view class="stat-item">
              <text class="stat-value">{{ statistics?.total || 0 }}</text>
              <text class="stat-label">总人数</text>
            </view>
            <view class="stat-item">
              <text class="stat-value present">{{ statistics?.presentCount || 0 }}</text>
              <text class="stat-label">已签到</text>
            </view>
            <view class="stat-item">
              <text class="stat-value absent">{{ statistics?.absentCount || 0 }}</text>
              <text class="stat-label">未签到</text>
            </view>
            <view class="stat-item">
              <text class="stat-value leave">{{ statistics?.leaveCount || 0 }}</text>
              <text class="stat-label">请假</text>
            </view>
          </view>

          <view v-if="statistics && statistics.presentList.length > 0" class="list-card">
            <text class="list-title">已签到</text>
            <text v-for="(item, index) in statistics.presentList" :key="`p-${index}`" class="list-item">{{ userName(item) }}</text>
          </view>

          <view v-if="statistics && statistics.absentList.length > 0" class="list-card">
            <text class="list-title">未签到</text>
            <text v-for="(item, index) in statistics.absentList" :key="`a-${index}`" class="list-item">{{ userName(item) }}</text>
          </view>

          <view v-if="statistics && statistics.leaveList.length > 0" class="list-card">
            <text class="list-title">请假</text>
            <text v-for="(item, index) in statistics.leaveList" :key="`l-${index}`" class="list-item">{{ userName(item) }}</text>
          </view>
        </template>
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
  gap: 24rpx;
  padding: 24rpx;
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
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
}

.tag {
  flex-shrink: 0;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  font-size: var(--text-size-caption);
  font-weight: 600;
}

.info-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12rpx;
  font-size: var(--text-size-body);
}

.info-label {
  width: 128rpx;
  color: var(--text-muted);
}

.info-value {
  flex: 1;
  color: var(--text-primary);
  text-align: right;
}

.state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 48rpx 24rpx;
  margin-bottom: 24rpx;
  background-color: var(--surface);
  border-radius: var(--rounded-lg);
  box-shadow: var(--shadow-soft);
}

.state-text {
  font-size: var(--text-size-subhead);
  font-weight: 600;
  color: var(--text-primary);
}

.state-sub {
  font-size: var(--text-size-caption);
  color: var(--text-muted);
}

.action-section {
  padding: 0 0 24rpx;
}

.action-section.secondary :deep(.app-button) {
  background-color: var(--text-muted);
}

.section-title {
  margin: 24rpx 0 16rpx;
  font-size: var(--text-size-subhead);
  font-weight: 600;
  color: var(--text-primary);
}

.statistics-card {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  padding: 24rpx;
  margin-bottom: 24rpx;
  background-color: var(--surface);
  border-radius: var(--rounded-lg);
  box-shadow: var(--shadow-soft);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.stat-value {
  font-size: var(--text-size-title);
  font-weight: 700;
  color: var(--text-primary);
}

.stat-value.present {
  color: #22C55E;
}

.stat-value.absent {
  color: #EF4444;
}

.stat-value.leave {
  color: #F97316;
}

.stat-label {
  font-size: var(--text-size-caption);
  color: var(--text-muted);
}

.list-card {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  background-color: var(--surface);
  border-radius: var(--rounded-lg);
  box-shadow: var(--shadow-soft);
}

.list-title {
  font-size: var(--text-size-body);
  font-weight: 600;
  color: var(--text-primary);
}

.list-item {
  font-size: var(--text-size-body);
  color: var(--text-secondary);
}

.safe-bottom {
  height: 48rpx;
}
</style>
