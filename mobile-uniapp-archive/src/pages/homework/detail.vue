<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import StatusBar from '@/components/StatusBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import BackButton from '@/components/BackButton.vue'
import AppButton from '@/components/AppButton.vue'
import { getHomeworkDetail, submitHomework, type HomeworkDetail } from '@/common/api/homeworks'
import { getCurrentClassId } from '@/common/utils/class'
import { secureStorage } from '@/common/storage/secure'

const id = ref('')
const detail = ref<HomeworkDetail | null>(null)
const loading = ref(false)
const submitting = ref(false)
const submissionContent = ref('')
const role = computed(() => secureStorage.get<string>('currentIdentity') || '学生')
const isCommittee = computed(() => role.value !== '学生')
const isSubmitted = computed(() => !!detail.value?.mySubmission)

function formatTime(time?: string) {
  if (!time) return ''
  const d = new Date(time)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function loadDetail() {
  const classId = getCurrentClassId()
  if (!classId) {
    uni.showToast({ title: '未选择班级', icon: 'none' })
    return
  }
  if (!id.value) {
    uni.showToast({ title: '作业ID缺失', icon: 'none' })
    return
  }
  loading.value = true
  try {
    detail.value = await getHomeworkDetail(classId, id.value)
  } catch (err) {
    const message = err instanceof Error ? err.message : '加载失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function onSubmit() {
  const classId = getCurrentClassId()
  if (!classId || !id.value) return
  if (!submissionContent.value.trim()) {
    uni.showToast({ title: '请输入提交内容', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await submitHomework(classId, id.value, { content: submissionContent.value.trim() })
    uni.showToast({ title: '提交成功', icon: 'success' })
    await loadDetail()
  } catch (err) {
    const message = err instanceof Error ? err.message : '提交失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    submitting.value = false
  }
}

onLoad((query) => {
  id.value = query?.id || ''
  loadDetail()
})
</script>

<template>
  <view class="page">
    <StatusBar dark />

    <view class="header">
      <BackButton class="back" />
      <text class="title">作业详情</text>
      <view class="action-placeholder" />
    </view>

    <scroll-view scroll-y class="content">
      <view v-if="detail" class="detail-card">
        <view class="detail-header">
          <view class="subject-tag">
            <text>{{ detail.subject }}</text>
          </view>
          <view v-if="isCommittee" class="submission-count">
            <AppIcon icon="lucide:users" size="24rpx" color="var(--accent)" />
            <text>已提交 {{ detail.submissionCount || 0 }} 人</text>
          </view>
        </view>

        <text class="detail-title">{{ detail.title }}</text>

        <view class="meta-row">
          <AppIcon icon="lucide:clock" size="24rpx" color="var(--text-muted)" />
          <text class="meta-text">截止时间：{{ formatTime(detail.deadline) }}</text>
        </view>
        <view class="meta-row">
          <AppIcon icon="lucide:user" size="24rpx" color="var(--text-muted)" />
          <text class="meta-text">发布人：{{ detail.publisher?.name || '未知' }}</text>
        </view>

        <view class="section">
          <text class="section-title">作业内容</text>
          <text class="section-content">{{ detail.content || '暂无内容' }}</text>
        </view>
      </view>

      <view v-if="detail && isSubmitted" class="submission-card">
        <view class="submission-header">
          <AppIcon icon="lucide:check-circle" size="32rpx" color="#10B981" />
          <text class="submission-title">我的提交</text>
        </view>
        <text class="submission-time">提交时间：{{ formatTime(detail.mySubmission?.submittedAt) }}</text>
        <text class="submission-content">{{ detail.mySubmission?.content || '无提交内容' }}</text>
      </view>

      <view v-else-if="detail && !isSubmitted" class="submit-card">
        <text class="section-title">提交作业</text>
        <textarea
          v-model="submissionContent"
          class="submit-textarea"
          placeholder="请输入提交内容"
          maxlength="2000"
        />
        <AppButton :loading="submitting" @click="onSubmit">提交作业</AppButton>
      </view>

      <view v-else-if="!loading && !detail" class="empty">
        <AppIcon icon="lucide:file-question" size="96rpx" color="var(--text-muted)" />
        <text class="empty-text">作业加载失败</text>
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

.detail-card,
.submission-card,
.submit-card {
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

.subject-tag {
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  font-size: var(--text-size-caption);
  font-weight: 600;
  background-color: var(--accent-100);
  color: var(--accent);
}

.submission-count {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8rpx;
  font-size: var(--text-size-caption);
  color: var(--accent);
}

.detail-title {
  font-size: var(--text-size-title);
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
}

.meta-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12rpx;
}

.meta-text {
  font-size: var(--text-size-body);
  color: var(--text-secondary);
}

.section {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-top: 8rpx;
}

.section-title {
  font-size: var(--text-size-subhead);
  font-weight: 600;
  color: var(--text-primary);
}

.section-content {
  font-size: var(--text-size-body);
  color: var(--text-secondary);
  line-height: 1.6;
  white-space: pre-wrap;
}

.submission-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12rpx;
}

.submission-title {
  font-size: var(--text-size-subhead);
  font-weight: 600;
  color: #10B981;
}

.submission-time {
  font-size: var(--text-size-caption);
  color: var(--text-muted);
}

.submission-content {
  font-size: var(--text-size-body);
  color: var(--text-secondary);
  line-height: 1.6;
  white-space: pre-wrap;
}

.submit-textarea {
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

.submit-textarea::placeholder {
  color: var(--text-muted);
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

.safe-bottom {
  height: 48rpx;
}
</style>
