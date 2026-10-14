// ============================================================
// 页面导航工具函数
// 封装 Taro 导航 API，统一处理失败提示
// ============================================================
import Taro from '@tarojs/taro'

/**
 * 保留当前页，跳转到应用内的某个页面
 */
export function navigateTo(url: string): void {
  Taro.navigateTo({
    url,
    fail: () => {
      Taro.showToast({ title: '页面跳转失败', icon: 'none' })
    }
  })
}

/**
 * 关闭当前页面，跳转到应用内的某个页面
 */
export function redirectTo(url: string): void {
  Taro.redirectTo({
    url,
    fail: () => {
      Taro.showToast({ title: '页面跳转失败', icon: 'none' })
    }
  })
}

/**
 * 跳转到 tabBar 页面，并关闭其他所有非 tabBar 页面
 */
export function switchTab(url: string): void {
  Taro.switchTab({
    url,
    fail: () => {
      Taro.showToast({ title: '页面切换失败', icon: 'none' })
    }
  })
}

/**
 * 关闭所有页面，打开到应用内的某个页面
 */
export function reLaunch(url: string): void {
  Taro.reLaunch({
    url,
    fail: () => {
      Taro.showToast({ title: '页面跳转失败', icon: 'none' })
    }
  })
}

/**
 * 智能跳转：tabBar 页面用 switchTab，其他用 navigateTo
 */
export function navigate(url: string): void {
  const tabBarPages = [
    '/pages/home/index',
    '/pages/class-home/index',
    '/pages/notice/index',
    '/pages/data/index',
    '/pages/profile/index'
  ]
  if (tabBarPages.some((p) => url.startsWith(p))) {
    switchTab(url)
  } else {
    navigateTo(url)
  }
}
