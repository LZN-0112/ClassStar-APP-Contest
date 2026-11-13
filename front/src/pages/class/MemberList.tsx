import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import StatusBar from '@/components/layout/StatusBar';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { isOwner, ROLE_LABEL } from '@/utils/role';
import { ChevronRight, Search, UserPlus, Users } from 'lucide-react';

interface Member {
  id: string;
  userId: string;
  name: string;
  avatar?: string;
  studentId?: string | null;
  phone?: string | null;
  role: string;
  roleLevel: 'owner' | 'admin' | 'member';
  isCommittee: boolean;
  verifyStatus?: 'CONFIRMED' | 'PENDING' | 'UNVERIFIED';
  joinedAt: string;
}

type FilterKey = 'all' | 'admin' | 'member';

const LEVEL_BADGE: Record<Member['roleLevel'], string> = {
  owner: 'bg-[#0062FF] text-white',
  admin: 'bg-[#10B981] text-white',
  member: 'bg-[#F3F4F6] text-[#4B5563]',
};

const VERIFY_BADGE: Record<NonNullable<Member['verifyStatus']>, { label: string; className: string }> = {
  CONFIRMED: { label: '已确认', className: 'bg-[#ECFDF5] text-[#047857]' },
  PENDING: { label: '待确认', className: 'bg-[#FFF7ED] text-[#C2410C]' },
  UNVERIFIED: { label: '未核实', className: 'bg-[#F3F4F6] text-[#6B7280]' },
};

const AVATAR_COLORS = ['#0062FF', '#10B981', '#F97316', '#8B5CF6', '#EF4444', '#0EA5E9'];

const ROLE_RANK: Record<string, number> = { owner: 0, admin: 1, member: 2 };

