<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import StatusBar from '@/components/StatusBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import BackButton from '@/components/BackButton.vue'
import AppButton from '@/components/AppButton.vue'
import AppInput from '@/components/AppInput.vue'
import { createRandomDraw } from '@/common/api/random-draws'
import { getCurrentClassId } from '@/common/utils/class'

const loading = ref(false)
const form = reactive({
  title: '',
  mainCount: 1,
  backupCount: 0,
})

const mainCountStr = computed<string>({
  get: () => String(form.mainCount),
  set: (value) => {
    const num = parseInt(value, 10)
    form.mainCount = Number.isNaN(num) || num < 1 ? 1 : num
  },
})

const backupCountStr = computed<string>({
  get: () => String(form.backupCount),
  set: (value) => {
    const num = parseInt(value, 10)
    form.backupCount = Number.isNaN(num) || num < 0 ? 0 : num
  },
})

const canSubmit = computed(() => form.title.trim().length > 0 && form.mainCount > 0)

async function onSubmit() {
  if (!canSubmit.value) {
    uni.showToast({ title: '请填写完整信息', icon: 'none' })
    return
  }
  const classId = getCurrentClassId()
  if (!classId) {
    uni.showToast({ title: '未选择班级', icon: 'none' })
    return
  }
  loading.value = true
  try {
    const res = await createRandomDraw(classId, {
      title: form.title.trim(),
      mainCount: form.mainCount,
      backupCount: form.backupCount,
    })
    uni.navigateTo({ url: `/pages/random-draw/detail?id=${res.id}` })
  } catch (err) {
    const message = err instanceof Error ? err.message : '创建失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <view class="page">
    <StatusBar dark />

    <view class="header">
      <BackButton class="back" />
      <text class="title">新建抽签</text>
      <view class="action-placeholder" />
    </view>

    <scroll-view scroll-y class="content">
      <view class="form-card">
        <view class="form-item">
          <text class="form-label">抽签标题</text>
          <AppInput
            v-model="form.title"
            placeholder="请输入抽签标题"
            :maxlength="50"
          />
        </view>

        <view class="form-item">
          <text class="form-label">正选人数</text>
          <AppInput
            v-model="mainCountStr"
            type="number"
            input-mode="numeric"
            placeholder="请输入正选人数"
          />
        </view>

        <view class="form-item">
          <text class="form-label">候补人数</text>
          <AppInput
            v-model="backupCountStr"
            type="number"
            input-mode="numeric"
            placeholder="请输入候补人数"
          />
        </view>
      </view>

      <view class="actions">
        <AppButton :loading="loading" :disabled="!canSubmit" @click="onSubmit">
          开始抽签
        </AppButton>
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
  padding: 24rpx;
  margin-bottom: 24rpx;
  background-color: var(--surface);
  border-radius: var(--rounded-lg);
  box-shadow: var(--shadow-soft);
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-bottom: 24rpx;
}

.form-item:last-child {
  margin-bottom: 0;
}

.form-label {
  font-size: var(--text-size-body);
  font-weight: 500;
  color: var(--text-primary);
}

.actions {
  margin-top: 24rpx;
}

.safe-bottom {
  height: 48rpx;
}
</style>
