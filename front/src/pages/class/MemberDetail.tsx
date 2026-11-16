import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import StatusBar from '@/components/layout/StatusBar';
import BottomSheet from '@/components/ui/BottomSheet';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { isOwner, ROLE_LABEL } from '@/utils/role';
import {
  CalendarDays,
  Crown,
  KeyRound,
  Pencil,
  Shield,
  ShieldOff,
  UserMinus,
  UserRound,
  Users,
} from 'lucide-react';

interface MemberDetailData {
  id: string;
  userId: string;
  name: string;
  avatar?: string;
  studentId?: string | null;
  role: string;
  roleLevel: 'owner' | 'admin' | 'member';
  isCommittee: boolean;
  verifyStatus?: 'CONFIRMED' | 'PENDING' | 'UNVERIFIED';
  verifiedAt?: string | null;
  joinedAt: string;
  /** 名单占位账号（未激活）：班委可代改资料、重置临时密码 */
  isPlaceholder?: boolean;
}

const VERIFY_STATUS_TEXT: Record<NonNullable<MemberDetailData['verifyStatus']>, string> = {
  CONFIRMED: '已确认',
  PENDING: '待确认',
  UNVERIFIED: '未核实',
};

const AVATAR_COLORS = ['#0062FF', '#10B981', '#F97316', '#8B5CF6', '#EF4444', '#0EA5E9'];

