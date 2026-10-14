<script setup lang="ts">
const props = defineProps<{
  loading?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  click: []
}>()

function handleClick() {
  if (props.disabled || props.loading) return
  emit('click')
}
</script>

<template>
  <view
    class="app-button"
    :class="{ disabled: disabled || loading }"
    @click="handleClick"
    @tap="handleClick"
  >
    <view class="app-button-text">
      <template v-if="loading">加载中...</template>
      <slot v-else />
    </view>
  </view>
</template>

<style scoped>
.app-button {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 112rpx;
  padding: 0;
  margin: 0;
  border: none;
  border-radius: var(--rounded-lg);
  background-color: var(--accent);
  box-shadow: 0 8rpx 32rpx rgba(0, 98, 255, 0.15);
  appearance: none;
  outline: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.app-button::after {
  display: none;
}

.app-button.disabled {
  background-color: #93c5fd;
}

.app-button-text {
  font-size: var(--text-size-body);
  font-weight: 600;
  color: var(--text-inverse);
}
</style>
