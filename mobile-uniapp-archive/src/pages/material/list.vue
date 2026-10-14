<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import StatusBar from '@/components/StatusBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import BackButton from '@/components/BackButton.vue'
import { getCurrentClassId } from '@/common/utils/class'
import { secureStorage } from '@/common/storage/secure'
import { getLocalMaterials, removeLocalMaterial, type LocalMaterial } from '@/common/utils/material'

const loading = ref(false)
const materialList = ref<LocalMaterial[]>([])
const role = computed(() => secureStorage.get<string>('currentIdentity') || '学生')
const isCommittee = computed(() => role.value !== '学生')

interface FolderItem {
  key: string
  label: string
  icon: string
  color: string
  bg: string
}

const folders: FolderItem[] = [
  { key: '班会资料', label: '班会资料', icon: 'lucide:folder', color: '#2563EB', bg: '#2563EB14' },
  { key: '课程作业', label: '课程作业', icon: 'lucide:file-text', color: '#F97316', bg: '#F9731614' },
  { key: '活动照片', label: '活动照片', icon: 'lucide:image', color: '#A855F7', bg: '#A855F714' },
  { key: '评优材料', label: '评优材料', icon: 'lucide:award', color: '#EF4444', bg: '#EF444414' },
]

function formatSize(bytes?: number) {
  if (bytes === undefined || bytes === null || bytes <= 0) return '未知大小'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function loadList() {
  const classId = getCurrentClassId()
  if (!classId) {
    uni.showToast({ title: '未选择班级', icon: 'none' })
    return
  }
  loading.value = true
  try {
    materialList.value = getLocalMaterials(classId)
  } finally {
    loading.value = false
  }
}

function openInApp(item: LocalMaterial) {
  const fs = uni.getFileSystemManager?.()
  if (!fs) {
    uni.showToast({ title: '当前环境不支持打开文件', icon: 'none' })
    return
  }
  const filePath = `${(uni as any).env.USER_DATA_PATH}/${item.id}_${item.fileName}`
  try {
    fs.writeFileSync(filePath, item.fileUrl.replace(/^data:[^;]+;base64,/, ''), 'base64')
    uni.openDocument({
      filePath,
      showMenu: true,
      fail: () => uni.showToast({ title: '打开文件失败', icon: 'none' }),
    })
  } catch {
    uni.showToast({ title: '保存文件失败', icon: 'none' })
  }
}

function onItemClick(item: LocalMaterial) {
  openInApp(item)
}

function onDelete(item: LocalMaterial) {
  const classId = getCurrentClassId()
  if (!classId) return
  uni.showModal({
    title: '删除资料',
    content: `确定删除 "${item.fileName}" 吗？`,
    confirmColor: '#EF4444',
    success: (res) => {
      if (res.confirm) {
        removeLocalMaterial(classId, item.id)
        loadList()
      }
    },
  })
}

function onUpload() {
  uni.navigateTo({ url: '/pages/material/upload' })
}

function onFolderClick(folder: FolderItem) {
  uni.navigateTo({ url: `/pages/material/files?category=${encodeURIComponent(folder.key)}` })
}

onMounted(() => {
  loadList()
})
</script>

<template>
  <view class="page">
    <StatusBar dark />

    <view class="header">
      <BackButton class="back" />
      <text class="title">班级资料库</text>
      <text v-if="isCommittee" class="publish" @click="onUpload">上传</text>
      <view v-else class="action-placeholder" />
    </view>

    <scroll-view scroll-y class="content">
      <view class="folders-grid">
        <view
          v-for="folder in folders"
          :key="folder.key"
          class="folder-card"
          @click="onFolderClick(folder)"
        >
          <view class="folder-icon-wrap" :style="{ backgroundColor: folder.bg }">
            <AppIcon :icon="folder.icon" size="44rpx" :color="folder.color" />
          </view>
          <text class="folder-label">{{ folder.label }}</text>
          <text class="folder-count">12 个文件</text>
        </view>
      </view>

      <view class="section-header">
        <view class="section-dot" style="background-color: var(--accent);" />
        <text class="section-title">最近上传</text>
      </view>

      <view v-if="materialList.length === 0 && !loading" class="empty">
        <AppIcon icon="lucide:folder-open" size="96rpx" color="var(--text-muted)" />
        <text class="empty-text">暂无资料</text>
      </view>

      <view
        v-for="item in materialList"
        :key="item.id"
        class="material-card"
        @click="onItemClick(item)"
        @longpress="onDelete(item)"
      >
        <view class="material-row">
          <AppIcon icon="lucide:file-text" size="48rpx" color="var(--accent)" />
          <view class="material-info">
            <text class="material-name">{{ item.title || item.fileName }}</text>
            <text class="material-meta">{{ formatSize(item.fileSize) }} · {{ item.fileName }}</text>
          </view>
          <AppIcon icon="lucide:chevron-right" size="40rpx" color="var(--text-muted)" />
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

.publish {
  font-size: var(--text-size-body);
  font-weight: 500;
  color: var(--accent);
  padding: 16rpx;
}

.content {
  flex: 1;
  padding: 24rpx;
  box-sizing: border-box;
}

.folders-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.folder-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 24rpx 8rpx;
  background-color: var(--surface);
  border-radius: var(--rounded-lg);
  box-shadow: var(--shadow-soft);
}

.folder-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 76rpx;
  height: 76rpx;
  border-radius: 9999rpx;
  flex-shrink: 0;
}

.folder-label {
  font-size: var(--text-size-body);
  font-weight: 600;
  color: var(--text-primary);
}

.folder-count {
  font-size: var(--text-size-caption);
  color: var(--text-muted);
}

.section-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.section-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
}

.section-title {
  font-size: var(--text-size-subhead);
  font-weight: 600;
  color: var(--text-primary);
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 120rpx;
  gap: 24rpx;
}

.empty-text {
  font-size: var(--text-size-body);
  color: var(--text-muted);
}

.material-card {
  padding: 24rpx;
  margin-bottom: 20rpx;
  background-color: var(--surface);
  border-radius: var(--rounded-lg);
  box-shadow: var(--shadow-soft);
}

.material-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 20rpx;
}

.material-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  overflow: hidden;
}

.material-name {
  font-size: var(--text-size-body);
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.material-meta {
  font-size: var(--text-size-caption);
  color: var(--text-muted);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.safe-bottom {
  height: 48rpx;
}
</style>
