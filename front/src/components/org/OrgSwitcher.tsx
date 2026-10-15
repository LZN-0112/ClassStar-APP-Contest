import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Check, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useCurrentUser, setCurrentOrg, getCurrentOrgId, type MyOrgItem } from '@/hooks/useCurrentUser';
import { getOrgTypeMeta } from '@/utils/org';

interface OrgTodo {
  orgId: string;
  orgName: string;
  orgType: string;
  totalCount: number;
}

export default function OrgSwitcher() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [orgs, setOrgs] = useState<MyOrgItem[]>([]);
  const [todoMap, setTodoMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const currentOrgId = getCurrentOrgId() || user?.classId || '';

  const loadOrgs = async () => {
    setLoading(true);
    try {
      const [orgsRes, todosRes] = await Promise.all([
        api.get('/classes/my'),
        api.get('/classes/orgs/todos').catch(() => null),
      ]);
      const rawList = orgsRes.data?.data || orgsRes.data || [];
      // 映射字段名，兼容 API 返回的不同字段名
      const list: MyOrgItem[] = rawList.map((o: any) => ({
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
      setOrgs(list);

      const todos: OrgTodo[] = todosRes?.data?.data || todosRes?.data || [];
      const map: Record<string, number> = {};
      todos.forEach((t) => {
        map[t.orgId] = t.totalCount;
      });
      setTodoMap(map);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '加载组织列表失败');
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    if (!open) {
      loadOrgs();
    }
    setOpen(!open);
  };

  const handleSwitch = (org: MyOrgItem) => {
    if (org.id === currentOrgId) {
      setOpen(false);
      return;
    }
    setCurrentOrg(org);
    setOpen(false);
    toast.success(`已切换到 ${org.name}`);
    // 触发 orgChanged 事件，通知 useCurrentUser 重新获取数据
    window.dispatchEvent(new Event('orgChanged'));
    // 强制整页刷新，确保所有组件重新初始化
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!user?.classId) {
    return null;
  }

  const meta = getOrgTypeMeta(user.orgType);
  const CurrentIcon = meta.Icon;

  return (
    <>
      {/* 触发栏 */}
      <button
        type="button"
        onClick={toggle}
        className="flex items-center gap-2 rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-black/5 active:bg-black/10"
        aria-label="切换组织"
      >
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
          style={{ backgroundColor: meta.color }}
        >
          <CurrentIcon className="h-3 w-3 text-white" strokeWidth={2.5} />
        </span>
        <span className="max-w-[120px] truncate text-[13px] font-medium text-[#1A1A1A]">
          {user.className}
        </span>
        <span
          className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
          style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
        >
          {meta.label}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-500" strokeWidth={2.5} />
      </button>

      {/* 下拉面板 */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-16" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-[360px] overflow-hidden rounded-2xl bg-white shadow-xl animate-[fadeIn_0.2s_ease]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 面板头 */}
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <span className="text-[16px] font-semibold text-gray-900">切换组织</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 组织列表 */}
            <div className="max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="py-10 text-center text-[13px] text-gray-400">加载中...</div>
              ) : orgs.length === 0 ? (
                <div className="py-10 text-center text-[13px] text-gray-400">暂无组织</div>
              ) : (
                orgs.map((org) => {
                  const oMeta = getOrgTypeMeta(org.orgType);
                  const OIcon = oMeta.Icon;
                  const isActive = org.id === currentOrgId;
                  const todoCount = todoMap[org.id] || 0;
                  return (
                    <button
                      key={org.id}
                      type="button"
                      onClick={() => handleSwitch(org)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                        isActive ? 'bg-blue-50' : ''
                      }`}
                    >
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: oMeta.color }}
                      >
                        <OIcon className="h-5 w-5 text-white" strokeWidth={2} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[15px] font-medium text-gray-900">
                            {org.name}
                          </span>
                          {todoCount > 0 && (
                            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                              {todoCount > 99 ? '99+' : todoCount}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="text-[12px] font-medium" style={{ color: oMeta.color }}>
                            {oMeta.label}
                          </span>
                          <span className="text-[12px] text-gray-400">·</span>
                          <span className="text-[12px] text-gray-500">{org.role}</span>
                          <span className="text-[12px] text-gray-400">·</span>
                          <span className="text-[12px] text-gray-400">{org.memberCount} 人</span>
                        </div>
                      </div>
                      {isActive && (
                        <Check className="h-5 w-5 shrink-0 text-blue-600" strokeWidth={2.5} />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* 底部操作 */}
            <div className="border-t border-gray-100 p-3">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate('/join-class');
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-50 py-2.5 text-[14px] font-semibold text-blue-600 transition-colors hover:bg-blue-100"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                创建 / 加入组织
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
