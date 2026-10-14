<template>
  <view class="page">
    <StatusBar />
    <BackButton class="back-fixed" @click="handleBack" />

    <scroll-view scroll-y class="content">
      <view class="spacer-status" />
      <view class="header">
        <text class="title">导入学生名单</text>
        <text class="subtitle">选择一种方式快速导入班级成员</text>
      </view>

      <view class="option-list">
        <view
          v-for="item in importOptions"
          :key="item.key"
          class="option-card"
          :class="{ disabled: item.disabled }"
          @click="item.handler"
        >
          <view class="option-icon-wrap" :style="{ backgroundColor: item.bgColor }">
            <AppIcon
              :icon="item.icon"
              size="48rpx"
              :color="item.color"
            />
          </view>
          <view class="option-text">
            <text class="option-label">{{ item.label }}</text>
            <text class="option-desc">{{ item.desc }}</text>
          </view>
          <view class="option-spacer" />
          <AppIcon
            icon="lucide:chevron-right"
            size="40rpx"
            color="var(--text-muted)"
          />
        </view>
      </view>

      <view class="footer">
        <AppButton
          :loading="completing"
          @click="handleComplete"
        >
          完成导入
        </AppButton>
      </view>
      <view class="bottom-safe" />
    </scroll-view>

    <!-- 结果弹窗 -->
    <view v-if="resultVisible" class="modal-mask" @click="closeResult">
      <view class="modal-content" @click.stop>
        <text class="modal-title">导入结果</text>
        <view class="modal-body">
          <text class="result-line result-success">
            成功导入人数：{{ result.successCount }}
          </text>
          <text v-if="result.duplicateStudentNos.length" class="result-line result-warning">
            重复学号：{{ result.duplicateStudentNos.join('、') || '无' }}
          </text>
          <text v-else class="result-line">重复学号：无</text>
          <view v-if="result.errors.length" class="error-list">
            <text class="error-title">错误明细：</text>
            <scroll-view scroll-y class="error-scroll">
              <view v-for="(err, idx) in result.errors" :key="idx" class="error-item">
                <text class="error-text">
                  第 {{ err.row }} 行（学号：{{ err.studentNo || '-' }}）{{ err.reason }}
                </text>
              </view>
            </scroll-view>
          </view>
        </view>
        <view class="modal-footer">
          <view class="modal-button" @click="handleComplete">
            <text class="modal-button-text">完成导入</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import StatusBar from '@/components/StatusBar.vue'
import BackButton from '@/components/BackButton.vue'
import AppIcon from '@/components/AppIcon.vue'
import AppButton from '@/components/AppButton.vue'
import { request } from '@/common/api/request'
import { secureStorage } from '@/common/storage/secure'

const MAX_SIZE = 5 * 1024 * 1024;

const classId = ref('')
const resultVisible = ref(false)
const completing = ref(false)
const result = ref<{ successCount: number; duplicateStudentNos: string[]; errors: any[] }>({
  successCount: 0,
  duplicateStudentNos: [],
  errors: [],
})

const importOptions = computed(() => [
  {
    key: 'excel',
    label: 'Excel 导入',
    desc: '上传表格文件批量导入',
    icon: 'mdi:file-excel',
    color: '#0062FF',
    bgColor: 'rgba(0, 98, 255, 0.1)',
    disabled: false,
    handler: handleExcelImport,
  },
  {
    key: 'edu',
    label: '教务系统导入',
    desc: '从学校教务系统同步',
    icon: 'lucide:school',
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    disabled: false,
    handler: handlePlaceholder,
  },
  {
    key: 'qq',
    label: 'QQ 群导入',
    desc: '从 QQ 群成员导入',
    icon: 'mdi:qqchat',
    color: '#12B7F5',
    bgColor: 'rgba(18, 183, 245, 0.1)',
    disabled: false,
    handler: handlePlaceholder,
  },
  {
    key: 'wechat',
    label: '微信群导入',
    desc: '从微信群成员导入',
    icon: 'mdi:wechat',
    color: '#07C160',
    bgColor: 'rgba(7, 193, 96, 0.1)',
    disabled: false,
    handler: handlePlaceholder,
  },
])

onMounted(() => {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1] as any
  classId.value = current?.$route?.query?.classId || current?.options?.classId || ''

  if (classId.value) {
    secureStorage.set('currentClassId', classId.value)
  }

  if (!classId.value) {
    uni.showToast({ title: '缺少班级信息，请重新进入', icon: 'none' })
  }
})

const safeNavigateBack = (fallbackUrl: string) => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({
      delta: 1,
      fail: () => uni.reLaunch({ url: fallbackUrl, fail: (err) => console.error('reLaunch fail', err) }),
    })
    return
  }
  uni.reLaunch({ url: fallbackUrl, fail: (err) => console.error('reLaunch fail', err) })
}

const handleBack = () => {
  safeNavigateBack('/pages/class/join-class')
}

const handleComplete = () => {
  if (completing.value) return
  completing.value = true
  resultVisible.value = false
  setTimeout(() => {
    completing.value = false
    safeNavigateBack('/pages/home/index')
  }, 200)
}

