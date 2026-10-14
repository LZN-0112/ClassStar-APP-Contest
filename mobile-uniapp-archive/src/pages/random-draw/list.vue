<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import StatusBar from '@/components/StatusBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import BackButton from '@/components/BackButton.vue'
import AppButton from '@/components/AppButton.vue'
import {
  createRandomDraw,
  getRandomDrawDetail,
  getRandomDrawList,
  type RandomDrawItem,
  type DrawMember,
} from '@/common/api/random-draws'
import { getCurrentClassId } from '@/common/utils/class'

interface ActivityInfo {
  name: string
  location: string
  time: string
}

const loading = ref(false)
const drawing = ref(false)
const drawList = ref<RandomDrawItem[]>([])
const latestDrawId = ref<string>('')

const activity = ref<ActivityInfo>({
  name: '学院运动会',
  location: '体育馆',
  time: '本周五 14:00',
})

const mainList = ref<DrawMember[]>([])
const backupList = ref<DrawMember[]>([])

const hasResult = computed(() => mainList.value.length > 0 || backupList.value.length > 0)
const firstWinner = computed(() => mainList.value[0]?.name || '')

function formatTime(time?: string) {
  if (!time) return ''
  const d = new Date(time)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function loadHistory() {
  const classId = getCurrentClassId()
  if (!classId) return
  try {
    const res = await getRandomDrawList(classId, { page: 1, pageSize: 5 })
    drawList.value = res.list || []
    if (drawList.value.length > 0) {
      latestDrawId.value = drawList.value[0].id
    }
  } catch {
    // 历史记录加载失败不阻断主流程
  }
}

async function loadLatestDetail() {
  const classId = getCurrentClassId()
  if (!classId || !latestDrawId.value) return
  loading.value = true
  try {
    const detail = await getRandomDrawDetail(classId, latestDrawId.value)
    mainList.value = detail.main || []
    backupList.value = detail.backup || []
    activity.value.name = detail.title || activity.value.name
  } catch (err) {
    const message = err instanceof Error ? err.message : '加载结果失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function onStartDraw() {
  const classId = getCurrentClassId()
  if (!classId) {
    uni.showToast({ title: '未选择班级', icon: 'none' })
    return
  }
  drawing.value = true
  try {
    const result = await createRandomDraw(classId, {
      title: activity.value.name,
      mainCount: 3,
      backupCount: 1,
    })
    latestDrawId.value = result.id
    mainList.value = result.main || []
    backupList.value = result.backup || []
    activity.value.name = result.title || activity.value.name
    uni.showToast({ title: '抽签完成', icon: 'success' })
  } catch (err) {
    const message = err instanceof Error ? err.message : '抽签失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    drawing.value = false
  }
}

function onRules() {
  uni.showModal({
    title: '抽签规则',
    content: '1. 从全班同学中随机抽取正选代表与候补代表。\n2. 正选代表优先参与活动。\n3. 正选代表无法参加时，由候补代表依次递补。',
    showCancel: false,
  })
}

function onRecords() {
  if (latestDrawId.value) {
    uni.navigateTo({ url: `/pages/random-draw/detail?id=${latestDrawId.value}` })
  } else {
    uni.showToast({ title: '暂无中签记录', icon: 'none' })
  }
}

onLoad((query) => {
  if (query?.name) activity.value.name = query.name as string
  if (query?.location) activity.value.location = query.location as string
  if (query?.time) activity.value.time = query.time as string
})

onMounted(() => {
  loadHistory().then(() => {
    if (latestDrawId.value) {
      loadLatestDetail()
    }
  })
})
</script>

<template>
  <view class="page">
    <StatusBar dark />

    <view class="header">
      <BackButton class="back" light />
      <text class="title">随机抽签</text>
      <text class="rules" @click="onRules">规则</text>
    </view>

    <scroll-view scroll-y class="content">
      <view class="activity-card">
        <view class="activity-row">
          <text class="activity-label">活动名称</text>
          <text class="activity-value">{{ activity.name }}</text>
        </view>
        <view class="activity-row">
          <text class="activity-label">活动地点</text>
          <text class="activity-value">{{ activity.location }}</text>
        </view>
        <view class="activity-row">
          <text class="activity-label">活动时间</text>
          <text class="activity-value">{{ activity.time }}</text>
        </view>
      </view>

      <view class="result-card">
        <view v-if="!hasResult" class="result-placeholder">
          <AppIcon icon="lucide:tickets-plane" size="80rpx" color="var(--text-muted)" />
          <text class="result-placeholder-text">点击开始抽签生成结果</text>
        </view>
        <view v-else class="result-content">
          <text class="result-title">恭喜 {{ firstWinner }} 同学被抽中为参赛代表</text>
          <text v-if="mainList.length > 1" class="result-subtitle">
            另有 {{ mainList.length - 1 }} 名正选代表与 {{ backupList.length }} 名候补代表
          </text>
        </view>
      </view>

      <view v-if="hasResult" class="section-card">
        <view class="section-header">
          <view class="section-dot" style="background-color: var(--accent);" />
          <text class="section-title">正选代表</text>
          <text class="section-count">共 {{ mainList.length }} 人</text>
        </view>
        <view class="member-list">
          <view
            v-for="(member, index) in mainList"
            :key="member.userId"
            class="member-item"
          >
            <text class="member-index">{{ index + 1 }}</text>
            <view class="member-avatar">
              <text class="avatar-text">{{ member.name.charAt(0) }}</text>
            </view>
            <text class="member-name">{{ member.name }}</text>
            <text class="member-tag main">正选</text>
          </view>
        </view>
      </view>

      <view v-if="hasResult" class="section-card">
        <view class="section-header">
          <view class="section-dot" style="background-color: #F59E0B;" />
          <text class="section-title">候补代表</text>
          <text class="section-count">共 {{ backupList.length }} 人</text>
        </view>
        <view class="member-list">
          <view
            v-for="(member, index) in backupList"
            :key="member.userId"
            class="member-item"
          >
            <text class="member-index">{{ index + 1 }}</text>
            <view class="member-avatar">
              <text class="avatar-text">{{ member.name.charAt(0) }}</text>
            </view>
            <text class="member-name">{{ member.name }}</text>
            <text class="member-tag backup">候补</text>
          </view>
        </view>
      </view>

      <view class="action-area">
        <AppButton :loading="drawing" @click="onStartDraw">开始抽签</AppButton>
        <text class="action-subtitle">从全班35人中抽取</text>
      </view>

      <view class="records-link" @click="onRecords">
        <text class="records-text">中签记录</text>
        <AppIcon icon="lucide:chevron-right" size="32rpx" color="var(--text-muted)" />
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

.back {
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

.rules {
  font-size: var(--text-size-body);
  font-weight: 500;
  color: #FFFFFF;
  padding: 16rpx;
}

.content {
  flex: 1;
  padding: 24rpx;
  box-sizing: border-box;
}

.activity-card {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  background-color: var(--surface);
  border-radius: var(--rounded-lg);
  box-shadow: var(--shadow-soft);
}

.activity-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
}

.activity-label {
  width: 128rpx;
  font-size: var(--text-size-caption);
  color: var(--text-secondary);
  flex-shrink: 0;
}

.activity-value {
  flex: 1;
  font-size: var(--text-size-body);
  font-weight: 500;
  color: var(--text-primary);
}

.result-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 240rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  background: linear-gradient(135deg, var(--accent) 0%, #60A5FA 100%);
  border-radius: var(--rounded-lg);
  box-shadow: var(--shadow-soft);
}

.result-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.result-placeholder-text {
  font-size: var(--text-size-body);
  color: rgba(255, 255, 255, 0.9);
}

.result-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  text-align: center;
}

.result-title {
  font-size: var(--text-size-headline);
  font-weight: 600;
  color: #FFFFFF;
  line-height: 1.4;
}

.result-subtitle {
  font-size: var(--text-size-caption);
  color: rgba(255, 255, 255, 0.85);
}

.section-card {
  padding: 24rpx;
  margin-bottom: 24rpx;
  background-color: var(--surface);
  border-radius: var(--rounded-lg);
  box-shadow: var(--shadow-soft);
}

.section-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.section-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
}

