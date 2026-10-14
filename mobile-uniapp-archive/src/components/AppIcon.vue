<script setup lang="ts">
import { Icon } from '@iconify/vue'

interface Props {
  icon: string
  size?: string | number
  color?: string
  className?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: '48rpx',
  color: 'currentColor',
  className: '',
})

// 将 rpx 转换为 px，保证 Iconify SVG 在 H5 中渲染尺寸正确
// 设计稿基准宽度 750rpx，1rpx = 0.5px
function toSize(val: string | number): string {
  if (typeof val === 'number') {
    return `${val * 0.5}px`
  }
  if (val.endsWith('rpx')) {
    const num = parseFloat(val)
    if (!isNaN(num)) return `${num * 0.5}px`
  }
  return val
}
</script>

<template>
  <Icon
    :icon="icon"
    :width="toSize(size)"
    :height="toSize(size)"
    :color="color"
    :class="className"
    class="app-icon"
  />
</template>

<style scoped>
.app-icon {
  display: inline-flex;
  flex-shrink: 0;
  vertical-align: middle;
}
</style>
