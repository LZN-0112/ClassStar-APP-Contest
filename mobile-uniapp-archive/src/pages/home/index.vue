<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import StatusBar from '@/components/StatusBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import OrgSwitcher from '@/components/OrgSwitcher.vue'
import { getProfile } from '@/common/api/settings'
import { getCurrentOrg } from '@/common/utils/class'

interface Profile {
  id: string
  name: string
  phone: string
  avatar: string | null
  studentId: string | null
  createdAt: string
}

const profile = ref<Profile>({
  id: '',
  name: '',
  phone: '',
  avatar: null,
  studentId: null,
  createdAt: '',
})

const role = ref('学生')
const loading = ref(false)
const orgType = ref('class')

const avatarText = computed(() => (profile.value.name || '同学').slice(0, 1))

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return `早上好，${profile.value.name || '同学'}`
  if (hour < 18) return `下午好，${profile.value.name || '同学'}`
  return `晚上好，${profile.value.name || '同学'}`
})

const subtitle = computed(() => {
  const parts: string[] = []
  // 根据组织类型显示不同的角色文案
  const orgTypeLabel = orgType.value === 'class' ? '班级' : orgType.value === 'association' ? '社团' : orgType.value === 'committee' ? '部门' : '兴趣小组'
  const roleLabel = role.value === '班长' ? '班长' : role.value === '社长' ? '社长' : role.value === '干事' ? '干事' : role.value
  parts.push(`${orgTypeLabel} · ${roleLabel}`)
  return parts.length ? parts.join(' · ') : ''
})

const todoProgress = 0.65

// 根据 orgType 过滤快捷入口
const quickGrid = computed(() => {
  const baseGrid = [
    { label: '通知', icon: 'lucide:bell', color: '#2563EB', path: '/pages/notice/index' },
    { label: '签到', icon: 'lucide:circle-check', color: '#22C55E', path: '/pages/attendance/check-in' },
    { label: '作业', icon: 'lucide:file-text', color: '#F97316', path: '/pages/homework/list' },
    { label: '活动', icon: 'lucide:flag', color: '#EF4444', path: '/pages/activity/list' },
    { label: '资料', icon: 'lucide:folder', color: '#A855F7', path: '/pages/material/list' },
    { label: '更多', icon: 'lucide:layout-grid', color: '#6B7280', path: '/pages/more/index' },
  ]
  // 非班级类型隐藏作业入口
  if (orgType.value !== 'class') {
    return baseGrid.filter(item => item.label !== '作业')
  }
  return baseGrid
})

const feedList = [
  { title: '青年大学习通知', meta: '10分钟前 · 通知 · 团支书 · 王五', icon: 'lucide:bell', color: '#EF4444', path: '/pages/notice/detail?id=demo-notice' },
  { title: '班会签到', meta: '1小时前 · 签到 · 班长 · 李四', icon: 'lucide:circle-check', color: '#22C55E', path: '/pages/attendance/detail?id=demo-attendance' },
  { title: '高数作业提醒', meta: '2小时前 · 作业 · 学委 · 赵六', icon: 'lucide:file-text', color: '#F97316', path: '/pages/homework/detail?id=demo-homework' },
]

function onQuick(item: { label: string; icon: string; color: string; path: string }) {
  uni.navigateTo({ url: item.path })
}

function onFeed(item: typeof feedList[0]) {
  if (item?.path) {
    uni.navigateTo({ url: item.path })
    return
  }
  uni.navigateTo({ url: '/pages/notice/list' })
}

function onFeedAll() {
  uni.navigateTo({ url: '/pages/notice/list' })
}

function onTodo() {
  uni.navigateTo({ url: '/pages/task-board/index' })
}

function onAvatar() {
  uni.navigateTo({ url: '/pages/settings/personal-center' })
}