.section-title {
  flex: 1;
  font-size: var(--text-size-subhead);
  font-weight: 600;
  color: var(--text-primary);
}

.section-count {
  font-size: var(--text-size-caption);
  color: var(--text-muted);
}

.member-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.member-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx;
  border-radius: var(--rounded-md);
  background-color: var(--bg);
}

.member-index {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background-color: var(--accent);
  font-size: var(--text-size-caption);
  font-weight: 600;
  color: var(--text-inverse);
}

.member-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background-color: var(--accent-100);
  flex-shrink: 0;
}

.avatar-text {
  font-size: var(--text-size-body);
  font-weight: 600;
  color: var(--accent);
}

.member-name {
  flex: 1;
  font-size: var(--text-size-body);
  font-weight: 500;
  color: var(--text-primary);
}

.member-tag {
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  font-size: var(--text-size-caption);
  font-weight: 500;
}

.member-tag.main {
  color: var(--accent);
  background-color: var(--accent-100);
}

.member-tag.backup {
  color: #F59E0B;
  background-color: rgba(245, 158, 11, 0.12);
}

.action-area {
  margin-top: 8rpx;
  margin-bottom: 24rpx;
}

.action-subtitle {
  display: block;
  text-align: center;
  margin-top: 16rpx;
  font-size: var(--text-size-caption);
  color: var(--text-muted);
}

.records-link {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 24rpx 0;
}

.records-text {
  font-size: var(--text-size-body);
  color: var(--text-secondary);
}

.safe-bottom {
  height: 48rpx;
}
</style>
