// ============================================================
// 班级设置 / 成员管理 / 错误看板 API
// 路由对应：
//  - classes/classes.controller.ts   classes/:id/members/*、transfer-owner、leave
//  - classes/class-import.controller.ts  class/upload-student-excel、import-student-excel
//  - errors/errors.controller.ts     /errors/*
// ============================================================
import Taro from '@tarojs/taro'

import { API_BASE_URL, REQUEST_TIMEOUT } from '@/constants/config'
import { useUserStore } from '@/stores'
import type { ApiResponse } from '@/types/api'
import { request } from './request'

/** 成员导入单项 */
export interface ImportMemberItem {
  name: string
  phone: string
  studentId?: string
}

// ------------------------------------------------------------------
// 班级设置
// ------------------------------------------------------------------

/** 更新班级信息 PATCH /classes/:id */
export function updateClassInfo(
  classId: string,
  dto: { name?: string; grade?: string; major?: string; announcement?: string }
): Promise<unknown> {
  return request.patch(`/classes/${classId}`, dto)
}

/** 解散班级 DELETE /classes/:id */
export function deleteClass(classId: string): Promise<unknown> {
  return request.del(`/classes/${classId}`)
}

/** 生成班级二维码 POST /classes/:id/qrcode */
export function generateClassQrCode(classId: string): Promise<{ qrCodeUrl: string }> {
  return request.post(`/classes/${classId}/qrcode`)
}

// ------------------------------------------------------------------
// 成员管理
// ------------------------------------------------------------------

/** 获取成员详情 GET /classes/:id/members/:memberId */
export function getMemberDetail(classId: string, memberId: string): Promise<unknown> {
  return request.get(`/classes/${classId}/members/${memberId}`)
}

/** 核实成员 POST /classes/:id/members/:userId/verify */
export function verifyMember(
  classId: string,
  userId: string,
  status: 'CONFIRMED' | 'PENDING' | 'UNVERIFIED' = 'CONFIRMED'
): Promise<unknown> {
  return request.post(`/classes/${classId}/members/${userId}/verify`, { status })
}

/** 修改成员显示身份 POST /classes/:id/members/:userId/display-role */
export function updateMemberDisplayRole(
  classId: string,
  userId: string,
  role: string
): Promise<unknown> {
  return request.post(`/classes/${classId}/members/${userId}/display-role`, { role })
}

/** 修改成员姓名/学号 POST /classes/:id/members/:userId/profile */
export function updateMemberProfile(
  classId: string,
  userId: string,
  dto: { realName?: string; studentId?: string }
): Promise<unknown> {
  return request.post(`/classes/${classId}/members/${userId}/profile`, dto)
}

/** 重置成员密码 POST /classes/:id/members/:userId/reset-password */
export function resetMemberPassword(
  classId: string,
  userId: string
): Promise<{ name?: string; phone?: string | null; tempPassword: string }> {
  return request.post(`/classes/${classId}/members/${userId}/reset-password`)
}

/** 移除成员 DELETE /classes/:id/members/:memberId */
export function removeMember(classId: string, memberId: string): Promise<unknown> {
  return request.del(`/classes/${classId}/members/${memberId}`)
}

/** 导入学生名单 POST /classes/:id/members/import */
export function importMembers(
  classId: string,
  members: ImportMemberItem[]
): Promise<{ successCount: number; failedCount: number }> {
  return request.post(`/classes/${classId}/members/import`, { members })
}

/** 设置成员权限等级 POST /classes/:id/members/:userId/role-level */
export function updateMemberRoleLevel(
  classId: string,
  userId: string,
  dto: { roleLevel: 'admin' | 'member'; role?: string }
): Promise<unknown> {
  return request.post(`/classes/${classId}/members/${userId}/role-level`, dto)
}

/** 转让群主 POST /classes/:id/transfer-owner */
export function transferOwner(
  classId: string,
  newOwnerUserId: string
): Promise<unknown> {
  return request.post(`/classes/${classId}/transfer-owner`, { newOwnerUserId })
}

/** 退出组织 POST /classes/:id/leave */
export function leaveClass(classId: string): Promise<unknown> {
  return request.post(`/classes/${classId}/leave`)
}

// ------------------------------------------------------------------
// Excel 导入学生
// ------------------------------------------------------------------

