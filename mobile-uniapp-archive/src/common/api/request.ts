import { API_BASE, REQUEST_TIMEOUT } from '../config'
import { secureStorage } from '../storage/secure'

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  params?: Record<string, string | number>
  header?: Record<string, string>
  loading?: boolean
  loadingText?: string
  needAuth?: boolean
  needCsrf?: boolean
  csrfRetry?: boolean
}

interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
  timestamp?: string
}

let csrfTokenCache = ''
let csrfFetching: Promise<string> | null = null
const CSRF_STORAGE_KEY = 'csrfToken'

function showLoading(text = '加载中...') {
  uni.showLoading({ title: text, mask: true })
}

function hideLoading() {
  uni.hideLoading()
}

function toast(message: string) {
  uni.showToast({ title: message, icon: 'none', duration: 2500 })
}

function getAccessToken(): string {
  return secureStorage.get<string>('accessToken') || ''
}

function getRefreshToken(): string {
  return secureStorage.get<string>('refreshToken') || ''
}

function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path.startsWith('http') ? path : `${API_BASE}${path}`
  if (params && Object.keys(params).length) {
    const qs = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&')
    url += `${url.includes('?') ? '&' : '?'}${qs}`
  }
  return url
}

function clearCsrfToken() {
  csrfTokenCache = ''
  secureStorage.remove(CSRF_STORAGE_KEY)
}

async function fetchCsrfToken(): Promise<string> {
  if (csrfTokenCache) return csrfTokenCache

  const stored = secureStorage.get<string>(CSRF_STORAGE_KEY)
  if (stored) {
    csrfTokenCache = stored
    return stored
  }

  if (csrfFetching) return csrfFetching

  csrfFetching = fetchCsrfTokenInternal()
    .finally(() => {
      csrfFetching = null
    })

  return csrfFetching
}

async function fetchCsrfTokenInternal(): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    uni.request({
      url: `${API_BASE}/auth/csrf-token`,
      method: 'GET',
      timeout: REQUEST_TIMEOUT,
      success: (res) => {
        const body = (res.data || {}) as ApiResponse<{ token: string }>
        const token = body?.data?.token
        if (token) {
          csrfTokenCache = token
          secureStorage.set(CSRF_STORAGE_KEY, token)
          resolve(token)
        } else {
          reject(new Error('获取 CSRF Token 失败'))
        }
      },
      fail: reject,
    })
  })
}

async function doRequest<T>(options: RequestOptions): Promise<T> {
  const {
    url,
    method = 'GET',
    data,
    params,
    header = {},
    loading = false,
    loadingText,
    needAuth = true,
    needCsrf = true,
    csrfRetry = false,
  } = options

  const token = getAccessToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...header,
  }

  if (needAuth && token) {
    headers.Authorization = `Bearer ${token}`
  }

  // 非安全方法且需要鉴权时附加 CSRF Token
  const safeMethods = ['GET', 'HEAD', 'OPTIONS']
  const isUnsafeMethod = !safeMethods.includes(method)
  if (needAuth && needCsrf && isUnsafeMethod) {
    const csrf = await fetchCsrfToken()
    if (csrf) headers['x-csrf-token'] = csrf
  }

  if (loading) showLoading(loadingText)

  let promise: Promise<T>
  promise = uniAppRequest<T>(buildUrl(url, params), method, data, headers, loading)

  try {
    return await promise
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    const isCsrfError =
      !csrfRetry &&
      needAuth &&
      needCsrf &&
      isUnsafeMethod &&
      (msg.toLowerCase().includes('csrf') || msg.includes('403'))

    if (isCsrfError) {
      clearCsrfToken()
      return doRequest<T>({ ...options, csrfRetry: true })
    }

    throw err
  }
}

function uniAppRequest<T>(
  url: string,
  method: string,
  data: any,
  headers: Record<string, string>,
  loading: boolean,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const requestOptions: UniApp.RequestOptions = {
      url,
      method: method as UniApp.RequestOptions['method'],
      data,
      header: headers,
      timeout: REQUEST_TIMEOUT,
      success: (res) => {
        const status = res.statusCode || 0
        const body = (res.data || {}) as ApiResponse<T>

        if (status >= 200 && status < 300) {
          if (body && typeof body === 'object' && 'code' in body) {
            if (body.code === 0 || body.code === 200) {
              resolve(body.data)
            } else {
              reject(new Error(body.message || '请求失败'))
            }
          } else {
            resolve(body as T)
          }
        } else {
          if (status === 401) {
            handleUnauthorized()
          }
          reject(new Error(body.message || `请求失败 (${status})`))
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络请求失败'))
      },
      complete: () => {
        if (loading) hideLoading()
      },
    }
    uni.request(requestOptions)
  })
}

function uploadFile(url: string, file: { file?: File; path?: string }, name = 'file'): Promise<any> {
  return new Promise((resolve, reject) => {
    const authToken = getAccessToken()
    fetchCsrfToken()
      .then((csrf) => {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${authToken}`,
        }
        if (csrf) headers['x-csrf-token'] = csrf

        uni.uploadFile({
          url: buildUrl(url),
          filePath: file.path as string,
          name,
          header: headers,
          success: (res) => {
            try {
              resolve(JSON.parse(res.data))
            } catch {
              resolve(res.data)
            }
          },
          fail: reject,
        })
      })
      .catch(reject)
  })
}

async function handleUnauthorized() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    logoutToLogin()
    return
  }

  try {
    const result = await doRequest<{ accessToken: string; refreshToken: string }>({
      url: '/auth/refresh',
      method: 'POST',
      data: { refreshToken },
      needAuth: false,
      needCsrf: false,
    })
    if (result.accessToken) {
      secureStorage.set('accessToken', result.accessToken)
      if (result.refreshToken) secureStorage.set('refreshToken', result.refreshToken)
      // 刷新后不重发原请求，由调用方再次发起
    }
  } catch {
    logoutToLogin()
  }
}

function logoutToLogin() {
  secureStorage.clear()
  csrfTokenCache = ''
  toast('登录已过期，请重新登录')
  setTimeout(() => {
    uni.reLaunch({ url: '/pages/auth/login' })
  }, 1500)
}

export const request = {
  get<T>(url: string, params?: Record<string, string | number>, options?: Omit<RequestOptions, 'url' | 'method' | 'params'>) {
    return doRequest<T>({ url, method: 'GET', params, ...options })
  },

  post<T>(url: string, data?: unknown, options?: Omit<RequestOptions, 'url' | 'method' | 'data'>) {
    return doRequest<T>({ url, method: 'POST', data, ...options })
  },

  put<T>(url: string, data?: unknown, options?: Omit<RequestOptions, 'url' | 'method' | 'data'>) {
    return doRequest<T>({ url, method: 'PUT', data, ...options })
  },

  delete<T>(url: string, params?: Record<string, string | number>, options?: Omit<RequestOptions, 'url' | 'method' | 'params'>) {
    return doRequest<T>({ url, method: 'DELETE', params, ...options })
  },

  uploadFile,
}

export function setTokens(accessToken: string, refreshToken: string) {
  secureStorage.set('accessToken', accessToken)
  secureStorage.set('refreshToken', refreshToken)
}

export function clearTokens() {
  secureStorage.remove('accessToken')
  secureStorage.remove('refreshToken')
  secureStorage.remove(CSRF_STORAGE_KEY)
  csrfTokenCache = ''
}

export function getCsrfToken(): string {
  return csrfTokenCache
}
