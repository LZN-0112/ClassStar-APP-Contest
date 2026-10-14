<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import StatusBar from '@/components/StatusBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import BackButton from '@/components/BackButton.vue'
import AppButton from '@/components/AppButton.vue'
import { getAttendanceList, type AttendanceItem } from '@/common/api/attendances'
import { getCurrentClassId } from '@/common/utils/class'
import { secureStorage } from '@/common/storage/secure'

const loading = ref(false)
const attendanceList = ref<AttendanceItem[]>([])
const page = ref(1)
const pageSize = 10
const total = ref(0)
const hasMore = computed(() => attendanceList.value.length < total.value)
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

function formatTime(time?: string) {
  if (!time) return ''
  const d = new Date(time)
  const now = new Date()
  const isToday = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  const isYesterday = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate() - 1
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  if (isToday) return `今天 ${hours}:${minutes}`
  if (isYesterday) return `昨天 ${hours}:${minutes}`
  return `${d.getMonth() + 1}月${d.getDate()}日 ${hours}:${minutes}`
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

async function loadList(reset = false) {
  const classId = getCurrentClassId()
  if (!classId) {
    uni.showToast({ title: '未选择班级', icon: 'none' })
    return
  }
  if (reset) {
    page.value = 1
    attendanceList.value = []
  }
  loading.value = true
  try {
    const res = await getAttendanceList(classId, { page: page.value, pageSize })
    attendanceList.value = reset ? res.list : [...attendanceList.value, ...res.list]
    total.value = res.pagination.total
  } catch (err) {
    const message = err instanceof Error ? err.message : '加载失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    loading.value = false
  }
}

function onItemClick(item: AttendanceItem) {
  const isOngoing = ['open', 'active', 'ongoing'].includes(item.status)
  if (!isCommittee.value && isOngoing) {
    uni.navigateTo({ url: `/pages/attendance/check-in?id=${item.id}` })
    return
  }
  uni.navigateTo({ url: `/pages/attendance/detail?id=${item.id}` })
}

function onCreate() {
  uni.navigateTo({ url: '/pages/attendance/create' })
}

function onLoadMore() {
  if (!hasMore.value || loading.value) return
  page.value += 1
  loadList()
}

onMounted(() => {
  loadList(true)
})
</script>

<template>
  <view class="page">
    <StatusBar dark />

    <view class="header">
      <BackButton class="back" light />
      <text class="title">考勤</text>
      <text v-if="isCommittee" class="publish" @click="onCreate">发起签到</text>
      <view v-else class="action-placeholder" />
    </view>

    <scroll-view scroll-y class="content" @scrolltolower="onLoadMore">
      <view v-if="attendanceList.length === 0 && !loading" class="empty">
        <AppIcon icon="lucide:clipboard-list" size="96rpx" color="var(--text-muted)" />
        <text class="empty-text">暂无签到</text>
      </view>

      <view
        v-for="item in attendanceList"
        :key="item.id"
        class="attendance-card"
        @click="onItemClick(item)"
      >
        <view class="attendance-icon" :style="{ backgroundColor: statusColor(item.status) + '1A' }">
          <AppIcon icon="lucide:calendar-check" size="44rpx" :color="statusColor(item.status)" />
        </view>
        <view class="attendance-body">
          <view class="attendance-row">
            <text class="attendance-title">{{ item.title }}</text>
            <view class="tag" :style="{ backgroundColor: statusColor(item.status) + '1A', color: statusColor(item.status) }">
              <text>{{ statusLabel(item.status) }}</text>
            </view>
          </view>
          <text class="attendance-time">{{ formatTime(item.startTime) }}</text>
        </view>
      </view>

      <view v-if="loading && attendanceList.length > 0" class="load-more">
        <text>加载中...</text>
      </view>
      <view v-else-if="!hasMore && attendanceList.length > 0" class="load-more">
        <text>没有更多了</text>
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
  background: linear-gradient(180deg, #076CAB 0%, #32C9FD 100%);
}

.back,
.action,
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
  color: #FFFFFF;
}

.publish {
  font-size: 28rpx;
  font-weight: 500;
  color: #FFFFFF;
  padding: 16rpx;
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

.attendance-card {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 24rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  background-color: var(--surface);
  border-radius: var(--rounded-lg);
  box-shadow: var(--shadow-soft);
}

.attendance-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 76rpx;
  height: 76rpx;
  border-radius: 9999rpx;
  flex-shrink: 0;
}

.attendance-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  overflow: hidden;
}

.attendance-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.tag {
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  font-size: var(--text-size-caption);
  font-weight: 600;
  flex-shrink: 0;
}

.attendance-title {
  flex: 1;
  font-size: var(--text-size-subhead);
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attendance-time {
  font-size: var(--text-size-caption);
  color: var(--text-secondary);
}

.load-more {
  text-align: center;
  padding: 24rpx 0;
  font-size: var(--text-size-caption);
  color: var(--text-muted);
}

.safe-bottom {
  height: 48rpx;
}
</style>
