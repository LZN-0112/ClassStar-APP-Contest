// ============================================================
// 统一上传工具
// 后端无客户端预签名上传端点，实际走 POST /material/upload（服务端直传）
// 路由来源：back/src/modules/material/material.controller.ts
// ============================================================
import Taro from '@tarojs/taro'

import { API_BASE_URL, REQUEST_TIMEOUT } from '@/constants/config'
import { useUserStore } from '@/stores'
import type { ApiResponse } from '@/types/api'

export interface UploadResult {
  url: string
}

interface CsrfResponseData {
  token: string
}

// ---------- CSRF Token 缓存（内部实现，不修改 request.ts） ----------
let csrfCache = ''
let csrfFetching: Promise<string> | null = null

/** 获取 CSRF Token（GET /auth/csrf-token），带缓存与并发去重 */
async function fetchCsrfToken(): Promise<string> {
  if (csrfCache) return csrfCache
  if (csrfFetching) return csrfFetching

  csrfFetching = new Promise<string>((resolve, reject) => {
    Taro.request<ApiResponse<CsrfResponseData>>({
      url: `${API_BASE_URL}/auth/csrf-token`,
      method: 'GET',
      timeout: REQUEST_TIMEOUT,
      enableCookie: true,
      success: (res) => {
        const token = res.data?.data?.token
        if (token) {
          csrfCache = token
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

function clearCsrfCacheLocal() {
  csrfCache = ''
}

/** 获取鉴权 headers（Authorization + method 非 GET 时的 CSRF） */
async function buildAuthHeaders(needAuth: boolean): Promise<Record<string, string>> {
  const headers: Record<string, string> = {}
  if (needAuth) {
    const token = useUserStore.getState().accessToken
    if (token) headers.Authorization = `Bearer ${token}`
    try {
      const csrf = await fetchCsrfToken()
      if (csrf) headers['x-csrf-token'] = csrf
    } catch {
      // CSRF 获取失败不阻塞上传，交给后端判定
      clearCsrfCacheLocal()
    }
  }
  return headers
}

/** 从上传响应中提取访问 URL */
function extractUrl(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const obj = data as Record<string, unknown>
  const url = (obj.fileUrl as string) || (obj.url as string) || ''
  return url
}

interface UpResponse {
  data?: {
    data?: Record<string, unknown>
    message?: string
  }
}

/**
 * 上传单个文件到材料库 /material/upload
 * @param filePath 本地临时文件路径
 * @param fileName 文件名（缺省取路径末段）
 * @param classId 班级 ID（缺省取当前班级）
 */
async function uploadOne(
  filePath: string,
  fileName: string,
  classId: string
): Promise<string> {
  const headers = await buildAuthHeaders(true)
  const withRetry = (attempt: number): Promise<string> =>
    new Promise<string>((resolve, reject) => {
      Taro.uploadFile({
        url: `${API_BASE_URL}/material/upload`,
        filePath,
        name: 'file',
        formData: { classId, fileName },
        timeout: 30000,
        header: headers,
        success: (res) => {
          let url = ''
          try {
            const parsed = JSON.parse(res.data) as UpResponse
            url = extractUrl(parsed?.data)
          } catch {
            url = extractUrl(res.data)
          }
          if (url) {
            resolve(url)
            return
          }
          if (attempt < 1) {
            // 失败重试 1 次
            clearCsrfCacheLocal()
            resolve(withRetry(attempt + 1))
            return
          }
          reject(new Error('上传失败：未获取到文件地址'))
        },
        fail: (err) => {
          if (attempt < 1) {
            clearCsrfCacheLocal()
            resolve(withRetry(attempt + 1))
            return
          }
          reject(new Error(err.errMsg || '上传失败'))
        }
      })
    })
  return withRetry(0)
}

/**
 * 上传图片
 * @param filePath 本地图片路径
 * @returns { url } 访问地址
 */
export async function uploadImage(filePath: string): Promise<UploadResult> {
  const url = await uploadOne(
    filePath,
    fileNameFromPath(filePath) || `${Date.now()}.png`,
    getClassId()
  )
  return { url }
}

/**
 * 上传文件
 * @param filePath 本地文件路径
 * @param fileName 文件名
 * @returns { url } 访问地址
 */
export async function uploadFile(filePath: string, fileName: string): Promise<UploadResult> {
  const url = await uploadOne(filePath, fileName || fileNameFromPath(filePath), getClassId())
  return { url }
}

/** 从路径提取文件名 */
function fileNameFromPath(filePath: string): string {
  if (!filePath) return ''
  const seg = filePath.split(/[/\\]/)
  return seg[seg.length - 1] || ''
}

/** 获取当前班级 ID */
function getClassId(): string {
  return useUserStore.getState().currentClassId || ''
}

/** 清除 CSRF 缓存（登出时调用） */
export function clearUploadCsrfCache() {
  clearCsrfCacheLocal()
}