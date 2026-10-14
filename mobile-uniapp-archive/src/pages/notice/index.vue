<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import StatusBar from '@/components/StatusBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import { getMessageList, type MessageItem, type MessageType } from '@/common/api/messages'
import { getCurrentClassId } from '@/common/utils/class'
import { secureStorage } from '@/common/storage/secure'

const loading = ref(false)
const activeTab = ref<'notice' | 'interaction'>('notice')
const noticeList = ref<MessageItem[]>([])
const interactionList = ref<MessageItem[]>([])

const role = computed(() => secureStorage.get<string>('currentIdentity') || '学生')
const isCommittee = computed(() => role.value !== '学生')

const tabs = [
  { key: 'notice', label: '通知' },
  { key: 'interaction', label: '互动' },
]

function formatTime(time?: string) {
  if (!time) return ''
  const d = new Date(time)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function typeIcon(type?: MessageType) {
  const map: Record<string, string> = {
    notice: 'lucide:bell',
    homework: 'lucide:file-text',
    activity: 'lucide:calendar',
    attendance: 'lucide:calendar-check',
    material: 'lucide:folder',
  }
  return map[type || ''] || 'lucide:bell'
}

function typeColor(type?: MessageType) {
  const map: Record<string, string> = {
    notice: '#2563EB',
    homework: '#F97316',
    activity: '#EF4444',
    attendance: '#22C55E',
    material: '#A855F7',
  }
  return map[type || ''] || '#2563EB'
}

function typeLabel(type?: MessageType) {
  const map: Record<string, string> = { notice: '通知', homework: '作业', activity: '活动', attendance: '签到', material: '资料' }
  return map[type || ''] || '通知'
}

const currentList = computed(() => (activeTab.value === 'notice' ? noticeList.value : interactionList.value))

async function loadList() {
  const classId = getCurrentClassId()
  if (!classId) return
  loading.value = true
  try {
    const [noticeRes, interactionRes] = await Promise.all([
      getMessageList(classId, { page: 1, pageSize: 10 }),
      getMessageList(classId, { page: 1, pageSize: 10, type: 'notice' }),
    ])
    noticeList.value = noticeRes.list || []
    interactionList.value = interactionRes.list || []
  } catch (err) {
    const message = err instanceof Error ? err.message : '加载失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    loading.value = false
  }
}

function onTab(tab: 'notice' | 'interaction') {
  activeTab.value = tab
}

function onItem(item: MessageItem) {
  uni.navigateTo({ url: `/pages/notice/detail?id=${item.id}` })
}

function onPublish() {
  uni.navigateTo({ url: '/pages/notice/publish' })
}

function onMore() {
  uni.navigateTo({ url: '/pages/notice/list' })
}

onMounted(() => {
  loadList()
})
</script>

<template>
  <view class="page">
    <StatusBar dark />

    <view class="header">
      <text class="title">通知</text>
      <text v-if="isCommittee" class="publish" @click="onPublish">发布</text>
    </view>

    <view class="tabs">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="tab"
        :class="{ active: activeTab === tab.key }"
        @click="onTab(tab.key as any)"
      >
        <text class="tab-text">{{ tab.label }}</text>
      </view>
    </view>

    <scroll-view scroll-y class="content" @scrolltolower="onMore">
      <view v-if="currentList.length === 0 && !loading" class="empty">
        <AppIcon icon="lucide:bell-off" size="80rpx" color="#9CA3AF" />
        <text class="empty-text">暂无{{ activeTab === 'notice' ? '通知' : '互动消息' }}</text>
      </view>

      <view class="notice-list">
        <view
          v-for="item in currentList"
          :key="item.id"
          class="notice-item"
          @click="onItem(item)"
        >
          <view class="icon-wrap" :style="{ backgroundColor: typeColor(item.type) }">
            <AppIcon :icon="typeIcon(item.type)" size="40rpx" color="#FFFFFF" />
          </view>
          <view class="notice-body">
            <text class="notice-title">{{ item.title }}</text>
            <text class="notice-meta">
              {{ formatTime(item.createdAt) }} · {{ item.isRead ? '已读' : '未读' }} · {{ typeLabel(item.type) }} · {{ item.publisher?.name || '未知' }}
            </text>
          </view>
          <view v-if="!item.isRead" class="unread-dot" />
        </view>
      </view>

      <view v-if="currentList.length > 0" class="more-hint" @click="onMore">
        <text>查看全部通知</text>
        <AppIcon icon="lucide:chevron-right" size="28rpx" color="#9CA3AF" />
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
  background-color: #F8F8F8;
}

.header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  height: 112rpx;
  padding: 0 32rpx;
  box-sizing: border-box;
  background: linear-gradient(180deg, #076CAB 0%, #32C9FD 100%);
}

.title {
  font-size: 40rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.publish {
  font-size: 30rpx;
  font-weight: 500;
  color: #FFFFFF;
}

.tabs {
  display: flex;
  flex-direction: row;
  gap: 8rpx;
  margin: 24rpx 32rpx;
  padding: 4rpx;
  border-radius: 8rpx;
  background-color: #FFFFFF;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
}

.tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 72rpx;
  border-radius: 8rpx;
}

.tab.active {
  background-color: #0062FF;
}

.tab-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #4B5563;
}

.tab.active .tab-text {
  color: #FFFFFF;
}

.content {
  flex: 1;
  padding: 0 32rpx;
  box-sizing: border-box;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
  padding: 120rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #9CA3AF;
}

.notice-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.notice-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 24rpx;
  padding: 28rpx;
  border-radius: 24rpx;
  background-color: #FFFFFF;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 76rpx;
  height: 76rpx;
  border-radius: 9999rpx;
  flex-shrink: 0;
}

.notice-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  overflow: hidden;
}

.notice-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1A1A1A;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notice-meta {
  font-size: 24rpx;
  color: #6B7280;
}

.unread-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 9999rpx;
  background-color: #EF4444;
  flex-shrink: 0;
}

.more-hint {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  margin-top: 32rpx;
  font-size: 26rpx;
  color: #9CA3AF;
}

.safe-bottom {
  height: 160rpx;
}
</style>
