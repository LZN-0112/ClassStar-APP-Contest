// ============================================================
// 设置与个人中心类型定义
// 对应 back/prisma 实体 user_settings 与 settings 模块返回
// ============================================================

/** 通知设置 */
export interface NotificationSettings {
  classNews?: boolean
  homeworkRemind?: boolean
  voteRemind?: boolean
  activityRemind?: boolean
  [key: string]: unknown
}

/** 隐私设置 */
export interface PrivacySettings {
  showStudentId?: boolean
  showPhone?: boolean
  [key: string]: unknown
}

/** 通用设置 */
export interface GeneralSettings {
  [key: string]: unknown
}

/** 用户设置 */
export interface UserSettings {
  notificationSettings?: NotificationSettings
  privacySettings?: PrivacySettings
  generalSettings?: GeneralSettings
}

/** 当前用户资料 */
export interface UserProfile {
  id: string
  name: string
  phone: string
  avatar?: string
  backgroundImage?: string
  bio?: string
  studentId?: string
}

/** 最近动态项 */
export interface RecentActivity {
  id: string
  action: string
  resourceType?: string
  resourceId?: string
  createdAt?: string
}