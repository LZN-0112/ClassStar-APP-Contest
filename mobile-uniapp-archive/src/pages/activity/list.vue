<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import StatusBar from '@/components/StatusBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import BackButton from '@/components/BackButton.vue'
import { getActivityList, type ActivityItem } from '@/common/api/activities'
import { getCurrentClassId } from '@/common/utils/class'
import { secureStorage } from '@/common/storage/secure'

const loading = ref(false)
const activityList = ref<ActivityItem[]>([])
const page = ref(1)
const pageSize = 10
const total = ref(0)
const hasMore = computed(() => activityList.value.length < total.value)
const role = computed(() => secureStorage.get<string>('currentIdentity') || '学生')
const isCommittee = computed(() => role.value !== '学生')

const statusOptions: { label: string; value: string }[] = [
  { label: '全部', value: '' },
  { label: '报名中', value: 'registering' },
  { label: '进行中', value: 'ongoing' },
  { label: '已结束', value: 'ended' },
]
const currentStatus = ref('')

function formatDateTime(date?: string, time?: string) {
  if (!date) return ''
  const d = new Date(date)
  const dateStr = `${String(d.getMonth() + 1).padStart(2, '0')}月${String(d.getDate()).padStart(2, '0')}日`
  return time ? `${dateStr} ${time}` : dateStr
}

function metaText(item: ActivityItem) {
  return `${formatDateTime(item.eventDate, item.eventTime)}  ·  ${item.location || ''}`
}

function registrationText(item: ActivityItem) {
  const count = item.registeredCount || 0
  if (item.capacity && count >= item.capacity) return '报名 已满'
  if (item.capacity) return `报名 ${count}/${item.capacity}`
  return `报名 ${count}人`
}

function isFull(item: ActivityItem) {
  return !!(item.capacity && item.registeredCount && item.registeredCount >= item.capacity)
}

function actionInfo(item: ActivityItem) {
  if (item.status === 'registering' && !isFull(item)) {
    return { text: '报名', color: 'var(--accent)' }
  }
  if (item.status === 'ongoing') {
    return { text: '进行中', color: '#F59E0B' }
  }
  if (item.status === 'ended') {
    return { text: '已结束', color: '#6B7280' }
  }
  if (item.status === 'closed' || isFull(item)) {
    return { text: '已满', color: '#6B7280' }
  }
  return { text: item.displayStatus || item.status, color: '#6B7280' }
}

async function loadList(reset = false) {
  const classId = getCurrentClassId()
  if (!classId) {
    uni.showToast({ title: '未选择班级', icon: 'none' })
    return
  }
  if (reset) {
    page.value = 1
    activityList.value = []
  }
  loading.value = true
  try {
    const params: { page: number; pageSize: number; status?: string } = {
      page: page.value,
      pageSize,
    }
    if (currentStatus.value) params.status = currentStatus.value
    const res = await getActivityList(classId, params)
    activityList.value = reset ? res.list : [...activityList.value, ...res.list]
    total.value = res.total
  } catch (err) {
    const message = err instanceof Error ? err.message : '加载失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    loading.value = false
  }
}

function onStatusChange(status: string) {
  currentStatus.value = status
  loadList(true)
}

function onItemClick(item: ActivityItem) {
  uni.navigateTo({ url: `/pages/activity/detail?id=${item.id}` })
}

function onPublish() {
  uni.navigateTo({ url: '/pages/activity/publish' })
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
      <text class="title">活动列表</text>
      <view v-if="isCommittee" class="action" @click="onPublish">
        <AppIcon icon="lucide:plus" size="40rpx" color="#FFFFFF" />
      </view>
      <view v-else class="action-placeholder" />
    </view>

    <view class="filter-bar">
      <view
        v-for="opt in statusOptions"
        :key="opt.value"
        class="filter-item"
        :class="{ active: currentStatus === opt.value }"
        @click="onStatusChange(opt.value)"
      >
        <text class="filter-text">{{ opt.label }}</text>
      </view>
    </view>

    <scroll-view scroll-y class="content" @scrolltolower="onLoadMore">
      <view v-if="activityList.length === 0 && !loading" class="empty">
        <AppIcon icon="lucide:calendar-x" size="96rpx" color="var(--text-muted)" />
        <text class="empty-text">暂无活动</text>
      </view>

      <view
        v-for="item in activityList"
        :key="item.id"
        class="activity-card"
        @click="onItemClick(item)"
      >
        <view class="activity-header">
          <text class="activity-title">{{ item.title }}</text>
          <view
            class="action-tag"
            :style="{ backgroundColor: actionInfo(item).color + '1A', color: actionInfo(item).color }"
          >
            <text>{{ actionInfo(item).text }}</text>
          </view>
        </view>

        <text class="activity-meta">{{ metaText(item) }}</text>
        <text class="activity-registration">{{ registrationText(item) }}</text>
      </view>

      <view v-if="loading && activityList.length > 0" class="load-more">
        <text>加载中...</text>
      </view>
      <view v-else-if="!hasMore && activityList.length > 0" class="load-more">
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

.filter-bar {
  display: flex;
  flex-direction: row;
  gap: 16rpx;
  padding: 24rpx;
  background-color: var(--surface);
  border-bottom: 2rpx solid var(--border-subtle);
}

.filter-item {
  padding: 12rpx 32rpx;
  border-radius: 999rpx;
  background-color: var(--border-subtle);
  transition: all 0.2s ease;
}

.filter-item.active {
  background-color: var(--accent);
}

.filter-text {
  font-size: var(--text-size-caption);
  font-weight: 500;
  color: var(--text-secondary);
}

.filter-item.active .filter-text {
  color: var(--text-inverse);
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

.activity-card {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  background-color: var(--surface);
  border-radius: var(--rounded-lg);
  box-shadow: var(--shadow-soft);
}

.activity-header {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.activity-title {
  flex: 1;
  font-size: var(--text-size-subhead);
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
}

.action-tag {
  flex-shrink: 0;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  font-size: var(--text-size-caption);
  font-weight: 600;
}

.activity-meta {
  font-size: var(--text-size-body);
  color: var(--text-secondary);
}

.activity-registration {
  font-size: var(--text-size-caption);
  color: var(--text-muted);
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
