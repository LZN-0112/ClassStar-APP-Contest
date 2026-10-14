<script setup lang="ts">
import { ref } from 'vue'
import StatusBar from '@/components/StatusBar.vue'
import BackButton from '@/components/BackButton.vue'
import AppButton from '@/components/AppButton.vue'
import AppInput from '@/components/AppInput.vue'
import AppIcon from '@/components/AppIcon.vue'
import { createMessage, type CreateMessageData, type MessageType } from '@/common/api/messages'
import { getCurrentClassId } from '@/common/utils/class'

const typeOptions: { label: string; value: MessageType; color: string }[] = [
  { label: '通知', value: 'notice', color: '#2563EB' },
  { label: '作业', value: 'homework', color: '#F97316' },
  { label: '活动', value: 'activity', color: '#EF4444' },
]

const form = ref<CreateMessageData>({
  type: 'notice',
  title: '',
  content: '',
  location: '',
  eventTime: '',
  requireAck: false,
})

const publishing = ref(false)

// 小程序端日期、时间分开选择，组合后写入 form.eventTime
const eventDate = ref('')
const eventTimeStr = ref('')

function onTypeChange(type: MessageType) {
  form.value.type = type
}

function updateEventTime() {
  if (eventDate.value && eventTimeStr.value) {
    form.value.eventTime = `${eventDate.value}T${eventTimeStr.value}:00`
  } else {
    form.value.eventTime = ''
  }
}

function onDateChange(e: any) {
  eventDate.value = e.detail.value as string
  updateEventTime()
}

function onTimeChange(e: any) {
  eventTimeStr.value = e.detail.value as string
  updateEventTime()
}

function clearEventTime() {
  eventDate.value = ''
  eventTimeStr.value = ''
  form.value.eventTime = ''
}

function toggleRequireAck() {
  form.value.requireAck = !form.value.requireAck
}

async function onSubmit() {
  if (!form.value.title.trim()) {
    uni.showToast({ title: '请输入标题', icon: 'none' })
    return
  }
  if (!form.value.content.trim()) {
    uni.showToast({ title: '请输入内容', icon: 'none' })
    return
  }

  const classId = getCurrentClassId()
  if (!classId) {
    uni.showToast({ title: '未选择班级', icon: 'none' })
    return
  }

  publishing.value = true
  try {
    const data: CreateMessageData = {
      ...form.value,
      title: form.value.title.trim(),
      content: form.value.content.trim(),
      location: form.value.location?.trim() || undefined,
      eventTime: form.value.eventTime || undefined,
    }
    await createMessage(classId, data)
    uni.showToast({ title: '发布成功', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 800)
  } catch (err) {
    const message = err instanceof Error ? err.message : '发布失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    publishing.value = false
  }
}
</script>

<template>
  <view class="page">
    <StatusBar dark />

    <view class="header">
      <BackButton class="back" />
      <text class="title">发布通知</text>
      <view class="action-placeholder" />
    </view>

    <scroll-view scroll-y class="content">
      <view class="form-card">
        <view class="form-section">
          <text class="section-label">类型</text>
          <view class="type-list">
            <view
              v-for="opt in typeOptions"
              :key="opt.value"
              class="type-item"
              :class="{ active: form.type === opt.value }"
              :style="form.type === opt.value ? { backgroundColor: opt.color + '1A', color: opt.color } : undefined"
              @click="onTypeChange(opt.value)"
            >
              <text class="type-item-text">{{ opt.label }}</text>
            </view>
          </view>
        </view>

        <view class="form-section">
          <text class="section-label">标题</text>
          <AppInput v-model="form.title" placeholder="请输入通知标题" :maxlength="100" />
        </view>

        <view class="form-section">
          <text class="section-label">内容</text>
          <textarea
            v-model="form.content"
            class="form-textarea"
            placeholder="请输入通知内容..."
            maxlength="2000"
          />
        </view>

        <view class="form-section">
          <text class="section-label">地点（可选）</text>
          <AppInput v-model="form.location" placeholder="请输入地点" :maxlength="100" />
        </view>

        <view class="form-section">
          <text class="section-label">事件时间（可选）</text>

          <view class="picker-row">
            <picker mode="date" :value="eventDate" @change="onDateChange">
              <view class="picker-value" :class="{ placeholder: !eventDate }">
                {{ eventDate || '选择日期' }}
              </view>
            </picker>
            <picker mode="time" :value="eventTimeStr" @change="onTimeChange">
              <view class="picker-value" :class="{ placeholder: !eventTimeStr }">
                {{ eventTimeStr || '选择时间' }}
              </view>
            </picker>
            <view v-if="form.eventTime" class="clear-btn" @click="clearEventTime">
              <AppIcon icon="lucide:x" size="28rpx" color="var(--text-muted)" />
            </view>
          </view>
        </view>

        <view class="form-section ack-section" @click="toggleRequireAck">
          <text class="section-label">需要签收</text>
          <view class="switch" :class="{ active: form.requireAck }">
            <view v-if="form.requireAck" class="switch-check">
              <AppIcon icon="lucide:check" size="20rpx" color="#FFFFFF" />
            </view>
          </view>
        </view>
      </view>

      <view class="action-area">
        <AppButton :loading="publishing" @click="onSubmit">发布</AppButton>
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
  padding: 24rpx;
  box-sizing: border-box;
}