async function loadData() {
  loading.value = true
  try {
    // 读取当前组织信息
    const currentOrg = getCurrentOrg()
    if (currentOrg) {
      orgType.value = currentOrg.orgType || 'class'
    }
    
    // 读取用户信息
    const userInfoStr = uni.getStorageSync('userInfo')
    if (userInfoStr) {
      const userInfo = JSON.parse(userInfoStr)
      profile.value.name = userInfo.name || ''
      profile.value.phone = userInfo.phone || ''
      role.value = userInfo.identity || userInfo.role || '学生'
    }
    
    const data = await getProfile()
    if (data) {
      const cloned = JSON.parse(JSON.stringify(data)) as Profile
      profile.value = { ...profile.value, ...cloned }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : '加载失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <view class="page">
    <StatusBar dark />

    <scroll-view scroll-y class="content">
      <!-- Header -->
      <view class="header">
        <!-- 组织切换器 -->
        <OrgSwitcher />

        <view class="header-content">
          <view class="header-text">
            <text class="greeting">{{ greeting }}</text>
            <text class="sub-info">{{ subtitle }}</text>
          </view>
          <view class="avatar" @click="onAvatar">
            <AppIcon icon="lucide:user" size="48rpx" color="#0062FF" />
          </view>
        </view>
      </view>

      <!-- 今日待办 -->
      <view class="todo-card">
        <view class="todo-top">
          <view class="todo-left">
            <text class="todo-title">今日待办</text>
            <text class="todo-subtitle">3 个待办事项等待处理</text>
          </view>
          <view class="todo-progress">
            <text class="progress-label">完成进度</text>
            <view class="progress-track">
              <view class="progress-fill" :style="{ width: `${todoProgress * 100}%` }" />
            </view>
          </view>
        </view>
        <view class="todo-button" @click="onTodo">
          <text class="todo-button-text">查看待办事件</text>
          <AppIcon icon="lucide:chevron-right" size="32rpx" color="#0062FF" />
        </view>
      </view>

      <!-- 快捷入口 -->
      <view class="quick-grid">
        <view class="quick-row">
          <view
            v-for="item in quickGrid.slice(0, 3)"
            :key="item.label"
            class="quick-item"
            @click="onQuick(item)"
          >
            <view class="quick-icon" :style="{ backgroundColor: item.color }">
              <AppIcon :icon="item.icon" size="56rpx" color="#FFFFFF" />
            </view>
            <text class="quick-label">{{ item.label }}</text>
          </view>
        </view>
        <view v-if="quickGrid.length > 3" class="quick-row">
          <view
            v-for="item in quickGrid.slice(3)"
            :key="item.label"
            class="quick-item"
            @click="onQuick(item)"
          >
            <view class="quick-icon" :style="{ backgroundColor: item.color }">
              <AppIcon :icon="item.icon" size="56rpx" color="#FFFFFF" />
            </view>
            <text class="quick-label">{{ item.label }}</text>
          </view>
        </view>
      </view>

      <!-- 组织动态 -->
      <view class="feed-card">
        <view class="feed-header">
          <text class="feed-title">{{ orgType === 'class' ? '班级动态' : '组织动态' }}</text>
          <text class="feed-more" @click="onFeedAll">查看全部</text>
        </view>
        <view class="feed-list">
          <view
            v-for="(item, idx) in feedList"
            :key="idx"
            class="feed-item"
            @click="onFeed(item)">

            <view class="feed-icon" :style="{ backgroundColor: item.color }">
              <AppIcon :icon="item.icon" size="56rpx" color="#FFFFFF" />
            </view>
            <view class="feed-text-wrap">
              <text class="feed-title-text">{{ item.title }}</text>
              <text class="feed-meta">{{ item.meta }}</text>
            </view>
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
  background-color: #ffffff;
}

.content {
  flex: 1;
  padding: 0 32rpx;
  box-sizing: border-box;
}

.header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 40rpx 32rpx;
}

.header-content {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.header-text {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.greeting {
  font-size: 40rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.sub-info {
  font-size: 26rpx;
  color: rgba(75, 85, 99, 0.9);
}

.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background-color: #ffffff;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.todo-card {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding: 32rpx;
  border-radius: 24rpx;
  background: linear-gradient(160deg, #0062ff 0%, #004ecc 100%);
}

.todo-top {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.todo-left {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.todo-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #ffffff;
}

.todo-subtitle {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

.todo-progress {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
}

.progress-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.9);
}

.progress-track {
  width: 240rpx;
  height: 12rpx;
  border-radius: 999rpx;
  background-color: rgba(255, 255, 255, 0.2);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 999rpx;
  background-color: #ffffff;
}

.todo-button {
  align-self: flex-start;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 28rpx;
  border-radius: 999rpx;
  background-color: #ffffff;
}

.todo-button-text {
  font-size: 26rpx;
  font-weight: 700;
  color: #0062ff;
}

.quick-grid {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
  margin-top: 32rpx;
  padding: 32rpx;
  border-radius: 24rpx;
  background-color: #ffffff;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
}

.quick-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 60rpx;
}

.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  width: 170rpx;
  height: 170rpx;
  padding: 16rpx 0;
  border-radius: 24rpx;
  background-color: rgba(0, 0, 0, 0);
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.quick-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 84rpx;
  height: 84rpx;
  border-radius: 24rpx;
  overflow: hidden;
}

.quick-icon::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  height: 36%;
  border-radius: 999rpx;
  background-color: rgba(255, 255, 255, 0.28);
}

.quick-label {
  font-size: 26rpx;
  font-weight: 500;
  color: #1a1a1a;
}

.feed-card {
  display: flex;
  flex-direction: column;
  gap: 30rpx;
  margin-top: 32rpx;
  margin-bottom: 32rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  background-color: #ffffff;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.05), 0 4rpx 16rpx rgba(0, 0, 0, 0.03);
}

.feed-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.feed-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.feed-more {
  font-size: 24rpx;
  color: #0062ff;
}

.feed-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.feed-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 24rpx;
  height: 100rpx;
  padding: 0 20rpx;
  border-radius: 24rpx;
  background-color: rgba(0, 0, 0, 0);
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.feed-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 84rpx;
  height: 84rpx;
  border-radius: 24rpx;
  flex-shrink: 0;
  overflow: hidden;
}

.feed-icon::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  height: 36%;
  border-radius: 999rpx;
  background-color: rgba(255, 255, 255, 0.28);
}

.feed-text-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.feed-title-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #1a1a1a;
}

.feed-meta {
  font-size: 22rpx;
  color: #9ca3af;
}

.bottom-safe {
  height: 160rpx;
}
</style>
