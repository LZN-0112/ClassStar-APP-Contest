// ============================================================
// 班级资料/文件相关 API
// 路由对应 back/src/modules/material/material.controller.ts
// 基路径：/material
// ============================================================
import { request } from './request'

export const materialApi = {
  /**
   * 上传单个文件（multipart，file 字段）
   * POST /material/upload
   */
  upload: (file: File | Blob | string, data: {
    classId: string
    fileName?: string
    fileUrl?: string
    fileSize?: number
    folderName?: string
  }) => {
    const formData = new FormData()
    formData.append('file', file as Blob)
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined) formData.append(k, String(v))
    })
    return request.post('/material/upload', formData, {
      header: { 'Content-Type': 'multipart/form-data' }
    })
  },

  /**
   * 批量上传文件（multipart，files 字段，最多20个）
   * POST /material/batch-upload
   */
  batchUpload: (files: (File | Blob)[], data: {
    classId: string
    folderName?: string
    fileNameList?: string[]
  }) => {
    const formData = new FormData()
    files.forEach((f) => formData.append('files', f))
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined) formData.append(k, typeof v === 'string' ? v : JSON.stringify(v))
    })
    return request.post('/material/batch-upload', formData, {
      header: { 'Content-Type': 'multipart/form-data' }
    })
  },

  /**
   * 一键转载（上传文件并创建通知，multipart）
   * POST /material/repost
   */
  repost: (files: (File | Blob)[], data: {
    classId: string
    text: string
    folderName?: string
    requireAck?: boolean
    fileNameList?: string[]
  }) => {
    const formData = new FormData()
    files.forEach((f) => formData.append('files', f))
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined) formData.append(k, typeof v === 'string' ? v : JSON.stringify(v))
    })
    return request.post('/material/repost', formData, {
      header: { 'Content-Type': 'multipart/form-data' }
    })
  },

  /**
   * 获取文件列表（资料库）
   * GET /material/list
   */
  getLibrary: (params: { classId: string; folderName?: string; keyword?: string }) =>
    request.get('/material/list', params),

  /**
   * 获取文件详情
   * GET /material/:fileId
   */
  getDetail: (fileId: string) => request.get(`/material/${fileId}`),

  /**
   * 删除文件
   * DELETE /material/:fileId
   */
  deleteMaterial: (fileId: string) => request.del(`/material/${fileId}`)
}