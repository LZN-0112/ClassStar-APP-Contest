// ============================================================
// 考勤签到相关 API
// 路由对应 back/src/modules/attendances/attendances.controller.ts
// 基路径：classes/:classId/attendances
// ============================================================
import { request } from './request'

export const attendanceApi = {
  /**
   * 创建签到（班委）
   * POST /classes/:classId/attendances
   */
  publish: (classId: string, data: {
    title: string
    type?: string
    startTime: string
    endTime: string
    method: 'normal' | 'qr' | 'gps' | 'code' | 'face'
    location?: string
    latitude?: number
    longitude?: number
    checkRadius?: number
    code?: string
  }) => request.post(`/classes/${classId}/attendances`, data),

  /**
   * 签到列表
   * GET /classes/:classId/attendances
   */
  getList: (classId: string, params?: { status?: string; page?: number; pageSize?: number }) =>
    request.get(`/classes/${classId}/attendances`, params),

  /**
   * 签到详情
   * GET /classes/:classId/attendances/:id
   */
  getDetail: (classId: string, id: string) =>
    request.get(`/classes/${classId}/attendances/${id}`),

  /**
   * 学生签到
   * POST /classes/:classId/attendances/:id/check-in
   */
  checkIn: (classId: string, id: string, data: {
    method: 'normal' | 'qr' | 'gps' | 'code' | 'face'
    location?: string
    latitude?: number
    longitude?: number
    code?: string
    selfieUrl?: string
  }) => request.post(`/classes/${classId}/attendances/${id}/check-in`, data),

  /**
   * 关闭签到
   * POST /classes/:classId/attendances/:id/close
   */
  close: (classId: string, id: string) =>
    request.post(`/classes/${classId}/attendances/${id}/close`),

  /**
   * 考勤统计
   * GET /classes/:classId/attendances/:id/statistics
   */
  getReport: (classId: string, id: string) =>
    request.get(`/classes/${classId}/attendances/${id}/statistics`),

  /**
   * 申请请假
   * POST /classes/:classId/attendances/:id/leave
   */
  leaveApply: (classId: string, id: string, data: { reason: string }) =>
    request.post(`/classes/${classId}/attendances/${id}/leave`, data),

  /**
   * 审批请假
   * POST /classes/:classId/attendances/:id/leave/:applicationId/review
   */
  leaveApproval: (
    classId: string,
    id: string,
    applicationId: string,
    data: { status: 'approved' | 'rejected' }
  ) => request.post(`/classes/${classId}/attendances/${id}/leave/${applicationId}/review`, data)
}