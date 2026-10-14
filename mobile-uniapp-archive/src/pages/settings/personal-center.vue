<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import StatusBar from '@/components/StatusBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import { getProfile } from '@/common/api/settings'
import { getClassInfo, getMyClasses, leaveClass, type MyOrgItem } from '@/common/api/auth'
import { secureStorage } from '@/common/storage/secure'
import { getCurrentClassId, setCurrentClassId, getCurrentOrg, setCurrentOrg, type OrgInfo } from '@/common/utils/class'

interface Profile {
  id: string
  name: string
  phone: string
  avatar: string | null
  studentId: string | null
  major: string | null
  createdAt: string
}

interface ClassInfo {
  id: string
  name: string
  code: string
  qrCodeUrl: string
  createdBy: string
}

const profile = ref<Profile>({
  id: '',
  name: '',
  phone: '',
  avatar: null,
  studentId: null,
  major: null,
  createdAt: '',
})

const classInfo = ref<ClassInfo | null>(null)
const role = ref('学生')

// 我的组织列表
const orgList = ref<MyOrgItem[]>([])
const orgLoading = ref(false)
const currentOrgId = ref<string>('')

const typeIconMap: Record<string, string> = {
  class: 'lucide:school',
  association: 'lucide:tent',
  committee: 'lucide:users',
  club: 'lucide:star',
}
const typeLabelMap: Record<string, string> = {
  class: '班级',
  association: '社团',
  committee: '部门',
  club: '兴趣小组',
}
const typeColorMap: Record<string, string> = {
  class: '#2563EB',
  association: '#A855F7',
  committee: '#EF4444',
  club: '#F59E0B',
}

async function loadOrgs() {
  orgLoading.value = true
  try {
    const list = await getMyClasses()
    orgList.value = list || []
    currentOrgId.value = getCurrentClassId()
  } catch {
    // 静默失败
  } finally {
    orgLoading.value = false
  }
}

function switchOrg(org: MyOrgItem) {
  setCurrentClassId(org.id)
  const orgInfo: OrgInfo = {
    id: org.id,
    name: org.name,
    orgType: org.orgType,
    roleLevel: org.roleLevel,
  }
  setCurrentOrg(orgInfo)
  uni.reLaunch({ url: '/pages/home/index' })
}

async function handleLeave(org: MyOrgItem) {
  const res = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '退出组织',
      content: `确定要退出「${org.name}」吗？`,
      confirmText: '退出',
      confirmColor: '#EF4444',
      success: (r) => resolve(r.confirm),
    })
  })
  if (!res) return

  try {
    await leaveClass(org.id)
    uni.showToast({ title: '已退出组织', icon: 'success' })

    const wasCurrent = org.id === currentOrgId.value
    await loadOrgs()

    if (wasCurrent) {
      // 退出的是当前组织：切到剩余第一个，没有则去加入页
      const remaining = orgList.value
      if (remaining.length > 0) {
        const first = remaining[0]
        setCurrentClassId(first.id)
        setCurrentOrg({
          id: first.id,
          name: first.name,
          orgType: first.orgType,
          roleLevel: first.roleLevel,
        })
      } else {
        setCurrentClassId('')
        setCurrentOrg({ id: '', name: '', orgType: 'class' })
      }
      uni.reLaunch({
        url: remaining.length > 0 ? '/pages/home/index' : '/pages/class/join-class',
      })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : '退出失败'
    uni.showToast({ title: message, icon: 'none' })
  }
}

const avatarText = computed(() => (profile.value.name || '同学').slice(0, 1))
const dutyText = computed(() => (role.value === '班委' ? '班长' : '暂无职务'))
const majorText = computed(() => profile.value.major || '-')
const maskedPhone = computed(() => {
  const phone = profile.value.phone || ''
  if (phone.length === 11) {
    return `${phone.slice(0, 3)}****${phone.slice(-4)}`
  }
  return phone || '-'
})
const classSub = computed(() => {
  const parts: string[] = []
  if (majorText.value && majorText.value !== '-') parts.push(majorText.value)
  if (classInfo.value?.name) parts.push(classInfo.value.name)
  return parts.length ? parts.join(' · ') : '暂无班级信息'
})

const quickActions = [
  { label: '待办中心', icon: 'lucide:check-square', color: '#8B5CF6', path: '/pages/todo/index' },
  { label: '我的考勤', icon: 'lucide:clock-check', color: '#3B82F6', path: '/pages/profile/attendance' },
  { label: '我的作业', icon: 'lucide:notebook-text', color: '#F97316', path: '/pages/profile/homework' },
  { label: '我的活动', icon: 'lucide:flag', color: '#EF4444', path: '/pages/profile/activity' },
  { label: '我的报名', icon: 'lucide:clipboard-check', color: '#22C55E', path: '/pages/profile/signup' },
]

const baseInfoRows = [
  { label: '学号', valueKey: 'studentId' as const, icon: 'lucide:hash' },
  { label: '专业', valueKey: 'major' as const, icon: 'lucide:book-open' },
  { label: '班级', valueKey: 'class' as const, icon: 'lucide:users' },
  { label: '联系方式', valueKey: 'phone' as const, icon: 'lucide:phone' },
]

