// ============================================================
// 通知消息类型定义
// 对应 back/prisma 实体 messages / message_attachments / message_acks
// ============================================================

/** 通知类型 */
export type MessageType = 'notice' | 'homework' | 'activity'

/** 通知状态 */
export type MessageStatus = 'published' | 'ended'

/** 通知 */
export interface MessageItem {
  id: string
  classId: string
  publisherId: string
  type: MessageType
  title: string
  content: string
  location?: string
  eventTime?: string
  requireAck: boolean
  reminderInterval?: number
  ackDeadline?: string
  status: MessageStatus
  createdAt?: string
  publisher?: { id: string; name: string }
  attachments?: MessageAttachment[]
  /** 当前用户是否已读 */
  read?: boolean
  /** 当前用户是否已签收 */
  acked?: boolean
}

/** 消息附件 */
export interface MessageAttachment {
  id: string
  messageId: string
  fileName: string
  fileUrl: string
  fileSize?: number
  mimeType?: string
}

/** 签收统计 */
export interface MessageAcks {
  total: number
  acked: number
  unacked: number
  ackList?: MessageAck[]
  unackedMembers?: { id: string; name: string }[]
}

/** 签收记录 */
export interface MessageAck {
  id: string
  messageId: string
  userId: string
  ackedAt: string
  user?: { id: string; name: string; avatar?: string }
}