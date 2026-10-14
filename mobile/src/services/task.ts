// ============================================================
// 任务工具相关 API
// 路由对应：
//  - tasks/tasks.controller.ts        classes/:classId/tasks
//  - random-draws/random-draws.controller.ts  classes/:classId/random-draws
//  - pomodoro/pomodoro.controller.ts  classes/:classId/pomodoro
//  - feedback/feedback.controller.ts  /feedback
// ============================================================
import { request } from './request'

// ---------- 任务看板 ----------
export const taskApi = {
  /**
   * 任务列表与统计（看板）
   * GET /classes/:classId/tasks
   */
  getTaskBoard: (classId: string, params?: { status?: 'todo' | 'in_progress' | 'done'; page?: number; pageSize?: number }) =>
    request.get(`/classes/${classId}/tasks`, params),

  /**
   * 发布任务
   * POST /classes/:classId/tasks
   */
  publishTask: (classId: string, data: {
    title: string
    ownerId?: string
    deadline?: string
    status?: 'todo' | 'in_progress' | 'done'
    progress?: number
  }) => request.post(`/classes/${classId}/tasks`, data),

  /**
   * 任务详情
   * GET /classes/:classId/tasks/:taskId
   */
  getTaskDetail: (classId: string, taskId: string) =>
    request.get(`/classes/${classId}/tasks/${taskId}`),

  /**
   * 更新任务
   * PUT /classes/:classId/tasks/:taskId
   */
  updateTask: (classId: string, taskId: string, data: {
    title?: string
    ownerId?: string
    deadline?: string
    status?: 'todo' | 'in_progress' | 'done'
    progress?: number
  }) => request.put(`/classes/${classId}/tasks/${taskId}`, data),

  /**
   * 删除任务
   * DELETE /classes/:classId/tasks/:taskId
   */
  removeTask: (classId: string, taskId: string) =>
    request.del(`/classes/${classId}/tasks/${taskId}`)
}

// ---------- 随机抽签 ----------
export const drawApi = {
  /**
   * 创建并执行抽签（班委）
   * POST /classes/:classId/random-draws
   */
  randomDraw: (classId: string, data: {
    title: string
    mainCount?: number
    backupCount?: number
    excludedUserIds?: string[]
  }) => request.post(`/classes/${classId}/random-draws`, data),

  /**
   * 预览抽签结果（不入库）
   * POST /classes/:classId/random-draws/preview
   */
  preview: (classId: string, data: {
    title: string
    mainCount?: number
    backupCount?: number
    excludedUserIds?: string[]
  }) => request.post(`/classes/${classId}/random-draws/preview`, data),

  /**
   * 作废抽签记录
   * POST /classes/:classId/random-draws/:drawId/cancel
   */
  cancelDraw: (classId: string, drawId: string) =>
    request.post(`/classes/${classId}/random-draws/${drawId}/cancel`),

  /**
   * 抽签记录列表
   * GET /classes/:classId/random-draws
   */
  getDrawRecords: (classId: string, params?: { page?: number; pageSize?: number }) =>
    request.get(`/classes/${classId}/random-draws`, params),

  /**
   * 抽签详情
   * GET /classes/:classId/random-draws/:drawId
   */
  getDrawDetail: (classId: string, drawId: string) =>
    request.get(`/classes/${classId}/random-draws/${drawId}`)
}

// ---------- 番茄钟 ----------
export const pomodoroApi = {
  /**
   * 开始专注 session
   * POST /classes/:classId/pomodoro/sessions
   */
  startSession: (classId: string, data: { taskTitle: string; durationMinutes?: number }) =>
    request.post(`/classes/${classId}/pomodoro/sessions`, data),

  /**
   * 专注 session 列表
   * GET /classes/:classId/pomodoro/sessions
   */
  getSessions: (classId: string, params?: { status?: 'in_progress' | 'completed' | 'cancelled'; page?: number; pageSize?: number }) =>
    request.get(`/classes/${classId}/pomodoro/sessions`, params),

  /**
   * 专注 session 详情
   * GET /classes/:classId/pomodoro/sessions/:sessionId
   */
  getSessionDetail: (classId: string, sessionId: string) =>
    request.get(`/classes/${classId}/pomodoro/sessions/${sessionId}`),

  /**
   * 更新 session 状态（完成/取消）
   * PATCH /classes/:classId/pomodoro/sessions/:sessionId
   */
  updateSession: (classId: string, sessionId: string, data: {
    status: 'in_progress' | 'completed' | 'cancelled'
    actualMinutes?: number
  }) => request.put(`/classes/${classId}/pomodoro/sessions/${sessionId}`, data),

  /**
   * 个人专注统计
   * GET /classes/:classId/pomodoro/stats
   */
  getPomodoroRecords: (classId: string) =>
    request.get(`/classes/${classId}/pomodoro/stats`)
}

// ---------- 帮助与反馈 ----------
export const feedbackApi = {
  /**
   * 提交反馈
   * POST /feedback
   */
  submitFeedback: (data: { content: string; contact?: string; images?: string[] }) =>
    request.post('/feedback', data),

  /**
   * 我的反馈列表
   * GET /feedback/my
   */
  getMyFeedback: () => request.get('/feedback/my')
}