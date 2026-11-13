import PhoneFrame from '@/components/layout/PhoneFrame';
import StatusBar from '@/components/layout/StatusBar';
import BottomSheet from '@/components/ui/BottomSheet';
import { isNative } from '@/lib/capacitor';
import { useStatusBarStyle } from '@/hooks/useStatusBarStyle';
import { useCurrentUser, setCurrentOrg, getCurrentOrgId, type MyOrgItem } from '@/hooks/useCurrentUser';
import { getOrgTypeMeta } from '@/utils/org';
import {
  Archive,
  Bell,
  Camera,
  Check,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Edit3,
  Flag,
  Headphones,
  HelpCircle,
  Image,
  Library,
  LogOut,
  Megaphone,
  Pencil,
  Settings,
  ShieldCheck,
  Star,
  Trophy,
  User,
  Vote,
  Wallet,
} from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/lib/api';

/* ─── 容错：接口返回异常时回退为空数组，避免整页崩溃 ─── */
function toOrgList(res: unknown): MyOrgItem[] {
  const payload = (res as { data?: { data?: unknown } })?.data;
  const list = payload?.data ?? payload;
  return Array.isArray(list) ? list : [];
}

/* ─── 头像渐变色 ─── */
const AVATAR_GRADIENTS = [
  'from-blue-400 to-blue-600',
  'from-emerald-400 to-emerald-600',
  'from-orange-400 to-orange-600',
  'from-purple-400 to-purple-600',
  'from-pink-400 to-pink-600',
  'from-cyan-400 to-cyan-600',
  'from-amber-400 to-amber-600',
  'from-rose-400 to-rose-600',
];

function getAvatarGradient(name: string): string {
  const code = name.charCodeAt(0) || 0;
  return AVATAR_GRADIENTS[code % AVATAR_GRADIENTS.length];
}

/* ─── 成就徽章 ── */
interface Badge {
  icon: ReactNode;
  label: string;
  color: string;
  bg: string;
}

function getBadges(isCommittee: boolean): Badge[] {
  const badges: Badge[] = [
    { icon: <Star className="h-4 w-4" strokeWidth={2} />, label: '活跃成员', color: 'text-[#F59E0B]', bg: 'bg-[#FEF3C7]' },
  ];
  if (isCommittee) {
    badges.push({ icon: <Trophy className="h-4 w-4" strokeWidth={2} />, label: '班委', color: 'text-[#EF4444]', bg: 'bg-[#FEE2E2]' });
  }
  return badges;
}

/* ─── QuickAccess 组件 ─── */
interface QuickAccessProps {
  icon: ReactNode;
  color: string;
  label: string;
  onClick?: () => void;
  loading?: boolean;
  badge?: number;
}

function QuickAccess({ icon, color, label, onClick, loading, badge }: QuickAccessProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="group box-border flex w-[70px] cursor-pointer flex-col items-center justify-start gap-2 disabled:opacity-60"
    >
      <div className="relative shrink-0">
        <div
          className="relative box-border flex h-[42px] w-[42px] items-center justify-center overflow-hidden rounded-xl shadow-icon transition-transform duration-150 active:scale-95"
          style={{ backgroundColor: color }}
        >
          <div className="pointer-events-none absolute left-0 top-0 h-4 w-10 rounded-full bg-white opacity-[0.22]" />
          {loading ? (
            <div className="h-[22px] w-[22px] animate-spin rounded-full border-2 border-t-transparent border-white" />
          ) : (
            <div className="text-white">{icon}</div>
          )}
        </div>
        {badge && badge > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 z-10 flex h-4 min-w-[16px] items-center justify-center rounded-full border border-white bg-[#EF4444] px-1 text-[10px] font-bold leading-none text-white">
            {badge > 99 ? '99+' : badge}
          </span>
        ) : null}
      </div>
      <div className="box-border text-center font-body text-[12px] font-medium text-[#1A1A1A] [white-space:nowrap]">
        {label}
      </div>
    </button>
  );
}

