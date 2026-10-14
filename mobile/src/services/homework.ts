// ============================================================
// 作业相关 API
// 路由对应 back/src/modules/homeworks/homeworks.controller.ts
// 基路径：classes/:classId/homeworks
// ============================================================
import { request } from './request'

export const homeworkApi = {
  /**
   * 发布作业（班委）
   * POST /classes/:classId/homeworks
   */
  publish: (classId: string, data: {
    subject: string
    title: string
    content?: string
    deadline: string
    submitMethod?: string
  }) => request.post(`/classes/${classId}/homeworks`, data),

  /**
   * 作业列表
   * GET /classes/:classId/homeworks
   */
  getList: (classId: string, params?: { status?: string; page?: number; pageSize?: number }) =>
    request.get(`/classes/${classId}/homeworks`, params),

  /**
   * 作业详情
   * GET /classes/:classId/homeworks/:id
   */
  getDetail: (classId: string, id: string) =>
    request.get(`/classes/${classId}/homeworks/${id}`),

  /**
   * 提交作业
   * POST /classes/:classId/homeworks/:id/submit
   */
  submit: (classId: string, id: string, data: { content?: string; fileUrls?: string[] }) =>
    request.post(`/classes/${classId}/homeworks/${id}/submit`, data),

  /**
   * 申请延时
   * POST /classes/:classId/homeworks/:id/delay
   */
  delayApply: (classId: string, id: string, data: { reason: string; requestedDeadline: string }) =>
    request.post(`/classes/${classId}/homeworks/${id}/delay`, data),

  /**
   * 审批延时申请
   * POST /classes/:classId/homeworks/:id/delay/:applicationId/review
   */
  reviewDelay: (
    classId: string,
    id: string,
    applicationId: string,
    status: string
  ) => request.post(`/classes/${classId}/homeworks/${id}/delay/${applicationId}/review`, { status }),

  /**
   * OCR 识别截图中的学号（multipart，file 字段）
   * POST /classes/:classId/homeworks/offline-check/recognize
   */
  recognizeScreenshot: (classId: string, file: File | Blob | string) => {
    const formData = new FormData()
    formData.append('file', file as Blob)
    return request.post(`/classes/${classId}/homeworks/offline-check/recognize`, formData, {
      header: { 'Content-Type': 'multipart/form-data' }
    })
  },

  /**
   * 离线学号核对（batch）
   * POST /classes/:classId/homeworks/offline-check
   */
  offlineCheck: (classId: string, data: {
    homeworkId: string
    checkType: 'screenshot' | 'student_id'
    studentIds: string[]
  }) => request.post(`/classes/${classId}/homeworks/offline-check`, data),

  /**
   * 查询离线核对结果
   * GET /classes/:classId/homeworks/offline-check/:checkId
   */
  getCheckResult: (classId: string, checkId: string) =>
    request.get(`/classes/${classId}/homeworks/offline-check/${checkId}`)
}