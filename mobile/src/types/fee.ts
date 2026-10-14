// ============================================================
// 班费/团费账本类型定义
// 对应 back/prisma 实体 class_fee / class_group_fee / fee_budgets
// ============================================================

/** 账本类型：class 班费 / group 团费 */
export type FeeCategory = 'class' | 'group'

/** 收支方向 */
export type FeeType = 'income' | 'expense'

/** 收支明细 */
export interface FeeRecord {
  id: string
  classId: string
  userId: string
  type: FeeType
  amount: number
  remark?: string
  billUrl?: string
  createTime?: string
  updateTime?: string
  userName?: string
}

/** 台账分页结果 */
export interface FeeLedgerResult {
  list: FeeRecord[]
  total: number
  pageNum: number
  pageSize: number
}

/** 月度收支统计 */
export interface FeeMonthStat {
  totalIncome: number
  totalExpense: number
  balance: number
  incomeList?: FeeRecord[]
  expenseList?: FeeRecord[]
}

/** 学期预算 */
export interface FeeBudget {
  id: string
  classId: string
  feeType: FeeCategory
  academicYear: string
  semester: string
  amount: number
  remark?: string
  createdAt?: string
}