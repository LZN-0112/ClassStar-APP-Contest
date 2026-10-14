<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import StatusBar from '@/components/StatusBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import { getClassInfo } from '@/common/api/auth'
import { getMessageList, type MessageItem } from '@/common/api/messages'
import { getAttendanceList } from '@/common/api/attendances'
import { getHomeworkList } from '@/common/api/homeworks'
import { getActivityList } from '@/common/api/activities'
import { secureStorage } from '@/common/storage/secure'
import { getCurrentOrg } from '@/common/utils/class'

interface ClassInfo {
  id: string
  name: string
  code: string
  qrCodeUrl: string
  createdBy: string
}

const classInfo = ref<ClassInfo | null>(null)
const loading = ref(false)

const orgType = ref<string>('class')
onMounted(() => {
  const org = getCurrentOrg()
  if (org) orgType.value = org.orgType || 'class'
})

const orgTypeLabelMap: Record<string, string> = {
  class: '班级',
  association: '社团',
  committee: '部门',
  club: '兴趣小组',
}

const pageTitle = computed(() => orgTypeLabelMap[orgType.value] || '组织')

const admins = [
  { name: '陈班长', role: '群主', avatar: '陈' },
  { name: '王团支书', role: '管理员', avatar: '王' },
  { name: '赵学委', role: '管理员', avatar: '赵' },
  { name: '孙生活委员', role: '管理员', avatar: '孙' },
]

const menuList = computed(() => {
  const prefix = orgType.value === 'class' ? '班级' : '组织'
  return [
    { label: `${prefix}成员`, sub: '35 人已加入', icon: 'lucide:users', color: '#2563EB', bg: '#2563EB14', path: '/pages/class/members' },
    { label: `${prefix}资料库`, sub: '128 个文件', icon: 'lucide:folder', color: '#F97316', bg: '#F9731614', path: '/pages/material/list' },
    { label: `${prefix}档案`, sub: '3 个学期归档', icon: 'lucide:archive', color: '#22C55E', bg: '#22C55E14', path: '/pages/class/archive' },
  ]
})

const feedTitle = computed(() => (orgType.value === 'class' ? '班级动态' : '组织动态'))
const activityStatLabel = computed(() => (orgType.value === 'class' ? '班级活动' : '组织活动'))

// 班级动态数据
const feedList = ref<any[]>([])
const feedLoading = ref(false)

// 数据概览
const stats = ref({
  unreadNotices: 0,
  pendingHomework: 0,
  recentAttendance: 0,
  upcomingActivity: 0,
})

const feedTypeMeta: Record<string, { icon: string; color: string; typeLabel: string }> = {
  notice: { icon: 'lucide:bell', color: '#EF4444', typeLabel: '通知' },
  homework: { icon: 'lucide:file-text', color: '#F97316', typeLabel: '作业' },
  activity: { icon: 'lucide:flag', color: '#22C55E', typeLabel: '活动' },
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  return `${days}天前`
}

interface MenuItem {
  label: string
  sub: string
  icon: string
  color: string
  bg: string
  path: string
}

function onMenu(item: MenuItem) {
  uni.navigateTo({ url: item.path })
}

function onFeed(item: any) {
  const pathMap: Record<string, string> = {
    notice: `/pages/notice/detail?id=${item.id}`,
    homework: `/pages/homework/detail?id=${item.id}`,
    activity: `/pages/activity/detail?id=${item.id}`,
  }
  uni.navigateTo({ url: pathMap[item.type] || '/pages/notice/list' })
}

function onFeedAll() {
  uni.navigateTo({ url: '/pages/notice/list' })
}

function onStatClick(type: string) {
  const pathMap: Record<string, string> = {
    notices: '/pages/notice/list',
    homework: '/pages/homework/list',
    attendance: '/pages/attendance/list',
    activity: '/pages/activity/list',
  }
  uni.navigateTo({ url: pathMap[type] || '/pages/notice/list' })
}