function goSettings() {
  uni.navigateTo({ url: '/pages/settings/settings' })
}

function handleBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  }
}

function handleQuick(item: typeof quickActions[0]) {
  uni.navigateTo({ url: item.path })
}

function getRowValue(row: typeof baseInfoRows[0]) {
  if (row.valueKey === 'studentId') return profile.value.studentId || '-'
  if (row.valueKey === 'major') return profile.value.major || '-'
  if (row.valueKey === 'class') return classInfo.value?.name || '-'
  if (row.valueKey === 'phone') return maskedPhone.value
  return '-'
}

async function loadData() {
  try {
    const userInfo = secureStorage.get<any>('userInfo')
    if (userInfo) {
      const cloned = JSON.parse(JSON.stringify(userInfo))
      profile.value.name = cloned.name || ''
      profile.value.phone = cloned.phone || ''
      role.value = cloned.identity || cloned.role || secureStorage.get<string>('currentIdentity') || '学生'
    }
    const data = await getProfile()
    if (data) {
      const cloned = JSON.parse(JSON.stringify(data)) as Profile
      profile.value.id = cloned.id || profile.value.id
      profile.value.name = cloned.name || profile.value.name
      profile.value.phone = cloned.phone || profile.value.phone
      profile.value.avatar = cloned.avatar ?? profile.value.avatar
      profile.value.studentId = cloned.studentId ?? profile.value.studentId
      profile.value.major = cloned.major ?? profile.value.major
      profile.value.createdAt = cloned.createdAt || profile.value.createdAt
    }
    const classId = secureStorage.get<string>('currentClassId')
    if (classId) {
      classInfo.value = await getClassInfo(classId)
    }
    await loadOrgs()
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取资料失败'
    uni.showToast({ title: message, icon: 'none' })
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <view class="page">
    <StatusBar dark />

    <!-- Header -->
    <view class="header">
      <view class="settings-row">
        <view class="back-btn" @click="handleBack">
          <AppIcon icon="lucide:chevron-left" size="48rpx" color="#ffffff" />
        </view>
        <view class="spacer" />
        <view class="settings-btn" @click="goSettings">
          <AppIcon icon="lucide:settings" size="44rpx" color="#ffffff" />
        </view>
      </view>

      <view class="profile-row">
        <view class="avatar">
          <text class="avatar-text">{{ avatarText }}</text>
        </view>
        <view class="profile-info">
          <view class="name-row">
            <text class="name">{{ profile.name || '同学' }}</text>
            <view class="role-tag">
              <text class="role-text">{{ dutyText }}</text>
            </view>
          </view>
          <text class="class-sub">{{ classSub }}</text>
        </view>
      </view>
    </view>

    <!-- Content Card -->
    <scroll-view scroll-y class="content">
      <view class="content-card">
        <view class="quick-actions">
          <view
            v-for="item in quickActions"
            :key="item.label"
            class="quick-item"
            @click="handleQuick(item)"
          >
            <view class="quick-icon" :style="{ backgroundColor: item.color }">
              <AppIcon :icon="item.icon" size="60rpx" color="#ffffff" />
            </view>
            <text class="quick-label">{{ item.label }}</text>
          </view>
        </view>

        <!-- 我的组织 -->
        <view class="group">
          <text class="group-title">我的组织</text>
          <view class="group-content">
            <view v-if="orgLoading" class="org-empty">
              <text class="org-empty-text">加载中...</text>
            </view>
            <template v-else-if="orgList.length > 0">
              <view
                v-for="(org, idx) in orgList"
                :key="org.id"
                class="org-row"
                :class="{ 'org-row-last': idx === orgList.length - 1 }"
              >
                <view
                  class="org-row-logo"
                  :style="{ backgroundColor: typeColorMap[org.orgType] || '#2563EB' }"
                >
                  <AppIcon
                    :icon="typeIconMap[org.orgType] || 'lucide:school'"
                    size="36rpx"
                    color="#FFFFFF"
                  />
                </view>
                <view class="org-row-info">
                  <view class="org-row-name-row">
                    <text class="org-row-name">{{ org.name }}</text>
                    <text
                      class="org-row-badge"
                      :style="{ color: typeColorMap[org.orgType] || '#2563EB' }"
                    >{{ typeLabelMap[org.orgType] || '组织' }}</text>
                    <text v-if="org.id === currentOrgId" class="org-current-tag">当前</text>
                  </view>
                  <view class="org-row-meta">
                    <text class="org-row-role">{{ org.role }}</text>
                    <text class="org-row-count">{{ org.memberCount }} 人</text>
                  </view>
                </view>
                <view class="org-row-actions">
                  <view
                    v-if="org.id !== currentOrgId"
                    class="org-action-btn org-action-switch"
                    @click="switchOrg(org)"
                  >
                    <text class="org-action-text">切换</text>
                  </view>
                  <view
                    class="org-action-btn org-action-leave"
                    @click="handleLeave(org)"
                  >
                    <text class="org-action-leave-text">退出</text>
                  </view>
                </view>
              </view>
            </template>
            <view v-else class="org-empty">
              <text class="org-empty-text">暂无组织，去加入一个吧</text>
            </view>
          </view>
        </view>

        <view class="group">
          <text class="group-title">基础信息</text>
          <view class="group-content">
            <view
              v-for="(row, idx) in baseInfoRows"
              :key="row.label"
              class="info-row"
              :class="{ 'info-row-last': idx === baseInfoRows.length - 1 }"
            >
              <AppIcon :icon="row.icon" size="40rpx" color="#9CA3AF" />
              <text class="info-label">{{ row.label }}</text>
              <view class="spacer" />
              <text class="info-value">{{ getRowValue(row) }}</text>
              <AppIcon icon="lucide:chevron-right" size="36rpx" color="#D1D5DB" />
            </view>
          </view>
        </view>

        <view class="group">
          <text class="group-title">身份信息</text>
          <view class="group-content">
            <view class="info-row info-row-last">
              <AppIcon icon="lucide:award" size="40rpx" color="#9CA3AF" />
              <text class="info-label">班委职务</text>
              <view class="spacer" />
              <text class="info-value">{{ dutyText }}</text>
              <AppIcon icon="lucide:chevron-right" size="36rpx" color="#D1D5DB" />
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
  background-color: #f3f4f6;
}

.header {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 432rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding: 0 40rpx;
  box-sizing: border-box;
  background: linear-gradient(180deg, #DEFCFF 0%, #32C9FD 50%, #076CAB 100%);
  z-index: 1;
}

.settings-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-top: 80rpx;
}

.spacer {
  flex: 1;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80rpx;
  height: 80rpx;
  margin-left: -16rpx;
}

.settings-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80rpx;
  height: 80rpx;
}

