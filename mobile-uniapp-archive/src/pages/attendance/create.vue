<script setup lang="ts">
import { ref, computed } from 'vue'
import StatusBar from '@/components/StatusBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import BackButton from '@/components/BackButton.vue'
import AppButton from '@/components/AppButton.vue'
import AppInput from '@/components/AppInput.vue'
import { createAttendance, type CreateAttendanceData } from '@/common/api/attendances'
import { getCurrentClassId } from '@/common/utils/class'

const title = ref('')
const method = ref<CreateAttendanceData['method']>('normal')
const location = ref('')
const code = ref('')
const submitting = ref(false)

const startDate = ref('')
const startTimeValue = ref('')
const endDate = ref('')
const endTimeValue = ref('')

const methodOptions: { label: string; value: CreateAttendanceData['method'] }[] = [
  { label: '普通签到', value: 'normal' },
  { label: '二维码', value: 'qr' },
  { label: '口令', value: 'code' },
  { label: '定位', value: 'gps' },
  { label: '人脸', value: 'face' },
]

const codeRequired = computed(() => method.value === 'code')

function nowString() {
  const d = new Date()
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return { date, time }
}

function initDefaults() {
  const { date, time } = nowString()
  startDate.value = date
  startTimeValue.value = time
  endDate.value = date
  endTimeValue.value = time
}
initDefaults()

function onStartDateChange(e: any) {
  startDate.value = e.detail.value
}
function onStartTimeChange(e: any) {
  startTimeValue.value = e.detail.value
}
function onEndDateChange(e: any) {
  endDate.value = e.detail.value
}
function onEndTimeChange(e: any) {
  endTimeValue.value = e.detail.value
}
function combineDateTime(date: string, time: string) {
  if (!date || !time) return ''
  return `${date}T${time}`
}

function validate(): string {
  if (!title.value.trim()) return '请输入签到标题'
  if (!startDate.value || !startTimeValue.value) return '请选择开始时间'
  if (!endDate.value || !endTimeValue.value) return '请选择结束时间'
  if (new Date(combineDateTime(endDate.value, endTimeValue.value)) <= new Date(combineDateTime(startDate.value, startTimeValue.value))) {
    return '结束时间必须晚于开始时间'
  }
  if (codeRequired.value && !code.value.trim()) return '请输入签到口令'
  return ''
}

async function onSubmit() {
  const error = validate()
  if (error) {
    uni.showToast({ title: error, icon: 'none' })
    return
  }
  const classId = getCurrentClassId()
  if (!classId) {
    uni.showToast({ title: '未选择班级', icon: 'none' })
    return
  }

  let start = ''
  let end = ''
  start = combineDateTime(startDate.value, startTimeValue.value)
  end = combineDateTime(endDate.value, endTimeValue.value)

  const data: CreateAttendanceData = {
    title: title.value.trim(),
    startTime: start,
    endTime: end,
    method: method.value,
    location: location.value.trim() || undefined,
    code: codeRequired.value ? code.value.trim() : undefined,
  }

  submitting.value = true
  try {
    await createAttendance(classId, data)
    uni.showToast({ title: '创建成功', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 800)
  } catch (err) {
    const message = err instanceof Error ? err.message : '创建失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <view class="page">
    <StatusBar dark />

    <view class="header">
      <BackButton class="back" />
      <text class="title">创建签到</text>
      <view class="action-placeholder" />
    </view>

    <scroll-view scroll-y class="content">
      <view class="form-card">
        <view class="form-row">
          <text class="form-label">标题</text>
          <AppInput v-model="title" placeholder="请输入签到标题" />
        </view>

        <view class="form-row">
          <text class="form-label">开始时间</text>
          <view class="datetime-wrapper">
            <picker mode="date" :value="startDate" @change="onStartDateChange">
              <view class="datetime-text">{{ startDate || '选择日期' }}</view>
            </picker>
            <picker mode="time" :value="startTimeValue" @change="onStartTimeChange">
              <view class="datetime-text">{{ startTimeValue || '选择时间' }}</view>
            </picker>
          </view>
        </view>

        <view class="form-row">
          <text class="form-label">结束时间</text>
          <view class="datetime-wrapper">
            <picker mode="date" :value="endDate" @change="onEndDateChange">
              <view class="datetime-text">{{ endDate || '选择日期' }}</view>
            </picker>
            <picker mode="time" :value="endTimeValue" @change="onEndTimeChange">
              <view class="datetime-text">{{ endTimeValue || '选择时间' }}</view>
            </picker>
          </view>
        </view>

        <view class="form-row">
          <text class="form-label">签到方式</text>
          <view class="method-options">
            <view
              v-for="opt in methodOptions"
              :key="opt.value"
              class="method-item"
              :class="{ active: method === opt.value }"
              @click="method = opt.value"
            >
              <text class="method-text">{{ opt.label }}</text>
            </view>
          </view>
        </view>

        <view class="form-row">
          <text class="form-label">地点</text>
          <AppInput v-model="location" placeholder="请输入签到地点（选填）" />
        </view>

        <view v-if="codeRequired" class="form-row">
          <text class="form-label">签到口令</text>
          <AppInput v-model="code" placeholder="请输入签到口令" />
        </view>
      </view>

      <view class="action-section">
        <AppButton :loading="submitting" @click="onSubmit">创建签到</AppButton>
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

.form-row {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.form-label {
  font-size: var(--text-size-body);
  font-weight: 500;
  color: var(--text-primary);
}

.datetime-wrapper {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
  width: 100%;
  height: 112rpx;
  padding: 0 32rpx;
  box-sizing: border-box;
  border-radius: var(--rounded-lg);
  border: 2rpx solid var(--border);
  background-color: var(--surface);
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

.datetime-text {
  font-size: var(--text-size-body);
  color: var(--text-primary);
}

.method-options {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 16rpx;
}

.method-item {
  padding: 16rpx 28rpx;
  border-radius: 999rpx;
  background-color: var(--border-subtle);
  transition: all 0.2s ease;
}

.method-item.active {
  background-color: var(--accent);
}

.method-text {
  font-size: var(--text-size-caption);
  font-weight: 500;
  color: var(--text-secondary);
}

.method-item.active .method-text {
  color: var(--text-inverse);
}

.action-section {
  padding: 0 0 24rpx;
}

.safe-bottom {
  height: 48rpx;
}
</style>
