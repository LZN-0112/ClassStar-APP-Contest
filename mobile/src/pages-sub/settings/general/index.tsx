import { useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { SettingsHeader } from '@/components/business'
import { Icon } from '@/components/ui'
import { STORAGE_KEYS } from '@/constants/config'
import { useAuth } from '@/utils'
import './index.scss'

const APP_VERSION = '1.0.0'
const PROTECTED_KEYS: string[] = Object.values(STORAGE_KEYS)

function getCacheSize(): number {
  try {
    const info = Taro.getStorageInfoSync()
    return (info.currentSize || 0) * 1024
  } catch {
    return 0
  }
}

function clearAppCache() {
  try {
    const info = Taro.getStorageInfoSync()
    info.keys.forEach((key) => {
      if (!PROTECTED_KEYS.includes(key)) {
        Taro.removeStorageSync(key)
      }
    })
  } catch {
    // ignore
  }
}

function formatCacheSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export default function GeneralSettings() {
  const { requireLogin } = useAuth()
  const [cacheSize, setCacheSize] = useState<number | null>(null)
  const [showClearCache, setShowClearCache] = useState(false)
  const [clearingCache, setClearingCache] = useState(false)

  useLoad(() => {
    if (!requireLogin()) return
    setCacheSize(getCacheSize())
  })

  const handleClearCache = () => {
    if (clearingCache) return
    setClearingCache(true)
    const before = cacheSize ?? 0
    try {
      clearAppCache()
      const after = getCacheSize()
      setCacheSize(after)
      const freed = Math.max(0, before - after)
      Taro.showToast({
        title: freed > 0 ? `已清理 ${formatCacheSize(freed)} 缓存` : '缓存已清理',
        icon: 'none'
      })
      setShowClearCache(false)
    } catch {
      Taro.showToast({ title: '清除缓存失败，请稍后重试', icon: 'none' })
    } finally {
      setClearingCache(false)
    }
  }

  return (
    <View className='gen'>
      <SettingsHeader title='通用设置' />

      <View className='gen__body'>
        {/* 基础偏好 */}
        <View className='gen__group'>
          <Text className='gen__group-title'>基础偏好</Text>
          <View className='gen__rows'>
            <View className='gen__row'>
              <Text className='gen__row-label'>语言</Text>
              <Text className='gen__row-value gen__row-value--muted'>简体中文（当前仅支持）</Text>
            </View>
            <View
              className='gen__row'
              onClick={() => Taro.showToast({ title: '深色模式跟随系统', icon: 'none' })}
            >
              <Text className='gen__row-label'>深色模式</Text>
              <View className='gen__row-right'>
                <Text className='gen__row-value'>跟随系统</Text>
                <Icon name='chevron-right' size={48} color='#4B5563' strokeWidth={2} />
              </View>
            </View>
          </View>
        </View>

        {/* 存储管理 */}
        <View className='gen__group'>
          <Text className='gen__group-title'>存储管理</Text>
          <View className='gen__rows'>
            <View className='gen__row' onClick={() => setShowClearCache(true)}>
              <Text className='gen__row-label'>清除缓存</Text>
              <View className='gen__row-right'>
                <Text className='gen__row-value gen__row-value--primary'>
                  {cacheSize === null ? '计算中…' : formatCacheSize(cacheSize)}
                </Text>
                <Icon name='chevron-right' size={48} color='#4B5563' strokeWidth={2} />
              </View>
            </View>
          </View>
        </View>

        {/* 关于 */}
        <View className='gen__group'>
          <Text className='gen__group-title'>关于</Text>
          <View className='gen__rows'>
            <View
              className='gen__row'
              onClick={() => Taro.navigateTo({ url: '/pages-sub/settings/about/index' })}
            >
              <Text className='gen__row-label'>关于</Text>
              <View className='gen__row-right'>
                <Text className='gen__row-value'>v{APP_VERSION}</Text>
                <Icon name='chevron-right' size={48} color='#4B5563' strokeWidth={2} />
              </View>
            </View>
          </View>
        </View>
      </View>

      {showClearCache && (
        <View className='gen__sheet'>
          <View
            className='gen__sheet-mask'
            onClick={() => {
              if (!clearingCache) setShowClearCache(false)
            }}
          />
          <View className='gen__sheet-panel'>
            <View className='gen__sheet-handle-wrap'>
              <View className='gen__sheet-handle' />
            </View>
            <View className='gen__sheet-header'>
              <Text className='gen__sheet-title'>清除缓存</Text>
            </View>
            <View className='gen__sheet-desc-wrap'>
              <Text className='gen__sheet-desc'>
                将清理应用内临时缓存（当前 {cacheSize === null ? '计算中…' : formatCacheSize(cacheSize)}
                ），不会影响登录状态和本地业务数据。
              </Text>
            </View>
            <View className='gen__sheet-footer'>
              <View
                className={`gen__sheet-btn gen__sheet-btn--cancel ${
                  clearingCache ? 'gen__sheet-btn--disabled' : ''
                }`}
                onClick={() => {
                  if (!clearingCache) setShowClearCache(false)
                }}
              >
                <Text className='gen__sheet-btn-text gen__sheet-btn-text--cancel'>取消</Text>
              </View>
              <View
                className={`gen__sheet-btn gen__sheet-btn--primary ${
                  clearingCache ? 'gen__sheet-btn--disabled' : ''
                }`}
                onClick={handleClearCache}
              >
                <Text className='gen__sheet-btn-text gen__sheet-btn-text--primary'>
                  {clearingCache ? '清理中…' : '清除'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}