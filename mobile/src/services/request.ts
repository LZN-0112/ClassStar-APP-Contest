// ============================================================
// 统一 API 请求层
// 基于 Taro.request 封装，支持 token 注入、CSRF、错误处理
// ============================================================
import Taro from '@tarojs/taro'

import { useUserStore } from '@/stores'
import { API_BASE_URL, REQUEST_TIMEOUT, SUCCESS_CODES, UNAUTHORIZED_CODE } from '@/constants/config'
import type { ApiResponse } from '@/types/api'

// ---------- 内部类型 ----------
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

interface RequestOptions {
  url: string
  method: HttpMethod
  data?: unknown
  params?: Record<string, string | number | boolean>
  header?: Record<string, string>
  /** 是否需要鉴权（默认 true） */
  needAuth?: boolean
}

// ---------- CSRF Token 缓存 ----------
let csrfTokenCache = ''
let csrfFetching: Promise<string> | null = null

/**
 * 拼接完整 URL（自动加 baseURL 和 query string）
 */
function buildUrl(path: string, params?: RequestOptions['params']): string {
  let url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`
  if (params && Object.keys(params).length > 0) {
    const qs = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&')
    url += `${url.includes('?') ? '&' : '?'}${qs}`
  }
  return url
}

/**
 * 获取 CSRF Token（带缓存与并发去重）
 * 后端 GET /auth/csrf-token 返回 { token }
 */
async function fetchCsrfToken(): Promise<string> {
  if (csrfTokenCache) return csrfTokenCache
  if (csrfFetching) return csrfFetching

  csrfFetching = new Promise<string>((resolve, reject) => {
    const headers: Record<string, string> = {}
    const token = useUserStore.getState().accessToken
    if (token) headers.Authorization = `Bearer ${token}`

    Taro.request({
      url: `${API_BASE_URL}/auth/csrf-token`,
      method: 'GET',
      header: headers,
      timeout: REQUEST_TIMEOUT,
      enableCookie: true,
      success: (res) => {
        const body = (res.data || {}) as ApiResponse<{ token: string }>
        const token = body?.data?.token
        if (token) {
          csrfTokenCache = token
          resolve(token)
        } else {
          reject(new Error('获取 CSRF Token 失败'))
        }
      },
      fail: (err) => reject(new Error(err.errMsg || '网络异常'))
    })
  }).finally(() => {
    csrfFetching = null
  })

  return csrfFetching
}

function clearCsrfToken() {
  csrfTokenCache = ''
}

/**
 * 处理 401 未授权：清除登录态并跳转登录页
 */
function handleUnauthorized() {
  clearCsrfToken()
  useUserStore.getState().logout()
  Taro.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
  setTimeout(() => {
    Taro.reLaunch({ url: '/pages/auth/login/index' })
  }, 1200)
}

/**
 * 核心请求方法
 */
function doRequest<T>(options: RequestOptions): Promise<T> {
  const { url, method, data, params, header = {}, needAuth = true } = options

  return new Promise<T>((resolve, reject) => {
    // ---- 请求拦截：组装 headers ----
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...header
    }

    // 注入 Authorization
    if (needAuth) {
      const token = useUserStore.getState().accessToken
      if (token) headers.Authorization = `Bearer ${token}`
    }

    // 非 GET 请求需要 CSRF Token
    const isSafeMethod = method === 'GET'
    const needCsrf = needAuth && !isSafeMethod

    const execute = (csrfToken?: string) => {
      if (csrfToken) headers['x-csrf-token'] = csrfToken

      Taro.request({
        url: buildUrl(url, params),
        method,
        data,
        header: headers,
        timeout: REQUEST_TIMEOUT,
        enableCookie: true,
        success: (res) => {
          const status = res.statusCode || 0
          const body = (res.data || {}) as ApiResponse<T>

          // HTTP 层 401 → 登录过期
          if (status === UNAUTHORIZED_CODE) {
            handleUnauthorized()
            reject(new Error(body?.message || '登录已过期'))
            return
          }

          // HTTP 2xx
          if (status >= 200 && status < 300) {
            // 业务响应：判断 code
            if (body && typeof body === 'object' && 'code' in body) {
              if (SUCCESS_CODES.includes(body.code)) {
                resolve(body.data)
              } else {
                // 业务失败
                Taro.showToast({ title: body.message || '请求失败', icon: 'none' })
                reject(new Error(body.message || '请求失败'))
              }
            } else {
              // 非标准响应（直接返回）
              resolve(body as unknown as T)
            }
            return
          }

          // 其他 HTTP 错误
          Taro.showToast({
            title: body?.message || `请求失败 (${status})`,
            icon: 'none'
          })
          reject(new Error(body?.message || `请求失败 (${status})`))
        },
        fail: (err) => {
          // 网络错误 / 超时
          Taro.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
          reject(new Error(err.errMsg || '网络异常'))
        }
      })
    }

    if (needCsrf) {
      fetchCsrfToken()
        .then((token) => {
          if (!token) {
            Taro.showToast({ title: 'CSRF Token 获取失败，请重试', icon: 'none' })
            reject(new Error('CSRF Token 为空'))
            return
          }
          execute(token)
        })
        .catch((err) => {
          Taro.showToast({ title: err.message || '获取鉴权信息失败，请检查网络', icon: 'none' })
          reject(err)
        })
    } else {
      execute()
    }
  })
}

// ---------- 导出请求方法 ----------
export const request = {
  get<T>(url: string, params?: RequestOptions['params'], options?: Omit<RequestOptions, 'url' | 'method' | 'params'>) {
    return doRequest<T>({ url, method: 'GET', params, ...options })
  },

  post<T>(url: string, data?: unknown, options?: Omit<RequestOptions, 'url' | 'method' | 'data'>) {
    return doRequest<T>({ url, method: 'POST', data, ...options })
  },

  put<T>(url: string, data?: unknown, options?: Omit<RequestOptions, 'url' | 'method' | 'data'>) {
    return doRequest<T>({ url, method: 'PUT', data, ...options })
  },

  del<T>(url: string, params?: RequestOptions['params'], options?: Omit<RequestOptions, 'url' | 'method' | 'params'>) {
    return doRequest<T>({ url, method: 'DELETE', params, ...options })
  }
}

/** 清除 CSRF 缓存（登出时调用） */
export function clearCsrfCache() {
  clearCsrfToken()
}
