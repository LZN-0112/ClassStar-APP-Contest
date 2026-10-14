// ============================================================
// 认证相关 API
// 路由对应 back/src/modules/auth/auth.controller.ts
// ============================================================
import type {
  LoginParams,
  LoginResult,
  RegisterParams,
  ResetPasswordParams,
  UserInfo
} from '@/types/user'
import { clearCsrfCache, request } from './request'

/**
 * 用户登录
 * POST /auth/login
 * 登录成功后清除 CSRF 缓存，确保后续 POST 请求使用新 session 的 CSRF Token
 */
export function login(data: LoginParams): Promise<LoginResult> {
  return request.post<LoginResult>('/auth/login', {
    phone: data.phone,
    password: data.password,
    loginType: data.loginType || 'password',
    deviceId: data.deviceId
  }).then((result) => {
    clearCsrfCache()
    return result
  })
}

/**
 * 用户注册
 * POST /auth/register
 */
export function register(data: RegisterParams): Promise<{ userId: string }> {
  return request.post<{ userId: string }>('/auth/register', data, { needAuth: false })
}

/**
 * 退出登录
 * POST /auth/logout
 */
export function logout(): Promise<null> {
  return request.post<null>('/auth/logout')
}

/**
 * 获取当前用户信息
 * GET /auth/me
 */
export function getUserInfo(): Promise<UserInfo> {
  return request.get<UserInfo>('/auth/me')
}

/**
 * 刷新 Token
 * POST /auth/refresh
 */
export function refreshToken(token: string): Promise<{ accessToken: string; expiresIn: number }> {
  return request.post<{ accessToken: string; expiresIn: number }>(
    '/auth/refresh',
    { refreshToken: token },
    { needAuth: false }
  )
}

/**
 * 重置密码
 * POST /auth/reset-password
 */
export function resetPassword(data: ResetPasswordParams): Promise<null> {
  return request.post<null>('/auth/reset-password', data, { needAuth: false })
}
