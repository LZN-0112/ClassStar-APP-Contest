<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import StatusBar from '@/components/StatusBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import BackButton from '@/components/BackButton.vue'
import { getHomeworkList, type HomeworkItem } from '@/common/api/homeworks'
import { getCurrentClassId } from '@/common/utils/class'
import { secureStorage } from '@/common/storage/secure'

const loading = ref(false)
const homeworkList = ref<HomeworkItem[]>([])
const page = ref(1)
const pageSize = 10
const total = ref(0)
const hasMore = computed(() => homeworkList.value.length < total.value)
const role = computed(() => secureStorage.get<string>('currentIdentity') || '学生')
const isCommittee = computed(() => role.value !== '学生')

const CLASS_MEMBER_COUNT = 35
const DEMO_CLASS_NAME = '计算机2301'

const statusOptions: { label: string; value: string }[] = [
  { label: '全部', value: '' },
  { label: '未发布', value: 'unpublished' },
  { label: '进行中', value: 'published' },
  { label: '已截止', value: 'closed' },
]
const currentStatus = ref('')

function getClassName(item: HomeworkItem) {
  return (item as HomeworkItem & { className?: string }).className || DEMO_CLASS_NAME
}

function metaText(item: HomeworkItem) {
  return `${getClassName(item)}  ·  提交 ${item.submissionCount || 0}/${CLASS_MEMBER_COUNT}`
}

async function loadList(reset = false) {
  const classId = getCurrentClassId()
  if (!classId) {
    uni.showToast({ title: '未选择班级', icon: 'none' })
    return
  }
  if (reset) {
    page.value = 1
    homeworkList.value = []
  }
  loading.value = true
  try {
    const params: { page: number; pageSize: number; status?: string } = {
      page: page.value,
      pageSize,
    }
    if (currentStatus.value) params.status = currentStatus.value
    const res = await getHomeworkList(classId, params)
    homeworkList.value = reset ? res.list : [...homeworkList.value, ...res.list]
    total.value = res.pagination.total
  } catch (err) {
    const message = err instanceof Error ? err.message : '加载失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    loading.value = false
  }
}

function onStatusChange(status: string) {
  currentStatus.value = status
  loadList(true)
}

function onItemClick(item: HomeworkItem) {
  uni.navigateTo({ url: `/pages/homework/detail?id=${item.id}` })
}

function onPublish() {
  uni.navigateTo({ url: '/pages/homework/publish' })
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
      <text class="title">作业列表</text>
      <view v-if="isCommittee" class="action" @click="onPublish">
        <AppIcon icon="lucide:plus" size="40rpx" color="#FFFFFF" />
      </view>
      <view v-else class="action-placeholder" />
    </view>

    <view class="filter-bar">
      <view
        v-for="opt in statusOptions"
        :key="opt.value"
        class="filter-item"
        :class="{ active: currentStatus === opt.value }"
        @click="onStatusChange(opt.value)"
      >
        <text class="filter-text">{{ opt.label }}</text>
      </view>
    </view>

    <scroll-view scroll-y class="content" @scrolltolower="onLoadMore">
      <text class="section-title">作业管理</text>

      <view v-if="homeworkList.length === 0 && !loading" class="empty">
        <AppIcon icon="lucide:book-open" size="96rpx" color="var(--text-muted)" />
        <text class="empty-text">暂无作业</text>
      </view>

      <view
        v-for="item in homeworkList"
        :key="item.id"
        class="homework-card"
        @click="onItemClick(item)"
      >
        <view class="card-left">
          <view class="subject-tag">
            <text>{{ item.subject }}</text>
          </view>
          <text class="homework-title">{{ item.title }}</text>
          <text class="homework-meta">{{ metaText(item) }}</text>
        </view>
        <view class="card-right" @click.stop="onItemClick(item)">
          <text class="detail-text">查看详情</text>
          <AppIcon icon="lucide:chevron-right" size="28rpx" color="var(--accent)" />
        </view>
      </view>

      <view v-if="loading && homeworkList.length > 0" class="load-more">
        <text>加载中...</text>
      </view>
      <view v-else-if="!hasMore && homeworkList.length > 0" class="load-more">
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

.back,
.action,
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
  color: #FFFFFF;
}

.filter-bar {
  display: flex;
  flex-direction: row;
  gap: 16rpx;
  padding: 24rpx;
  background-color: var(--surface);
  border-bottom: 2rpx solid var(--border-subtle);
}

.filter-item {
  padding: 12rpx 32rpx;
  border-radius: 999rpx;
  background-color: var(--border-subtle);
  transition: all 0.2s ease;
}

.filter-item.active {
  background-color: var(--accent);
}

.filter-text {
  font-size: var(--text-size-caption);
  font-weight: 500;
  color: var(--text-secondary);
}

.filter-item.active .filter-text {
  color: var(--text-inverse);
}

.content {
  flex: 1;
  padding: 24rpx;
  box-sizing: border-box;
}

.section-title {
  display: block;
  margin-bottom: 24rpx;
  font-size: var(--text-size-subhead);
  font-weight: 600;
  color: var(--text-primary);
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

.homework-card {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  background-color: var(--surface);
  border-radius: var(--rounded-lg);
  box-shadow: var(--shadow-soft);
}

.card-left {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  flex: 1;
  min-width: 0;
}

.subject-tag {
  align-self: flex-start;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  font-size: var(--text-size-caption);
  font-weight: 600;
  background-color: var(--accent-100);
  color: var(--accent);
}

.homework-title {
  font-size: var(--text-size-subhead);
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
}

.homework-meta {
  font-size: var(--text-size-caption);
  color: var(--text-secondary);
}

.card-right {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4rpx;
  flex-shrink: 0;
}

.detail-text {
  font-size: var(--text-size-caption);
  font-weight: 500;
  color: var(--accent);
}

.load-more {
  text-align: center;
  padding: 24rpx 0;
  font-size: var(--text-size-caption);
  color: var(--text-muted);
}

.safe-bottom {
  height: 48rpx;
}
</style>