const QUICK_ACCESS_ITEMS: {
  label: string;
  path: string;
  icon: ReactNode;
  color: string;
  todoKey?: 'attendance' | 'homework' | 'activity';
}[] = [
  {
    label: '我的考勤',
    path: '/my-attendance',
    icon: <Clock className="h-[22px] w-[22px]" strokeWidth={2} />,
    color: '#2563EB',
    todoKey: 'attendance' as const,
  },
  {
    label: '我的作业',
    path: '/my-homework',
    icon: <Edit3 className="h-[22px] w-[22px]" strokeWidth={2} />,
    color: '#F97316',
    todoKey: 'homework' as const,
  },
  {
    label: '我的活动',
    path: '/my-activities',
    icon: <Flag className="h-[22px] w-[22px]" strokeWidth={2} />,
    color: '#EF4444',
  },
  {
    label: '我的报名',
    path: '/my-registration',
    icon: <ClipboardCheck className="h-[22px] w-[22px]" strokeWidth={2} />,
    color: '#10B981',
    todoKey: 'activity' as const,
  },
];

const SERVICE_ITEMS = [
  { label: '班费台账', path: '/fee-ledger', icon: <Wallet className="h-[18px] w-[18px]" strokeWidth={2} />, color: '#2563EB', bg: '#EFF6FF' },
  { label: '投票与抽签', path: '/vote-list', icon: <Vote className="h-[18px] w-[18px]" strokeWidth={2} />, color: '#7C3AED', bg: '#F5F3FF' },
  { label: '班级资料库', path: '/material-library', icon: <Library className="h-[18px] w-[18px]" strokeWidth={2} />, color: '#F59E0B', bg: '#FFF7ED' },
  { label: '班级档案', path: '/class-archive', icon: <Archive className="h-[18px] w-[18px]" strokeWidth={2} />, color: '#059669', bg: '#ECFDF5' },
];

/* ─── 最近动态项 ─── */
interface ActivityItem {
  id?: string;
  type: string;
  title: string;
  time: string;
}

const FEED_META: Record<string, { icon: ReactNode; color: string; bg: string; label: string }> = {
  attendance: { icon: <Clock className="h-[18px] w-[18px]" strokeWidth={2} />, color: '#2563EB', bg: '#EFF6FF', label: '考勤' },
  homework: { icon: <Edit3 className="h-[18px] w-[18px]" strokeWidth={2} />, color: '#F97316', bg: '#FFF7ED', label: '作业' },
  activity: { icon: <Flag className="h-[18px] w-[18px]" strokeWidth={2} />, color: '#EF4444', bg: '#FEF2F2', label: '活动' },
  message: { icon: <Megaphone className="h-[18px] w-[18px]" strokeWidth={2} />, color: '#EC4899', bg: '#FDF2F8', label: '通知' },
};

const FEED_ROUTE: Record<string, string> = {
  attendance: '/my-attendance',
  homework: '/my-homework',
  activity: '/my-registration',
  message: '/messages',
};

function ActivityRow({ item, onClick }: { item: ActivityItem; onClick?: () => void }) {
  const meta = FEED_META[item.type] || FEED_META.message;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 py-2.5 text-left transition-colors active:bg-[#F7F9FC]"
    >
      <div
        className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: meta.bg, color: meta.color }}
      >
        {meta.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-[#1F2937]">{item.title}</div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: meta.bg, color: meta.color }}>
            {meta.label}
          </span>
          <span className="text-[11px] text-[#9CA3AF]">{item.time}</span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#CBD5E1]" strokeWidth={2} />
    </button>
  );
}

