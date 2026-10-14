<script setup lang="ts">
import { ref } from 'vue'
import StatusBar from '@/components/StatusBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import BackButton from '@/components/BackButton.vue'
import AppInput from '@/components/AppInput.vue'
import AppButton from '@/components/AppButton.vue'
import { createActivity, type CreateActivityData } from '@/common/api/activities'
import { getCurrentClassId } from '@/common/utils/class'

const title = ref('')
const eventDate = ref('')
const eventTime = ref('')
const location = ref('')
const capacity = ref('')
const deadline = ref('')
const deadlineDate = ref('')
const deadlineTime = ref('')
const loading = ref(false)

function updateDeadline() {
  if (deadlineDate.value && deadlineTime.value) {
    deadline.value = `${deadlineDate.value}T${deadlineTime.value}:00`
  } else {
    deadline.value = ''
  }
}

function onDeadlineDateChange(e: any) {
  deadlineDate.value = e.detail.value as string
  updateDeadline()
}

function onDeadlineTimeChange(e: any) {
  deadlineTime.value = e.detail.value as string
  updateDeadline()
}

function onEventDateChange(e: any) {
  eventDate.value = e.detail.value as string
}

function onEventTimeChange(e: any) {
  eventTime.value = e.detail.value as string
}

function validateForm(): boolean {
  if (!title.value.trim()) {
    uni.showToast({ title: '请输入活动标题', icon: 'none' })
    return false
  }
  if (!eventDate.value) {
    uni.showToast({ title: '请选择活动日期', icon: 'none' })
    return false
  }
  if (!eventTime.value) {
    uni.showToast({ title: '请选择活动时间', icon: 'none' })
    return false
  }
  return true
}

async function onSubmit() {
  if (!validateForm()) return
  if (loading.value) return

  const classId = getCurrentClassId()
  if (!classId) {
    uni.showToast({ title: '未选择班级', icon: 'none' })
    return
  }

  const data: CreateActivityData = {
    title: title.value.trim(),
    eventDate: eventDate.value,
    eventTime: eventTime.value,
  }

  if (location.value.trim()) {
    data.location = location.value.trim()
  }

  const capacityNum = parseInt(capacity.value, 10)
  if (!isNaN(capacityNum) && capacityNum > 0) {
    data.capacity = capacityNum
  }

  if (deadline.value) {
    data.deadline = deadline.value
  }

  loading.value = true
  try {
    await createActivity(classId, data)
    uni.showToast({ title: '发布成功', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 800)
  } catch (err) {
    const message = err instanceof Error ? err.message : '发布失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <view class="page">
    <StatusBar dark />

    <view class="header">
      <BackButton class="back" />
      <text class="title">发布活动</text>
      <view class="action-placeholder" />
    </view>

    <scroll-view scroll-y class="content">
      <view class="form-card">
        <view class="form-item">
          <text class="form-label">活动标题</text>
          <AppInput
            v-model="title"
            placeholder="请输入活动标题"
          />
        </view>

        <view class="form-item">
          <text class="form-label">活动日期</text>
          <picker mode="date" :value="eventDate" @change="onEventDateChange">
            <view class="form-input-wrapper">
              <text class="form-input" :class="{ placeholder: !eventDate }">{{ eventDate || '请选择活动日期' }}</text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">活动时间</text>
          <picker mode="time" :value="eventTime" @change="onEventTimeChange">
            <view class="form-input-wrapper">
              <text class="form-input" :class="{ placeholder: !eventTime }">{{ eventTime || '请选择活动时间' }}</text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">活动地点</text>
          <AppInput
            v-model="location"
            placeholder="请输入活动地点"
          />
        </view>

        <view class="form-item">
          <text class="form-label">人数限制</text>
          <AppInput
            v-model="capacity"
            type="number"
            placeholder="请输入人数限制，留空表示不限"
          />
        </view>

        <view class="form-item">
          <text class="form-label">报名截止</text>
          <view class="picker-row">
            <picker mode="date" :value="deadlineDate" @change="onDeadlineDateChange">
              <view class="form-input-wrapper">
                <text class="form-input" :class="{ placeholder: !deadlineDate }">{{ deadlineDate || '选择日期' }}</text>
              </view>
            </picker>
            <picker mode="time" :value="deadlineTime" @change="onDeadlineTimeChange">
              <view class="form-input-wrapper">
                <text class="form-input" :class="{ placeholder: !deadlineTime }">{{ deadlineTime || '选择时间' }}</text>
              </view>
            </picker>
          </view>
        </view>
      </view>

      <view class="action-bar">
        <AppButton :loading="loading" @click="onSubmit">
          发布活动
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
  padding: 24rpx;
  box-sizing: border-box;
}

.form-card {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  background-color: var(--surface);
  border-radius: var(--rounded-lg);
  box-shadow: var(--shadow-soft);
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.form-label {
  font-size: var(--text-size-body);
  font-weight: 500;
  color: var(--text-primary);
}

.form-input-wrapper {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  height: 112rpx;
  padding: 0 32rpx;
  box-sizing: border-box;
  border-radius: var(--rounded-lg);
  border: 2rpx solid var(--border);
  background-color: var(--surface);
  box-shadow: var(--shadow-soft);
}

.form-input {
  flex: 1;
  height: 100%;
  font-size: var(--text-size-body);
  color: var(--text-primary);
  background-color: transparent;
  border: none;
  outline: none;
}

.form-input::placeholder {
  color: var(--text-muted);
}

.form-input.placeholder {
  color: var(--text-muted);
}

.picker-row {
  display: flex;
  flex-direction: row;
  gap: 16rpx;
}

.picker-row .form-input-wrapper {
  flex: 1;
}

.action-bar {
  margin-top: 24rpx;
}

.safe-bottom {
  height: 48rpx;
}
</style>
