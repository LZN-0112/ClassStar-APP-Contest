// ============================================================
// 作业类型定义
// 对应 back/prisma 实体 homeworks / homework_submissions 等
// ============================================================

/** 作业状态 */
export type HomeworkStatus = 'published' | 'ended'

/** 作业提交状态 */
export type SubmissionStatus = 'submitted' | 'checked'

/** 离线核对类型 */
export type OfflineCheckType = 'screenshot' | 'student_id'

/** 审核状态 */
export type ReviewStatus = 'pending' | 'approved' | 'rejected'

/** 作业 */
export interface Homework {
  id: string
  classId: string
  publisherId: string
  title: string
  subject?: string
  content?: string
  deadline: string
  attachments?: Attachment[]
  status: HomeworkStatus
  createdAt?: string
  publisher?: { id: string; name: string }
  submission?: HomeworkSubmission
  submittedCount?: number
  totalCount?: number
}

/** 附件 */
export interface Attachment {
  fileName: string
  fileUrl: string
  fileSize?: number
}

/** 作业提交 */
export interface HomeworkSubmission {
  id: string
  homeworkId: string
  studentId: string
  content?: string
  attachments?: Attachment[]
  status: SubmissionStatus
  submittedAt: string
  updatedAt?: string
}

/** 延时申请 */
export interface HomeworkDelayApplication {
  id: string
  homeworkId: string
  studentId: string
  reason: string
  expectedDeadline: string
  status: ReviewStatus
  reviewedBy?: string
  reviewedAt?: string
  createdAt?: string
}

/** 离线核对 */
export interface HomeworkOfflineCheck {
  id: string
  homeworkId: string
  checkedBy: string
  submittedCount: number
  totalCount: number
  checkType?: OfflineCheckType
  checkedAt?: string
  details?: HomeworkOfflineCheckDetail[]
}

/** 离线核对明细 */
export interface HomeworkOfflineCheckDetail {
  id: string
  checkId: string
  studentId: string
  userId?: string
  status: string
  student?: { id: string; name: string; studentId?: string }
}