/** CSRF Token 缓存（仿 upload.ts 内部实现） */
let csrfCache = ''
async function fetchCsrfToken(): Promise<string> {
  if (csrfCache) return csrfCache
  try {
    const res = await Taro.request<ApiResponse<{ token: string }>>({
      url: `${API_BASE_URL}/auth/csrf-token`,
      method: 'GET',
      timeout: REQUEST_TIMEOUT,
      enableCookie: true
    })
    const token = res.data?.data?.token
    if (token) csrfCache = token
    return token || ''
  } catch {
    return ''
  }
}

async function buildAuthHeaders(_needAuth = true): Promise<Record<string, string>> {
  const headers: Record<string, string> = {}
  const token = useUserStore.getState().accessToken
  if (token) headers.Authorization = `Bearer ${token}`
  const csrf = await fetchCsrfToken()
  if (csrf) headers['x-csrf-token'] = csrf
  return headers
}

/**
 * 下载学生名单导入模板
 * GET /class/student-excel-template
 */
export function downloadStudentExcelTemplate(): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const headers = await buildAuthHeaders(false)
    Taro.downloadFile({
      url: `${API_BASE_URL}/class/student-excel-template`,
      header: headers,
      timeout: 60000,
      success: (res) => {
        if (res.statusCode === 200 && res.tempFilePath) resolve(res.tempFilePath)
        else reject(new Error('模板下载失败'))
      },
      fail: (err) => reject(new Error(err.errMsg || '模板下载失败'))
    })
  })
}

/**
 * 上传学生名单 Excel 到 MinIO
 * POST /class/upload-student-excel（multipart，字段名 file，需同时带 classId）
 */
export async function uploadStudentExcel(
  filePath: string,
  classId: string,
  onProgress?: (percent: number) => void
): Promise<{ fileUrl: string }> {
  const headers = await buildAuthHeaders(true)
  return new Promise((resolve, reject) => {
    const task = Taro.uploadFile({
      url: `${API_BASE_URL}/class/upload-student-excel`,
      filePath,
      name: 'file',
      formData: { classId },
      timeout: 60000,
      header: headers,
      success: (res) => {
        try {
          const parsed = JSON.parse(res.data) as ApiResponse<{ fileUrl: string }>
          const fileUrl = parsed?.data?.fileUrl || (parsed as unknown as { fileUrl?: string })?.fileUrl
          if (fileUrl) resolve({ fileUrl })
          else reject(new Error(parsed?.message || '上传失败：未获取到文件地址'))
        } catch {
          reject(new Error('上传失败：解析响应失败'))
        }
      },
      fail: (err) => reject(new Error(err.errMsg || '上传失败'))
    })
    task?.onProgressUpdate?.((res) => {
      if (onProgress) onProgress(res.progress)
    })
  })
}

/**
 * 提交 Excel 导入学生名单
 * POST /class/import-student-excel
 */
export function importStudentExcel(
  classId: string,
  fileUrl: string,
  sync?: boolean
): Promise<{
  successCount: number
  pendingCount?: number
  removedCount?: number
  updatedCount?: number
  duplicateStudentNos?: string[]
  sync?: boolean
  errors?: { row: number; studentNo: string; reason: string }[]
}> {
  return request.post('/class/import-student-excel', { classId, fileUrl, sync })
}

// ------------------------------------------------------------------
// 错误看板（admin）
// ------------------------------------------------------------------

/** 错误日志项 */
export interface ErrorLogItem {
  id: string
  message?: string
  errorType?: string
  status?: string
  createdAt?: string
  userId?: string
}

/** 错误看板聚合 GET /errors/dashboard */
export function getErrorDashboard(): Promise<unknown> {
  return request.get('/errors/dashboard')
}

/** 错误日志列表 GET /errors/logs */
export function getErrorLogs(params?: {
  errorType?: string
  status?: string
  page?: number
  pageSize?: number
}): Promise<{ list: ErrorLogItem[]; total?: number }> {
  return request.get('/errors/logs', params)
}

/** 更新错误日志状态 PUT /errors/logs/:id/status */
export function updateErrorLogStatus(id: string, status: string): Promise<unknown> {
  return request.put(`/errors/logs/${id}/status`, { status })
}