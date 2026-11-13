import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, Settings, User, X } from 'lucide-react';
import {
  getFeatureGroups,
  getRecentFeatureIds,
  pushRecentFeatureId,
  type FeatureBadgeKey,
  type FeatureItem,
} from '@/config/featureItems';
import { isNative } from '@/lib/capacitor';

interface FeatureDrawerProps {
  open: boolean;
  onClose: () => void;
  onAttendance: () => void;
  isManager: boolean;
  canManageFee: boolean;
  orgName?: string;
  counts: Record<FeatureBadgeKey, number>;
}

function formatBadge(count: number) {
  if (count <= 0) return '';
  return count > 99 ? '99+' : String(count);
}

export default function FeatureDrawer({
  open,
  onClose,
  onAttendance,
  isManager,
  canManageFee,
  orgName,
  counts,
}: FeatureDrawerProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [recentIds, setRecentIds] = useState<string[]>([]);

  const groups = useMemo(
    () => getFeatureGroups({ canManageFee, isManager }),
    [canManageFee, isManager],
  );

  const allItems = useMemo(() => groups.flatMap((group) => group.items), [groups]);

  const recentItems = useMemo(
    () =>
      recentIds
        .map((id) => allItems.find((item) => item.id === id))
        .filter((item): item is FeatureItem => Boolean(item)),
    [recentIds, allItems],
  );

  const keyword = query.trim();
  const filteredGroups = useMemo(() => {
    if (!keyword) return groups;
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.label.includes(keyword)),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, keyword]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setRecentIds(getRecentFeatureIds());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handleSelect = (item: FeatureItem) => {
    pushRecentFeatureId(item.id);
    onClose();
    if (item.action === 'attendance') {
      onAttendance();
      return;
    }
    if (item.path) navigate(item.path);
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-[90] ${open ? '' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 flex items-stretch justify-center sm:items-center sm:p-6">
        <div className="relative h-full w-full overflow-hidden sm:h-phone sm:w-phone sm:rounded-device">
          {/* 遮罩 */}
          <div
            className={`absolute inset-0 bg-[#0B1526]/45 transition-opacity duration-300 ${
              open ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={onClose}
          />

          {/* 右侧抽屉 */}
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="全部功能"
            className={`absolute right-0 top-0 flex h-full w-[320px] max-w-[88%] flex-col bg-white shadow-[-16px_0_48px_-16px_rgba(15,23,42,0.45)] transition-transform duration-300 ease-out sm:rounded-l-[28px] ${
              open ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {/* 头部（原生环境避开系统状态栏/挖孔） */}
            <div
              className="shrink-0 px-5 pt-5"
              style={
                isNative
                  ? { paddingTop: 'calc(var(--safe-top, env(safe-area-inset-top, 0px)) + 20px)' }
                  : undefined
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[19px]/[normal] font-heading font-bold text-[#0F172A]">
                    全部功能
                  </div>
                  <div className="mt-1.5 truncate text-[11px]/[normal] font-body text-[#94A3B8]">
                    {orgName ? `${orgName} · ` : ''}
                    {isManager ? '班委视角' : '学生视角'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="关闭全部功能"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[#64748B] transition-colors active:bg-[#E2E8F0]"
                >
                  <X className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </div>

              {/* 搜索 */}
              <div className="mt-4 flex items-center gap-2 rounded-[14px] bg-[#F1F5F9] px-3 py-2.5">
                <Search className="h-4 w-4 shrink-0 text-[#94A3B8]" strokeWidth={2} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索功能"
                  className="w-full bg-transparent text-[13px]/[normal] font-body text-[#0F172A] outline-none placeholder:text-[#94A3B8]"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="清空搜索"
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#CBD5E1] text-white"
                  >
                    <X className="h-2.5 w-2.5" strokeWidth={3} />
                  </button>
                ) : null}
              </div>

              {/* 最近使用 */}
              {!keyword && recentItems.length > 0 ? (
                <div className="mt-3 flex items-center gap-2 overflow-x-auto">
                  <span className="shrink-0 text-[10px]/[normal] font-body text-[#94A3B8]">
                    最近
                  </span>
                  {recentItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelect(item)}
                        className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#F8FAFC] py-1 pl-1 pr-2.5 text-[11px]/[normal] font-body font-medium text-[#475569] ring-1 ring-[#EEF2F7] transition-colors active:bg-[#EFF6FF]"
                      >
                        <span
                          className="flex h-5 w-5 items-center justify-center rounded-full"
                          style={{ backgroundImage: item.gradient }}
                        >
                          <Icon className="h-3 w-3 text-white" strokeWidth={2.2} />
                        </span>
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {/* 功能分组 */}
            <div className="mt-1 min-h-0 flex-1 overflow-y-auto px-5 pb-4">
              {filteredGroups.map((group) => (
                <section key={group.key} className="mt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-[13px]/[normal] font-heading font-semibold text-[#0F172A]">
                        {group.title}
                      </h3>
                      {group.note ? (
                        <span className="rounded-full bg-[#EFF6FF] px-1.5 py-0.5 text-[9px]/[normal] font-body font-medium text-[#2563EB]">
                          {group.note}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[10px]/[normal] font-data text-[#CBD5E1]">
                      {group.items.length}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-y-4">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const badge = item.badge ? formatBadge(counts[item.badge] ?? 0) : '';
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelect(item)}
                          className="flex flex-col items-center gap-1.5 rounded-xl py-1 transition-transform duration-150 active:scale-95"
                        >
                          <span className="relative">
                            <span
                              className="flex h-11 w-11 items-center justify-center rounded-[14px] shadow-[0_6px_14px_-8px_rgba(15,23,42,0.5)]"
                              style={{ backgroundImage: item.gradient }}
                            >
                              <Icon className="h-[21px] w-[21px] text-white" strokeWidth={2} />
                            </span>
                            {badge ? (
                              <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#EF4444] px-1 text-[9px] font-semibold leading-none text-white ring-2 ring-white">
                                {badge}
                              </span>
                            ) : null}
                          </span>
                          <span className="text-[10.5px]/[normal] font-body font-medium text-[#334155]">
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}

              {filteredGroups.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-16">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F1F5F9]">
                    <Search className="h-5 w-5 text-[#CBD5E1]" strokeWidth={2} />
                  </div>
                  <div className="text-[12px]/[normal] font-body text-[#94A3B8]">
                    没有找到「{keyword}」
                  </div>
                </div>
              ) : null}
            </div>

            {/* 底部 */}
            <div
              className="shrink-0 border-t border-[#F1F5F9] bg-white px-5 pt-3"
              style={{
                paddingBottom:
                  'calc(12px + max(env(safe-area-inset-bottom, 0px), var(--safe-bottom, 0px)))',
              }}
            >
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/class-settings');
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-[12px] bg-[#F8FAFC] py-2.5 text-[12px]/[normal] font-body font-medium text-[#334155] transition-colors active:bg-[#EFF6FF]"
                >
                  <Settings className="h-3.5 w-3.5" strokeWidth={2} />
                  班级设置
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/personal-center');
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-[12px] bg-[#F8FAFC] py-2.5 text-[12px]/[normal] font-body font-medium text-[#334155] transition-colors active:bg-[#EFF6FF]"
                >
                  <User className="h-3.5 w-3.5" strokeWidth={2} />
                  个人中心
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>,
    document.body,
  );
}