async function loadData() {
  const classId = secureStorage.get<string>('currentClassId')
  if (!classId) return
  loading.value = true
  try {
    classInfo.value = await getClassInfo(classId)
  } catch {
    // 静默失败展示占位
  } finally {
    loading.value = false
  }
}

async function loadFeedAndStats() {
  const classId = secureStorage.get<string>('currentClassId')
  if (!classId) return

  feedLoading.value = true
  try {
    const [msgRes, attRes, hwRes, actRes] = await Promise.allSettled([
      getMessageList(classId, { page: 1, pageSize: 5 }),
      getAttendanceList(classId, { page: 1, pageSize: 1 }),
      getHomeworkList(classId, { page: 1, pageSize: 1 }),
      getActivityList(classId, { page: 1, pageSize: 1 }),
    ])

    // 构建动态列表
    const feeds: any[] = []

    if (msgRes.status === 'fulfilled' && msgRes.value?.list) {
      msgRes.value.list.forEach((m: MessageItem) => {
        feeds.push({
          id: m.id,
          type: m.type,
          title: m.title,
          meta: `${formatTimeAgo(m.createdAt)} · ${feedTypeMeta[m.type]?.typeLabel || '消息'} · ${m.publisher?.name || '未知'}`,
          icon: feedTypeMeta[m.type]?.icon || 'lucide:bell',
          color: feedTypeMeta[m.type]?.color || '#6B7280',
        })
      })
    }

    if (attRes.status === 'fulfilled' && attRes.value?.list?.length) {
      const att = attRes.value.list[0]
      feeds.push({
        id: att.id,
        type: 'attendance',
        title: att.title,
        meta: `${formatTimeAgo(att.createdAt)} · 签到 · ${att.publisher?.name || '未知'}`,
        icon: 'lucide:circle-check',
        color: '#2563EB',
      })
    }

    if (hwRes.status === 'fulfilled' && hwRes.value?.list?.length) {
      const hw = hwRes.value.list[0]
      if (!feeds.find((f) => f.type === 'homework' && f.id === hw.id)) {
        feeds.push({
          id: hw.id,
          type: 'homework',
          title: `${hw.subject} - ${hw.title}`,
          meta: `${formatTimeAgo(hw.createdAt)} · 作业 · ${hw.publisher?.name || '未知'}`,
          icon: 'lucide:file-text',
          color: '#F97316',
        })
      }
    }

    if (actRes.status === 'fulfilled' && actRes.value?.list?.length) {
      const act = actRes.value.list[0]
      feeds.push({
        id: act.id,
        type: 'activity',
        title: act.title,
        meta: `${formatTimeAgo(act.createdAt)} · 活动 · ${act.eventDate || ''}`,
        icon: 'lucide:flag',
        color: '#22C55E',
      })
    }

    // 按时间排序取前5条
    feeds.sort((a, b) => new Date(b.meta).getTime() - new Date(a.meta).getTime())
    feedList.value = feeds.slice(0, 5)

    // 统计数据
    let unreadCount = 0
    if (msgRes.status === 'fulfilled' && msgRes.value?.list) {
      unreadCount = msgRes.value.list.filter((m: MessageItem) => !m.isRead).length
    }

    let pendingHw = 0
    if (hwRes.status === 'fulfilled' && hwRes.value?.list) {
      pendingHw = hwRes.value.list.filter((h: any) => !h.submitted && h.status !== 'closed').length
    }

    let recentAtt = 0
    if (attRes.status === 'fulfilled' && attRes.value?.pagination) {
      recentAtt = attRes.value.pagination.total
    }

    let upcomingAct = 0
    if (actRes.status === 'fulfilled' && actRes.value?.total) {
      upcomingAct = actRes.value.total
    }

    stats.value = {
      unreadNotices: unreadCount,
      pendingHomework: pendingHw,
      recentAttendance: recentAtt,
      upcomingActivity: upcomingAct,
    }
  } catch {
    // 静默失败
  } finally {
    feedLoading.value = false
  }
}

function onSettings() {
  uni.navigateTo({ url: '/pages/class/settings' })
}

onMounted(() => {
  loadData()
  loadFeedAndStats()
})
</script>

