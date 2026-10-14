<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import StatusBar from '@/components/StatusBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import BackButton from '@/components/BackButton.vue'
import AppButton from '@/components/AppButton.vue'
import {
  getMessageDetail,
  ackMessage,
  type MessageType,
  type MessageDetail,
  type Attachment,
} from '@/common/api/messages'
import { getCurrentClassId } from '@/common/utils/class'

const messageId = ref('')
const detail = ref<MessageDetail | null>(null)
const loading = ref(false)
const acking = ref(false)

const typeOptions: { label: string; value: MessageType }[] = [
  { label: '通知', value: 'notice' },
  { label: '作业', value: 'homework' },
  { label: '活动', value: 'activity' },
]

function typeLabel(type?: MessageType) {
  return typeOptions.find((opt) => opt.value === type)?.label || '通知'
}

function typeColor(type?: MessageType) {
  const map: Record<string, string> = {
    notice: '#2563EB',
    homework: '#F97316',
    activity: '#EF4444',
  }
  return map[type || ''] || '#2563EB'
}

function formatTime(time?: string) {
  if (!time) return ''
  const d = new Date(time)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatFileSize(size?: number) {
  if (size === undefined || size === null) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(2)} MB`
}

onLoad((option) => {
  messageId.value = option?.id || ''
})

onMounted(() => {
  if (messageId.value) {
    loadDetail()
  }
})

async function loadDetail() {
  const classId = getCurrentClassId()
  if (!classId) {
    uni.showToast({ title: '未选择班级', icon: 'none' })
    return
  }
  loading.value = true
  try {
    detail.value = await getMessageDetail(classId, messageId.value)
  } catch (err) {
    const message = err instanceof Error ? err.message : '加载失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function onAck() {
  const classId = getCurrentClassId()
  if (!classId || !detail.value) return
  acking.value = true
  try {
    await ackMessage(classId, detail.value.id)
    uni.showToast({ title: '签收成功', icon: 'success' })
    await loadDetail()
  } catch (err) {
    const message = err instanceof Error ? err.message : '签收失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    acking.value = false
  }
}

function onAttachmentClick(att: Attachment) {
  uni.downloadFile({
    url: att.fileUrl,
    success: (res) => {
      if (res.statusCode === 200) {
        uni.openDocument({
          filePath: res.tempFilePath,
          showMenu: true,
          fail: () => {
            uni.setClipboardData({
              data: att.fileUrl,
              success: () => uni.showToast({ title: '链接已复制', icon: 'none' }),
            })
          },
        })
      } else {
        uni.showToast({ title: '下载失败', icon: 'none' })
      }
    },
    fail: () => {
      uni.setClipboardData({
        data: att.fileUrl,
        success: () => uni.showToast({ title: '链接已复制', icon: 'none' }),
      })
    },
  })
}
</script>

<template>
  <view class="page">
    <StatusBar dark />

    <view class="header">
      <BackButton class="back" />
      <text class="title">通知详情</text>
      <view class="action-placeholder" />
    </view>

    <scroll-view scroll-y class="content">
      <view v-if="loading && !detail" class="empty">
        <text class="empty-text">加载中...</text>
      </view>

      <template v-if="detail">
        <view class="detail-card">
          <view class="detail-header">
            <view
              class="tag"
              :style="{
                backgroundColor: typeColor(detail.type) + '1A',
                color: typeColor(detail.type),
              }"
            >
              <text>{{ typeLabel(detail.type) }}</text>
            </view>
            <text class="time">{{ formatTime(detail.createdAt) }}</text>
          </view>

          <text class="detail-title">{{ detail.title }}</text>

          <view class="detail-meta">
            <text class="meta-text">发布人：{{ detail.publisher?.name || '未知' }}</text>
            <text class="meta-text">已读 {{ detail.readCount || 0 }} 人</text>
          </view>

          <text class="detail-content">{{ detail.content }}</text>

          <view v-if="detail.location" class="extra-row">
            <AppIcon icon="lucide:map-pin" size="28rpx" color="var(--text-muted)" />
            <text class="extra-text">{{ detail.location }}</text>
          </view>

          <view v-if="detail.eventTime" class="extra-row">
            <AppIcon icon="lucide:clock" size="28rpx" color="var(--text-muted)" />
            <text class="extra-text">{{ formatTime(detail.eventTime) }}</text>
          </view>
        </view>

        <view v-if="detail.attachments?.length" class="attachments-card">
          <text class="section-title">附件</text>
          <view
            v-for="att in detail.attachments"
            :key="att.fileUrl"
            class="attachment-item"
            @click="onAttachmentClick(att)"
          >
            <AppIcon icon="lucide:file-text" size="40rpx" color="var(--accent)" />
            <view class="attachment-info">
              <text class="attachment-name">{{ att.fileName }}</text>
              <text class="attachment-size">{{ formatFileSize(att.fileSize) }}</text>
            </view>
            <AppIcon icon="lucide:download" size="32rpx" color="var(--text-muted)" />
          </view>
        </view>

        <view v-if="detail.requireAck" class="ack-card">
          <AppIcon
            :icon="detail.isAcked ? 'lucide:check-circle' : 'lucide:circle'"
            size="40rpx"
            :color="detail.isAcked ? 'var(--accent)' : 'var(--text-muted)'"
          />
          <text :class="['ack-text', { acked: detail.isAcked }]">
            {{ detail.isAcked ? '已签收' : '未签收' }}
          </text>
        </view>

        <view v-if="detail.requireAck && !detail.isAcked" class="action-area">
          <AppButton :loading="acking" @click="onAck">签收</AppButton>
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

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;
}

.empty-text {
  font-size: var(--text-size-body);
  color: var(--text-muted);
}

.detail-card,
.attachments-card,
.ack-card {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  background-color: var(--surface);
  border-radius: var(--rounded-lg);
  box-shadow: var(--shadow-soft);
}

.detail-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.tag {
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  font-size: var(--text-size-caption);
  font-weight: 600;
}

.time {
  font-size: var(--text-size-caption);
  color: var(--text-muted);
}

.detail-title {
  font-size: var(--text-size-subhead);
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
}

.detail-meta {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.meta-text {
  font-size: var(--text-size-caption);
  color: var(--text-muted);
}

.detail-content {
  font-size: var(--text-size-body);
  color: var(--text-secondary);
  line-height: 1.6;
  white-space: pre-wrap;
}

.extra-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12rpx;
}

.extra-text {
  font-size: var(--text-size-body);
  color: var(--text-secondary);
}

.section-title {
  font-size: var(--text-size-body);
  font-weight: 600;
  color: var(--text-primary);
}

.attachment-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx;
  background-color: var(--border-subtle);
  border-radius: var(--rounded-md);
}

.attachment-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 4rpx;
  overflow: hidden;
}

.attachment-name {
  font-size: var(--text-size-body);
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-size {
  font-size: var(--text-size-caption);
  color: var(--text-muted);
}

.ack-card {
  flex-direction: row;
  align-items: center;
  gap: 12rpx;
}

.ack-text {
  font-size: var(--text-size-body);
  color: var(--text-muted);
}

.ack-text.acked {
  color: var(--accent);
}

.action-area {
  margin-top: 8rpx;
}

.safe-bottom {
  height: 48rpx;
}
</style>
