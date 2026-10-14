// ============================================================
// 班级投票类型定义
// 对应 back/prisma 实体 votes / vote_options / vote_records
// ============================================================

/** 投票类型 */
export type VoteType = 'single' | 'multiple'

/** 投票状态 */
export type VoteStatus = 'published' | 'closed'

/** 投票选项 */
export interface VoteOption {
  id: string
  voteId: string
  label: string
  sortOrder: number
  /** 投票数量（统计时返回） */
  count?: number
  /** 当前用户是否已选 */
  selected?: boolean
}

/** 投票 */
export interface Vote {
  id: string
  classId: string
  publisherId: string
  title: string
  voteType: VoteType
  deadline: string
  status: VoteStatus
  createdAt?: string
  publisher?: { id: string; name: string }
  options?: VoteOption[]
  /** 总投票人数 */
  participantCount?: number
  /** 当前用户是否已投 */
  voted?: boolean
}

/** 投票结果 */
export interface VoteResults {
  voteId: string
  total: number
  options: VoteOption[]
}