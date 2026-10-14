import { request } from './request'

export interface CreateFeedbackParams {
  content: string
  contact?: string
  images?: string[]
}

export interface FeedbackItem {
  id: string
  userId: string
  content: string
  contact: string | null
  images: string[]
  status: string
  createdAt: string
  updatedAt?: string
}

export function createFeedback(data: CreateFeedbackParams) {
  return request.post<FeedbackItem>('/feedback', data)
}

export function getMyFeedbacks() {
  return request.get<FeedbackItem[]>('/feedback/my')
}
