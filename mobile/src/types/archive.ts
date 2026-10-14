// ============================================================
// 班级档案类型定义
// 对应 back/prisma 实体 archives / archive_files
// ============================================================

/** 档案 */
export interface Archive {
  id: string
  classId: string
  title: string
  archiveYear: string
  archiveType: string
  createdBy: string
  status: string
  createdAt?: string
  files?: ArchiveFile[]
}

/** 档案附件 */
export interface ArchiveFile {
  id: string
  archiveId: string
  fileName: string
  fileUrl: string
  fileSize?: number
  folderName?: string
  downloadCount: number
  createdAt?: string
}

/** 学期报表 */
export interface SemesterReport {
  classId: string
  startTime?: string
  endTime?: string
  /** 各模块聚合指标，具体字段以后端返回为准 */
  attendance?: Record<string, unknown>
  homework?: Record<string, unknown>
  activity?: Record<string, unknown>
  vote?: Record<string, unknown>
  fee?: Record<string, unknown>
  [key: string]: unknown
}

/** 数据看板聚合指标 */
export interface DashboardData {
  classId: string
  [key: string]: unknown
}