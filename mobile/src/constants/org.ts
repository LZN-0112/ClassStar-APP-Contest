// ============================================================
// 组织类型元数据（对应 front/src/utils/org.ts，颜色/图标从 front 提取）
// icon 名对应 constants/icons.ts 中的键
// ============================================================

export type OrgType = 'class' | 'association' | 'committee' | 'club'

export interface OrgTypeMeta {
  label: string
  color: string
  icon: string
}

export const ORG_TYPE_META: Record<OrgType, OrgTypeMeta> = {
  class: { label: '班级', color: '#2563EB', icon: 'school' },
  association: { label: '社团', color: '#A855F7', icon: 'tent' },
  committee: { label: '部门', color: '#EF4444', icon: 'users' },
  club: { label: '兴趣小组', color: '#F59E0B', icon: 'star' }
}

/** 组织类型列表 */
export const ORG_TYPES: OrgType[] = ['class', 'association', 'committee', 'club']

/** 按类型取元数据，未知名类型回退为 class */
export function getOrgTypeMeta(type?: string): OrgTypeMeta {
  const t = (type as OrgType) || 'class'
  return ORG_TYPE_META[t] || ORG_TYPE_META.class
}