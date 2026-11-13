import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarCheck,
  CheckCircle,
  ClipboardList,
  Dices,
  FileText,
  Flag,
  Folder,
  Megaphone,
  Timer,
  UserCheck,
  Vote,
  Wallet,
} from 'lucide-react';

export type FeatureGroupKey = 'affairs' | 'study' | 'manage';
export type FeatureBadgeKey = 'unread' | 'homework' | 'activity' | 'material';

export interface FeatureItem {
  id: string;
  label: string;
  icon: LucideIcon;
  /** 图标底色渐变 */
  gradient: string;
  group: FeatureGroupKey;
  path?: string;
  /** 特殊入口：签到需要先判断是否有进行中的签到 */
  action?: 'attendance';
  badge?: FeatureBadgeKey;
  /** 仅班长 / 班委可见 */
  managerOnly?: boolean;
}

export interface FeatureGroup {
  key: FeatureGroupKey;
  title: string;
  note?: string;
  items: FeatureItem[];
}

const AFFAIRS_ITEMS: FeatureItem[] = [
  {
    id: 'notice',
    label: '通知',
    icon: Bell,
    gradient: 'linear-gradient(145deg, #60A5FA, #2563EB)',
    group: 'affairs',
    path: '/messages',
    badge: 'unread',
  },
  {
    id: 'attendance',
    label: '签到',
    icon: CheckCircle,
    gradient: 'linear-gradient(145deg, #4ADE80, #16A34A)',
    group: 'affairs',
    path: '/attendance-list',
    action: 'attendance',
  },
  {
    id: 'homework',
    label: '作业',
    icon: FileText,
    gradient: 'linear-gradient(145deg, #FDBA74, #F97316)',
    group: 'affairs',
    path: '/homework-list',
    badge: 'homework',
  },
  {
    id: 'activity',
    label: '活动',
    icon: Flag,
    gradient: 'linear-gradient(145deg, #FB7185, #E11D48)',
    group: 'affairs',
    path: '/activity-list',
    badge: 'activity',
  },
  {
    id: 'vote',
    label: '投票',
    icon: Vote,
    gradient: 'linear-gradient(145deg, #A5B4FC, #6366F1)',
    group: 'affairs',
    path: '/vote-list',
  },
  {
    id: 'draw',
    label: '抽签',
    icon: Dices,
    gradient: 'linear-gradient(145deg, #FCD34D, #F59E0B)',
    group: 'affairs',
    path: '/random-draw',
  },
  {
    id: 'fee',
    label: '班费',
    icon: Wallet,
    gradient: 'linear-gradient(145deg, #34D399, #059669)',
    group: 'affairs',
    path: '/fee-ledger',
  },
  {
    id: 'material',
    label: '资料',
    icon: Folder,
    gradient: 'linear-gradient(145deg, #5EEAD4, #0D9488)',
    group: 'affairs',
    path: '/material-library',
    badge: 'material',
  },
];

const STUDY_ITEMS: FeatureItem[] = [
  {
    id: 'pomodoro',
    label: '番茄钟',
    icon: Timer,
    gradient: 'linear-gradient(145deg, #FDA4AF, #E11D48)',
    group: 'study',
    path: '/pomodoro',
  },
  {
    id: 'my-homework',
    label: '我的作业',
    icon: ClipboardList,
    gradient: 'linear-gradient(145deg, #FDBA74, #EA580C)',
    group: 'study',
    path: '/my-homework',
  },
  {
    id: 'my-registration',
    label: '我的报名',
    icon: UserCheck,
    gradient: 'linear-gradient(145deg, #7DD3FC, #0284C7)',
    group: 'study',
    path: '/my-registration',
  },
  {
    id: 'dashboard',
    label: '数据看板',
    icon: BarChart3,
    gradient: 'linear-gradient(145deg, #C4B5FD, #7C3AED)',
    group: 'study',
    path: '/data-dashboard',
  },
];

const MANAGE_ITEMS: FeatureItem[] = [
  {
    id: 'publish-message',
    label: '发通知',
    icon: Megaphone,
    gradient: 'linear-gradient(145deg, #60A5FA, #1D4ED8)',
    group: 'manage',
    path: '/publish-message',
    managerOnly: true,
  },
  {
    id: 'publish-homework',
    label: '发作业',
    icon: BookOpen,
    gradient: 'linear-gradient(145deg, #FDBA74, #EA580C)',
    group: 'manage',
    path: '/publish-homework',
    managerOnly: true,
  },
  {
    id: 'publish-attendance',
    label: '发签到',
    icon: CalendarCheck,
    gradient: 'linear-gradient(145deg, #6EE7B7, #059669)',
    group: 'manage',
    path: '/publish-attendance',
    managerOnly: true,
  },
  {
    id: 'publish-activity',
    label: '发活动',
    icon: Flag,
    gradient: 'linear-gradient(145deg, #FCA5A5, #DC2626)',
    group: 'manage',
    path: '/publish-activity',
    managerOnly: true,
  },
];

export function getFeatureGroups(options: {
  canManageFee: boolean;
  isManager: boolean;
}): FeatureGroup[] {
  const affairs = AFFAIRS_ITEMS.map((item) =>
    item.id === 'fee' && !options.canManageFee
      ? { ...item, label: '班费明细' }
      : item,
  );

  const groups: FeatureGroup[] = [
    { key: 'affairs', title: '班级事务', items: affairs },
    { key: 'study', title: '学习与记录', items: STUDY_ITEMS },
  ];

  if (options.isManager) {
    groups.push({
      key: 'manage',
      title: '班级管理',
      note: '仅班委可见',
      items: MANAGE_ITEMS,
    });
  }

  return groups;
}

const RECENT_KEY = 'banwuxing:recent-features';
const RECENT_LIMIT = 4;

export function getRecentFeatureIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string').slice(0, RECENT_LIMIT)
      : [];
  } catch {
    return [];
  }
}

export function pushRecentFeatureId(id: string): void {
  try {
    const next = [id, ...getRecentFeatureIds().filter((item) => item !== id)].slice(
      0,
      RECENT_LIMIT,
    );
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // 本地存储不可用时忽略，不影响功能
  }
}