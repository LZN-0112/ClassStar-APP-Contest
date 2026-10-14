// ============================================================
// 考勤签到类型定义
// 对应 back/prisma 实体 attendances / attendance_records / leave_applications
// ============================================================

/** 签到方式 */
export type AttendanceMethod = 'normal' | 'qr' | 'gps' | 'code' | 'face'

/** 签到状态 */
export type AttendanceStatus = 'open' | 'closed'

/** 签到记录状态 */
export type AttendanceRecordStatus = 'present' | 'late' | 'absent' | 'leave'

/** 请假审批状态 */
export type LeaveStatus = 'pending' | 'approved' | 'rejected'

/** 签到（发布记录） */
export interface Attendance {
  id: string
  classId: string
  publisherId: string
  title: string
  type?: string
  startTime: string
  endTime: string
  method: AttendanceMethod
  location?: string
  latitude?: number
  longitude?: number
  checkRadius?: number
  code?: string
  status: AttendanceStatus
  createdAt?: string
  updatedAt?: string
  publisher?: { id: string; name: string }
  records?: AttendanceRecord[]
}

/** 学生签到记录 */
export interface AttendanceRecord {
  id: string
  attendanceId: string
  studentId: string
  status: AttendanceRecordStatus
  checkInAt?: string
  checkInMethod?: string
  latitude?: number
  longitude?: number
  selfieUrl?: string
  createdAt?: string
  student?: { id: string; name: string; studentId?: string; avatar?: string }
}

/** 请假申请 */
export interface LeaveApplication {
  id: string
  attendanceId: string
  studentId: string
  reason: string
  status: LeaveStatus
  reviewedBy?: string
  reviewedAt?: string
  createdAt?: string
  student?: { id: string; name: string }
}

/** 考勤统计结果 */
export interface AttendanceStatistics {
  total: number
  present: number
  late: number
  absent: number
  leave: number
  /** 详细名单 */
  records?: AttendanceRecord[]
  /** 请假列表 */
  leaves?: LeaveApplication[]
}