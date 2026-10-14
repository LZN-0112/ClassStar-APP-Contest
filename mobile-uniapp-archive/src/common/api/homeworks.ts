import { request } from './request'

export interface CreateHomeworkData {
  subject: string
  title: string
  content?: string
  deadline: string
  submitMethod?: string
}

export interface HomeworkItem {
  id: string
  subject: string
  title: string
  content?: string
  deadline: string
  publisher?: {
    id: string
    name: string
  }
  submitted: boolean
  submissionCount: number
  status: string
  createdAt: string
}

export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface HomeworkListResult {
  list: HomeworkItem[]
  pagination: Pagination
}

export interface HomeworkSubmission {
  id: string
  content?: string
  fileUrls?: string[]
  submittedAt: string
  status: string
}

export interface DelayApplication {
  id: string
  status: string
  reason: string
  requestedDeadline: string
  createdAt: string
}

export interface HomeworkDetail extends HomeworkItem {
  mySubmission?: HomeworkSubmission
  myDelayApplication?: DelayApplication
}

export interface SubmitHomeworkData {
  content?: string
  fileUrls?: string[]
}

export interface DelayApplicationData {
  reason: string
  requestedDeadline: string
}

export function createHomework(classId: string, data: CreateHomeworkData) {
  return request.post<{ id: string }>(`/classes/${classId}/homeworks`, data)
}

export function getHomeworkList(
  classId: string,
  params?: { status?: string; page?: number; pageSize?: number },
) {
  return request.get<HomeworkListResult>(`/classes/${classId}/homeworks`, params)
}

export function getHomeworkDetail(classId: string, id: string) {
  return request.get<HomeworkDetail>(`/classes/${classId}/homeworks/${id}`)
}

export function submitHomework(classId: string, id: string, data: SubmitHomeworkData) {
  return request.post<null>(`/classes/${classId}/homeworks/${id}/submit`, data)
}

export function applyDelay(classId: string, id: string, data: DelayApplicationData) {
  return request.post<null>(`/classes/${classId}/homeworks/${id}/delay`, data)
}

export function reviewDelay(
  classId: string,
  id: string,
  applicationId: string,
  status: 'approved' | 'rejected',
) {
  return request.post<null>(`/classes/${classId}/homeworks/${id}/delay/${applicationId}/review`, { status })
}