function avatarColor(name: string) {
  let sum = 0;
  for (let i = 0; i < name.length; i += 1) sum += name.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function MemberDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const memberId = searchParams.get('id') || '';
  const { user } = useCurrentUser();
  const classId = user?.classId;
  const isOwnerRole = isOwner(user?.roleLevel);
  const canManage = isOwnerRole || user?.roleLevel === 'admin';

  const [member, setMember] = useState<MemberDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'transfer' | 'reset' | 'remove' | null>(null);
  const [resetResult, setResetResult] = useState<{ name: string; phone: string | null; tempPassword: string } | null>(null);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editStudentId, setEditStudentId] = useState('');
  const [roleSheetOpen, setRoleSheetOpen] = useState(false);
  const [editRole, setEditRole] = useState('');

  // 群主可改自己与成员的身份；管理员不能修改群主
  const canEditRole = canManage && (member?.roleLevel !== 'owner' || isOwnerRole);
  // 与后端规则一致：群主不可移除；管理员不能移除其他管理员
  const canRemoveMember =
    !!member &&
    member.roleLevel !== 'owner' &&
    (isOwnerRole || member.roleLevel === 'member');

  const openRoleSheet = () => {
    if (!member) return;
    setEditRole(member.role || '');
    setRoleSheetOpen(true);
  };

  const updateDisplayRole = async () => {
    if (!classId || !member) return;
    const role = editRole.trim();
    if (!role) {
      toast.error('请输入身份名称');
      return;
    }
    setActionLoading(true);
    try {
      await api.post(`/classes/${classId}/members/${member.userId}/display-role`, { role });
      toast.success('身份已更新');
      setRoleSheetOpen(false);
      await fetchMember();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败，请稍后重试');
    } finally {
      setActionLoading(false);
    }
  };

  const openProfileSheet = () => {
    if (!member) return;
    setEditName(member.name || '');
    setEditStudentId(member.studentId || '');
    setProfileSheetOpen(true);
  };

  const verifyMember = async () => {
    if (!classId || !member) return;
    setActionLoading(true);
    try {
      await api.post(`/classes/${classId}/members/${member.userId}/verify`, {
        status: 'CONFIRMED',
      });
      toast.success('已确认该成员身份');
      await fetchMember();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '确认失败，请稍后重试');
    } finally {
      setActionLoading(false);
    }
  };

  const updateMemberProfile = async () => {
    if (!classId || !member) return;
    const realName = editName.trim();
    const studentId = editStudentId.trim();
    if (!realName && !studentId) {
      toast.error('请至少填写真实姓名或学号');
      return;
    }
    setActionLoading(true);
    try {
      await api.post(`/classes/${classId}/members/${member.userId}/profile`, {
        ...(realName ? { realName } : {}),
        ...(studentId ? { studentId } : {}),
      });
      toast.success('成员信息已更新');
      setProfileSheetOpen(false);
      await fetchMember();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败，请稍后重试');
    } finally {
      setActionLoading(false);
    }
  };

  const fetchMember = async () => {
    if (!classId || !memberId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/classes/${classId}/members/${memberId}`);
      setMember(res.data?.data || res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '获取成员信息失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMember();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, memberId]);

  const setRoleLevel = async (roleLevel: 'admin' | 'member') => {
    if (!classId || !member) return;
    setActionLoading(true);
    try {
      await api.post(`/classes/${classId}/members/${member.userId}/role-level`, {
        roleLevel,
        role: roleLevel === 'admin' ? '管理员' : undefined,
      });
      toast.success(roleLevel === 'admin' ? '已设为管理员' : '已取消管理员');
      await fetchMember();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!classId || !member) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/classes/${classId}/members/${member.userId}/reset-password`);
      const data = res.data?.data;
      setResetResult({
        name: data?.name || member.name,
        phone: data?.phone || null,
        tempPassword: data?.tempPassword || '',
      });
      setConfirmAction(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '重置密码失败');
    } finally {
      setActionLoading(false);
    }
  };

  const transferOwner = async () => {
    if (!classId || !member) return;
    setActionLoading(true);
    try {
      await api.post(`/classes/${classId}/transfer-owner`, { userId: member.userId });
      toast.success('群主转让成功');
      setConfirmAction(null);
      window.dispatchEvent(new Event('orgChanged'));
      navigate(-1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '转让失败');
    } finally {
      setActionLoading(false);
    }
  };

  const removeMember = async () => {
    if (!classId || !member) return;
    setActionLoading(true);
    try {
      await api.delete(`/classes/${classId}/members/${member.id}`);
      toast.success(`已将 ${member.name} 移出班级`);
      setConfirmAction(null);
      navigate('/member-list', { replace: true, state: { refreshKey: Date.now() } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '移除成员失败');
    } finally {
      setActionLoading(false);
    }
  };

  const copyResetResult = async () => {
    if (!resetResult) return;
    const text = `${resetResult.name} 的临时密码：${resetResult.tempPassword}${
      resetResult.phone ? `（登录手机号 ${resetResult.phone}）` : ''
    }`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('已复制');
    } catch {
      toast.error('复制失败，请手动记录');
    }
  };

  const badgeClass: Record<string, string> = {
    owner: 'bg-[#0062FF] text-white',
    admin: 'bg-[#10B981] text-white',
    member: 'bg-[#F3F4F6] text-[#4B5563]',
  };

  return (
    <PhoneFrame reserveSafeAreaTop safeAreaTopClassName="bg-[#F7F8FA]">
      <StatusBar />

      <div className="box-border w-full flex-1 flex flex-col gap-4 px-5 pb-6 bg-[#F7F8FA]">
        <div className="w-full h-2 shrink-0" />

        <div className="flex w-full flex-row items-center gap-0">
          <BackButton className="-ml-2" />
          <div className="text-[20px]/[normal] text-[#1A1A1A] font-heading font-bold">成员详情</div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            <div className="h-[200px] w-full animate-pulse rounded-2xl bg-white shadow-soft" />
            <div className="h-[180px] w-full animate-pulse rounded-2xl bg-white shadow-soft" />
          </div>
        ) : !member ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EBF3FF]">
              <Users className="h-8 w-8 text-[#0062FF]" strokeWidth={1.5} />
            </div>
            <div className="text-[14px] font-body text-[#4B5563]">
              {memberId ? '成员信息加载失败' : '未选择成员'}
            </div>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-lg bg-[#0062FF] px-5 py-2.5 text-[13px] font-body font-semibold text-white active:opacity-80"
            >
              返回成员列表
            </button>
          </div>
        ) : (
          <>
            {/* 名片 */}
            <div className="flex w-full flex-col items-center gap-3 rounded-2xl bg-white px-5 py-6 shadow-soft">
              <div
                className="flex h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-full ring-4 ring-[#F3F4F6]"
                style={{ backgroundColor: member.avatar ? '#F3F4F6' : avatarColor(member.name) }}
              >
                {member.avatar ? (
                  <img src={member.avatar} alt={member.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[28px] font-heading font-bold text-white">{member.name.charAt(0)}</span>
                )}
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="flex flex-row items-center gap-2">
                  <span className="text-[21px] font-heading font-bold text-[#1A1A1A]">{member.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-body font-medium ${badgeClass[member.roleLevel]}`}>
                    {ROLE_LABEL[member.roleLevel]}
                  </span>
                </div>
                <div className="flex flex-row items-center gap-1.5 text-[12px] font-body text-[#6B7280]">
                  <UserRound className="h-3.5 w-3.5" strokeWidth={2} />
                  {member.role || '班级成员'}
                  {member.isCommittee && <span className="rounded bg-[#FFF7ED] px-1.5 py-0.5 text-[10px] font-medium text-[#C2410C]">班委</span>}
                  {member.userId === user?.id && <span className="text-[#0062FF]">（我）</span>}
                </div>
              </div>
            </div>

            {/* 基本信息 */}
            <div className="flex w-full flex-col rounded-2xl bg-white px-4 py-1 shadow-soft">
              {[
                { icon: Users, label: '所属班级', value: user?.className || '—' },
                { icon: CalendarDays, label: '加入时间', value: formatDate(member.joinedAt) },
                { icon: UserRound, label: '学号', value: member.studentId || '未公开/未填写' },
                {
                  icon: Shield,
                  label: '身份核实',
                  value: member.verifyStatus ? VERIFY_STATUS_TEXT[member.verifyStatus] : '—',
                },
                {
                  icon: member.roleLevel === 'member' ? Shield : ShieldOff,
                  label: '成员身份',
                  value: member.isCommittee ? '班委成员' : '普通成员',
                },
              ].map((row, idx, arr) => {
                const Icon = row.icon;
                return (
                  <div
                    key={row.label}
                    className={`flex flex-row items-center gap-3 py-3 ${idx < arr.length - 1 ? 'border-b border-[#F3F4F6]' : ''}`}
                  >
                    <Icon className="h-[17px] w-[17px] shrink-0 text-[#9CA3AF]" strokeWidth={2} />
                    <span className="text-[13px] font-body text-[#6B7280]">{row.label}</span>
                    <span className="ml-auto truncate text-[13px] font-body font-medium text-[#1A1A1A]">{row.value}</span>
                  </div>
                );
              })}
            </div>

            {/* 身份设置：显示身份不影响权限，群主可改自己 */}
            {canEditRole && (
              <div className="flex w-full flex-col rounded-2xl bg-white p-4 shadow-soft">
                <div className="mb-2 text-[14px] font-heading font-semibold text-[#1A1A1A]">身份设置</div>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={openRoleSheet}
                  className="flex w-full flex-row items-center gap-3 rounded-xl px-1 py-3 text-left active:bg-[#F8FAFC] disabled:opacity-60"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EBF3FF]">
                    <UserRound className="h-[18px] w-[18px] text-[#0062FF]" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-body font-medium text-[#1A1A1A]">
                      修改身份
                    </div>
                    <div className="text-[11px] font-body text-[#9CA3AF]">
                      当前身份：{member.role || '未设置'}，如班长、团支书、学习委员
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* 管理操作 */}
            {canManage && member.roleLevel !== 'owner' && member.userId !== user?.id && (
              <div className="flex w-full flex-col rounded-2xl bg-white p-4 shadow-soft">
                <div className="mb-2 text-[14px] font-heading font-semibold text-[#1A1A1A]">成员管理</div>
                {isOwnerRole && (
                  <>
                    {member.roleLevel === 'member' ? (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => setRoleLevel('admin')}
                        className="flex w-full flex-row items-center gap-3 rounded-xl px-1 py-3 text-left active:bg-[#F8FAFC] disabled:opacity-60"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EBF3FF]">
                          <Shield className="h-[18px] w-[18px] text-[#0062FF]" strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-body font-medium text-[#1A1A1A]">设为管理员</div>
                          <div className="text-[11px] font-body text-[#9CA3AF]">可协助管理班级成员与考勤</div>
                        </div>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => setRoleLevel('member')}
                        className="flex w-full flex-row items-center gap-3 rounded-xl px-1 py-3 text-left active:bg-[#F8FAFC] disabled:opacity-60"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3F4F6]">
                          <ShieldOff className="h-[18px] w-[18px] text-[#6B7280]" strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-body font-medium text-[#1A1A1A]">取消管理员</div>
                          <div className="text-[11px] font-body text-[#9CA3AF]">恢复为普通成员权限</div>
                        </div>
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => setConfirmAction('transfer')}
                      className="flex w-full flex-row items-center gap-3 rounded-xl px-1 py-3 text-left active:bg-[#F8FAFC] disabled:opacity-60"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF7ED]">
                        <Crown className="h-[18px] w-[18px] text-[#F59E0B]" strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-body font-medium text-[#1A1A1A]">转让群主</div>
                        <div className="text-[11px] font-body text-[#9CA3AF]">转让后你将变为管理员</div>
                      </div>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={verifyMember}
                  className="flex w-full flex-row items-center gap-3 rounded-xl px-1 py-3 text-left active:bg-[#F8FAFC] disabled:opacity-60"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ECFDF5]">
                    <Shield className="h-[18px] w-[18px] text-[#10B981]" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-body font-medium text-[#1A1A1A]">
                      {member.verifyStatus === 'CONFIRMED' ? '身份已确认' : '确认成员身份'}
                    </div>
                    <div className="text-[11px] font-body text-[#9CA3AF]">
                      {member.verifyStatus === 'CONFIRMED'
                        ? '该成员信息已核对无误'
                        : '核对无误后标记为已确认'}
                    </div>
                  </div>
                </button>
                {member.isPlaceholder && (
                  <>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={openProfileSheet}
                      className="flex w-full flex-row items-center gap-3 rounded-xl px-1 py-3 text-left active:bg-[#F8FAFC] disabled:opacity-60"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EBF3FF]">
                        <Pencil className="h-[18px] w-[18px] text-[#0062FF]" strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-body font-medium text-[#1A1A1A]">修正姓名与学号</div>
                        <div className="text-[11px] font-body text-[#9CA3AF]">仅未激活的名单成员可由班委代为修正</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => setConfirmAction('reset')}
                      className="flex w-full flex-row items-center gap-3 rounded-xl px-1 py-3 text-left active:bg-[#F8FAFC] disabled:opacity-60"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3F4F6]">
                        <KeyRound className="h-[18px] w-[18px] text-[#6B7280]" strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-body font-medium text-[#1A1A1A]">生成临时密码</div>
                        <div className="text-[11px] font-body text-[#9CA3AF]">仅未激活的名单成员可生成，一次性显示</div>
                      </div>
                    </button>
                  </>
                )}
                {canRemoveMember && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => setConfirmAction('remove')}
                    className="flex w-full flex-row items-center gap-3 rounded-xl px-1 py-3 text-left active:bg-[#F8FAFC] disabled:opacity-60"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FEF2F2]">
                      <UserMinus className="h-[18px] w-[18px] text-[#DC2626]" strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-body font-medium text-[#DC2626]">移出班级</div>
                      <div className="text-[11px] font-body text-[#9CA3AF]">移除后该成员将无法访问班级内容</div>
                    </div>
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmAction === 'remove'}
        title={`确认将 ${member?.name ?? ''} 移出班级？`}
        description="移除后该成员将立即失去该班级的通知、作业、资料和考勤访问权限，如需重新加入需使用班级码。"
        confirmText="确认移除"
        danger
        loading={actionLoading}
        onCancel={() => {
          if (!actionLoading) setConfirmAction(null);
        }}
        onConfirm={removeMember}
      />

      <ConfirmDialog
        open={confirmAction === 'transfer'}
        title={`确认把群主转让给 ${member?.name ?? ''}？`}
        description="转让后你将成为管理员，仍可协助管理班级；此操作不可撤回。"
        confirmText="确认转让"
        danger
        loading={actionLoading}
        onCancel={() => {
          if (!actionLoading) setConfirmAction(null);
        }}
        onConfirm={transferOwner}
      />

      <ConfirmDialog
        open={confirmAction === 'reset'}
        title={`重置${member?.name ?? ''}的登录密码？`}
        description="重置后该成员所有设备会被退出登录，系统将生成一次性临时密码，仅本页显示一次。"
        confirmText="确认重置"
        danger
        loading={actionLoading}
        onCancel={() => {
          if (!actionLoading) setConfirmAction(null);
        }}
        onConfirm={resetPassword}
      />

      {profileSheetOpen && (
        <BottomSheet
          open
          onClose={() => {
            if (!actionLoading) setProfileSheetOpen(false);
          }}
          title="修正成员信息"
          maxHeight="70vh"
          locked={actionLoading}
          footer={
            <div className="flex w-full flex-row gap-3">
              <button
                type="button"
                onClick={() => setProfileSheetOpen(false)}
                className="h-[48px] flex-1 rounded-[14px] bg-[#F2F5F9] font-body text-[15px]/[normal] font-semibold text-[#475569] active:opacity-80"
              >
                取消
              </button>
              <button
                type="button"
                onClick={updateMemberProfile}
                disabled={actionLoading}
                className="h-[48px] flex-1 rounded-[14px] bg-[#0062FF] font-body text-[15px]/[normal] font-semibold text-white active:opacity-90 disabled:opacity-50"
              >
                {actionLoading ? '保存中...' : '保存'}
              </button>
            </div>
          }
        >
          <div className="box-border flex w-full flex-col gap-3 px-5 pb-2">
            <input
              type="text"
              maxLength={50}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="真实姓名"
              className="box-border h-[48px] w-full rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] px-4 text-[14px] font-body text-[#1A1A1A] outline-none placeholder:text-[#9CA3AF] focus:border-[#0062FF]"
            />
            <input
              type="text"
              maxLength={30}
              value={editStudentId}
              onChange={(e) => setEditStudentId(e.target.value)}
              placeholder="学号"
              className="box-border h-[48px] w-full rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] px-4 text-[14px] font-body text-[#1A1A1A] outline-none placeholder:text-[#9CA3AF] focus:border-[#0062FF]"
            />
            <div className="text-[11px]/[1.6] font-body text-[#9CA3AF]">
              保存后将以修改后的姓名和学号为准，并把该成员标记为「已确认」。
            </div>
          </div>
        </BottomSheet>
      )}

      {roleSheetOpen && (
        <BottomSheet
          open
          onClose={() => {
            if (!actionLoading) setRoleSheetOpen(false);
          }}
          title="修改身份"
          maxHeight="70vh"
          locked={actionLoading}
          footer={
            <div className="flex w-full flex-row gap-3">
              <button
                type="button"
                onClick={() => setRoleSheetOpen(false)}
                className="h-[48px] flex-1 rounded-[14px] bg-[#F2F5F9] font-body text-[15px]/[normal] font-semibold text-[#475569] active:opacity-80"
              >
                取消
              </button>
              <button
                type="button"
                onClick={updateDisplayRole}
                disabled={actionLoading}
                className="h-[48px] flex-1 rounded-[14px] bg-[#0062FF] font-body text-[15px]/[normal] font-semibold text-white active:opacity-90 disabled:opacity-50"
              >
                {actionLoading ? '保存中...' : '保存'}
              </button>
            </div>
          }
        >
          <div className="box-border flex w-full flex-col gap-3 px-5 pb-2">
            <input
              type="text"
              maxLength={20}
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              placeholder="如 班长、团支书、学习委员"
              className="box-border h-[48px] w-full rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] px-4 text-[14px] font-body text-[#1A1A1A] outline-none placeholder:text-[#9CA3AF] focus:border-[#0062FF]"
            />
            <div className="text-[11px]/[1.6] font-body text-[#9CA3AF]">
              身份仅用于展示，不改变权限；「群主」「管理员」等权限角色请通过成员管理设置。
            </div>
          </div>
        </BottomSheet>
      )}

      {resetResult && (
        <BottomSheet
          open
          onClose={() => setResetResult(null)}
          title="临时密码已生成"
          maxHeight="80vh"
          footer={
            <div className="flex flex-row gap-3">
              <button
                type="button"
                onClick={copyResetResult}
                className="h-[48px] flex-1 rounded-[14px] bg-[#F2F5F9] font-body text-[15px]/[normal] font-semibold text-[#475569] active:opacity-80"
              >
                复制
              </button>
              <button
                type="button"
                onClick={() => setResetResult(null)}
                className="h-[48px] flex-1 rounded-[14px] bg-[linear-gradient(180deg,#2E7DFF_0%,#0062FF_100%)] font-body text-[15px]/[normal] font-semibold text-white shadow-[0_10px_20px_rgba(0,98,255,0.24)] active:opacity-90"
              >
                我已记录
              </button>
            </div>
          }
        >
          <div className="box-border flex w-full flex-col gap-3 px-5 pb-2">
            <div className="text-center text-[13px]/[1.6] font-body font-normal text-[#6B7280]">
              {resetResult.name}
              {resetResult.phone ? `（${resetResult.phone}）` : ''}
              请用下方临时密码登录，登录后立即修改密码。
            </div>
            <div className="select-all rounded-lg bg-[#F3F4F6] py-3 text-center text-[22px]/[normal] font-data font-bold tracking-[4px] text-[#1A1A1A]">
              {resetResult.tempPassword}
            </div>
            <div className="text-center text-[12px]/[normal] font-caption font-normal text-[#DC2626]">
              关闭后无法再次查看，请先复制或记录
            </div>
          </div>
        </BottomSheet>
      )}
    </PhoneFrame>
  );
}