export default function PersonalCenter() {
  useStatusBarStyle(true); // 深色渐变头部 → 白色状态栏图标
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [navigating, setNavigating] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingField, setEditingField] = useState<'name' | 'avatar' | 'background' | null>(null);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [bio, setBio] = useState('');
  const [editingBio, setEditingBio] = useState(false);

  // 个人概览数据（个人维度，非班级均值）
  const [me, setMe] = useState<{
    attendanceRate: number | null;
    homeworkRate: number | null;
    activityRate: number | null;
    rank: number | null;
    total: number;
  } | null>(null);

  // 待办统计
  const [todo, setTodo] = useState({ total: 0, homework: 0, attendance: 0, activity: 0, message: 0 });

  // 最近动态
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [showAllFeed, setShowAllFeed] = useState(false);

  // 我的组织
  const [myOrgs, setMyOrgs] = useState<MyOrgItem[]>([]);
  const [orgLoading, setOrgLoading] = useState(false);
  const [showOrgSheet, setShowOrgSheet] = useState(false);
  const [showServiceSheet, setShowServiceSheet] = useState(false);
  const [showTodoSheet, setShowTodoSheet] = useState(false);

  const loadMyOrgs = () => {
    setOrgLoading(true);
    api
      .get('/classes/my')
      .then((res) => {
        setMyOrgs(toOrgList(res));
      })
      .catch(() => { /* 静默失败 */ })
      .finally(() => setOrgLoading(false));
  };

  // 切换组织
  const handleSwitchOrg = (org: MyOrgItem) => {
    setShowOrgSheet(false);
    setCurrentOrg(org);
    toast.success(`已切换到 ${org.name}`);
    setTimeout(() => {
      window.location.href = '/home';
    }, 300);
  };

  // 退出组织
  const handleLeaveOrg = async (org: MyOrgItem) => {
    if (!window.confirm(`确定要退出「${org.name}」吗？`)) return;
    try {
      await api.post(`/classes/${org.id}/leave`);
      toast.success('已退出组织');
      const currentId = getCurrentOrgId();
      if (org.id === currentId) {
        // 退出的是当前组织：刷新列表后自动切到剩余首个
        const res = await api.get('/classes/my');
        const remaining: MyOrgItem[] = toOrgList(res);
        setMyOrgs(remaining);
        if (remaining.length > 0) {
          setCurrentOrg(remaining[0]);
          toast.success(`已切换到 ${remaining[0].name}`);
          setTimeout(() => navigate('/home'), 300);
        } else {
          localStorage.removeItem('currentOrgId');
          navigate('/join-class');
        }
      } else {
        loadMyOrgs();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '退出组织失败');
    }
  };

  // 同步 bio 状态
  useEffect(() => {
    setBio(user?.bio ?? '');
  }, [user?.bio]);

  // 加载个人概览（使用 memberRanking.me，而非班级均值）
  useEffect(() => {
    const orgId = getCurrentOrgId() || user?.classId;
    if (!orgId) return;
    api
      .get('/data/dashboard', { params: { classId: orgId } })
      .then((res) => {
        const d = res.data.data || res.data;
        const mine = d.memberRanking?.me;
        if (!mine) {
          setMe(null);
          return;
        }
        setMe({
          attendanceRate: mine.attendanceRate ?? null,
          homeworkRate: mine.homeworkRate ?? null,
          activityRate: mine.activityRate ?? null,
          rank: mine.rank ?? null,
          total: d.memberRanking?.total ?? 0,
        });
      })
      .catch(() => setMe(null));
  }, [user?.classId]);

  // 加载当前组织待办
  useEffect(() => {
    const orgId = getCurrentOrgId() || user?.classId;
    if (!orgId) return;
    api
      .get('/classes/orgs/todos')
      .then((res) => {
        const d = res.data.data || res.data;
        const list: { orgId: string; todos?: { type: string }[] }[] = Array.isArray(d) ? d : [];
        const cur = list.find((item) => item.orgId === orgId);
        const items: { type: string }[] = cur?.todos || [];
        const count = (type: string) => items.filter((item) => item.type === type).length;
        setTodo({
          total: items.length,
          homework: count('homework'),
          attendance: count('attendance'),
          activity: count('activity'),
          message: count('message_ack'),
        });
      })
      .catch(() => setTodo({ total: 0, homework: 0, attendance: 0, activity: 0, message: 0 }));
  }, [user?.classId]);

  // 加载最近动态（按当前组织）
  useEffect(() => {
    const orgId = getCurrentOrgId() || user?.classId;
    if (!orgId) return;
    api
      .get('/settings/recent-activities', { params: { classId: orgId } })
      .then((res) => {
        const d = res.data.data || res.data;
        setRecentActivities(d.list || []);
      })
      .catch(() => { /* 静默失败 */ });
  }, [user?.classId]);

  // 加载我的组织
  useEffect(() => {
    loadMyOrgs();
  }, []);

  // ESC 关闭弹窗
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowEditModal(false);
        setEditingField(null);
        setEditingBio(false);
      }
    };
    if (showEditModal) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showEditModal]);

  const displayName = user?.name ?? '未登录';
  const displayRole = user?.role ?? '学生';
  const displayClassName = user?.className ?? '未加入班级';
  const displayStudentId = user?.studentId ?? '未设置';
  const displayAvatar = user?.avatar;
  const displayBackgroundImage = user?.backgroundImage;

  const currentOrg = myOrgs.find((org) => org.id === getCurrentOrgId()) || myOrgs[0];

  const formatRate = (value: number | null | undefined) =>
    value === null || value === undefined ? '--' : `${value}`;

  const badges = getBadges(user?.isCommittee ?? false);

  // 展开高度
  const expandedHeight = isExpanded ? 'h-[350px]' : 'h-[240px]';

  const handleQuickAccess = (path: string, label: string) => {
    if (navigating) return;
    setNavigating(label);
    requestAnimationFrame(() => {
      navigate(path);
      setTimeout(() => setNavigating(null), 300);
    });
  };

  // 待办分类入口（仅展示有数量的类型）
  const todoActions = [
    { show: todo.homework > 0, label: `作业 ${todo.homework} 项`, path: '/my-homework' },
    { show: todo.attendance > 0, label: `考勤 ${todo.attendance} 项`, path: '/my-attendance' },
    { show: todo.activity > 0, label: `活动 ${todo.activity} 项`, path: '/my-registration' },
    { show: todo.message > 0, label: `通知 ${todo.message} 条`, path: '/messages' },
  ].filter((item) => item.show);

  const handleTodoNavigate = (path: string) => {
    setShowTodoSheet(false);
    navigate(path);
  };

  const handleServiceNavigate = (path: string) => {
    setShowServiceSheet(false);
    navigate(path);
  };

  const settingRows = [
    {
      key: 'profile',
      label: '个人资料',
      value: `学号 ${displayStudentId}`,
      icon: <User className="h-[18px] w-[18px]" strokeWidth={2} />,
      color: '#2563EB',
      bg: '#EBF3FF',
      onTap: () => {
        setEditingField(null);
        setShowEditModal(true);
      },
    },
    {
      key: 'security',
      label: '账号与安全',
      value: '密码 · 手机 · 隐私',
      icon: <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={2} />,
      color: '#0284C7',
      bg: '#F0F9FF',
      onTap: () => navigate('/account-security'),
    },
    {
      key: 'notification',
      label: '通知与提醒',
      value: '消息 · 再次提醒',
      icon: <Bell className="h-[18px] w-[18px]" strokeWidth={2} />,
      color: '#F59E0B',
      bg: '#FFF7ED',
      onTap: () => navigate('/notification-settings'),
    },
    {
      key: 'help',
      label: '帮助与关于',
      value: '帮助反馈 · 版本',
      icon: <HelpCircle className="h-[18px] w-[18px]" strokeWidth={2} />,
      color: '#64748B',
      bg: '#F1F5F9',
      onTap: () => navigate('/help-feedback'),
    },
  ];

  const handleEditName = () => {
    setEditingField('name');
    setNewName(displayName);
  };

  const handleSaveName = async () => {
    if (!newName.trim() || newName.length < 2) {
      toast.error('姓名至少需要2个字符');
      return;
    }
    setSaving(true);
    try {
      await api.put('/settings/profile', { name: newName.trim() });
      toast.success('姓名修改成功');
      setShowEditModal(false);
      setEditingField(null);
      window.location.reload();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || '修改失败');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('请选择图片文件'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('图片大小不能超过5MB'); return; }

    setSaving(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        await api.put('/settings/profile', { avatar: base64 });
        toast.success('头像修改成功');
        setShowEditModal(false);
        setEditingField(null);
        window.location.reload();
      } catch (error: any) {
        toast.error(error?.response?.data?.message || '修改失败');
        setSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('请选择图片文件'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('图片大小不能超过5MB'); return; }

    setSaving(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        await api.put('/settings/profile', { backgroundImage: base64 });
        toast.success('背景图修改成功');
        setShowEditModal(false);
        setEditingField(null);
        window.location.reload();
      } catch (error: any) {
        toast.error(error?.response?.data?.message || '修改失败');
        setSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBio = async () => {
    try {
      await api.put('/settings/profile', { bio: bio.trim() });
      toast.success('简介修改成功');
      setEditingBio(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || '修改失败');
    }
  };

  return (
    <PhoneFrame>
      <div className="flex min-h-full w-full flex-col bg-white">
        {/* 顶部背景图区域 - 可展开 */}
        <div
          data-pencil-name="Header"
          className={`relative flex w-full shrink-0 flex-col bg-gradient-a transition-all duration-500 ease-in-out ${expandedHeight}`}
          style={displayBackgroundImage ? { backgroundImage: `url(${displayBackgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
          onClick={() => {
            setIsExpanded(!isExpanded);
            if (isExpanded) setEditingBio(false);
          }}
        >
          <StatusBar light />
          <div className="relative flex flex-1 flex-col px-5" style={{ paddingTop: isNative ? 'calc(var(--safe-top, env(safe-area-inset-top, 0px)) + 12px)' : '0px' }}>
            {/* 顶部按钮区 */}
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/settings');
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-black backdrop-blur-sm transition-opacity active:opacity-70"
                aria-label="设置"
              >
                <Settings className="h-[18px] w-[18px]" strokeWidth={2} />
              </button>
            </div>

            {/* 头像和信息区域 - 展开时上移 */}
            <div className={`flex flex-1 items-center gap-4 transition-all duration-500 ease-in-out ${isExpanded ? '-mt-16' : '-mt-1'}`}>
              {/* 头像 */}
              <div className="relative">
                <div className="box-border flex h-[80px] w-[80px] shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white shadow-lg">
                  {displayAvatar ? (
                    <img src={displayAvatar} alt="头像" className="h-full w-full object-cover" />
                  ) : (
                    <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${getAvatarGradient(displayName)} text-[28px] font-bold text-white`}>
                      {displayName.charAt(0)}
                    </div>
                  )}
                </div>
                {/* 相机图标 */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingField('avatar');
                    setShowEditModal(true);
                  }}
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white shadow-md transition-opacity active:opacity-70"
                  aria-label="更换头像"
                >
                  <Camera className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>

              {/* 名字和班级信息 */}
              <div className="flex flex-1 flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-heading text-[20px] font-bold text-white drop-shadow-md truncate">
                    {displayName}
                  </div>
                  <div className="box-border flex h-[22px] shrink-0 items-center justify-center rounded-full bg-white/20 px-2 backdrop-blur-sm">
                    <div className="text-[10px] font-semibold text-white">{displayRole}</div>
                  </div>
                  {/* 编辑资料按钮 */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEditModal(true);
                    }}
                    className="flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm transition-opacity active:opacity-70"
                  >
                    <Edit3 className="h-3 w-3" strokeWidth={2} />
                    <span>编辑</span>
                  </button>
                </div>
                <div className="font-body text-[14px] font-normal text-white/90 drop-shadow-sm truncate">
                  {displayClassName}
                </div>
              </div>
            </div>
          </div>

          {/* 展开时显示的内容 - 始终渲染，用 opacity 控制过渡 */}
          <div
            className={`pointer-events-none absolute bottom-0 left-0 h-32 w-full bg-gradient-to-t from-white/60 via-white/30 to-transparent transition-opacity duration-500 ease-in-out ${isExpanded ? 'opacity-100' : 'opacity-0'}`}
          />

          {/* 成就徽章 */}
          <div
            className={`absolute bottom-20 left-5 right-5 flex flex-wrap gap-2 transition-all duration-500 ease-in-out ${isExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'}`}
          >
            {badges.map((badge) => (
              <div
                key={badge.label}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${badge.bg}`}
              >
                <span className={badge.color}>{badge.icon}</span>
                <span className={`text-[11px] font-medium ${badge.color}`}>{badge.label}</span>
              </div>
            ))}
          </div>

          {/* 个人简介 */}
          <div
            className={`absolute bottom-8 left-5 right-5 transition-all duration-500 ease-in-out ${isExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'}`}
          >
            {editingBio ? (
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="写一句个人简介..."
                  className="flex-1 rounded-lg bg-white/90 px-3 py-1.5 text-[13px] text-[#1A1A1A] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0062FF]/30"
                  maxLength={50}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleSaveBio(); }}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0062FF] text-white active:opacity-70"
                >
                  <Check className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
            ) : (
              <div
                className="flex items-center gap-2"
                onClick={(e) => { e.stopPropagation(); setEditingBio(true); }}
              >
                <div className="text-[13px] text-white/80 truncate flex-1 drop-shadow-sm">
                  {bio || '点击添加个人简介...'}
                </div>
                <Pencil className="h-3.5 w-3.5 text-white/60 shrink-0" strokeWidth={2} />
              </div>
            )}
          </div>
        </div>

        {/* 内容卡片区 - 圆弧角设计 */}
        <div
          data-pencil-name="Content Card"
          className="relative z-10 flex w-full flex-1 flex-col gap-[10px] rounded-t-[20px] bg-[#F9FAFB] px-5 -mt-4 pt-4 pb-5 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]"
        >
          {/* 1 我的概览：个人数据 + 待办 + 排名 */}
          <div className="box-border flex w-full flex-col rounded-xl bg-white p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] font-bold text-[#1F2937]">我的概览</span>
                <span className="text-[11px] text-[#9CA3AF]">近 30 天 · {displayClassName}</span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/data-dashboard')}
                className="flex shrink-0 items-center gap-0.5 pt-0.5 text-[11px] font-semibold text-[#0062FF]"
              >
                <span>{me?.rank ? `班级第 ${me.rank} 名` : '暂无排名'}</span>
                <ChevronRight className="h-3 w-3" strokeWidth={2} />
              </button>
            </div>

            <div className="mt-4 flex w-full">
              {[
                { label: '出勤率', value: me?.attendanceRate },
                { label: '作业完成', value: me?.homeworkRate },
                { label: '活动参与', value: me?.activityRate },
              ].map((item, idx) => (
                <div
                  key={item.label}
                  className={`flex flex-1 flex-col gap-1 ${idx > 0 ? 'border-l border-[#F3F4F6] pl-3' : ''}`}
                >
                  <span className="text-[10px] text-[#9CA3AF]">{item.label}</span>
                  <div className="flex items-baseline">
                    <span className="text-[22px] font-bold leading-none text-[#1F2937]">
                      {formatRate(item.value)}
                    </span>
                    {item.value !== null && item.value !== undefined ? (
                      <span className="ml-0.5 text-[11px] font-semibold text-[#9CA3AF]">%</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                if (todo.total > 0) setShowTodoSheet(true);
              }}
              className={`mt-3 flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-left ${todo.total > 0 ? 'bg-[#FFF7ED]' : 'bg-[#F8FAFC]'}`}
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${todo.total > 0 ? 'bg-[#F59E0B]' : 'bg-[#CBD5E1]'}`} />
              <span className={`flex-1 truncate text-[11px] font-medium ${todo.total > 0 ? 'text-[#9A3412]' : 'text-[#64748B]'}`}>
                {todo.total > 0
                  ? `${todo.total} 项待处理 · 作业 ${todo.homework} · 考勤 ${todo.attendance}`
                  : '当前没有待处理事项'}
              </span>
              {todo.total > 0 ? (
                <span className="shrink-0 text-[11px] font-bold text-[#B45309]">去处理</span>
              ) : null}
            </button>
          </div>

          {/* 2 快捷入口 + 全部服务 */}
          <div className="box-border flex w-full flex-col rounded-xl bg-white p-4 shadow-soft">
            <div className="grid w-full grid-cols-4 gap-y-4">
              {QUICK_ACCESS_ITEMS.map((item) => (
                <QuickAccess
                  key={item.path}
                  icon={item.icon}
                  color={item.color}
                  label={item.label}
                  onClick={() => handleQuickAccess(item.path, item.label)}
                  loading={navigating === item.label}
                  badge={item.todoKey ? todo[item.todoKey] : 0}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowServiceSheet(true)}
              className="mt-3 flex w-full items-center gap-2 border-t border-[#F3F4F6] pt-3 text-left"
            >
              <span className="shrink-0 text-[11px] font-semibold text-[#475569]">全部服务</span>
              <span className="min-w-0 flex-1 truncate text-[10px] text-[#9CA3AF]">
                班费 · 投票抽签 · 资料库 · 班级档案
              </span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#CBD5E1]" strokeWidth={2} />
            </button>
          </div>

          {/* 3 我的组织：仅当前组织一行 */}
          <div className="box-border flex w-full flex-col rounded-xl bg-white px-4 shadow-soft">
            <div className="flex items-center gap-3 py-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: getOrgTypeMeta(currentOrg?.orgType).color }}
              >
                {(() => {
                  const meta = getOrgTypeMeta(currentOrg?.orgType);
                  const OrgIcon = meta.Icon;
                  return <OrgIcon className="h-4 w-4 text-white" strokeWidth={2} />;
                })()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13px] font-semibold text-[#1F2937]">
                    {currentOrg?.name || displayClassName}
                  </span>
                  <span className="shrink-0 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                    当前
                  </span>
                </div>
                <div className="mt-0.5 truncate text-[11px] text-[#9CA3AF]">
                  {currentOrg?.role || displayRole} · {currentOrg?.memberCount ?? 0} 人
                  {myOrgs.length > 1 ? ` · 另有 ${myOrgs.length - 1} 个组织` : ''}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOrgSheet(true)}
                className="shrink-0 rounded-lg border border-[#DBE7FF] px-2.5 py-1 text-[11px] font-semibold text-[#0062FF]"
              >
                切换
              </button>
            </div>
          </div>

          {/* 4 帮助与反馈：显眼入口 */}
          <button
            type="button"
            onClick={() => navigate('/help-feedback')}
            className="box-border flex w-full items-center gap-3 rounded-xl border border-[#D8E6FF] bg-gradient-to-br from-white to-[#EEF5FF] px-4 py-3 text-left shadow-soft active:scale-[0.99]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-[#4C93FF] to-[#0062FF] shadow-[0_6px_12px_-5px_rgba(0,98,255,0.65)]">
              <Headphones className="h-5 w-5 text-white" strokeWidth={2} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[13px] font-bold text-[#0B3B8F]">帮助与反馈</span>
              <span className="mt-0.5 truncate text-[10.5px] text-[#5B7BB0]">
                问题反馈 · 使用指南 · 常见问题
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-[#93B4E8]" strokeWidth={2} />
          </button>

          {/* 5 最近动态：2 条 + 全部 */}
          <div className="box-border flex w-full flex-col rounded-xl bg-white px-4 py-3 shadow-soft">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-[#1F2937]">最近动态</span>
              {recentActivities.length > 2 ? (
                <button
                  type="button"
                  onClick={() => setShowAllFeed((v) => !v)}
                  className="flex items-center gap-0.5 text-[11px] font-semibold text-[#0062FF]"
                >
                  {showAllFeed ? '收起' : '全部'}
                  <ChevronRight className="h-3 w-3" strokeWidth={2} />
                </button>
              ) : null}
            </div>
            {recentActivities.length === 0 ? (
              <div className="py-5 text-center text-[12px] text-[#9CA3AF]">暂无动态</div>
            ) : (
              <div className="divide-y divide-[#F3F4F6]">
                {(showAllFeed ? recentActivities : recentActivities.slice(0, 2)).map((item, idx) => (
                  <ActivityRow
                    key={item.id || idx}
                    item={item}
                    onClick={() => navigate(FEED_ROUTE[item.type] || '/messages')}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 6 设置与服务 */}
          <div className="box-border flex w-full flex-col rounded-xl bg-white px-4 shadow-soft">
            {settingRows.map((row, idx) => (
              <button
                key={row.key}
                type="button"
                onClick={row.onTap}
                className={`flex w-full items-center gap-3 py-3 text-left ${idx !== settingRows.length - 1 ? 'border-b border-[#F3F4F6]' : ''}`}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: row.bg, color: row.color }}
                >
                  {row.icon}
                </span>
                <span className="shrink-0 text-[13px] text-[#1F2937]">{row.label}</span>
                <span className="min-w-0 flex-1 truncate text-right text-[10px] text-[#9CA3AF]">
                  {row.value}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#CBD5E1]" strokeWidth={2} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 待办明细 */}
      <BottomSheet open={showTodoSheet} onClose={() => setShowTodoSheet(false)} title="待处理事项">
        <div className="flex flex-col px-5 pb-3">
          {todoActions.map((action) => (
            <button
              key={action.path}
              type="button"
              onClick={() => handleTodoNavigate(action.path)}
              className="flex items-center justify-between border-b border-[#F3F4F6] py-3.5 text-left last:border-0"
            >
              <span className="text-[14px] text-[#1F2937]">{action.label}</span>
              <ChevronRight className="h-4 w-4 text-[#9CA3AF]" strokeWidth={2} />
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* 全部服务 */}
      <BottomSheet open={showServiceSheet} onClose={() => setShowServiceSheet(false)} title="全部服务">
        <div className="grid grid-cols-4 gap-y-5 px-5 pb-4 pt-1">
          {SERVICE_ITEMS.map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => handleServiceNavigate(item.path)}
              className="flex flex-col items-center gap-2"
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ backgroundColor: item.bg, color: item.color }}
              >
                {item.icon}
              </span>
              <span className="text-[11px] font-medium text-[#1F2937]">{item.label}</span>
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* 组织切换 */}
      <BottomSheet open={showOrgSheet} onClose={() => setShowOrgSheet(false)} title="我的组织">
        <div className="flex flex-col px-5 pb-3">
          {orgLoading ? (
            <div className="py-6 text-center text-[13px] text-[#9CA3AF]">加载中...</div>
          ) : myOrgs.length === 0 ? (
            <div className="py-6 text-center text-[13px] text-[#9CA3AF]">暂无组织</div>
          ) : (
            myOrgs.map((org) => {
              const isCurrent = org.id === getCurrentOrgId();
              return (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => (isCurrent ? setShowOrgSheet(false) : handleSwitchOrg(org))}
                  className="flex items-center gap-3 border-b border-[#F3F4F6] py-3 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-semibold text-[#1F2937]">{org.name}</span>
                      {isCurrent ? (
                        <span className="shrink-0 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                          当前
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#9CA3AF]">
                      {org.role} · {org.memberCount} 人
                    </div>
                  </div>
                  {!isCurrent ? (
                    <span className="shrink-0 text-[12px] font-semibold text-[#0062FF]">切换</span>
                  ) : null}
                </button>
              );
            })
          )}
          {currentOrg ? (
            <button
              type="button"
              onClick={() => {
                setShowOrgSheet(false);
                handleLeaveOrg(currentOrg);
              }}
              className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-[#FEF2F2] py-3 text-[13px] font-semibold text-[#DC2626]"
            >
              <LogOut className="h-4 w-4" strokeWidth={2} />
              退出当前组织
            </button>
          ) : null}
        </div>
      </BottomSheet>

      {/* 编辑弹窗 */}
      <BottomSheet
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingField(null);
        }}
        title="编辑资料"
        footer={
          editingField === 'name' ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setEditingField(null); setShowEditModal(false); }}
                className="h-[48px] flex-1 rounded-[14px] bg-[#F2F5F9] font-body text-[15px]/[normal] font-semibold text-[#475569] active:opacity-80 disabled:opacity-50"
                disabled={saving}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveName}
                className="h-[48px] flex-1 rounded-[14px] bg-[linear-gradient(180deg,#2E7DFF_0%,#0062FF_100%)] font-body text-[15px]/[normal] font-semibold text-white shadow-[0_10px_20px_rgba(0,98,255,0.24)] active:opacity-90 disabled:opacity-50"
                disabled={saving}
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          ) : undefined
        }
      >
        {!editingField && (
          <div className="flex flex-col gap-3 px-5 pb-2">
            <button
              type="button"
              onClick={handleEditName}
              className="flex items-center gap-3 rounded-[14px] border border-[#E5E7EB] p-4 text-left transition-colors active:bg-[#F7F9FC]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#DBEAFE]">
                <Edit3 className="h-5 w-5 text-[#2563EB]" />
              </div>
              <div className="flex-1">
                <div className="text-[14px] font-semibold text-[#1A1A1A]">修改姓名</div>
                <div className="text-[12px] text-[#9CA3AF]">当前: {displayName}</div>
              </div>
              <ChevronRight className="h-5 w-5 text-[#9CA3AF]" />
            </button>

            <label className="flex cursor-pointer items-center gap-3 rounded-[14px] border border-[#E5E7EB] p-4 text-left transition-colors active:bg-[#F7F9FC]">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#DCFCE7]">
                <Camera className="h-5 w-5 text-[#16A34A]" />
              </div>
              <div className="flex-1">
                <div className="text-[14px] font-semibold text-[#1A1A1A]">更换头像</div>
                <div className="text-[12px] text-[#9CA3AF]">点击选择图片</div>
              </div>
              <ChevronRight className="h-5 w-5 text-[#9CA3AF]" />
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={saving} />
            </label>

            <label className="flex cursor-pointer items-center gap-3 rounded-[14px] border border-[#E5E7EB] p-4 text-left transition-colors active:bg-[#F7F9FC]">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F3E8FF]">
                <Image className="h-5 w-5 text-[#9333EA]" />
              </div>
              <div className="flex-1">
                <div className="text-[14px] font-semibold text-[#1A1A1A]">更换背景图</div>
                <div className="text-[12px] text-[#9CA3AF]">点击选择图片</div>
              </div>
              <ChevronRight className="h-5 w-5 text-[#9CA3AF]" />
              <input type="file" accept="image/*" onChange={handleBackgroundUpload} className="hidden" disabled={saving} />
            </label>
          </div>
        )}

        {editingField === 'name' && (
          <div className="flex flex-col gap-4 px-5 pb-2">
            <div>
              <label className="mb-2 block text-[13px] font-medium text-[#4B5563]">姓名</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="请输入姓名"
                className="w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-[14px] text-[#1A1A1A] focus:border-[#0062FF] focus:outline-none focus:ring-2 focus:ring-[#0062FF]/20"
                maxLength={50}
                autoFocus
              />
            </div>
          </div>
        )}
      </BottomSheet>
    </PhoneFrame>
  );
}
