// ============================================================
// 全局常量配置
// ============================================================

/** API 基础地址：生产从环境变量读取，开发默认 localhost:3000 */
export const API_BASE_URL: string =
  process.env.TARO_APP_API_BASE_URL || 'http://localhost:3000/api/v1'

/** 请求超时时间（毫秒） */
export const REQUEST_TIMEOUT = 15000

/** 后端响应成功码 */
export const SUCCESS_CODES = [0, 200]

/** 未授权 HTTP 状态码 */
export const UNAUTHORIZED_CODE = 401

/** Storage key 常量（前缀 class_assistant:） */
export const STORAGE_KEYS = {
  userInfo: 'class_assistant:userInfo',
  accessToken: 'class_assistant:accessToken',
  currentClassId: 'class_assistant:currentClassId',
  refreshToken: 'class_assistant:refreshToken'
} as const
