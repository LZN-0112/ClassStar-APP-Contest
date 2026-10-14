// ============================================================
// 班级相关类型定义（用于首页任务统计 / 班级动态等）
// ============================================================

/** 任务统计 */
export interface TaskStats {
  todo: number
  inProgress: number
  done: number
}

/** 任务项 */
export interface TaskItem {
  id: string
  title: string
  progress: number
  status: string
}

/** 任务统计与列表结果 */
export interface TasksResult {
  stats: TaskStats
  list: TaskItem[]
}

/** 班级消息 / 通知 */
export interface MessageItem {
  id: string
  type: string
  title: string
  publisher?: { name: string }
  createdAt: string
}

/** 消息列表结果 */
export interface MessageListResult {
  list: MessageItem[]
  total?: number
}