.form-card {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  background-color: var(--surface);
  border-radius: var(--rounded-lg);
  box-shadow: var(--shadow-soft);
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.section-label {
  font-size: var(--text-size-caption);
  font-weight: 500;
  color: var(--text-secondary);
}

.type-list {
  display: flex;
  flex-direction: row;
  gap: 16rpx;
}

.type-item {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12rpx 32rpx;
  border-radius: 999rpx;
  background-color: var(--border-subtle);
  transition: all 0.2s ease;
}

.type-item.active {
  background-color: var(--accent-100);
}

.type-item-text {
  font-size: var(--text-size-caption);
  font-weight: 500;
  color: var(--text-secondary);
}

.type-item.active .type-item-text {
  color: var(--accent);
}

.form-textarea {
  width: 100%;
  min-height: 240rpx;
  padding: 24rpx;
  box-sizing: border-box;
  font-size: var(--text-size-body);
  color: var(--text-primary);
  line-height: 1.5;
  background-color: var(--surface);
  border: 2rpx solid var(--border);
  border-radius: var(--rounded-lg);
  box-shadow: var(--shadow-soft);
  resize: none;
}

.form-textarea::placeholder {
  color: var(--text-muted);
}

.datetime-input-wrapper {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
  width: 100%;
  height: 112rpx;
  padding: 0 24rpx;
  box-sizing: border-box;
  background-color: var(--surface);
  border: 2rpx solid var(--border);
  border-radius: var(--rounded-lg);
  box-shadow: var(--shadow-soft);
}

.datetime-input {
  flex: 1;
  height: 100%;
  font-size: var(--text-size-body);
  color: var(--text-primary);
  background-color: transparent;
  border: none;
  outline: none;
}

.picker-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
}

picker {
  flex: 1;
}

.picker-value {
  flex: 1;
  display: flex;
  align-items: center;
  height: 112rpx;
  padding: 0 24rpx;
  box-sizing: border-box;
  font-size: var(--text-size-body);
  color: var(--text-primary);
  background-color: var(--surface);
  border: 2rpx solid var(--border);
  border-radius: var(--rounded-lg);
  box-shadow: var(--shadow-soft);
}

.picker-value.placeholder {
  color: var(--text-muted);
}

.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  flex-shrink: 0;
  background-color: var(--border-subtle);
  border-radius: 999rpx;
}

.ack-section {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-top: 8rpx;
}

.switch {
  position: relative;
  width: 96rpx;
  height: 56rpx;
  background-color: var(--border);
  border-radius: 999rpx;
  transition: background-color 0.2s ease;
}

.switch.active {
  background-color: var(--accent);
}

.switch::before {
  content: '';
  position: absolute;
  top: 4rpx;
  left: 4rpx;
  width: 48rpx;
  height: 48rpx;
  background-color: #ffffff;
  border-radius: 999rpx;
  transition: transform 0.2s ease;
}

.switch.active::before {
  transform: translateX(40rpx);
}

.switch-check {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.action-area {
  margin-top: 8rpx;
}

.safe-bottom {
  height: 48rpx;
}
</style>
