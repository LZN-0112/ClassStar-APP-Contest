<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps<{
  light?: boolean
}>()

const iconColor = computed(() => (props.light ? '#FFFFFF' : 'var(--text-primary)'))

function goBack() {
  const pages = getCurrentPages()
  if (pages && pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.reLaunch({ url: '/pages/home/index' })
  }
}
</script>

<template>
  <view class="back-button" @click="goBack">
    <AppIcon icon="lucide:chevron-left" size="44rpx" :color="iconColor" />
  </view>
</template>

<style scoped>
.back-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80rpx;
  height: 80rpx;
}
</style>
