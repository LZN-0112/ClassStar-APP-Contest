import { request } from './request'

export interface CreateAttendanceData {
  title: string
  type?: string
  startTime: string
  endTime: string
  method: 'normal' | 'qr' | 'gps' | 'code' | 'face'
  location?: string
  latitude?: number
  longitude?: number
  checkRadius?: number
  code?: string
}

export interface AttendanceItem {
  id: string
  title: string
  type?: string
  startTime: string
  endTime: string
  method: string
  location?: string
  status: string
  publisher?: {
    id: string
    name: string
  }
  checkInCount: number
  createdAt: string
}

export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface AttendanceListResult {
  list: AttendanceItem[]
  pagination: Pagination
}

export interface AttendanceRecord {
  id: string
  status: string
  checkInAt: string
}

export interface LeaveApplication {
  id: string
  status: string
  reason: string
  createdAt: string
}

export interface AttendanceDetail extends AttendanceItem {
  latitude?: number
  longitude?: number
  checkRadius?: number
  myRecord?: AttendanceRecord
  myLeaveApplication?: LeaveApplication
}

export interface CheckInData {
  method: string
  location?: string
  latitude?: number
  longitude?: number
  code?: string
  selfieUrl?: string
}

export interface CheckInResult {
  id: string
  status: string
  checkInAt: string
}

export interface AttendanceStatistics {
  total: number
  presentCount: number
  absentCount: number
  leaveCount: number
  presentList: any[]
  absentList: any[]
  leaveList: any[]
}

export function createAttendance(classId: string, data: CreateAttendanceData) {
  return request.post<{ id: string }>(`/classes/${classId}/attendances`, data)
}

export function getAttendanceList(
  classId: string,
  params?: { status?: string; page?: number; pageSize?: number },
) {
  return request.get<AttendanceListResult>(`/classes/${classId}/attendances`, params)
}

export function getAttendanceDetail(classId: string, id: string) {
  return request.get<AttendanceDetail>(`/classes/${classId}/attendances/${id}`)
}

export function checkIn(classId: string, id: string, data: CheckInData) {
  return request.post<CheckInResult>(`/classes/${classId}/attendances/${id}/check-in`, data)
}

export function closeAttendance(classId: string, id: string) {
  return request.post<null>(`/classes/${classId}/attendances/${id}/close`, {})
}

export function getAttendanceStatistics(classId: string, id: string) {
  return request.get<AttendanceStatistics>(`/classes/${classId}/attendances/${id}/statistics`)
}

export function applyLeave(classId: string, id: string, reason: string) {
  return request.post<null>(`/classes/${classId}/attendances/${id}/leave`, { reason })
}

export function reviewLeave(
  classId: string,
  id: string,
  applicationId: string,
  status: 'approved' | 'rejected',
) {
  return request.post<null>(`/classes/${classId}/attendances/${id}/leave/${applicationId}/review`, { status })
}
