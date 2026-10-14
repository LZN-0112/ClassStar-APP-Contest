<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import StatusBar from '@/components/StatusBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import BackButton from '@/components/BackButton.vue'
import AppButton from '@/components/AppButton.vue'
import AppInput from '@/components/AppInput.vue'
import { addFeeRecord, type FeeRecordType } from '@/common/api/fee'
import { getCurrentClassId } from '@/common/utils/class'

const loading = ref(false)
const form = reactive<{
  type: FeeRecordType
  amount: string
  remark: string
}>({
  type: 'income',
  amount: '',
  remark: '',
})

const typeOptions: { label: string; value: FeeRecordType }[] = [
  { label: '收入', value: 'income' },
  { label: '支出', value: 'expense' },
]

const canSubmit = computed(() => {
  const amount = parseFloat(form.amount)
  return !Number.isNaN(amount) && amount > 0
})

function onTypeChange(value: FeeRecordType) {
  form.type = value
}

async function onSubmit() {
  if (!canSubmit.value) {
    uni.showToast({ title: '请输入有效金额', icon: 'none' })
    return
  }
  const classId = getCurrentClassId()
  if (!classId) {
    uni.showToast({ title: '未选择班级', icon: 'none' })
    return
  }
  loading.value = true
  try {
    await addFeeRecord({
      classId,
      feeType: 'class',
      type: form.type,
      amount: parseFloat(form.amount),
      remark: form.remark.trim(),
    })
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 800)
  } catch (err) {
    const message = err instanceof Error ? err.message : '保存失败'
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
      <text class="title">记一笔</text>
      <view class="action-placeholder" />
    </view>

    <scroll-view scroll-y class="content">
      <view class="form-card">
        <view class="form-item">
          <text class="form-label">类型</text>
          <view class="type-selector">
            <view
              v-for="opt in typeOptions"
              :key="opt.value"
              class="type-option"
              :class="{ active: form.type === opt.value, income: opt.value === 'income', expense: opt.value === 'expense' }"
              @click="onTypeChange(opt.value)"
            >
              <text class="type-option-text">{{ opt.label }}</text>
            </view>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">金额</text>
          <AppInput
            v-model="form.amount"
            type="number"
            input-mode="numeric"
            placeholder="请输入金额"
          />
        </view>

        <view class="form-item">
          <text class="form-label">备注</text>
          <AppInput
            v-model="form.remark"
            placeholder="请输入备注（选填）"
            :maxlength="100"
          />
        </view>
      </view>

      <view class="actions">
        <AppButton :loading="loading" :disabled="!canSubmit" @click="onSubmit">
          保存
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

.type-selector {
  display: flex;
  flex-direction: row;
  gap: 24rpx;
}

.type-option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  border-radius: var(--rounded-lg);
  background-color: var(--bg);
  border: 2rpx solid var(--border-subtle);
  transition: all 0.2s ease;
}

.type-option-text {
  font-size: var(--text-size-body);
  font-weight: 500;
  color: var(--text-secondary);
}

.type-option.active.income {
  background-color: rgba(16, 185, 129, 0.1);
  border-color: #10B981;
}

.type-option.active.income .type-option-text {
  color: #10B981;
  font-weight: 600;
}

.type-option.active.expense {
  background-color: rgba(239, 68, 68, 0.1);
  border-color: #EF4444;
}

.type-option.active.expense .type-option-text {
  color: #EF4444;
  font-weight: 600;
}

.actions {
  margin-top: 24rpx;
}

.safe-bottom {
  height: 48rpx;
}
</style>
