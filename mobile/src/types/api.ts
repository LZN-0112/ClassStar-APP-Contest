// ============================================================
// API 通用类型定义
// 后端统一响应格式：{ code, message, data }
// ============================================================

/** 后端统一响应结构 */
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

/** 分页请求参数 */
export interface PageParams {
  page: number
  pageSize: number
}

/** 分页响应结果 */
export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}
