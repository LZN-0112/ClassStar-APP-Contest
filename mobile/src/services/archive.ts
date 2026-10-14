// ============================================================
// 班级档案相关 API
// 路由对应：
//  - archive/archive.controller.ts     classes/:classId/archives
//  - data/data.controller.ts           /data
// ============================================================
import { request } from './request'

export const archiveApi = {
  /**
   * 获取班级学期档案列表
   * GET /classes/:classId/archives
   */
  getClassArchive: (classId: string) =>
    request.get(`/classes/${classId}/archives`),

  /**
   * 获取档案详情
   * GET /classes/:classId/archives/:archiveId
   */
  getDetail: (classId: string, archiveId: string) =>
    request.get(`/classes/${classId}/archives/${archiveId}`),

  /**
   * 获取档案附件详情
   * GET /classes/:classId/archives/:archiveId/files/:fileId
   */
  getFileDetail: (classId: string, archiveId: string, fileId: string) =>
    request.get(`/classes/${classId}/archives/${archiveId}/files/${fileId}`),

  /**
   * 下载档案附件（后端 redirect）
   * GET /classes/:classId/archives/:archiveId/files/:fileId/download
   */
  downloadArchiveFile: (classId: string, archiveId: string, fileId: string) =>
    request.get(`/classes/${classId}/archives/${archiveId}/files/${fileId}/download`),

  /**
   * 导出档案（xlsx 或 pdf）
   * GET /classes/:classId/archives/:archiveId/export?format=xlsx|pdf
   */
  exportArchive: (classId: string, archiveId: string, format?: 'xlsx' | 'pdf') =>
    request.get(`/classes/${classId}/archives/${archiveId}/export`, format ? { format } : undefined),

  /**
   * 学期报表聚合数据（data 模块）
   * GET /data/semester-report
   */
  getSemesterReport: (classId: string, params?: { startTime?: string; endTime?: string }) =>
    request.get('/data/semester-report', { classId, ...params }),

  /**
   * 班级数据看板聚合指标（data 模块）
   * GET /data/dashboard
   */
  getDashboard: (classId: string) =>
    request.get('/data/dashboard', { classId })
}