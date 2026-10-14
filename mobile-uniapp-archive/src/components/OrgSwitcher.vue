<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { getMyClasses, getOrgTodos, type MyOrgItem, type OrgTodosResult } from '@/common/api/auth'
import { getCurrentClassId, setCurrentClassId, setCurrentOrg, type OrgInfo } from '@/common/utils/class'

const isOpen = ref(false)
const orgList = ref<MyOrgItem[]>([])
const loading = ref(false)
const currentOrgId = getCurrentClassId()
const todoMap = ref<Map<string, number>>(new Map())

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

const currentOrg = ref<{ name: string; orgType: string; role: string }>({
  name: '我的组织',
  orgType: 'class',
  role: '',
})

async function loadTodos() {
  try {
    const todos = await getOrgTodos()
    const map = new Map<string, number>()
    for (const org of todos) {
      map.set(org.orgId, org.totalCount)
    }
    todoMap.value = map
  } catch {
    // 静默失败，不影响主流程
  }
}

async function loadOrgs() {
  loading.value = true
  try {
    const list = await getMyClasses()
    orgList.value = list || []

    if (currentOrgId && list && list.length > 0) {
      const current = list.find((o) => o.id === currentOrgId)
      if (current) {
        currentOrg.value = {
          name: current.name,
          orgType: current.orgType,
          role: current.role,
        }
      }
    } else if (list && list.length > 0) {
      const first = list[0]
      currentOrg.value = {
        name: first.name,
        orgType: first.orgType,
        role: first.role,
      }
    }

    // 并行加载待办数据
    await loadTodos()
  } catch (err) {
    const message = err instanceof Error ? err.message : '加载失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    loading.value = false
  }
}

function getTodoCount(orgId: string): number {
  return todoMap.value.get(orgId) || 0
}

function toggle() {
  if (!isOpen.value) {
    loadOrgs()
  }
  isOpen.value = !isOpen.value
}

function close() {
  isOpen.value = false
}

async function switchOrg(org: MyOrgItem) {
  if (org.id === currentOrgId) {
    close()
    return
  }

  setCurrentClassId(org.id)
  const orgInfo: OrgInfo = {
    id: org.id,
    name: org.name,
    orgType: org.orgType,
    roleLevel: org.roleLevel,
  }
  setCurrentOrg(orgInfo)

  close()
  uni.showToast({ title: `已切换到 ${org.name}`, icon: 'success', duration: 1500 })

  setTimeout(() => {
    uni.reLaunch({ url: '/pages/home/index' })
  }, 800)
}

function goToCreate() {
  close()
  uni.navigateTo({ url: '/pages/class/join-class' })
}

onMounted(() => {
  if (currentOrgId) {
    loadOrgs()
  }
})

defineExpose({ loadOrgs })
</script>