<template>
  <view class="page">
    <StatusBar dark />

    <view class="header">
      <text class="title">班级</text>
      <text class="settings" @click="onSettings">设置</text>
    </view>

    <scroll-view scroll-y class="content">
      <view class="class-card">
        <text class="class-name">{{ classInfo?.name || (orgType === 'class' ? '我的班级' : '我的组织') }}</text>
        <text class="class-info">35 人 · 2022 级 · 计算机学院</text>
        <text class="class-code">{{ orgType === 'class' ? '班级码' : '组织码' }}：{{ classInfo?.code || '------' }}</text>

        <view class="admin-header">
          <view class="admin-avatar">
            <text class="admin-avatar-text">{{ admins[0]?.avatar || '班' }}</text>
          </view>
          <view class="admin-info">
            <text class="admin-name">{{ admins[0]?.name || '班长' }}</text>
            <text class="admin-role">{{ admins[0]?.role || '群主' }}</text>
          </view>
        </view>
        <view class="admin-divider" />
        <view class="admin-list">
          <text class="admin-list-title">管理员：王团支书、赵学委、孙生活委员</text>
          <view class="admin-avatars">
            <view
              v-for="(admin, idx) in admins.slice(1)"
              :key="idx"
              class="admin-mini-avatar"
            >
              <text class="admin-mini-text">{{ admin.avatar }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 数据概览 -->
      <view class="stats-row">
        <view class="stat-item" @click="onStatClick('notices')">
          <view class="stat-icon-wrap stat-icon-notice">
            <AppIcon icon="lucide:bell" size="36rpx" color="#EF4444" />
          </view>
          <text class="stat-value">{{ stats.unreadNotices }}</text>
          <text class="stat-label">未读通知</text>
        </view>
        <view class="stat-item" @click="onStatClick('homework')">
          <view class="stat-icon-wrap stat-icon-homework">
            <AppIcon icon="lucide:file-text" size="36rpx" color="#F97316" />
          </view>
          <text class="stat-value">{{ stats.pendingHomework }}</text>
          <text class="stat-label">待交作业</text>
        </view>
        <view class="stat-item" @click="onStatClick('attendance')">
          <view class="stat-icon-wrap stat-icon-attendance">
            <AppIcon icon="lucide:circle-check" size="36rpx" color="#2563EB" />
          </view>
          <text class="stat-value">{{ stats.recentAttendance }}</text>
          <text class="stat-label">签到记录</text>
        </view>
        <view class="stat-item" @click="onStatClick('activity')">
          <view class="stat-icon-wrap stat-icon-activity">
            <AppIcon icon="lucide:flag" size="36rpx" color="#22C55E" />
          </view>
          <text class="stat-value">{{ stats.upcomingActivity }}</text>
          <text class="stat-label">{{ activityStatLabel }}</text>
        </view>
      </view>

      <!-- 班级动态 -->
      <view class="feed-card">
        <view class="feed-header">
          <text class="feed-title">班级动态</text>
          <text class="feed-more" @click="onFeedAll">查看全部</text>
        </view>
        <view v-if="feedLoading" class="feed-empty">
          <text class="feed-empty-text">加载中...</text>
        </view>
        <view v-else-if="feedList.length === 0" class="feed-empty">
          <AppIcon icon="lucide:inbox" size="48rpx" color="#D1D5DB" />
          <text class="feed-empty-text">暂无动态</text>
        </view>
        <view v-else class="feed-list">
          <view
            v-for="(item, idx) in feedList"
            :key="idx"
            class="feed-item"
            @click="onFeed(item)"
          >
            <view class="feed-icon" :style="{ backgroundColor: item.color }">
              <AppIcon :icon="item.icon" size="40rpx" color="#FFFFFF" />
            </view>
            <view class="feed-text-wrap">
              <text class="feed-title-text">{{ item.title }}</text>
              <text class="feed-meta">{{ item.meta }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="menu-list">
        <view
          v-for="item in menuList"
          :key="item.label"
          class="menu-card"
          @click="onMenu(item)"
        >
          <view class="menu-left">
            <view class="menu-icon-wrap" :style="{ backgroundColor: item.bg }">
              <AppIcon :icon="item.icon" size="40rpx" :color="item.color" />
            </view>
            <view class="menu-text">
              <text class="menu-label">{{ item.label }}</text>
              <text class="menu-sub">{{ item.sub }}</text>
            </view>
          </view>
          <AppIcon icon="lucide:chevron-right" size="40rpx" color="#9CA3AF" />
        </view>
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
  background-color: #F8F8F8;
}

.header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  height: 112rpx;
  padding: 0 32rpx;
  box-sizing: border-box;
  background-color: #FFFFFF;
}

