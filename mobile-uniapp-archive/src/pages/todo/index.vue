<script setup lang="ts">
import { ref, onMounted } from 'vue'
import StatusBar from '@/components/StatusBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import BackButton from '@/components/BackButton.vue'
import { getOrgTodos, type OrgTodosResult, type OrgTodoItem } from '@/common/api/auth'

const loading = ref(false)
const orgTodos = ref<OrgTodosResult[]>([])

const typeIconMap: Record<string, string> = {
  message_ack: 'lucide:bell',
  attendance: 'lucide:clock-check',
  homework: 'lucide:notebook-text',
  activity: 'lucide:flag',
}

const typeColorMap: Record<string, string> = {
  message_ack: '#F59E0B',
  attendance: '#22C55E',
  homework: '#F97316',
  activity: '#EF4444',
}

const typeLabelMap: Record<string, string> = {
  message_ack: '待签收',
  attendance: '待签到',
  homework: '待提交',
  activity: '待报名',
}

const orgTypeIconMap: Record<string, string> = {
  class: 'lucide:school',
  association: 'lucide:tent',
  committee: 'lucide:users',
  club: 'lucide:star',
}

const orgTypeColorMap: Record<string, string> = {
  class: '#2563EB',
  association: '#A855F7',
  committee: '#EF4444',
  club: '#F59E0B',
}

const orgTypeLabelMap: Record<string, string> = {
  class: '班级',
  association: '社团',
  committee: '部门',
  club: '兴趣小组',
}

async function loadTodos() {
  loading.value = true
  try {
    const data = await getOrgTodos()
    orgTodos.value = data || []
  } catch (err) {
    const message = err instanceof Error ? err.message : '加载失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    loading.value = false
  }
}

function getOrgTypeIcon(orgType: string): string {
  return orgTypeIconMap[orgType] || 'lucide:school'
}

function getOrgTypeColor(orgType: string): string {
  return orgTypeColorMap[orgType] || '#2563EB'
}

function getOrgTypeLabel(orgType: string): string {
  return orgTypeLabelMap[orgType] || '组织'
}

function getTodoIcon(type: string): string {
  return typeIconMap[type] || 'lucide:check-circle'
}

function getTodoColor(type: string): string {
  return typeColorMap[type] || '#6B7280'
}

function getTodoLabel(type: string): string {
  return typeLabelMap[type] || '待办'
}

function handleTodoClick(todo: OrgTodoItem, orgType: string) {
  // 根据待办类型跳转到对应页面
  switch (todo.type) {
    case 'message_ack':
      uni.navigateTo({ url: '/pages/notice/index' })
      break
    case 'attendance':
      uni.navigateTo({ url: '/pages/attendance/check-in' })
      break
    case 'homework':
      if (orgType === 'class') {
        uni.navigateTo({ url: '/pages/homework/list' })
      }
      break
    case 'activity':
      uni.navigateTo({ url: '/pages/activity/list' })
      break
  }
}

onMounted(() => {
  loadTodos()
})
</script>

<template>
  <view class="page">
    <StatusBar dark />

    <view class="header">
      <BackButton class="back" />
      <text class="title">待办中心</text>
      <view class="action" @click="loadTodos">
        <AppIcon icon="lucide:refresh-cw" size="40rpx" color="var(--accent)" />
      </view>
    </view>

    <scroll-view scroll-y class="content">
      <view v-if="loading" class="loading-container">
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else-if="orgTodos.length === 0" class="empty-container">
        <AppIcon icon="lucide:inbox" size="120rpx" color="#D1D5DB" />
        <text class="empty-text">暂无待办事项</text>
      </view>

      <view v-else class="org-list">
        <view
          v-for="org in orgTodos"
          :key="org.orgId"
          class="org-section"
        >
          <view class="org-header">
            <view
              class="org-logo"
              :style="{ backgroundColor: getOrgTypeColor(org.orgType) }"
            >
              <AppIcon
                :icon="getOrgTypeIcon(org.orgType)"
                size="32rpx"
                color="#FFFFFF"
              />
            </view>
            <view class="org-info">
              <text class="org-name">{{ org.orgName }}</text>
              <view class="org-badge">
                <text
                  class="org-badge-text"
                  :style="{ color: getOrgTypeColor(org.orgType) }"
                >{{ getOrgTypeLabel(org.orgType) }}</text>
              </view>
            </view>
            <view v-if="org.totalCount > 0" class="org-count">
              <text class="org-count-text">{{ org.totalCount }}</text>
            </view>
          </view>

          <view v-if="org.todos.length > 0" class="todo-list">
            <view
              v-for="todo in org.todos"
              :key="`${todo.type}-${todo.id}`"
              class="todo-item"
              @click="handleTodoClick(todo, org.orgType)"
            >
              <view
                class="todo-icon"
                :style="{ backgroundColor: getTodoColor(todo.type) }"
              >
                <AppIcon
                  :icon="getTodoIcon(todo.type)"
                  size="36rpx"
                  color="#FFFFFF"
                />
              </view>
              <view class="todo-info">
                <text class="todo-title">{{ todo.title }}</text>
                <text class="todo-label">{{ getTodoLabel(todo.type) }}</text>
              </view>
              <AppIcon icon="lucide:chevron-right" size="36rpx" color="#D1D5DB" />
            </view>
          </view>

          <view v-else class="no-todo">
            <text class="no-todo-text">暂无待办</text>
          </view>
        </view>
      </view>

      <view class="bottom-safe" />
    </scroll-view>
  </view>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  background-color: #F8F8F8;
}

.header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  height: 112rpx;
  padding: 0 24rpx;
  box-sizing: border-box;
  background-color: #FFFFFF;
}

.back,
.action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80rpx;
  height: 80rpx;
}

.title {
  font-size: 36rpx;
  font-weight: 600;
  color: #1A1A1A;
}

.content {
  flex: 1;
  padding: 24rpx;
  box-sizing: border-box;
}

.loading-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 0;
  gap: 24rpx;
}

.loading-text,
.empty-text {
  font-size: 28rpx;
  color: #9CA3AF;
}

.org-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.org-section {
  background-color: #FFFFFF;
  border-radius: 24rpx;
  overflow: hidden;
}

.org-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx;
  border-bottom: 1rpx solid #F3F4F6;
}

.org-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48rpx;
  height: 48rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
}

.org-info {
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12rpx;
}

.org-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #1A1A1A;
}

.org-badge {
  display: inline-flex;
  align-items: center;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  background-color: rgba(0, 0, 0, 0.04);
}

.org-badge-text {
  font-size: 20rpx;
  font-weight: 500;
}

.org-count {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 40rpx;
  height: 40rpx;
  padding: 0 12rpx;
  border-radius: 20rpx;
  background-color: #EF4444;
}

.org-count-text {
  font-size: 22rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.todo-list {
  display: flex;
  flex-direction: column;
}

.todo-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx;
  border-bottom: 1rpx solid #F3F4F6;
  transition: background-color 0.15s;
}

.todo-item:last-child {
  border-bottom: none;
}

.todo-item:active {
  background-color: #F9FAFB;
}

.todo-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44rpx;
  height: 44rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
}

.todo-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.todo-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #1A1A1A;
}

.todo-label {
  font-size: 22rpx;
  color: #9CA3AF;
}

.no-todo {
  padding: 48rpx 24rpx;
  text-align: center;
}

.no-todo-text {
  font-size: 26rpx;
  color: #9CA3AF;
}

.bottom-safe {
  height: 160rpx;
}
</style>
