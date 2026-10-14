<template>
  <view class="page">
    <view class="header">
      <StatusBar dark />
      <view class="nav-bar">
        <BackButton dark @click="handleBack" />
      </view>
      <view class="header-title-row">
        <text class="header-title">帮助与反馈</text>
        <text class="header-icon">?</text>
      </view>
    </view>

    <scroll-view scroll-y class="content">
      <view class="body">
        <!-- 帮助入口 -->
        <view class="help-group">
          <view
            v-for="item in helpEntries"
            :key="item.label"
            class="help-item"
            @click="handleHelp(item)"
          >
            <view class="icon-box" :style="{ backgroundColor: item.bg }">
              <text class="icon-text" :style="{ color: item.color }">{{ item.icon }}</text>
            </view>
            <text class="item-label">{{ item.label }}</text>
            <view class="spacer" />
            <text class="item-arrow">›</text>
          </view>
        </view>

        <!-- 反馈表单 -->
        <view class="feedback-card">
          <text class="card-title">意见反馈</text>
          <textarea
            v-model="content"
            class="feedback-textarea"
            placeholder="请输入您的意见或建议，我们会认真听取并不断改进"
            maxlength="500"
          />
          <view class="textarea-counter">{{ content.length }}/500</view>

          <view class="contact-row">
            <text class="contact-label">联系方式（选填）</text>
            <input
              v-model="contact"
              class="contact-input"
              type="text"
              placeholder="手机号 / 邮箱"
              maxlength="50"
            />
          </view>
        </view>

        <view
          class="submit-btn"
          :class="{ disabled: !canSubmit || submitting }"
          @click="handleSubmit"
        >
          <text class="submit-text">{{ submitting ? '提交中...' : '提交反馈' }}</text>
        </view>

        <!-- 我的反馈 -->
        <view v-if="feedbacks.length" class="history-section">
          <text class="section-title">我的反馈</text>
          <view class="feedback-list">
            <view
              v-for="fb in feedbacks"
              :key="fb.id"
              class="feedback-item"
            >
              <view class="feedback-header">
                <text class="feedback-status" :class="statusClass(fb.status)">{{ statusText(fb.status) }}</text>
                <text class="feedback-time">{{ formatTime(fb.createdAt) }}</text>
              </view>
              <text class="feedback-content">{{ fb.content }}</text>
              <text v-if="fb.contact" class="feedback-contact">联系方式：{{ fb.contact }}</text>
            </view>
          </view>
        </view>

        <view class="bottom-safe" />
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import StatusBar from '@/components/StatusBar.vue'
import BackButton from '@/components/BackButton.vue'
import { createFeedback, getMyFeedbacks, type FeedbackItem } from '@/common/api/feedback'

const content = ref('')
const contact = ref('')
const submitting = ref(false)
const feedbacks = ref<FeedbackItem[]>([])

const helpEntries = [
  { label: '常见问题', icon: '?', bg: '#E0F2FE', color: '#0062FF', action: 'faq' },
  { label: '使用教程', icon: '📖', bg: '#E0F2FE', color: '#0062FF', action: 'guide' },
  { label: '在线客服', icon: '💬', bg: '#E0F2FE', color: '#0062FF', action: 'service' },
]

const canSubmit = computed(() => content.value.trim().length > 0)

function handleBack() {
  uni.navigateBack({ delta: 1 })
}

function handleHelp(item: typeof helpEntries[0]) {
  if (item.action === 'service') {
    uni.showModal({
      title: '在线客服',
      content: '客服在线时间为工作日 9:00-18:00，是否拨打客服电话？',
      confirmText: '拨打',
      success: (res) => {
        if (res.confirm) {
          uni.makePhoneCall({ phoneNumber: '400-000-0000' })
        }
      },
    })
    return
  }
  uni.showToast({ title: `${item.label} 功能暂未开放`, icon: 'none' })
}

function statusClass(status: string) {
  if (status === 'resolved') return 'resolved'
  if (status === 'processing') return 'processing'
  return 'pending'
}

function statusText(status: string) {
  if (status === 'resolved') return '已处理'
  if (status === 'processing') return '处理中'
  return '待处理'
}

