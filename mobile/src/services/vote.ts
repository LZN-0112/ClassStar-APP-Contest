// ============================================================
// 班级投票相关 API
// 路由对应 back/src/modules/votes/votes.controller.ts
// 基路径：classes/:classId/votes
// ============================================================
import { request } from './request'

export const voteApi = {
  /**
   * 发布投票（班委）
   * POST /classes/:classId/votes
   */
  publish: (classId: string, data: {
    title: string
    voteType?: 'single' | 'multiple'
    deadline: string
    options: string[]
  }) => request.post(`/classes/${classId}/votes`, data),

  /**
   * 投票列表
   * GET /classes/:classId/votes
   */
  getList: (classId: string, params?: { status?: 'published' | 'closed'; page?: number; pageSize?: number }) =>
    request.get(`/classes/${classId}/votes`, params),

  /**
   * 投票详情（含选项）
   * GET /classes/:classId/votes/:voteId
   */
  getDetail: (classId: string, voteId: string) =>
    request.get(`/classes/${classId}/votes/${voteId}`),

  /**
   * 我参与的投票
   * GET /classes/:classId/votes/my-votes
   */
  myVotes: (classId: string, params?: { page?: number; pageSize?: number }) =>
    request.get(`/classes/${classId}/votes/my-votes`, params),

  /**
   * 提交投票
   * POST /classes/:classId/votes/:voteId/submit
   */
  submitVote: (classId: string, voteId: string, data: { optionIds: string[] }) =>
    request.post(`/classes/${classId}/votes/${voteId}/submit`, data),

  /**
   * 投票结果统计
   * GET /classes/:classId/votes/:voteId/results
   */
  getResults: (classId: string, voteId: string) =>
    request.get(`/classes/${classId}/votes/${voteId}/results`)
}