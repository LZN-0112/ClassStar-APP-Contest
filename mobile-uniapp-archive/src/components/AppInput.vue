<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    type?: 'text' | 'password' | 'tel' | 'number'
    placeholder?: string
    inputMode?: 'text' | 'tel' | 'numeric' | 'search'
    maxlength?: number
    password?: boolean
  }>(),
  {
    modelValue: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: []
  confirm: []
}>()

const showPassword = ref(false)

const model = computed<string>({
  get: () => props.modelValue ?? '',
  set: (value) => emit('update:modelValue', value),
})

function togglePassword() {
  showPassword.value = !showPassword.value
}

function onBlur() {
  emit('blur')
}

function onConfirm() {
  emit('confirm')
}

const inputType = computed(() => {
  if (props.password) {
    return showPassword.value ? 'text' : 'password'
  }
  return props.type || 'text'
})
</script>

<template>
  <view class="app-input-wrapper">
    <input
      v-model="model"
      class="app-input"
      :type="inputType"
      :inputmode="inputMode || (type === 'tel' ? 'tel' : type === 'number' ? 'numeric' : 'text')"
      :placeholder="placeholder"
      :maxlength="maxlength || -1"
      @blur="onBlur"
      @confirm="onConfirm"
    />
    <view
      v-if="password"
      class="eye-button"
      @click="togglePassword"
    >
      <AppIcon
        :icon="showPassword ? 'lucide:eye-off' : 'lucide:eye'"
        size="40rpx"
        color="var(--text-secondary)"
      />
    </view>
  </view>
</template>

<style scoped>
.app-input-wrapper {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 112rpx;
  padding: 0 32rpx;
  box-sizing: border-box;
  border-radius: var(--rounded-lg);
  border: 2rpx solid var(--border);
  background-color: var(--surface);
  box-shadow: var(--shadow-soft);
}

.app-input {
  flex: 1;
  height: 100%;
  font-size: var(--text-size-body);
  color: var(--text-primary);
  background-color: transparent;
  border: none;
  outline: none;
}

.app-input::placeholder {
  color: var(--text-muted);
}

.eye-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80rpx;
  height: 80rpx;
  flex-shrink: 0;
}
</style>