function formatTime(time?: string) {
  if (!time) return ''
  const date = new Date(time)
  if (Number.isNaN(date.getTime())) return time
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function loadFeedbacks() {
  try {
    const data = await getMyFeedbacks()
    feedbacks.value = Array.isArray(data) ? data : []
  } catch (err) {
    // 列表加载失败不阻塞主流程
    feedbacks.value = []
  }
}

async function handleSubmit() {
  if (!canSubmit.value || submitting.value) return

  const text = content.value.trim()
  if (text.length < 5) {
    uni.showToast({ title: '反馈内容至少 5 个字', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    await createFeedback({
      content: text,
      contact: contact.value.trim() || undefined,
    })
    uni.showToast({ title: '提交成功，感谢您的反馈', icon: 'success' })
    content.value = ''
    contact.value = ''
    await loadFeedbacks()
  } catch (err) {
    const message = err instanceof Error ? err.message : '提交失败，请稍后重试'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadFeedbacks()
})
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  background-color: #FFFFFF;
}

.header {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 540rpx;
  background: linear-gradient(180deg, #004ECC 0%, #4B83FF 55%, #DEFCFF 100%);
  border-radius: 0 0 48rpx 48rpx;
  padding: 0 48rpx;
  box-sizing: border-box;
}

.nav-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  margin-top: 16rpx;
}

.header-title-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-top: 40rpx;
}

.header-title {
  font-size: 56rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.header-icon {
  font-size: 112rpx;
  color: rgba(255, 255, 255, 0.2);
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.body {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
  padding: 32rpx 40rpx 0;
}

.help-group {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 24rpx;
  background-color: #FFFFFF;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
}

.help-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 96rpx;
}

.icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80rpx;
  height: 80rpx;
  border-radius: 16rpx;
  margin-right: 24rpx;
}

.icon-text {
  font-size: 36rpx;
}

.item-label {
  font-size: 30rpx;
  font-weight: 600;
  color: #1A1A1A;
}

.spacer {
  flex: 1;
}

.item-arrow {
  font-size: 40rpx;
  color: #9CA3AF;
}

.feedback-card {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  padding: 24rpx;
  background-color: #FFFFFF;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
}

.card-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1A1A1A;
}

.feedback-textarea {
  width: 100%;
  height: 240rpx;
  padding: 20rpx;
  box-sizing: border-box;
  font-size: 28rpx;
  color: #1A1A1A;
  background-color: #FFFFFF;
  border: 2rpx solid #E5E7EB;
  border-radius: 12rpx;
}

.textarea-counter {
  font-size: 24rpx;
  color: #9CA3AF;
  text-align: right;
}

.contact-row {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.contact-label {
  font-size: 28rpx;
  font-weight: 600;
  color: #1A1A1A;
}

.contact-input {
  width: 100%;
  height: 88rpx;
  padding: 0 20rpx;
  box-sizing: border-box;
  font-size: 28rpx;
  color: #1A1A1A;
  background-color: #FFFFFF;
  border: 2rpx solid #E5E7EB;
  border-radius: 12rpx;
}

.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 104rpx;
  background: linear-gradient(180deg, #0062FF 0%, #3B82F6 100%);
  border-radius: 16rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 98, 255, 0.2);
}

.submit-btn.disabled {
  background: #93C5FD;
  box-shadow: none;
}

.submit-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.history-section {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-top: 16rpx;
}

.section-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #4B5563;
  padding-left: 8rpx;
}

.feedback-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.feedback-item {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding: 24rpx;
  background-color: #FFFFFF;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
}

.feedback-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.feedback-status {
  font-size: 24rpx;
  font-weight: 600;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.feedback-status.pending {
  color: #D97706;
  background-color: #FEF3C7;
}

.feedback-status.processing {
  color: #0062FF;
  background-color: #E0F2FE;
}

.feedback-status.resolved {
  color: #22C55E;
  background-color: #DCFCE7;
}

.feedback-time {
  font-size: 24rpx;
  color: #9CA3AF;
}

.feedback-content {
  font-size: 28rpx;
  color: #1A1A1A;
  line-height: 1.5;
}

.feedback-contact {
  font-size: 24rpx;
  color: #6B7280;
}

.bottom-safe {
  height: 48rpx;
}
</style>