<template>
  <view class="org-switcher">
    <!-- 顶部栏 -->
    <view class="org-bar" @click="toggle">
      <view class="org-bar-left">
        <view
          class="org-logo"
          :style="{ backgroundColor: typeColorMap[currentOrg.orgType] || '#2563EB' }"
        >
          <AppIcon
            :icon="typeIconMap[currentOrg.orgType] || 'lucide:school'"
            size="36rpx"
            color="#FFFFFF"
          />
        </view>
        <text class="org-name">{{ currentOrg.name }}</text>
        <view
          class="org-badge"
          :style="{ backgroundColor: (typeColorMap[currentOrg.orgType] || '#2563EB') + '18' }"
        >
          <text
            class="org-badge-text"
            :style="{ color: typeColorMap[currentOrg.orgType] || '#2563EB' }"
          >{{ typeLabelMap[currentOrg.orgType] || '组织' }}</text>
        </view>
      </view>
      <AppIcon icon="lucide:chevron-down" size="40rpx" color="#6B7280" />
    </view>

    <!-- 遮罩 -->
    <view v-if="isOpen" class="overlay" @click="close" />

    <!-- 下拉面板 -->
    <view v-if="isOpen" class="panel" @click.stop @touchstart.stop>
      <view class="panel-header">
        <text class="panel-title">切换组织</text>
        <view class="panel-close" @click="close">
          <AppIcon icon="lucide:x" size="32rpx" color="#9CA3AF" />
        </view>
      </view>

      <scroll-view scroll-y class="panel-list">
        <view
          v-for="org in orgList"
          :key="org.id"
          class="org-item"
          :class="{ active: org.id === currentOrgId }"
          @click="switchOrg(org)"
        >
          <view
            class="org-item-logo"
            :style="{ backgroundColor: typeColorMap[org.orgType] || '#2563EB' }"
          >
            <AppIcon
              :icon="typeIconMap[org.orgType] || 'lucide:school'"
              size="36rpx"
              color="#FFFFFF"
            />
          </view>
          <view class="org-item-info">
            <view class="org-item-name-row">
              <text class="org-item-name">{{ org.name }}</text>
              <view v-if="getTodoCount(org.id) > 0" class="todo-badge">
                <text class="todo-badge-text">{{ getTodoCount(org.id) }}</text>
              </view>
            </view>
            <view class="org-item-meta">
              <text
                class="org-item-type"
                :style="{ color: typeColorMap[org.orgType] || '#2563EB' }"
              >{{ typeLabelMap[org.orgType] || '组织' }}</text>
              <text class="org-item-role">{{ org.role }}</text>
            </view>
          </view>
          <view class="org-item-right">
            <AppIcon
              v-if="org.id === currentOrgId"
              icon="lucide:check"
              size="40rpx"
              color="#0062FF"
            />
          </view>
        </view>

        <view v-if="loading" class="loading-row">
          <text class="loading-text">加载中...</text>
        </view>
      </scroll-view>

      <!-- 底部操作 -->
      <view class="panel-footer">
        <view class="footer-btn" @click="goToCreate">
          <AppIcon icon="lucide:plus" size="40rpx" color="#0062FF" />
          <text class="footer-btn-text">创建 / 加入组织</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.org-switcher {
  width: 100%;
}

/* 顶部栏 */
.org-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 28rpx;
  border-radius: 20rpx;
  background-color: #ffffff;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.org-bar-left {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
  flex: 1;
  overflow: hidden;
}

.org-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  border-radius: 16rpx;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}

.org-logo::before {
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

.org-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.org-badge {
  display: inline-flex;
  align-items: center;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
}

.org-badge-text {
  font-size: 22rpx;
  font-weight: 500;
}

/* 遮罩 */
.overlay {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 200;
}

/* 下拉面板 */
.panel {
  position: fixed;
  left: 32rpx;
  top: calc(var(--status-bar-height, 0px) + 120rpx);
  right: 32rpx;
  z-index: 201;
  display: flex;
  flex-direction: column;
  max-height: 65vh;
  border-radius: 24rpx;
  background-color: #ffffff;
  box-shadow: 0 12rpx 48rpx rgba(0, 0, 0, 0.12);
  overflow: hidden;
  animation: slideDown 0.25s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.panel-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #f3f4f6;
}

.panel-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.panel-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background-color: #f3f4f6;
}

.panel-list {
  flex: 1;
  max-height: 50vh;
  padding: 16rpx 0;
}

/* 组织列表项 */
.org-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 32rpx;
  transition: background-color 0.15s;
}

.org-item:active {
  background-color: #f9fafb;
}

.org-item.active {
  background-color: #f0f7ff;
}

.org-item-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60rpx;
  height: 60rpx;
  border-radius: 18rpx;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}

.org-item-logo::before {
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

.org-item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.org-item-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.org-item-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #1a1a1a;
}

.todo-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 36rpx;
  height: 36rpx;
  padding: 0 10rpx;
  border-radius: 18rpx;
  background-color: #ef4444;
}

.todo-badge-text {
  font-size: 20rpx;
  font-weight: 600;
  color: #ffffff;
}

.org-item-meta {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12rpx;
}

.org-item-type {
  font-size: 22rpx;
  font-weight: 500;
}

.org-item-role {
  font-size: 22rpx;
  color: #9ca3af;
}

.org-item-right {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48rpx;
  height: 48rpx;
}

.loading-row {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx;
}

.loading-text {
  font-size: 24rpx;
  color: #9ca3af;
}

/* 底部操作 */
.panel-footer {
  padding: 20rpx 32rpx;
  border-top: 1rpx solid #f3f4f6;
}

.footer-btn {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  height: 80rpx;
  border-radius: 16rpx;
  background-color: #f0f7ff;
}

.footer-btn-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #0062ff;
}
</style>
