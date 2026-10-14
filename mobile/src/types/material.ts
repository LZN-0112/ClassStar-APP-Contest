// ============================================================
// 资料/文件类型定义
// 对应 back/prisma 实体 materials
// ============================================================

/** 资料文件 */
export interface Material {
  id: string
  classId: string
  uploaderId: string
  title: string
  category?: string
  description?: string
  fileUrl: string
  fileSize?: number
  mimeType?: string
  downloadCount: number
  status: boolean
  createdAt?: string
  uploader?: { id: string; name: string }
}

/** 资料库结果 */
export interface MaterialLibraryResult {
  list: Material[]
  total?: number
  folderList?: string[]
}