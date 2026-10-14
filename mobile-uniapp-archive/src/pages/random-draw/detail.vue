<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import StatusBar from '@/components/StatusBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import BackButton from '@/components/BackButton.vue'
import { getRandomDrawDetail, type RandomDrawDetail } from '@/common/api/random-draws'
import { getCurrentClassId } from '@/common/utils/class'

const loading = ref(false)
const detail = ref<RandomDrawDetail | null>(null)

function formatTime(time?: string) {
  if (!time) return ''
  const d = new Date(time)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function loadDetail(id: string) {
  const classId = getCurrentClassId()
  if (!classId) {
    uni.showToast({ title: '未选择班级', icon: 'none' })
    return
  }
  loading.value = true
  try {
    detail.value = await getRandomDrawDetail(classId, id)
  } catch (err) {
    const message = err instanceof Error ? err.message : '加载失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    loading.value = false
  }
}

onLoad((query) => {
  const id = query?.id as string | undefined
  if (!id) {
    uni.showToast({ title: '缺少参数', icon: 'none' })
    return
  }
  loadDetail(id)
})
</script>

<template>
  <view class="page">
    <StatusBar dark />

    <view class="header">
      <BackButton class="back" />
      <text class="title">抽签结果</text>
      <view class="action-placeholder" />
    </view>

    <scroll-view v-if="detail" scroll-y class="content">
      <view class="info-card">
        <text class="info-title">{{ detail.title }}</text>
        <view class="info-meta">
          <text class="info-meta-text">正选 {{ detail.main.length }} 人</text>
          <text class="info-meta-dot">·</text>
          <text class="info-meta-text">候补 {{ detail.backup.length }} 人</text>
          <text class="info-meta-dot">·</text>
          <text class="info-meta-text">{{ formatTime(detail.createdAt) }}</text>
        </view>
      </view>

      <view class="section-card">
        <view class="section-header">
          <view class="section-dot" style="background-color: var(--accent);" />
          <text class="section-title">正选名单</text>
          <text class="section-count">{{ detail.main.length }}人</text>
        </view>
        <view class="member-list">
          <view
            v-for="(member, index) in detail.main"
            :key="member.userId"
            class="member-item"
          >
            <text class="member-index">{{ index + 1 }}</text>
            <text class="member-name">{{ member.name }}</text>
            <text class="member-id">{{ member.studentId }}</text>
          </view>
          <view v-if="detail.main.length === 0" class="member-empty">
            <text>无正选人员</text>
          </view>
        </view>
      </view>

      <view class="section-card">
        <view class="section-header">
          <view class="section-dot" style="background-color: #F59E0B;" />
          <text class="section-title">候补名单</text>
          <text class="section-count">{{ detail.backup.length }}人</text>
        </view>
        <view class="member-list">
          <view
            v-for="(member, index) in detail.backup"
            :key="member.userId"
            class="member-item"
          >
            <text class="member-index">{{ index + 1 }}</text>
            <text class="member-name">{{ member.name }}</text>
            <text class="member-id">{{ member.studentId }}</text>
          </view>
          <view v-if="detail.backup.length === 0" class="member-empty">
            <text>无候补人员</text>
          </view>
        </view>
      </view>

      <view class="safe-bottom" />
    </scroll-view>

    <view v-else-if="!loading" class="empty">
      <AppIcon icon="lucide:file-question-mark" size="96rpx" color="var(--text-muted)" />
      <text class="empty-text">暂无抽签结果</text>
    </view>
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
  gap: 24rpx;
}

.empty-text {
  font-size: var(--text-size-body);
  color: var(--text-muted);
}

.info-card,
.section-card {
  padding: 24rpx;
  margin-bottom: 24rpx;
  background-color: var(--surface);
  border-radius: var(--rounded-lg);
  box-shadow: var(--shadow-soft);
}

.info-title {
  font-size: var(--text-size-headline);
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
}

.info-meta {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 16rpx;
}

.info-meta-text {
  font-size: var(--text-size-caption);
  color: var(--text-muted);
}

.info-meta-dot {
  font-size: var(--text-size-caption);
  color: var(--text-muted);
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

.member-name {
  flex: 1;
  font-size: var(--text-size-body);
  font-weight: 500;
  color: var(--text-primary);
}

.member-id {
  font-size: var(--text-size-caption);
  color: var(--text-muted);
}

.member-empty {
  padding: 32rpx 0;
  text-align: center;
  font-size: var(--text-size-body);
  color: var(--text-muted);
}

.safe-bottom {
  height: 48rpx;
}
</style>
