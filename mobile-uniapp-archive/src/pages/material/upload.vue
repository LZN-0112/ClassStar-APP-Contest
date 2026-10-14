<script setup lang="ts">
import { ref, computed } from 'vue'
import StatusBar from '@/components/StatusBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import BackButton from '@/components/BackButton.vue'
import AppButton from '@/components/AppButton.vue'
import AppInput from '@/components/AppInput.vue'
import { getCurrentClassId } from '@/common/utils/class'
import { secureStorage } from '@/common/storage/secure'
import { request } from '@/common/api/request'

interface SelectedFile {
  name: string
  size: number
  path?: string
}

const title = ref('')
const content = ref('')
const files = ref<SelectedFile[]>([])
const submitting = ref(false)

const role = computed(() => secureStorage.get<string>('currentIdentity') || '学生')
const isCommittee = computed(() => role.value !== '学生')
const canSubmit = computed(() => title.value.trim() && files.value.length > 0 && !submitting.value)

const MAX_FILE_SIZE = 5 * 1024 * 1024

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function chooseAppFile() {
  uni.chooseMessageFile({
    count: 9,
    type: 'all',
    success: (res) => {
      for (const temp of res.tempFiles) {
        if (temp.size > MAX_FILE_SIZE) {
          uni.showToast({ title: `${temp.name} 超过 5MB 限制`, icon: 'none' })
          continue
        }
        files.value.push({ name: temp.name, size: temp.size, path: temp.path })
      }
    },
    fail: () => {
      uni.showToast({ title: '选择文件失败', icon: 'none' })
    },
  })
}

function onSelectFile() {
  chooseAppFile()
}

function removeFile(index: number) {
  files.value.splice(index, 1)
}

async function onSubmit() {
  if (!isCommittee.value) {
    uni.showToast({ title: '仅班委可上传资料', icon: 'none' })
    return
  }
  const classId = getCurrentClassId()
  if (!classId) {
    uni.showToast({ title: '未选择班级', icon: 'none' })
    return
  }
  if (!title.value.trim()) {
    uni.showToast({ title: '请输入资料标题', icon: 'none' })
    return
  }
  if (files.value.length === 0) {
    uni.showToast({ title: '请选择要上传的文件', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    for (let i = 0; i < files.value.length; i++) {
      const file = files.value[i]
      await request.uploadFile('/material/upload', { path: file.path as string }, 'file')
    }
    uni.showToast({ title: `成功上传 ${files.value.length} 个文件`, icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1200)
  } catch (err: any) {
    uni.showToast({ title: err.message || '上传失败', icon: 'none' })
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
      <text class="title">上传资料</text>
      <view class="action-placeholder" />
    </view>

    <scroll-view scroll-y class="content">
      <view class="form-card">
        <view class="form-item">
          <text class="label">标题</text>
          <AppInput v-model="title" placeholder="请输入资料标题" :maxlength="100" />
        </view>

        <view class="form-item">
          <text class="label">说明（可选）</text>
          <view class="textarea-wrapper">
            <textarea
              v-model="content"
              class="textarea"
              placeholder="请输入资料说明"
              maxlength="500"
            />
          </view>
        </view>

        <view class="form-item">
          <view class="file-header">
            <text class="label">附件</text>
            <view class="select-btn" @click="onSelectFile">
              <AppIcon icon="lucide:plus" size="32rpx" color="var(--accent)" />
              <text class="select-text">选择文件</text>
            </view>
          </view>

          <view v-if="files.length === 0" class="file-empty">
            <text class="file-empty-text">请选择文件（支持图片、文档等，单个不超过 5MB）</text>
          </view>

          <view
            v-for="(file, index) in files"
            :key="index"
            class="file-item"
          >
            <view class="file-row">
              <AppIcon icon="lucide:file-text" size="40rpx" color="var(--accent)" />
              <view class="file-info">
                <text class="file-name">{{ file.name }}</text>
                <text class="file-size">{{ formatSize(file.size) }}</text>
              </view>
              <view class="remove-btn" @click="removeFile(index)">
                <AppIcon icon="lucide:trash-2" size="32rpx" color="#EF4444" />
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="submit-wrapper">
        <AppButton :loading="submitting" :disabled="!canSubmit" @click="onSubmit">确认上传</AppButton>
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

.content {
  flex: 1;
  padding: 24rpx;
  box-sizing: border-box;
}

.form-card {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  background-color: var(--surface);
  border-radius: var(--rounded-lg);
  box-shadow: var(--shadow-soft);
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.label {
  font-size: var(--text-size-body);
  font-weight: 600;
  color: var(--text-primary);
}

.textarea-wrapper {
  width: 100%;
  padding: 24rpx;
  box-sizing: border-box;
  border-radius: var(--rounded-lg);
  border: 2rpx solid var(--border);
  background-color: var(--surface);
  box-shadow: var(--shadow-soft);
}

.textarea {
  width: 100%;
  height: 200rpx;
  font-size: var(--text-size-body);
  color: var(--text-primary);
  line-height: 1.5;
}

.textarea::placeholder {
  color: var(--text-muted);
}

.file-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.select-btn {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background-color: rgba(0, 98, 255, 0.08);
}

.select-text {
  font-size: var(--text-size-caption);
  font-weight: 600;
  color: var(--accent);
}

.file-empty {
  padding: 32rpx;
  border-radius: var(--rounded-lg);
  background-color: var(--bg);
  text-align: center;
}

.file-empty-text {
  font-size: var(--text-size-caption);
  color: var(--text-muted);
}

.file-item {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 24rpx;
  border-radius: var(--rounded-lg);
  background-color: var(--bg);
}

.file-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
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

.submit-wrapper {
  margin-top: 8rpx;
}

.safe-bottom {
  height: 48rpx;
}
</style>