.profile-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
}

.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background-color: #ffffff;
}

.avatar-text {
  font-size: 40rpx;
  font-weight: 700;
  color: #0062ff;
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.name-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
}

.name {
  font-size: 40rpx;
  font-weight: 700;
  color: #ffffff;
}

.role-tag {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40rpx;
  padding: 0 16rpx;
  border-radius: 20rpx;
  background-color: rgba(0, 98, 255, 0.16);
}

.role-text {
  font-size: 22rpx;
  font-weight: 600;
  color: #ffffff;
}

.class-sub {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}

.content {
  position: relative;
  z-index: 10;
  flex: 1;
  margin-top: 368rpx;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.content::-webkit-scrollbar {
  display: none;
}

.content-card {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
  padding: 32rpx 40rpx 40rpx;
  border-radius: 48rpx 48rpx 0 0;
  background-color: #ffffff;
  min-height: calc(100vh - 368rpx);
  box-sizing: border-box;
}

.quick-actions {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
}

.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  width: 140rpx;
}

.quick-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 90rpx;
  height: 90rpx;
  border-radius: 28rpx;
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
  background-color: rgba(255, 255, 255, 0.22);
}

.quick-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #1a1a1a;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.group-title {
  font-size: 22rpx;
  font-weight: 600;
  color: #9CA3AF;
  letter-spacing: 2rpx;
  padding-left: 4rpx;
}

.group-content {
  display: flex;
  flex-direction: column;
  background-color: #FFFFFF;
  border-radius: 24rpx;
  overflow: hidden;
}

.info-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 112rpx;
  padding: 0 32rpx;
  gap: 16rpx;
  border-bottom: 1rpx solid #F3F4F6;
}

.info-row-last {
  border-bottom: none;
}

.info-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #6B7280;
}

.info-value {
  font-size: 28rpx;
  font-weight: 600;
  color: #111827;
}

/* 我的组织 */
.org-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 112rpx;
}

.org-empty-text {
  font-size: 26rpx;
  color: #9CA3AF;
}

.org-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid #F3F4F6;
}

.org-row-last {
  border-bottom: none;
}

.org-row-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
  flex-shrink: 0;
}

.org-row-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
}

.org-row-name-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12rpx;
}

.org-row-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #1A1A1A;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 280rpx;
}

.org-row-badge {
  font-size: 22rpx;
  font-weight: 500;
}

.org-current-tag {
  font-size: 20rpx;
  font-weight: 600;
  color: #2563EB;
  background-color: #EFF6FF;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
}

.org-row-meta {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
}

.org-row-role {
  font-size: 24rpx;
  color: #6B7280;
}

.org-row-count {
  font-size: 24rpx;
  color: #9CA3AF;
}

.org-row-actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12rpx;
  flex-shrink: 0;
}

.org-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 52rpx;
  padding: 0 20rpx;
  border-radius: 26rpx;
}

.org-action-switch {
  background-color: #EFF6FF;
}

.org-action-text {
  font-size: 24rpx;
  font-weight: 600;
  color: #2563EB;
}

.org-action-leave {
  background-color: #FEF2F2;
}

.org-action-leave-text {
  font-size: 24rpx;
  font-weight: 600;
  color: #EF4444;
}

.bottom-safe {
  height: 160rpx;
}
</style>
