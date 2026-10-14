// ============================================================
// useAuth 权限校验 Hook
// 基于 UserInfo.role / roleLevel / isCommittee 判断角色
// ============================================================
import Taro from '@tarojs/taro'

import { useUserStore } from '@/stores'
import type { UserInfo } from '@/types/user'

/** 角色 key */
export type AuthRole = 'student' | 'committee' | 'teacher' | 'admin'

/** 角色判定结果 */
export interface AuthScope {
  user: UserInfo | null
  isLoggedIn: boolean
  /** 班级成员（普通学生） */
  isStudent: boolean
  /** 班委 / 管理人员 */
  isCommittee: boolean
  /** 教师 */
  isTeacher: boolean
  /** 系统管理员。判断指定角色是否满足 */
  hasRole: (role: AuthRole) => boolean
  /** 校验权限；无权限时自动 toast 并返回 false */
  requireAuth: (role: AuthRole) => boolean
  /** 校验登录；未登录时提示并跳转登录页 */
  requireLogin: () => boolean
}

/**
 * 判断用户是否具备某角色
 */
function matchRole(user: UserInfo | null, role: AuthRole): boolean {
  if (!user) return false
  const level = user.roleLevel
  switch (role) {
    case 'admin':
      return level === 'owner' || user.role === 'admin' || level === 'admin'
    case 'committee':
      return user.isCommittee || level === 'owner' || level === 'admin'
    case 'teacher':
      return user.role === 'teacher'
    case 'student':
    default:
      return true
  }
}

/** 角色中文文案（用于 toast 提示） */
const ROLE_TEXT: Record<AuthRole, string> = {
  student: '学生',
  committee: '管理员',
  teacher: '教师',
  admin: '管理员'
}

export function useAuth(): AuthScope {
  const user = useUserStore((s) => s.userInfo)
  const isLoggedIn = useUserStore((s) => s.isLoggedIn)

  const hasRole = (role: AuthRole): boolean => matchRole(user, role)

  const requireAuth = (role: AuthRole): boolean => {
    if (!isLoggedIn) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      return false
    }
    if (!matchRole(user, role)) {
      Taro.showToast({ title: `需要${ROLE_TEXT[role]}权限`, icon: 'none' })
      return false
    }
    return true
  }

  const requireLogin = (): boolean => {
    if (isLoggedIn) return true
    Taro.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => Taro.reLaunch({ url: '/pages/auth/login/index' }), 1000)
    return false
  }

  return {
    user,
    isLoggedIn,
    isStudent: matchRole(user, 'student'),
    isCommittee: matchRole(user, 'committee'),
    isTeacher: matchRole(user, 'teacher'),
    hasRole,
    requireAuth,
    requireLogin
  }
}