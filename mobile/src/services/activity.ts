// ============================================================
// 班级活动相关 API
// 路由对应 back/src/modules/activities/activities.controller.ts
// 基路径：classes/:classId/activities
// ============================================================
import { request } from './request'

export const activityApi = {
  /**
   * 上传活动封面图片（multipart，file 字段）
   * POST /classes/:classId/activities/upload-cover
   */
  uploadCover: (classId: string, file: File | Blob | string) => {
    const formData = new FormData()
    formData.append('file', file as Blob)
    return request.post(`/classes/${classId}/activities/upload-cover`, formData, {
      header: { 'Content-Type': 'multipart/form-data' }
    })
  },

  /**
   * 发布活动（班委）
   * POST /classes/:classId/activities
   */
  publish: (classId: string, data: {
    title: string
    eventDate: string
    eventTime?: string
    location?: string
    capacity?: number
    deadline?: string
    coverUrl?: string
  }) => request.post(`/classes/${classId}/activities`, data),

  /**
   * 活动列表
   * GET /classes/:classId/activities
   */
  getList: (classId: string, params?: { status?: 'registering' | 'ongoing' | 'ended'; page?: number; pageSize?: number }) =>
    request.get(`/classes/${classId}/activities`, params),

  /**
   * 活动详情
   * GET /classes/:classId/activities/:activityId
   */
  getDetail: (classId: string, activityId: string) =>
    request.get(`/classes/${classId}/activities/${activityId}`),

  /**
   * 报名活动
   * POST /classes/:classId/activities/:activityId/register
   */
  register: (classId: string, activityId: string) =>
    request.post(`/classes/${classId}/activities/${activityId}/register`),

  /**
   * 取消报名
   * POST /classes/:classId/activities/:activityId/cancel
   */
  cancel: (classId: string, activityId: string) =>
    request.post(`/classes/${classId}/activities/${activityId}/cancel`),

  /**
   * 我的活动报名
   * GET /classes/:classId/activities/my-registrations
   */
  myRegistration: (classId: string, params?: { page?: number; pageSize?: number }) =>
    request.get(`/classes/${classId}/activities/my-registrations`, params),

  /**
   * 报名统计与名单
   * GET /classes/:classId/activities/:activityId/registrations
   */
  registrationStats: (classId: string, activityId: string) =>
    request.get(`/classes/${classId}/activities/${activityId}/registrations`),

  /**
   * 审核报名
   * POST /classes/:classId/activities/:activityId/registrations/:registrationId/review
   */
  reviewRegistration: (
    classId: string,
    activityId: string,
    registrationId: string,
    data: { status: 'pending' | 'registered' | 'rejected' }
  ) => request.post(
    `/classes/${classId}/activities/${activityId}/registrations/${registrationId}/review`,
    data
  )
}