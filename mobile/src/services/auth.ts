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
  return request.post<LoginResult>(
    '/auth/login',
    {
      account: data.account,
      password: data.password,
      loginType: data.loginType || 'password',
      deviceId: data.deviceId
    },
    { needAuth: false }
  ).then((result) => {
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
 * 修改密码
 * POST /auth/change-password
 */
export function changePassword(data: {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}): Promise<null> {
  return request.post<null>('/auth/change-password', data)
}

/**
 * 获取当前用户信息
 * GET /auth/me?classId=xxx
 */
export function getUserInfo(classId?: string): Promise<UserInfo> {
  return request.get<UserInfo>('/auth/me', classId ? { classId } : undefined)
}

/**
 * 绑定微信
 * POST /auth/wechat/bind
 */
export function bindWechat(code: string): Promise<null> {
  return request.post<null>('/auth/wechat/bind', { code })
}

/** 微信登录结果：已绑定则直接返回令牌，未绑定则返回绑定凭证 */
export interface WechatLoginResult {
  needBindPhone: boolean
  bindTicket?: string
  isNewUser?: boolean
  accessToken?: string
  refreshToken?: string
  expiresIn?: number
}

/**
 * 微信登录（小程序）
 * POST /auth/wechat/miniprogram-login
 * 小程序 wx.login 的 code 需由后端走 jscode2session 换取 openid
 */
export function wechatLogin(code: string): Promise<WechatLoginResult> {
  return request.post<WechatLoginResult>('/auth/wechat/miniprogram-login', { code }, { needAuth: false })
}

/** 邮箱验证码发送结果（开发环境未配置 SMTP 时返回 devCode） */
export interface SendEmailCodeResult {
  sent: boolean
  expiresIn: number
  devCode?: string
}

/**
 * 发送邮箱验证码
 * POST /auth/email/send-code（公开接口）
 * scene：register 注册 / bind_email 绑定邮箱
 */
export function sendEmailCode(
  email: string,
  scene: 'register' | 'bind_email'
): Promise<SendEmailCodeResult> {
  return request.post<SendEmailCodeResult>(
    '/auth/email/send-code',
    { email, scene },
    { needAuth: false }
  )
}

/** 重置密码验证码发送结果（验证码发送到输入的注册邮箱） */
export interface SendResetPasswordCodeResult extends SendEmailCodeResult {
  /** 脱敏后的邮箱，如 zh***@qq.com */
  email: string
}

/**
 * 发送重置密码邮箱验证码
 * POST /auth/reset-password/send-code（公开接口）
 * 验证码发送到输入的注册邮箱
 */
export function sendResetPasswordCode(email: string): Promise<SendResetPasswordCodeResult> {
  return request.post<SendResetPasswordCodeResult>(
    '/auth/reset-password/send-code',
    { email },
    { needAuth: false }
  )
}

/**
 * 绑定 / 更换邮箱
 * POST /auth/email/bind
 */
export function bindEmail(email: string, code: string): Promise<{ email: string }> {
  return request.post<{ email: string }>('/auth/email/bind', { email, code })
}

/** 微信绑定手机号结果 */
export interface WechatBindPhoneResult {
  needBindPhone: boolean
  isNewUser: boolean
  accessToken: string
  refreshToken: string
  expiresIn: number
}

/**
 * 微信登录绑定手机号
 * POST /auth/wechat/bind-phone
 */
export function bindWechatPhone(data: {
  bindTicket: string
  phone: string
  password: string
  confirmPassword?: string
  name?: string
  nickname?: string
}): Promise<WechatBindPhoneResult> {
  return request.post<WechatBindPhoneResult>('/auth/wechat/bind-phone', data, {
    needAuth: false
  })
}

/**
 * 解绑微信
 * DELETE /auth/wechat/bind
 */
export function unbindWechat(): Promise<null> {
  return request.del<null>('/auth/wechat/bind')
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
 * 需同时校验旧密码与账号绑定邮箱收到的验证码
 */
export function resetPassword(data: ResetPasswordParams): Promise<null> {
  return request.post<null>('/auth/reset-password', data, { needAuth: false })
}
