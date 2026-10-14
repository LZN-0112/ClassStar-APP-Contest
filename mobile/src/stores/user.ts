// ============================================================
// 用户状态管理
// 持久化：userInfo / accessToken / refreshToken / currentClassId 存 Taro storage
// storage key 前缀：class_assistant:
// ============================================================
import Taro from '@tarojs/taro'
import { create } from 'zustand'

import { STORAGE_KEYS } from '@/constants/config'
import type { UserInfo } from '@/types/user'

// ---------- 从 storage 读取初始值 ----------
function readUserInfo(): UserInfo | null {
  try {
    const raw = Taro.getStorageSync(STORAGE_KEYS.userInfo)
    return raw ? (JSON.parse(raw) as UserInfo) : null
  } catch {
    return null
  }
}

function readAccessToken(): string {
  try {
    return Taro.getStorageSync(STORAGE_KEYS.accessToken) || ''
  } catch {
    return ''
  }
}

function readRefreshToken(): string {
  try {
    return Taro.getStorageSync(STORAGE_KEYS.refreshToken) || ''
  } catch {
    return ''
  }
}

function readClassId(): string {
  try {
    return Taro.getStorageSync(STORAGE_KEYS.currentClassId) || ''
  } catch {
    return ''
  }
}

// ---------- store 类型 ----------
interface UserState {
  userInfo: UserInfo | null
  accessToken: string
  refreshToken: string
  currentClassId: string
  isLoggedIn: boolean

  setUserInfo: (info: UserInfo | null) => void
  setToken: (accessToken: string, refreshToken?: string) => void
  setCurrentClass: (classId: string) => void
  logout: () => void
}

export const useUserStore = create<UserState>()((set) => ({
  // 初始化时从 storage 读取
  userInfo: readUserInfo(),
  accessToken: readAccessToken(),
  refreshToken: readRefreshToken(),
  currentClassId: readClassId(),
  isLoggedIn: !!readAccessToken(),

  setUserInfo: (info) => {
    set({ userInfo: info })
    if (info) {
      Taro.setStorageSync(STORAGE_KEYS.userInfo, JSON.stringify(info))
    } else {
      Taro.removeStorageSync(STORAGE_KEYS.userInfo)
    }
  },

  setToken: (accessToken, refreshToken) => {
    set({ accessToken, isLoggedIn: !!accessToken })
    if (accessToken) {
      Taro.setStorageSync(STORAGE_KEYS.accessToken, accessToken)
    } else {
      Taro.removeStorageSync(STORAGE_KEYS.accessToken)
    }
    if (refreshToken !== undefined) {
      set({ refreshToken })
      if (refreshToken) {
        Taro.setStorageSync(STORAGE_KEYS.refreshToken, refreshToken)
      } else {
        Taro.removeStorageSync(STORAGE_KEYS.refreshToken)
      }
    }
  },

  setCurrentClass: (classId) => {
    set({ currentClassId: classId })
    if (classId) {
      Taro.setStorageSync(STORAGE_KEYS.currentClassId, classId)
    } else {
      Taro.removeStorageSync(STORAGE_KEYS.currentClassId)
    }
  },

  logout: () => {
    set({
      userInfo: null,
      accessToken: '',
      refreshToken: '',
      currentClassId: '',
      isLoggedIn: false
    })
    Taro.removeStorageSync(STORAGE_KEYS.userInfo)
    Taro.removeStorageSync(STORAGE_KEYS.accessToken)
    Taro.removeStorageSync(STORAGE_KEYS.refreshToken)
    Taro.removeStorageSync(STORAGE_KEYS.currentClassId)
  }
}))
