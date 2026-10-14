// ============================================================
// 班级活动类型定义
// 对应 back/prisma 实体 activities / activity_registrations
// ============================================================

/** 活动展示状态 */
export type ActivityStatus = 'registering' | 'ongoing' | 'ended'

/** 报名状态 */
export type RegistrationStatus = 'pending' | 'registered' | 'rejected'

/** 活动 */
export interface Activity {
  id: string
  classId: string
  publisherId: string
  title: string
  eventDate: string
  eventTime?: string
  location?: string
  capacity?: number
  coverUrl?: string
  deadline?: string
  status: ActivityStatus
  createdAt?: string
  publisher?: { id: string; name: string }
  /** 已报名人数 */
  registeredCount?: number
  /** 当前用户是否已报名 */
  registered?: boolean
}

/** 活动报名 */
export interface ActivityRegistration {
  id: string
  activityId: string
  studentId: string
  status: RegistrationStatus
  registeredAt: string
  activity?: Activity
  student?: { id: string; name: string; studentId?: string; avatar?: string }
}

/** 报名统计与名单结果 */
export interface RegistrationStatsResult {
  total: number
  registered: number
  pending: number
  rejected: number
  list?: ActivityRegistration[]
}