// ============================================================
// 通知消息相关 API
// 路由对应 back/src/modules/messages/messages.controller.ts
// 基路径：classes/:classId/messages
// ============================================================
import { request } from './request'

export const messageApi = {
  /**
   * 发布通知（班委）
   * POST /classes/:classId/messages
   */
  publish: (classId: string, data: {
    type: 'notice' | 'homework' | 'activity'
    title: string
    content: string
    location?: string
    eventTime?: string
    reminderInterval?: number
    requireAck?: boolean
    status?: 'published' | 'ended'
    attachments?: { fileName: string; fileUrl: string; fileSize?: number }[]
    ackDeadline?: string
  }) => request.post(`/classes/${classId}/messages`, data),

  /**
   * 通知列表
   * GET /classes/:classId/messages
   */
  getList: (classId: string, params?: { type?: string; page?: number; pageSize?: number }) =>
    request.get(`/classes/${classId}/messages`, params),

  /**
   * 通知详情
   * GET /classes/:classId/messages/:id
   */
  getDetail: (classId: string, id: string) =>
    request.get(`/classes/${classId}/messages/${id}`),

  /**
   * 标记通知已读
   * POST /classes/:classId/messages/:id/read
   */
  markRead: (classId: string, id: string) =>
    request.post(`/classes/${classId}/messages/${id}/read`),

  /**
   * 签收通知
   * POST /classes/:classId/messages/:id/ack
   */
  ack: (classId: string, id: string) =>
    request.post(`/classes/${classId}/messages/${id}/ack`),

  /**
   * 签收统计与未签收名单
   * GET /classes/:classId/messages/:id/acks
   */
  getAcks: (classId: string, id: string) =>
    request.get(`/classes/${classId}/messages/${id}/acks`),

  /**
   * 再次提醒未签收成员
   * POST /classes/:classId/messages/:id/remind
   */
  remind: (classId: string, id: string, data: { remindAfterMinutes: number }) =>
    request.post(`/classes/${classId}/messages/${id}/remind`, data),

  /**
   * 导出未签收名单
   * GET /classes/:classId/messages/:id/export-acks
   */
  exportAcks: (classId: string, id: string) =>
    request.get(`/classes/${classId}/messages/${id}/export-acks`)
}