.title {
  font-size: 40rpx;
  font-weight: 700;
  color: #1A1A1A;
}

.settings {
  font-size: 28rpx;
  color: #4B5563;
}

.content {
  flex: 1;
  padding: 32rpx;
  box-sizing: border-box;
}

.class-card {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding: 40rpx;
  border-radius: 24rpx;
  background: linear-gradient(160deg, #0062FF 0%, #004ECC 100%);
  box-shadow: 0 12rpx 40rpx rgba(0, 98, 255, 0.25);
}

.class-name {
  font-size: 40rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.class-info {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.85);
}

.class-code {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.85);
}

.admin-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 20rpx;
  margin-top: 32rpx;
}

.admin-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background-color: #FFFFFF;
}

.admin-avatar-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #0062FF;
}

.admin-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.admin-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.admin-role {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.85);
}

.admin-divider {
  width: 100%;
  height: 2rpx;
  background-color: rgba(255, 255, 255, 0.2);
}

.admin-list {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.admin-list-title {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.9);
}

.admin-avatars {
  display: flex;
  flex-direction: row;
  gap: 8rpx;
}

.admin-mini-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.2);
}

.admin-mini-text {
  font-size: 22rpx;
  font-weight: 500;
  color: #FFFFFF;
}

/* 数据概览 */
.stats-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin-top: 24rpx;
  padding: 28rpx 16rpx;
  border-radius: 24rpx;
  background-color: #EBF3FF;
  border: 2rpx solid #B3D4FF;
  box-shadow: 0 4rpx 16rpx rgba(0, 98, 255, 0.08);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  flex: 1;
}

.stat-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
}

.stat-icon-notice {
  background-color: #EF444414;
}

.stat-icon-homework {
  background-color: #F9731614;
}

.stat-icon-attendance {
  background-color: #2563EB14;
}

.stat-icon-activity {
  background-color: #22C55E14;
}

.stat-value {
  font-size: 32rpx;
  font-weight: 700;
  color: #1A1A1A;
}

.stat-label {
  font-size: 22rpx;
  color: #9CA3AF;
}

/* 班级动态 */
.feed-card {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  margin-top: 24rpx;
  padding: 28rpx;
  border-radius: 24rpx;
  background-color: #FFFFFF;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
}

.feed-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.feed-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1A1A1A;
}

.feed-more {
  font-size: 24rpx;
  color: #0062FF;
}

.feed-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: 40rpx 0;
}

.feed-empty-text {
  font-size: 26rpx;
  color: #9CA3AF;
}

.feed-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.feed-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 20rpx;
  padding: 16rpx 20rpx;
  border-radius: 16rpx;
  background-color: #F9FAFB;
}

.feed-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  flex-shrink: 0;
}

.feed-text-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  overflow: hidden;
}

.feed-title-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #1A1A1A;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.feed-meta {
  font-size: 22rpx;
  color: #9CA3AF;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-top: 24rpx;
}

.menu-card {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx;
  border-radius: 24rpx;
  background-color: #FFFFFF;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
}

.menu-left {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 20rpx;
}

.menu-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
}

.menu-text {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.menu-label {
  font-size: 30rpx;
  font-weight: 600;
  color: #1A1A1A;
}

.menu-sub {
  font-size: 24rpx;
  color: #6B7280;
}

.safe-bottom {
  height: 160rpx;
}
</style>
