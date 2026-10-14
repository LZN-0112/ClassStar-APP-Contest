<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import StatusBar from '@/components/StatusBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import BackButton from '@/components/BackButton.vue'
import AppButton from '@/components/AppButton.vue'
import { getFeeList, type FeeRecord, type FeeRecordType, type FeeSummary } from '@/common/api/fee'
import { getCurrentClassId, getCurrentOrg } from '@/common/utils/class'
import { secureStorage } from '@/common/storage/secure'

const loading = ref(false)
const feeList = ref<FeeRecord[]>([])
const summary = ref<FeeSummary>({ income: 0, expense: 0, balance: 0 })
const pageNum = ref(1)
const pageSize = 10
const total = ref(0)
const hasMore = computed(() => feeList.value.length < total.value)
const role = computed(() => secureStorage.get<string>('currentIdentity') || '学生')
const isCommittee = computed(() => role.value !== '学生')
const orgType = ref('class')
const feeTitle = computed(() => orgType.value === 'class' ? '班费账本' : '会费账本')

function formatMoney(amount?: number) {
  const num = amount ?? 0
  return `¥${num.toFixed(2)}`
}

function formatTime(time?: string) {
  if (!time) return ''
  const d = new Date(time)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function typeLabel(type?: FeeRecordType) {
  return type === 'income' ? '收入' : '支出'
}

function typeColor(type?: FeeRecordType) {
  return type === 'income' ? '#10B981' : '#EF4444'
}

async function loadList(reset = false) {
  const classId = getCurrentClassId()
  if (!classId) {
    uni.showToast({ title: '未选择班级', icon: 'none' })
    return
  }
  if (reset) {
    pageNum.value = 1
    feeList.value = []
    summary.value = { income: 0, expense: 0, balance: 0 }
  }
  loading.value = true
  try {
    const res = await getFeeList({ classId, feeType: 'class', pageNum: pageNum.value, pageSize })
    feeList.value = reset ? res.list : [...feeList.value, ...res.list]
    total.value = res.pagination.total
    if (res.summary) {
      summary.value = res.summary
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : '加载失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    loading.value = false
  }
}

function onAdd() {
  uni.navigateTo({ url: '/pages/fee/add' })
}

function onLoadMore() {
  if (!hasMore.value || loading.value) return
  pageNum.value += 1
  loadList()
}

onMounted(() => {
  const org = getCurrentOrg()
  if (org) orgType.value = org.orgType || 'class'
  loadList(true)
})
</script>

<template>
  <view class="page">
    <StatusBar dark />

    <view class="header">
      <BackButton class="back" />
      <text class="title">{{ feeTitle }}</text>
      <view v-if="isCommittee" class="action" @click="onAdd">
        <AppIcon icon="lucide:plus" size="40rpx" color="var(--accent)" />
      </view>
      <view v-else class="action-placeholder" />
    </view>

    <scroll-view scroll-y class="content" @scrolltolower="onLoadMore">
      <view class="summary-card">
        <view class="summary-item">
          <text class="summary-label">收入</text>
          <text class="summary-value income">{{ formatMoney(summary.income) }}</text>
        </view>
        <view class="summary-divider" />
        <view class="summary-item">
          <text class="summary-label">支出</text>
          <text class="summary-value expense">{{ formatMoney(summary.expense) }}</text>
        </view>
        <view class="summary-divider" />
        <view class="summary-item">
          <text class="summary-label">余额</text>
          <text class="summary-value balance">{{ formatMoney(summary.balance) }}</text>
        </view>
      </view>

      <view v-if="feeList.length === 0 && !loading" class="empty">
        <AppIcon icon="lucide:receipt" size="96rpx" color="var(--text-muted)" />
        <text class="empty-text">暂无收支记录</text>
      </view>

      <view
        v-for="item in feeList"
        :key="item.id"
        class="fee-card"
      >
        <view class="fee-header">
          <view class="fee-tag" :style="{ backgroundColor: typeColor(item.type) + '1A', color: typeColor(item.type) }">
            <text>{{ typeLabel(item.type) }}</text>
          </view>
          <text class="fee-time">{{ formatTime(item.createTime) }}</text>
        </view>
        <view class="fee-body">
          <text class="fee-amount" :style="{ color: typeColor(item.type) }">
            {{ item.type === 'income' ? '+' : '-' }}{{ formatMoney(item.amount) }}
          </text>
          <text class="fee-remark">{{ item.remark || '暂无备注' }}</text>
        </view>
      </view>

      <view v-if="loading && feeList.length > 0" class="load-more">
        <text>加载中...</text>
      </view>
      <view v-else-if="!hasMore && feeList.length > 0" class="load-more">
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
  background-color: var(--surface);
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
  color: var(--text-primary);
}

.content {
  flex: 1;
  padding: 24rpx;
  box-sizing: border-box;
}

.summary-card {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-around;
  padding: 32rpx 24rpx;
  margin-bottom: 24rpx;
  background: linear-gradient(135deg, var(--accent) 0%, #3b82f6 100%);
  border-radius: var(--rounded-lg);
  box-shadow: var(--shadow-soft);
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.summary-label {
  font-size: var(--text-size-caption);
  color: rgba(255, 255, 255, 0.8);
}

.summary-value {
  font-size: var(--text-size-headline);
  font-weight: 700;
  color: #ffffff;
}

.summary-divider {
  width: 2rpx;
  height: 56rpx;
  background-color: rgba(255, 255, 255, 0.3);
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 160rpx;
  gap: 24rpx;
}

.empty-text {
  font-size: var(--text-size-body);
  color: var(--text-muted);
}

.fee-card {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  background-color: var(--surface);
  border-radius: var(--rounded-lg);
  box-shadow: var(--shadow-soft);
}

.fee-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.fee-tag {
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  font-size: var(--text-size-caption);
  font-weight: 600;
}

.fee-time {
  font-size: var(--text-size-caption);
  color: var(--text-muted);
}

.fee-body {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  justify-content: space-between;
  gap: 16rpx;
}

.fee-amount {
  font-size: var(--text-size-headline);
  font-weight: 700;
}

.fee-remark {
  flex: 1;
  text-align: right;
  font-size: var(--text-size-body);
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
