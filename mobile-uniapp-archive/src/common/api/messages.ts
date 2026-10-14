import { request } from './request'

export type MessageType = 'notice' | 'homework' | 'activity'

export interface Attachment {
  fileName: string
  fileUrl: string
  fileSize: number
}

export interface CreateMessageData {
  type: MessageType
  title: string
  content: string
  location?: string
  eventTime?: string
  reminderInterval?: number
  requireAck?: boolean
  attachments?: Attachment[]
}

export interface MessageItem {
  id: string
  type: MessageType
  title: string
  content: string
  location?: string
  eventTime?: string
  publisher?: {
    id: string
    name: string
  }
  isRead: boolean
  requireAck: boolean
  readCount: number
  createdAt: string
}

export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface MessageListResult {
  list: MessageItem[]
  pagination: Pagination
}

export interface MessageDetail extends MessageItem {
  isAcked: boolean
  attachments?: Attachment[]
}

export interface AckUser {
  userId: string
  name: string
  avatar?: string
  studentId: string
  ackedAt: string
}

export interface UnackUser {
  userId: string
  name: string
  avatar?: string
  studentId: string
}

export interface MessageAcksResult {
  ackedCount: number
  unackedCount: number
  total: number
  ackedList: AckUser[]
  unackedList: UnackUser[]
}

export interface ExportAcksResult {
  messageId: string
  title: string
  total: number
  ackedCount: number
  unackedCount: number
  unackedList: { userId: string; name: string; studentId: string; phone: string }[]
}

export function createMessage(classId: string, data: CreateMessageData) {
  return request.post<string>(`/classes/${classId}/messages`, data)
}

export function getMessageList(
  classId: string,
  params?: { type?: MessageType; page?: number; pageSize?: number },
) {
  return request.get<MessageListResult>(`/classes/${classId}/messages`, params)
}

export function getMessageDetail(classId: string, id: string) {
  return request.get<MessageDetail>(`/classes/${classId}/messages/${id}`)
}

export function readMessage(classId: string, id: string) {
  return request.post<null>(`/classes/${classId}/messages/${id}/read`, {})
}

export function ackMessage(classId: string, id: string) {
  return request.post<null>(`/classes/${classId}/messages/${id}/ack`, {})
}

export function getMessageAcks(classId: string, id: string) {
  return request.get<MessageAcksResult>(`/classes/${classId}/messages/${id}/acks`)
}

export function remindMessage(classId: string, id: string, remindAfterMinutes: number) {
  return request.post<null>(`/classes/${classId}/messages/${id}/remind`, { remindAfterMinutes })
}

export function exportMessageAcks(classId: string, id: string) {
  return request.get<ExportAcksResult>(`/classes/${classId}/messages/${id}/export-acks`)
}