function avatarColor(name: string) {
  let sum = 0;
  for (let i = 0; i < name.length; i += 1) sum += name.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export default function MemberList() {
  const navigate = useNavigate();
  const location = useLocation();
  const refreshKey = (location.state as { refreshKey?: number } | null)?.refreshKey;
  const { user } = useCurrentUser();
  const classId = user?.classId;
  const isOwnerRole = isOwner(user?.roleLevel);
  const canManage = isOwnerRole || user?.roleLevel === 'admin';

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const confirmMember = async (member: Member) => {
    if (!classId || verifyingId) return;
    setVerifyingId(member.id);
    try {
      await api.post(`/classes/${classId}/members/${member.userId}/verify`, {
        status: 'CONFIRMED',
      });
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, verifyStatus: 'CONFIRMED' } : m)),
      );
      toast.success(`已确认 ${member.name} 的身份`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '确认失败，请稍后重试');
    } finally {
      setVerifyingId(null);
    }
  };

  const fetchMembers = async () => {
    if (!classId) return;
    setLoading(true);
    try {
      const res = await api.get(`/classes/${classId}/members`, {
        params: { pageSize: 200 },
      });
      setMembers(res.data?.data?.list || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '获取成员列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, refreshKey]);

  const counts = useMemo(() => {
    const manager = members.filter((m) => m.roleLevel === 'owner' || m.roleLevel === 'admin').length;
    return {
      all: members.length,
      admin: manager,
      member: members.length - manager,
    };
  }, [members]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return members
      .filter((m) => {
        if (filter === 'admin') return m.roleLevel === 'owner' || m.roleLevel === 'admin';
        if (filter === 'member') return m.roleLevel === 'member';
        return true;
      })
      .filter((m) => {
        if (!q) return true;
        return (
          m.name.toLowerCase().includes(q) ||
          (m.studentId || '').toLowerCase().includes(q) ||
          (m.role || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const rankDiff = (ROLE_RANK[a.roleLevel] ?? 2) - (ROLE_RANK[b.roleLevel] ?? 2);
        if (rankDiff !== 0) return rankDiff;
        return new Date(a.joinedAt || 0).getTime() - new Date(b.joinedAt || 0).getTime();
      });
  }, [members, filter, keyword]);

  const tabs: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all', label: '全部', count: counts.all },
    { key: 'admin', label: '班委', count: counts.admin },
    { key: 'member', label: '成员', count: counts.member },
  ];

  return (
    <PhoneFrame reserveSafeAreaTop safeAreaTopClassName="bg-[#F7F8FA]">
      <StatusBar />

      <div className="box-border w-full flex-1 flex flex-col gap-4 px-5 pb-6 bg-[#F7F8FA]">
        <div className="w-full h-2 shrink-0" />

        {/* Header */}
        <div className="flex w-full flex-row items-center justify-between">
          <div className="flex flex-row items-center">
            <BackButton className="-ml-2" />
            <div className="text-[20px]/[normal] text-[#1A1A1A] font-heading font-bold">班级成员</div>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={() => navigate('/import-students')}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-[12px] font-body font-medium text-[#0062FF] shadow-soft active:scale-95 transition-transform"
            >
              <UserPlus className="h-4 w-4" strokeWidth={2} />
              邀请/导入
            </button>
          )}
        </div>

        {/* 统计 */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: '总人数', value: counts.all, color: '#0062FF' },
            { label: '班委', value: counts.admin, color: '#10B981' },
            { label: '普通成员', value: counts.member, color: '#6B7280' },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-1 rounded-xl bg-white py-3 shadow-soft">
              <div className="text-[18px] font-heading font-bold leading-none" style={{ color: item.color }}>
                {item.value}
              </div>
              <div className="text-[10px] font-body text-[#6B7280]">{item.label}</div>
            </div>
          ))}
        </div>

        {/* 搜索 */}
        <div className="flex h-[44px] w-full flex-row items-center gap-2 rounded-xl bg-white px-3.5 shadow-soft">
          <Search className="h-[17px] w-[17px] shrink-0 text-[#9CA3AF]" strokeWidth={2} />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索姓名、学号或职务"
            className="min-w-0 flex-1 bg-transparent text-[13px] font-body text-[#1A1A1A] outline-none placeholder:text-[#9CA3AF]"
          />
          {keyword && (
            <button
              type="button"
              onClick={() => setKeyword('')}
              className="text-[11px] font-body text-[#9CA3AF] active:opacity-70"
            >
              清空
            </button>
          )}
        </div>

        {/* 筛选 */}
        <div className="flex w-full flex-row gap-2">
          {tabs.map((tab) => {
            const active = filter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={`flex h-[34px] flex-1 items-center justify-center gap-1 rounded-lg text-[12px] font-body transition-colors ${
                  active ? 'bg-[#0062FF] font-semibold text-white' : 'bg-white text-[#4B5563] shadow-soft'
                }`}
              >
                {tab.label}
                <span className={`text-[10px] ${active ? 'text-white/80' : 'text-[#9CA3AF]'}`}>{tab.count}</span>
              </button>
            );
          })}
        </div>

        {!classId && !loading && (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EBF3FF]">
              <Users className="h-8 w-8 text-[#0062FF]" strokeWidth={1.5} />
            </div>
            <div className="text-[14px] font-body text-[#4B5563]">你还没有加入班级</div>
            <button
              type="button"
              onClick={() => navigate('/join-class')}
              className="rounded-lg bg-[#0062FF] px-5 py-2.5 text-[13px] font-body font-semibold text-white active:opacity-80"
            >
              去加入班级
            </button>
          </div>
        )}

        {/* 成员列表 */}
        {loading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[62px] w-full animate-pulse rounded-xl bg-white shadow-soft" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14">
            <Users className="h-9 w-9 text-[#D1D5DB]" strokeWidth={1.5} />
            <div className="text-[13px] font-body text-[#9CA3AF]">
              {members.length === 0 ? '暂无班级成员' : '没有找到匹配的成员'}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => navigate(`/member-detail?id=${member.id}`)}
                className="flex w-full flex-row items-center gap-3 rounded-xl bg-white px-3.5 py-3 text-left shadow-soft active:scale-[0.99] transition-transform"
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl"
                  style={{ backgroundColor: member.avatar ? '#F3F4F6' : avatarColor(member.name) }}
                >
                  {member.avatar ? (
                    <img src={member.avatar} alt={member.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[16px] font-heading font-semibold text-white">{member.name.charAt(0)}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-row items-center gap-2">
                    <span className="truncate text-[15px] font-body font-semibold text-[#1A1A1A]">{member.name}</span>
                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-body font-medium ${LEVEL_BADGE[member.roleLevel]}`}>
                      {ROLE_LABEL[member.roleLevel]}
                    </span>
                    {member.isCommittee && (
                      <span className="shrink-0 rounded-full bg-[#FFF7ED] px-1.5 py-0.5 text-[10px] font-body font-medium text-[#C2410C]">
                        班委
                      </span>
                    )}
                    {member.verifyStatus && member.roleLevel !== 'owner' && (
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-body font-medium ${VERIFY_BADGE[member.verifyStatus].className}`}
                      >
                        {VERIFY_BADGE[member.verifyStatus].label}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] font-body text-[#9CA3AF]">
                    {member.studentId ? `学号 ${member.studentId}` : member.role || '班级成员'}
                  </div>
                </div>
                {canManage && member.roleLevel !== 'owner' && member.verifyStatus !== 'CONFIRMED' && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmMember(member);
                    }}
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-body font-semibold ${
                      verifyingId === member.id
                        ? 'bg-[#F3F4F6] text-[#9CA3AF]'
                        : 'bg-[#0062FF] text-white active:opacity-80'
                    }`}
                  >
                    {verifyingId === member.id ? '确认中' : '确认'}
                  </span>
                )}
                <ChevronRight className="h-4 w-4 shrink-0 text-[#C0C4CC]" strokeWidth={2} />
              </button>
            ))}
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}
