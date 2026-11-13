/**
 * 平台内置账号（系统管理员）识别。
 * 这类账号可能因为测试或误操作被加入班级成员，但它不是学生，
 * 不应出现在抽签候选池等「面向学生」的场景里。
 */
const SYSTEM_ACCOUNT_PHONES = ['13800138000'];
const SYSTEM_ACCOUNT_STUDENT_IDS = ['A0001'];

export function isSystemAccount(user?: { phone?: string | null; student_id?: string | null } | null): boolean {
  if (!user) return false;
  if (user.phone && SYSTEM_ACCOUNT_PHONES.includes(user.phone)) return true;
  if (user.student_id && SYSTEM_ACCOUNT_STUDENT_IDS.includes(user.student_id)) return true;
  return false;
}
