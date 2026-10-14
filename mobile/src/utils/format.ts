// ============================================================
// 格式化工具函数
// 逻辑与 front StudentHome.tsx 中的同名函数完全一致
// ============================================================

/**
 * 格式化时间为相对时间
 * @param dateStr ISO 日期字符串
 * @returns "刚刚" / "N分钟前" / "N小时前" / "N天前" / "M月D日"
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin}分钟前`
  if (diffHour < 24) return `${diffHour}小时前`
  if (diffDay < 7) return `${diffDay}天前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

/**
 * 获取今日日期字符串
 * @returns 如 "9月3日 周三"
 */
export function getTodayDateStr(): string {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${month}月${day}日 ${weekDays[now.getDay()]}`
}

/**
 * 根据当前小时获取问候语
 * @returns 凌晨好 / 早上好 / 中午好 / 下午好 / 晚上好
 */
export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return '凌晨好'
  if (hour < 12) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}
