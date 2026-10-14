// ============================================================
// 任务/工具类型定义
// 对应 back/prisma 实体 tasks / random_draw_records / pomodoro_sessions / feedback
// ============================================================

// ---------- 任务看板 ----------

/** 任务状态 */
export type TaskStatusType = 'todo' | 'in_progress' | 'done'

/** 任务项 */
export interface TaskItem {
  id: string
  classId: string
  title: string
  ownerId: string
  deadline?: string
  progress: number
  status: TaskStatusType
  createdAt?: string
  owner?: { id: string; name: string; avatar?: string }
}

/** 任务统计 */
export interface TaskCounts {
  todo: number
  in_progress: number
  done: number
}

/** 任务看板结果 */
export interface TaskBoardResult {
  stats: TaskCounts
  list: TaskItem[]
  total?: number
}

// ---------- 随机抽签 ----------

/** 抽签记录 */
export interface RandomDrawRecord {
  id: string
  classId: string
  title: string
  mainCount: number
  backupCount: number
  status: string
  createdBy: string
  createdAt?: string
  mainMembers?: DrawMember[]
  backupMembers?: DrawMember[]
}

/** 抽签成员 */
export interface DrawMember {
  id: string
  drawId: string
  studentId: string
  drawType: 'main' | 'backup'
  student?: { id: string; name: string; studentId?: string; avatar?: string }
}

// ---------- 番茄钟 ----------

/** 番茄钟状态 */
export type PomodoroStatusType = 'in_progress' | 'completed' | 'cancelled'

/** 专注 session */
export interface PomodoroSession {
  id: string
  classId: string
  userId: string
  taskTitle: string
  durationMinutes: number
  actualMinutes: number
  status: PomodoroStatusType
  startedAt?: string
  completedAt?: string
}

/** 个人专注统计 */
export interface PomodoroStats {
  totalSessions: number
  totalMinutes: number
  completedSessions: number
}

// ---------- 帮助与反馈 ----------

/** 反馈 */
export interface FeedbackItem {
  id: string
  userId?: string
  content: string
  contact?: string
  images?: string[]
  status: string
  createdAt?: string
}