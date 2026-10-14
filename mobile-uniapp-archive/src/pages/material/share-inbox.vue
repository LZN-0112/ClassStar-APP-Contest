<script setup lang="ts">
import { ref, onMounted } from 'vue'
import StatusBar from '@/components/StatusBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import BackButton from '@/components/BackButton.vue'
import AppButton from '@/components/AppButton.vue'
import { getCurrentClassId } from '@/common/utils/class'
import { request } from '@/common/api/request'
import {
  getPendingShareFiles,
  clearPendingShareFiles,
} from '@/common/plugins/share-receiver'

interface PendingFile {
  name: string
  path: string
  size: number
  type?: string
}

const FOLDERS = ['班会资料', '课程作业', '活动照片', '评优材料']

const files = ref<PendingFile[]>([])
const selectedFolder = ref('')
const submitting = ref(false)

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function getFileExt(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  return ext
}

onMounted(() => {
  const pending = getPendingShareFiles()
  files.value = pending
})

function removeFile(index: number) {
  files.value.splice(index, 1)
}

async function handleArchive() {
  if (files.value.length === 0) {
    uni.showToast({ title: '没有待归档的文件', icon: 'none' })
    return
  }
  if (!selectedFolder.value) {
    uni.showToast({ title: '请选择文件分类', icon: 'none' })
    return
  }

  const classId = getCurrentClassId()
  if (!classId) {
    uni.showToast({ title: '未选择班级，请先加入班级', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    for (let i = 0; i < files.value.length; i++) {
      const file = files.value[i]
      await request.uploadFile(
        '/material/upload',
        { path: file.path },
        'file'
      )
    }

    // 归档成功，清除缓存
    clearPendingShareFiles()

    uni.showToast({
      title: `成功归档 ${files.value.length} 个文件`,
      icon: 'success',
    })

    setTimeout(() => {
      uni.redirectTo({
        url: '/pages/material/files',
      })
    }, 1200)
  } catch (err: any) {
    uni.showToast({
      title: err.message || '归档失败，请重试',
      icon: 'none',
      duration: 3000,
    })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <view class="page">
    <StatusBar dark />

    <view class="header">
      <BackButton class="back" />
      <text class="title">归档外部文件</text>
      <view class="action-placeholder" />
    </view>

    <scroll-view scroll-y class="content">
      <!-- 空状态 -->
      <view v-if="files.length === 0" class="empty-state">
        <AppIcon icon="lucide:inbox" size="96rpx" color="var(--text-muted)" />
        <text class="empty-text">暂无待归档文件</text>
        <text class="empty-hint">从微信等应用分享文件后，在此处查看并归档</text>
      </view>

      <!-- 有文件 -->
      <template v-else>
        <view class="info-card">
          <view class="info-row">
            <AppIcon icon="lucide:info" size="36rpx" color="var(--accent)" />
            <text class="info-text">收到 {{ files.length }} 个来自外部应用的文件</text>
          </view>
        </view>

        <!-- 文件列表 -->
        <view class="section">
          <text class="section-title">待归档文件</text>
          <view class="file-list">
            <view
              v-for="(file, index) in files"
              :key="index"
              class="file-item"
            >
              <view class="file-row">
                <view class="file-icon">
                  <AppIcon icon="lucide:file-text" size="40rpx" color="var(--accent)" />
                </view>
                <view class="file-info">
                  <text class="file-name">{{ file.name }}</text>
                  <text class="file-size">{{ formatSize(file.size) }}</text>
                </view>
                <view class="remove-btn" @click="removeFile(index)">
                  <AppIcon icon="lucide:x" size="32rpx" color="var(--text-muted)" />
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 分类选择 -->
        <view class="section">
          <text class="section-title">选择分类</text>
          <view class="folder-list">
            <view
              v-for="folder in FOLDERS"
              :key="folder"
              class="folder-tag"
              :class="{ 'folder-tag--active': selectedFolder === folder }"
              @click="selectedFolder = folder"
            >
              <text
                class="folder-text"
                :class="{ 'folder-text--active': selectedFolder === folder }"
              >
                {{ folder }}
              </text>
            </view>
          </view>
        </view>

        <!-- 归档按钮 -->
        <view class="submit-wrapper">
          <AppButton
            :loading="submitting"
            :disabled="files.length === 0 || !selectedFolder"
            @click="handleArchive"
          >
            归档到资料库
          </AppButton>
        </view>
      </template>

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

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 48rpx;
  gap: 16rpx;
}

.empty-text {
  font-size: var(--text-size-body);
  font-weight: 600;
  color: var(--text-primary);
  margin-top: 16rpx;
}

.empty-hint {
  font-size: var(--text-size-caption);
  color: var(--text-muted);
  text-align: center;
}

/* 信息卡片 */
.info-card {
  display: flex;
  flex-direction: column;
  padding: 24rpx;
  margin-bottom: 24rpx;
  background-color: var(--accent-50);
  border-radius: var(--rounded-lg);
  border: 2rpx solid var(--accent-100);
}

.info-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12rpx;
}

.info-text {
  font-size: var(--text-size-body);
  color: var(--accent);
  font-weight: 500;
}

/* 分区 */
.section {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.section-title {
  font-size: var(--text-size-body);
  font-weight: 600;
  color: var(--text-primary);
}

/* 文件列表 */
.file-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.file-item {
  display: flex;
  flex-direction: column;
  padding: 24rpx;
  background-color: var(--surface);
  border-radius: var(--rounded-lg);
  box-shadow: var(--shadow-soft);
  border: 2rpx solid var(--border);
}

.file-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
}

.file-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  background-color: var(--accent-50);
  border-radius: var(--rounded-md);
}

.file-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  overflow: hidden;
}

.file-name {
  font-size: var(--text-size-body);
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: var(--text-size-caption);
  color: var(--text-muted);
}

.remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
}

/* 分类标签 */
.folder-list {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 16rpx;
}

.folder-tag {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12rpx 32rpx;
  border-radius: var(--rounded-full);
  background-color: var(--accent-50);
}

.folder-tag--active {
  background-color: var(--accent);
}

.folder-text {
  font-size: var(--text-size-caption);
  font-weight: 600;
  color: var(--accent);
}

.folder-text--active {
  color: var(--text-inverse);
}

/* 提交按钮 */
.submit-wrapper {
  margin-top: 16rpx;
}

.safe-bottom {
  height: 48rpx;
}
</style>
