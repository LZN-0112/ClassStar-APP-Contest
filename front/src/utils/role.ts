export type RoleLevel = 'owner' | 'admin' | 'member';

export const isOwner = (level?: RoleLevel) => level === 'owner';

export const isAdminOrOwner = (level?: RoleLevel) =>
  level === 'admin' || level === 'owner';

export const isMember = (level?: RoleLevel) => level === 'member';

/**
 * 角色显示名称映射（兜底）
 */
export const ROLE_LABEL: Record<RoleLevel, string> = {
  owner: '群主',
  admin: '管理员',
  member: '群员',
};

/**
 * 从 localStorage 缓存中读取当前用户等级（用于非 Hook 场景）
 */
export function getCurrentRoleLevel(): RoleLevel | undefined {
  try {
    const raw = localStorage.getItem('currentUser');
    if (!raw) return undefined;
    const user = JSON.parse(raw);
    return user?.roleLevel as RoleLevel;
  } catch {
    return undefined;
  }
}

export const currentIsOwner = () => isOwner(getCurrentRoleLevel());
export const currentIsAdminOrOwner = () => isAdminOrOwner(getCurrentRoleLevel());

/**
 * @deprecated 旧班委概念已统一为 admin/owner，请使用 currentIsAdminOrOwner
 */
export const currentIsCommittee = currentIsAdminOrOwner;

/**
 * @deprecated 旧角色概念已统一为 admin/owner，请使用 currentIsAdminOrOwner
 */
export const currentIsLeagueSecretary = currentIsAdminOrOwner;

/**
 * @deprecated 旧角色概念已统一为 admin/owner，请使用 currentIsAdminOrOwner
 */
export const currentIsStudyCommittee = currentIsAdminOrOwner;
