// ============================================================
// 用户相关类型定义
// 参考 front/src/hooks/useCurrentUser.ts 的 CurrentUser 接口
// ============================================================

/** 角色层级 */
export type RoleLevel = 'owner' | 'admin' | 'member'

/** 用户信息 */
export interface UserInfo {
  id: string
  name: string
  phone: string
  /** 绑定邮箱（未绑定为空字符串） */
  email?: string
  avatar?: string
  backgroundImage?: string
  bio?: string
  studentId?: string
  role: string
  roleLevel: RoleLevel
  classId?: string
  className?: string
  orgType?: string
  isCommittee: boolean
  /** 是否已绑定微信（账号与安全页使用） */
  hasWechat?: boolean
  createdAt?: string
}

/** 登录请求参数（对应后端 LoginDto） */
export interface LoginParams {
  /** 登录账号：手机号或邮箱 */
  account: string
  password: string
  /** 登录方式：password / wechat */
  loginType?: 'password' | 'wechat'
  deviceId?: string
}

/** 登录返回结果（对应后端 generateTokens 返回） */
export interface LoginResult {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

/** 注册请求参数（对应后端 RegisterDto） */
export interface RegisterParams {
  phone: string
  name: string
  nickname?: string
  password: string
  confirmPassword: string
  studentId?: string
}

/** 重置密码参数（对应后端 ResetPasswordDto） */
export interface ResetPasswordParams {
  /** 注册邮箱 */
  email: string
  /** 该邮箱收到的验证码 */
  emailCode: string
  oldPassword: string
  newPassword: string
  confirmPassword: string
}
