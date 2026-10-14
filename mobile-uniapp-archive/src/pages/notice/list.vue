<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import StatusBar from '@/components/StatusBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import BackButton from '@/components/BackButton.vue'
import { getMessageList, type MessageItem, type MessageType } from '@/common/api/messages'
import { getCurrentClassId } from '@/common/utils/class'
import { secureStorage } from '@/common/storage/secure'

const loading = ref(false)
const messageList = ref<MessageItem[]>([])
const page = ref(1)
const pageSize = 10
const total = ref(0)
const hasMore = computed(() => messageList.value.length < total.value)
const role = computed(() => secureStorage.get<string>('currentIdentity') || '学生')
const isCommittee = computed(() => role.value !== '学生')

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

async function loadList(reset = false) {
  const classId = getCurrentClassId()
  if (!classId) {
    uni.showToast({ title: '未选择班级', icon: 'none' })
    return
  }
  if (reset) {
    page.value = 1
    messageList.value = []
  }
  loading.value = true
  try {
    const res = await getMessageList(classId, { page: page.value, pageSize })
    messageList.value = reset ? res.list : [...messageList.value, ...res.list]
    total.value = res.pagination.total
  } catch (err) {
    const message = err instanceof Error ? err.message : '加载失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    loading.value = false
  }
}

function onItemClick(item: MessageItem) {
  uni.navigateTo({ url: `/pages/notice/detail?id=${item.id}` })
}

function onPublish() {
  uni.navigateTo({ url: '/pages/notice/publish' })
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
      <text class="title">通知</text>
      <text v-if="isCommittee" class="publish" @click="onPublish">发布</text>
      <view v-else class="action-placeholder" />
    </view>

    <scroll-view scroll-y class="content" @scrolltolower="onLoadMore">
      <view v-if="messageList.length === 0 && !loading" class="empty">
        <AppIcon icon="lucide:bell-off" size="96rpx" color="#9CA3AF" />
        <text class="empty-text">暂无通知</text>
      </view>

      <view class="notice-list">
        <view
          v-for="item in messageList"
          :key="item.id"
          class="notice-item"
          @click="onItemClick(item)"
        >
          <view class="icon-wrap" :style="{ backgroundColor: typeColor(item.type) }">
            <AppIcon :icon="typeIcon(item.type)" size="40rpx" color="#FFFFFF" />
          </view>
          <view class="notice-body">
            <text class="notice-title">{{ item.title }}</text>
            <text class="notice-meta">
              {{ formatTime(item.createdAt) }} · {{ typeLabel(item.type) }}
            </text>
          </view>
        </view>
      </view>

      <view v-if="loading && messageList.length > 0" class="load-more">
        <text>加载中...</text>
      </view>
      <view v-else-if="!hasMore && messageList.length > 0" class="load-more">
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
  background-color: #F8F8F8;
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
.action-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80rpx;
  height: 80rpx;
}

.title {
  font-size: 36rpx;
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

.load-more {
  text-align: center;
  padding: 24rpx 0;
  font-size: var(--text-size-caption);
  color: #9CA3AF;
}

.safe-bottom {
  height: 48rpx;
}
</style>
