<script setup lang="ts">
import { ref } from 'vue'
import StatusBar from '@/components/StatusBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import { selectIdentity } from '@/common/api/auth'
import { secureStorage } from '@/common/storage/secure'

const loading = ref(false)

async function selectStudent() {
  if (loading.value) return
  loading.value = true
  try {
    await selectIdentity({ role: 'student' }).catch(() => null)
    secureStorage.set('currentIdentity', '学生')
    uni.navigateTo({ url: '/pages/class/join-class?identity=student' })
  } catch (err) {
    const message = err instanceof Error ? err.message : '选择身份失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function selectCommittee() {
  if (loading.value) return
  loading.value = true
  try {
    await selectIdentity({ role: 'committee' }).catch(() => null)
    secureStorage.set('currentIdentity', '班委')
    uni.navigateTo({ url: '/pages/class/join-class?identity=committee' })
  } catch (err) {
    const message = err instanceof Error ? err.message : '选择身份失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <view class="page">
    <StatusBar />
    <view class="content">
      <view class="header">
        <text class="title">选择你的身份</text>
        <text class="subtitle">请选择你在班级中的角色</text>
      </view>

      <view class="card-list">
        <view
          class="identity-card"
          :class="{ disabled: loading }"
          @click="selectStudent"
        >
          <AppIcon
            icon="lucide:graduation-cap"
            size="48rpx"
            color="var(--text-muted)"
          />
          <view class="identity-text">
            <text class="identity-label">我是学生</text>
            <text class="identity-desc">接收通知、签到、交作业</text>
          </view>
          <AppIcon
            icon="lucide:chevron-right"
            size="48rpx"
            color="var(--text-muted)"
          />
        </view>

        <view
          class="identity-card"
          :class="{ disabled: loading }"
          @click="selectCommittee"
        >
          <AppIcon
            icon="lucide:users"
            size="48rpx"
            color="var(--text-muted)"
          />
          <view class="identity-text">
            <text class="identity-label">我是班委</text>
            <text class="identity-desc">管理班级事务、发布通知</text>
          </view>
          <AppIcon
            icon="lucide:chevron-right"
            size="48rpx"
            color="var(--text-muted)"
          />
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100vh;
  background-color: var(--bg);
}

.content {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 0 48rpx;
  box-sizing: border-box;
}

.header {
  margin-top: 160rpx;
  margin-bottom: 80rpx;
}

.title {
  display: block;
  font-family: var(--font-heading);
  font-size: 72rpx;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
  margin-bottom: 16rpx;
}

.subtitle {
  display: block;
  font-size: var(--text-size-body);
  color: var(--text-secondary);
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.identity-card {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 32rpx;
  height: 192rpx;
  padding: 0 48rpx;
  border-radius: var(--rounded-xl);
  border: 2rpx solid var(--border);
  background-color: var(--surface);
  box-shadow: var(--shadow-soft);
  transition: transform 0.15s ease-out;
}

.identity-card.disabled {
  opacity: 0.7;
}

.identity-text {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  flex: 1;
}

.identity-label {
  display: block;
  font-size: var(--text-size-subhead);
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.identity-desc {
  display: block;
  font-size: var(--text-size-caption);
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
