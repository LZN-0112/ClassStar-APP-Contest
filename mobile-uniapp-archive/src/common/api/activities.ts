import { request } from './request'

export interface CreateActivityData {
  title: string
  eventDate: string
  eventTime?: string
  location?: string
  capacity?: number
  deadline?: string
  coverUrl?: string
}

export interface ActivityItem {
  id: string
  classId: string
  publisherId: string
  title: string
  eventDate: string
  eventTime?: string
  location?: string
  capacity?: number
  deadline?: string
  coverUrl?: string
  status: string
  displayStatus: string
  createdAt: string
  updatedAt: string
  registeredCount?: number
  registration?: {
    id: string
    status: string
    registeredAt: string
  }
}

export interface ActivityListResult {
  list: ActivityItem[]
  total: number
  page: number
  pageSize: number
}

export interface ActivityRegistration {
  registrationId: string
  status: string
  registeredAt: string
  activity: ActivityItem
}

export interface MyRegistrationsResult {
  list: ActivityRegistration[]
  total: number
  page: number
  pageSize: number
}

export interface ActivityDetail extends ActivityItem {
  registeredCount: number
}

export interface RegisterResult {
  id: string
  status: string
  registeredAt: string
}

export interface RegistrationMember {
  id: string
  studentId: string
  studentName: string
  studentAvatar?: string
  status: string
  registeredAt: string
}

export interface ActivityRegistrationsResult {
  activityId: string
  total: number
  pending: number
  approved: number
  rejected: number
  participationRate: number
  list: RegistrationMember[]
}

export function createActivity(classId: string, data: CreateActivityData) {
  return request.post<string>(`/classes/${classId}/activities`, data)
}

export function getActivityList(classId: string, params?: { status?: string; page?: number; pageSize?: number }) {
  return request.get<ActivityListResult>(`/classes/${classId}/activities`, params)
}

export function getMyRegistrations(classId: string, params?: { status?: string; page?: number; pageSize?: number }) {
  return request.get<MyRegistrationsResult>(`/classes/${classId}/activities/my-registrations`, params)
}

export function getActivityDetail(classId: string, activityId: string) {
  return request.get<ActivityDetail>(`/classes/${classId}/activities/${activityId}`)
}

export function registerActivity(classId: string, activityId: string) {
  return request.post<RegisterResult>(`/classes/${classId}/activities/${activityId}/register`, {})
}

export function cancelActivityRegistration(classId: string, activityId: string) {
  return request.post<{ success: boolean }>(`/classes/${classId}/activities/${activityId}/cancel`, {})
}

export function getActivityRegistrations(classId: string, activityId: string) {
  return request.get<ActivityRegistrationsResult>(`/classes/${classId}/activities/${activityId}/registrations`)
}

export function reviewActivityRegistration(
  classId: string,
  activityId: string,
  registrationId: string,
  status: 'pending' | 'registered' | 'rejected',
) {
  return request.post<{ id: string; status: string }>(
    `/classes/${classId}/activities/${activityId}/registrations/${registrationId}/review`,
    { status },
  )
}
