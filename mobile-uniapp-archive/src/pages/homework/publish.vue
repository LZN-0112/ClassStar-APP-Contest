<script setup lang="ts">
import { ref, computed } from 'vue'
import StatusBar from '@/components/StatusBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import BackButton from '@/components/BackButton.vue'
import AppButton from '@/components/AppButton.vue'
import AppInput from '@/components/AppInput.vue'
import { createHomework, type CreateHomeworkData } from '@/common/api/homeworks'
import { getCurrentClassId } from '@/common/utils/class'

const subject = ref('')
const title = ref('')
const content = ref('')
const deadline = ref('')
const submitMethod = ref('')
const publishing = ref(false)

const datePart = computed(() => deadline.value ? deadline.value.split('T')[0] : '')
const timePart = computed(() => deadline.value ? deadline.value.split('T')[1] : '')

function onDateChange(e: any) {
  const date = e.detail.value as string
  deadline.value = date && timePart.value ? `${date}T${timePart.value}` : `${date}T00:00`
}

function onTimeChange(e: any) {
  const time = e.detail.value as string
  deadline.value = datePart.value ? `${datePart.value}T${time}` : `${new Date().toISOString().split('T')[0]}T${time}`
}

function resetForm() {
  subject.value = ''
  title.value = ''
  content.value = ''
  deadline.value = ''
  submitMethod.value = ''
}

async function onPublish() {
  const classId = getCurrentClassId()
  if (!classId) {
    uni.showToast({ title: '未选择班级', icon: 'none' })
    return
  }
  if (!subject.value.trim()) {
    uni.showToast({ title: '请输入科目', icon: 'none' })
    return
  }
  if (!title.value.trim()) {
    uni.showToast({ title: '请输入标题', icon: 'none' })
    return
  }
  if (!deadline.value) {
    uni.showToast({ title: '请选择截止时间', icon: 'none' })
    return
  }

  const data: CreateHomeworkData = {
    subject: subject.value.trim(),
    title: title.value.trim(),
    content: content.value.trim(),
    deadline: deadline.value,
    submitMethod: submitMethod.value.trim(),
  }

  publishing.value = true
  try {
    await createHomework(classId, data)
    uni.showToast({ title: '布置成功', icon: 'success' })
    resetForm()
    setTimeout(() => uni.navigateBack(), 800)
  } catch (err) {
    const message = err instanceof Error ? err.message : '布置失败'
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
      <text class="title">布置作业</text>
      <view class="action-placeholder" />
    </view>

    <scroll-view scroll-y class="content">
      <view class="form-card">
        <view class="form-item">
          <text class="form-label">科目</text>
          <AppInput v-model="subject" placeholder="请输入科目" />
        </view>

        <view class="form-item">
          <text class="form-label">标题</text>
          <AppInput v-model="title" placeholder="请输入作业标题" />
        </view>

        <view class="form-item">
          <text class="form-label">截止时间</text>
          <view class="datetime-row">
            <picker mode="date" :value="datePart" @change="onDateChange">
              <view class="datetime-picker">{{ datePart || '选择日期' }}</view>
            </picker>
            <picker mode="time" :value="timePart" @change="onTimeChange">
              <view class="datetime-picker">{{ timePart || '选择时间' }}</view>
            </picker>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">提交方式</text>
          <AppInput v-model="submitMethod" placeholder="请输入提交方式，如线上提交/纸质提交" />
        </view>

        <view class="form-item">
          <text class="form-label">作业内容</text>
          <textarea
            v-model="content"
            class="content-textarea"
            placeholder="请输入作业内容"
            maxlength="2000"
          />
        </view>
      </view>

      <view class="actions">
        <AppButton :loading="publishing" @click="onPublish">发布作业</AppButton>
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

.form-item {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.form-label {
  font-size: var(--text-size-body);
  font-weight: 600;
  color: var(--text-primary);
}

.datetime-input {
  width: 100%;
  height: 112rpx;
  padding: 0 32rpx;
  box-sizing: border-box;
  border-radius: var(--rounded-lg);
  border: 2rpx solid var(--border);
  background-color: var(--surface);
  font-size: var(--text-size-body);
  color: var(--text-primary);
}

.datetime-input::placeholder {
  color: var(--text-muted);
}

.datetime-row {
  display: flex;
  flex-direction: row;
  gap: 16rpx;
}

.datetime-picker {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 240rpx;
  height: 112rpx;
  padding: 0 24rpx;
  box-sizing: border-box;
  border-radius: var(--rounded-lg);
  border: 2rpx solid var(--border);
  background-color: var(--surface);
  font-size: var(--text-size-body);
  color: var(--text-primary);
}

.content-textarea {
  width: 100%;
  min-height: 240rpx;
  padding: 24rpx;
  box-sizing: border-box;
  border-radius: var(--rounded-lg);
  border: 2rpx solid var(--border);
  background-color: var(--surface);
  font-size: var(--text-size-body);
  color: var(--text-primary);
  line-height: 1.5;
}

.content-textarea::placeholder {
  color: var(--text-muted);
}

.actions {
  padding: 0 0 24rpx;
}

.safe-bottom {
  height: 48rpx;
}
</style>
