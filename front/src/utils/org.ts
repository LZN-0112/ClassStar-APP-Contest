import { School, Tent, Users, Star, type LucideIcon } from 'lucide-react';

export type OrgType = 'class' | 'association' | 'committee' | 'club';

export const ORG_TYPE_LABEL: Record<OrgType, string> = {
  class: '班级',
  association: '社团',
  committee: '部门',
  club: '兴趣小组',
};

export const ORG_TYPE_COLOR: Record<OrgType, string> = {
  class: '#2563EB',
  association: '#A855F7',
  committee: '#EF4444',
  club: '#F59E0B',
};

export const ORG_TYPE_ICON: Record<OrgType, LucideIcon> = {
  class: School,
  association: Tent,
  committee: Users,
  club: Star,
};

export interface OrgTypeMeta {
  label: string;
  color: string;
  Icon: LucideIcon;
}

export function getOrgTypeMeta(type?: string): OrgTypeMeta {
  const t = (type as OrgType) || 'class';
  const fallback: OrgType = ORG_TYPE_LABEL[t] ? t : 'class';
  return {
    label: ORG_TYPE_LABEL[fallback],
    color: ORG_TYPE_COLOR[fallback],
    Icon: ORG_TYPE_ICON[fallback],
  };
}

export const ORG_TYPES: OrgType[] = ['class', 'association', 'committee', 'club'];