const handlePlaceholder = () => {
  uni.showToast({ title: '该导入方式暂未开放', icon: 'none' })
}

const handleExcelImport = () => {
  uni.chooseFile({
    count: 1,
    type: 'all',
    extension: ['.xlsx', '.xls'],
    success: (res: any) => {
      const file = res.tempFiles[0]
      processSelectedFile(file)
    },
    fail: () => {
      uni.showToast({ title: '选择文件失败', icon: 'none' })
    },
  })
}

const processSelectedFile = (file: any) => {
  if (!file || file.size === 0) {
    uni.showToast({ title: '文件不能为空', icon: 'none' })
    return
  }
  if (file.size > MAX_SIZE) {
    uni.showModal({ title: '提示', content: '文件不能超过5MB', showCancel: false })
    return
  }

  const name = file.name || ''
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase()
  if (!['.xlsx', '.xls'].includes(ext)) {
    uni.showToast({ title: '仅支持 .xlsx、.xls 文件', icon: 'none' })
    return
  }

  uploadAndImport(file)
}

const uploadAndImport = async (file: any) => {
  uni.showLoading({ title: '正在上传解析名单，请稍候', mask: true })

  try {
    const uploadRes = await request.uploadFile('/class/upload-student-excel', file)
    const fileUrl = uploadRes?.fileUrl || uploadRes?.data?.fileUrl

    if (!fileUrl) {
      throw new Error('上传文件失败，未获取到文件地址')
    }

    const importResult = await request.post<{ successCount: number; duplicateStudentNos: string[]; errors: any[] }>('/class/import-student-excel', {
      classId: classId.value,
      fileUrl,
    })

    result.value = importResult
    resultVisible.value = true
  } catch (err) {
    const message = err instanceof Error ? err.message : '请稍后重试'
    if (message.includes('CSRF') || message.includes('csrf')) {
      secureStorage.remove('csrfToken')
    }
    uni.showModal({
      title: '导入失败',
      content: message,
      showCancel: false,
    })
  } finally {
    uni.hideLoading()
  }
}

const closeResult = () => {
  resultVisible.value = false
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  background-color: var(--bg);
}

.back-fixed {
  position: absolute;
  left: 24rpx;
  top: 72rpx;
  z-index: 10;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 48rpx;
  box-sizing: border-box;
}

.spacer-status {
  width: 100%;
  height: 120rpx;
  flex-shrink: 0;
}

.header {
  margin-bottom: 64rpx;
}

.title {
  display: block;
  font-family: var(--font-heading);
  font-size: var(--text-size-display);
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

.option-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.option-card {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  padding: 32rpx;
  box-sizing: border-box;
  background-color: var(--surface);
  border: 2rpx solid var(--border);
  border-radius: var(--rounded-lg);
  box-shadow: var(--shadow-soft);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.option-card:active {
  transform: scale(0.985);
  box-shadow: var(--shadow-card);
}

.option-card.disabled {
  opacity: 0.6;
}

.option-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 88rpx;
  height: 88rpx;
  border-radius: var(--rounded-md);
  margin-right: 24rpx;
  flex-shrink: 0;
}

.option-text {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.option-label {
  display: block;
  font-size: var(--text-size-body);
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.option-desc {
  display: block;
  font-size: var(--text-size-caption);
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.option-spacer {
  flex: 1;
}

.footer {
  margin-top: auto;
  padding-top: 48rpx;
}

.bottom-safe {
  width: 100%;
  height: 32rpx;
  flex-shrink: 0;
}

.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  width: 560rpx;
  max-width: calc(100vw - 96rpx);
  max-height: 70vh;
  background-color: var(--surface);
  border-radius: var(--rounded-xl);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--shadow-card);
}

.modal-title {
  font-family: var(--font-heading);
  font-size: var(--text-size-subhead);
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
  padding: 32rpx 0 16rpx;
}

.modal-body {
  padding: 0 32rpx 24rpx;
  display: flex;
  flex-direction: column;
}

.result-line {
  font-size: var(--text-size-body);
  color: var(--text-secondary);
  margin-bottom: 12rpx;
}

.result-success {
  color: var(--accent);
  font-weight: 600;
}

.result-warning {
  color: #F59E0B;
}

.error-list {
  margin-top: 16rpx;
}

.error-title {
  font-size: var(--text-size-body);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8rpx;
}

.error-scroll {
  max-height: 240rpx;
}

.error-item {
  padding: 8rpx 0;
}

.error-text {
  font-size: var(--text-size-caption);
  color: #EF4444;
  line-height: 1.5;
}

.modal-footer {
  padding: 0 32rpx 32rpx;
}

.modal-button {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 88rpx;
  border-radius: var(--rounded-lg);
  background-color: var(--accent);
}

.modal-button:active {
  opacity: 0.85;
}

.modal-button-text {
  font-size: var(--text-size-body);
  font-weight: 600;
  color: var(--text-inverse);
}
</style>
