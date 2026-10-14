import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface MyOrgItem {
  id: string;
  name: string;
  code: string;
  grade: string | null;
  major: string | null;
  qrCodeUrl: string | null;
  orgType: string;
  category: string | null;
  logoUrl: string | null;
  description: string | null;
  maxMembers: number | null;
  role: string;
  roleLevel: 'owner' | 'admin' | 'member';
  isCommittee: boolean;
  memberCount: number;
  joinedAt: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  backgroundImage?: string;
  bio?: string;
  studentId?: string;
  role: string;
  roleLevel: 'owner' | 'admin' | 'member';
  classId?: string;
  className?: string;
  orgType?: string;
  isCommittee: boolean;
  createdAt?: string;
}

const CURRENT_ORG_KEY = 'currentOrgId';
const CURRENT_USER_KEY = 'currentUser';

/**
 * 读取当前选中的组织 ID
 */
export function getCurrentOrgId(): string {
  return localStorage.getItem(CURRENT_ORG_KEY) || '';
}

/**
 * 切换当前组织：写入 currentOrgId 并同步更新 currentUser 缓存中的组织相关字段，
 * 以便所有读取 currentUser 缓存的页面立即感知切换。
 */
export function setCurrentOrg(org: MyOrgItem): void {
  localStorage.setItem(CURRENT_ORG_KEY, org.id);

  const cached = localStorage.getItem(CURRENT_USER_KEY);
  if (cached) {
    try {
      const user = JSON.parse(cached) as CurrentUser;
      user.classId = org.id;
      user.className = org.name;
      user.orgType = org.orgType;
      user.role = org.role;
      user.roleLevel = org.roleLevel;
      user.isCommittee = org.isCommittee;
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } catch {
      // 缓存损坏则忽略，下次 useCurrentUser 会重建
    }
  }
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentOrgId, setCurrentOrgId] = useState<string>(getCurrentOrgId());

  useEffect(() => {
    const handleStorageChange = () => {
      const newOrgId = getCurrentOrgId();
      if (newOrgId !== currentOrgId) {
        setCurrentOrgId(newOrgId);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    // Also listen for custom event for same-tab updates
    window.addEventListener('orgChanged', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('orgChanged', handleStorageChange);
    };
  }, [currentOrgId]);

  useEffect(() => {
    const cached = localStorage.getItem(CURRENT_USER_KEY);
    if (cached) {
      try {
        setUser(JSON.parse(cached));
      } catch {
        localStorage.removeItem(CURRENT_USER_KEY);
      }
    }

    Promise.all([api.get('/auth/me'), api.get('/classes/my')])
      .then(([meRes, orgsRes]) => {
        const data = meRes.data?.data || meRes.data;
        const rawOrgs = orgsRes.data?.data || orgsRes.data || [];
        // 映射字段名，兼容 API 返回的不同字段名
        const orgs: MyOrgItem[] = rawOrgs.map((o: any) => ({
          id: o.id || o.classId,
          name: o.name || o.className,
          code: o.code || '',
          grade: o.grade || null,
          major: o.major || null,
          qrCodeUrl: o.qrCodeUrl || null,
          orgType: o.orgType,
          category: o.category || null,
          logoUrl: o.logoUrl || null,
          description: o.description || null,
          maxMembers: o.maxMembers || null,
          role: o.role,
          roleLevel: o.roleLevel || 'member',
          isCommittee: o.isCommittee || false,
          memberCount: o.memberCount || 0,
          joinedAt: o.joinedAt || '',
        }));

        const normalized: CurrentUser = {
          id: data.id,
          name: data.name,
          phone: data.phone,
          avatar: data.avatar,
          backgroundImage: data.backgroundImage,
          bio: data.bio,
          studentId: data.studentId,
          role: data.role,
          roleLevel: data.roleLevel || 'member',
          classId: data.classId,
          className: data.className,
          orgType: data.orgType,
          isCommittee: data.isCommittee,
          createdAt: data.createdAt,
        };

        // 解析当前组织：优先用 localStorage.currentOrgId，否则取首个并持久化
        if (orgs.length > 0) {
          let currentOrgId = getCurrentOrgId();
          let currentOrg = orgs.find((o) => o.id === currentOrgId);

          if (!currentOrg) {
            currentOrg = orgs[0];
            currentOrgId = currentOrg.id;
            localStorage.setItem(CURRENT_ORG_KEY, currentOrgId);
          }

          normalized.classId = currentOrg.id;
          normalized.className = currentOrg.name;
          normalized.orgType = currentOrg.orgType;
          normalized.role = currentOrg.role;
          normalized.roleLevel = currentOrg.roleLevel;
          normalized.isCommittee = currentOrg.isCommittee;
        } else {
          // 无任何组织，清空 currentOrgId
          localStorage.removeItem(CURRENT_ORG_KEY);
          normalized.classId = undefined;
          normalized.className = undefined;
          normalized.orgType = undefined;
        }

        setUser(normalized);
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(normalized));
      })
      .catch((err) => {
        setError(err.message || '获取用户信息失败');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [currentOrgId]);

  return { user, loading, error };
}
