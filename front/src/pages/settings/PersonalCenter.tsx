import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import StatusBar from '@/components/layout/StatusBar';
import { isNative } from '@/lib/capacitor';
import { useCurrentUser, setCurrentOrg, getCurrentOrgId, type MyOrgItem } from '@/hooks/useCurrentUser';
import { getOrgTypeMeta } from '@/utils/org';
import {
  Award,
  BookOpen,
  Camera,
  Check,
  ChevronRight,
  Clock,
  Edit3,
  Flag,
  Hash,
  Image,
  LogOut,
  Megaphone,
  Pencil,
  Phone,
  Settings,
  Star,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  X,
} from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/lib/api';

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

/* ── InfoItem 组件 ─── */
interface InfoItemProps {
  icon: ReactNode;
  label: string;
  value: string;
  isLast?: boolean;
}

function InfoItem({ icon, label, value, isLast }: InfoItemProps) {
  return (
    <div className={`box-border flex h-[52px] w-full shrink-0 items-center justify-start gap-3 px-4 ${!isLast ? 'border-b border-[#F3F4F6]' : ''}`}>
      <div className="text-[#111827]">{icon}</div>
      <div className="box-border text-left font-body text-[14px] font-bold text-[#111827]">
        {label}
      </div>
      <div className="box-border h-[1px] flex-1" />
      <div className="box-border text-left font-body text-[14px] font-bold text-[#111827] [white-space:nowrap]">
        {value}
      </div>
      <ChevronRight className="h-[16px] w-[16px] shrink-0 text-[#4B5563]" strokeWidth={2} />
    </div>
  );
}

/* ─── QuickAccess 组件 ─── */
interface QuickAccessProps {
  icon: ReactNode;
  color: string;
  label: string;
  onClick?: () => void;
  loading?: boolean;
}

function QuickAccess({ icon, color, label, onClick, loading }: QuickAccessProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="group box-border flex w-[70px] cursor-pointer flex-col items-center justify-start gap-2 disabled:opacity-60"
    >
      <div
        className="box-border flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl shadow-icon relative overflow-hidden transition-transform duration-150 active:scale-95"
        style={{ backgroundColor: color }}
      >
        <div className="pointer-events-none absolute left-0 top-0 h-4 w-10 rounded-full bg-white opacity-[0.22]" />
        {loading ? (
          <div className="h-[22px] w-[22px] animate-spin rounded-full border-2 border-t-transparent border-white" />
        ) : (
          <div className="text-white">{icon}</div>
        )}
      </div>
      <div className="box-border text-center font-body text-[12px] font-medium text-[#1A1A1A] [white-space:nowrap]">
        {label}
      </div>
    </button>
  );
}

const QUICK_ACCESS_ITEMS = [
  {
    label: '我的考勤',
    path: '/my-attendance',
    icon: <Clock className="h-[22px] w-[22px]" strokeWidth={2} />,
    color: '#2563EB',
  },
  {
    label: '我的作业',
    path: '/my-homework',
    icon: <Edit3 className="h-[22px] w-[22px]" strokeWidth={2} />,
    color: '#F97316',
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
    icon: <Award className="h-[22px] w-[22px]" strokeWidth={2} />,
    color: '#22C55E',
  },
];

/* ─── 统计卡片 ── */
interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: 'up' | 'down' | 'flat';
  color: string;
  bg: string;
}

function StatCard({ label, value, sub, trend, color, bg }: StatCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-[#10B981]' : trend === 'down' ? 'text-[#EF4444]' : 'text-[#6B7280]';
  return (
    <div className={`box-border flex min-w-[120px] flex-1 flex-col rounded-xl p-3.5 ${bg}`}>
      <div className="text-[11px] font-semibold text-[#1F2937]">{label}</div>
      <div className={`mt-1 text-[22px] font-bold ${color}`}>{value}</div>
      {sub && (
        <div className={`mt-0.5 flex items-center gap-0.5 text-[11px] font-semibold ${trendColor}`}>
          <TrendIcon className="h-3 w-3" strokeWidth={2.5} />
          <span>{sub}</span>
        </div>
      )}
    </div>
  );
}

/* ─── 最近动态项 ─── */
interface ActivityItem {
  type: string;
  title: string;
  time: string;
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const iconConfig: Record<string, { icon: ReactNode; color: string }> = {
    attendance: { icon: <Clock className="h-[22px] w-[22px]" strokeWidth={2} />, color: '#2563EB' },
    homework: { icon: <Edit3 className="h-[22px] w-[22px]" strokeWidth={2} />, color: '#F97316' },
    activity: { icon: <Flag className="h-[22px] w-[22px]" strokeWidth={2} />, color: '#EF4444' },
    message: { icon: <Megaphone className="h-[22px] w-[22px]" strokeWidth={2} />, color: '#EC4899' },
  };
  const config = iconConfig[item.type] || iconConfig.message;

  return (
    <div className="flex items-center gap-3 py-2.5">
      <div
        className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-xl relative overflow-hidden"
        style={{ backgroundColor: config.color }}
      >
        <div className="pointer-events-none absolute left-0 top-0 h-3 w-8 rounded-full bg-white opacity-[0.22]" />
        <div className="text-white relative z-0">{config.icon}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-[#1F2937] truncate">{item.title}</div>
      </div>
      <div className="text-[11px] font-medium text-[#6B7280] shrink-0">{item.time}</div>
    </div>
  );
}

export default function PersonalCenter() {
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

  // 统计数据
  const [stats, setStats] = useState<{
    attendanceRate: number;
    homeworkSubmitRate: number;
    activityParticipationRate: number;
  } | null>(null);

  // 最近动态
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);

  // 我的组织
  const [myOrgs, setMyOrgs] = useState<MyOrgItem[]>([]);
  const [orgLoading, setOrgLoading] = useState(false);

  const loadMyOrgs = () => {
    setOrgLoading(true);
    api
      .get('/classes/my')
      .then((res) => {
        setMyOrgs(res.data?.data || res.data || []);
      })
      .catch(() => { /* 静默失败 */ })
      .finally(() => setOrgLoading(false));
  };

  // 切换组织
  const handleSwitchOrg = (org: MyOrgItem) => {
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
        const remaining: MyOrgItem[] = res.data?.data || res.data || [];
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

  // 加载统计数据
  useEffect(() => {
    if (!user?.classId) return;
    api
      .get('/data/dashboard', { params: { classId: user.classId } })
      .then((res) => {
        const d = res.data.data || res.data;
        setStats({
          attendanceRate: d.attendanceRate ?? 0,
          homeworkSubmitRate: d.homeworkSubmitRate ?? 0,
          activityParticipationRate: d.activityParticipationRate ?? 0,
        });
      })
      .catch(() => { /* 静默失败 */ });
  }, [user?.classId]);

  // 加载最近动态
  useEffect(() => {
    if (!user?.id) return;
    api
      .get('/settings/recent-activities')
      .then((res) => {
        const d = res.data.data || res.data;
        setRecentActivities(d.list || []);
      })
      .catch(() => { /* 静默失败 */ });
  }, [user?.id]);

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
  const displayPhone = user?.phone ?? '未设置';
  const displayCommitteeRole = user?.isCommittee ? user.role : '普通成员';
  const displayAvatar = user?.avatar;
  const displayBackgroundImage = user?.backgroundImage;

  // 从 createdAt 提取入学年份
  const enrollYear = user?.createdAt
    ? new Date(user.createdAt).getFullYear().toString()
    : '-';

  const badges = getBadges(user?.isCommittee ?? false);

  // 展开高度
  const expandedHeight = isExpanded ? 'h-[400px]' : 'h-[280px]';

  const handleQuickAccess = (path: string, label: string) => {
    if (navigating) return;
    setNavigating(label);
    requestAnimationFrame(() => {
      navigate(path);
      setTimeout(() => setNavigating(null), 300);
    });
  };

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
          <div className="relative flex flex-1 flex-col px-5" style={{ paddingTop: isNative ? 'var(--safe-top, env(safe-area-inset-top, 0px))' : '0px' }}>
            {/* 顶部按钮区 */}
            <div className="flex items-center justify-between">
              <BackButton variant="dark" />
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
            <div className={`flex flex-1 items-center gap-4 transition-all duration-500 ease-in-out ${isExpanded ? '-mt-8' : '-mt-1'}`}>
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
          {/* 数据统计卡片 */}
          <div className="flex w-full gap-2.5 overflow-x-auto pb-1 scrollbar-none">
            <StatCard
              label="出勤率"
              value={stats ? `${stats.attendanceRate}%` : '--'}
              sub={stats ? (stats.attendanceRate >= 90 ? '表现优秀' : '继续加油') : undefined}
              trend={stats ? (stats.attendanceRate >= 90 ? 'up' : 'flat') : undefined}
              color="text-[#3B82F6]"
              bg="bg-white shadow-soft"
            />
            <StatCard
              label="作业完成率"
              value={stats ? `${stats.homeworkSubmitRate}%` : '--'}
              sub={stats ? (stats.homeworkSubmitRate >= 80 ? '保持良好' : '需要提升') : undefined}
              trend={stats ? (stats.homeworkSubmitRate >= 80 ? 'up' : 'down') : undefined}
              color="text-[#F97316]"
              bg="bg-white shadow-soft"
            />
            <StatCard
              label="活动参与率"
              value={stats ? `${stats.activityParticipationRate}%` : '--'}
              sub={stats ? (stats.activityParticipationRate >= 70 ? '积极参与' : '多多参与') : undefined}
              trend={stats ? (stats.activityParticipationRate >= 70 ? 'up' : 'flat') : undefined}
              color="text-[#10B981]"
              bg="bg-white shadow-soft"
            />
          </div>

          {/* 快捷入口 2×4 网格 */}
          <div className="box-border grid w-full grid-cols-4 gap-y-4 rounded-xl bg-white p-4 shadow-soft">
            {QUICK_ACCESS_ITEMS.map((item) => (
              <QuickAccess
                key={item.path}
                icon={item.icon}
                color={item.color}
                label={item.label}
                onClick={() => handleQuickAccess(item.path, item.label)}
                loading={navigating === item.label}
              />
            ))}
          </div>

          {/* 最近动态 */}
          <div className="box-border flex w-full flex-col rounded-xl bg-white p-4 shadow-soft">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-[3px] rounded-full bg-[#6D28D9]" />
                <span className="text-[11px] font-bold tracking-wide text-[#1F2937] uppercase">最近动态</span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/messages')}
                className="flex items-center gap-0.5 text-[11px] text-[#0062FF]"
              >
                查看全部
                <ChevronRight className="h-3 w-3" strokeWidth={2} />
              </button>
            </div>
            <div className="divide-y divide-[#F3F4F6]">
              {recentActivities.map((item, idx) => (
                <ActivityRow key={idx} item={item} />
              ))}
            </div>
          </div>

          {/* 我的组织 */}
          <div className="box-border flex w-full flex-col gap-0">
            <div className="flex items-center gap-1.5 px-1 pb-1.5">
              <div className="h-3 w-[3px] rounded-full bg-[#7C3AED]" />
              <span className="text-[11px] font-bold tracking-wide text-[#1F2937] uppercase">我的组织</span>
            </div>
            <div className="box-border flex w-full flex-col rounded-xl bg-white shadow-soft overflow-hidden">
              {orgLoading ? (
                <div className="py-8 text-center text-[13px] text-gray-400">加载中...</div>
              ) : myOrgs.length === 0 ? (
                <div className="py-8 text-center text-[13px] text-gray-400">暂无组织</div>
              ) : (
                myOrgs.map((org, idx) => {
                  const meta = getOrgTypeMeta(org.orgType);
                  const OIcon = meta.Icon;
                  const isCurrent = org.id === getCurrentOrgId();
                  const isLast = idx === myOrgs.length - 1;
                  return (
                    <div
                      key={org.id}
                      className={`flex items-center gap-3 px-4 py-3 ${!isLast ? 'border-b border-[#F3F4F6]' : ''}`}
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: meta.color }}
                      >
                        <OIcon className="h-4 w-4 text-white" strokeWidth={2} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[14px] font-semibold text-[#1F2937]">
                            {org.name}
                          </span>
                          {isCurrent && (
                            <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                              当前
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span className="text-[11px] font-medium" style={{ color: meta.color }}>
                            {meta.label}
                          </span>
                          <span className="text-[11px] text-gray-400">·</span>
                          <span className="text-[11px] text-gray-500">{org.role}</span>
                          <span className="text-[11px] text-gray-400">·</span>
                          <span className="text-[11px] text-gray-400">{org.memberCount} 人</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => handleSwitchOrg(org)}
                            className="rounded-lg bg-blue-50 px-2.5 py-1 text-[12px] font-medium text-blue-600 hover:bg-blue-100"
                          >
                            切换
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleLeaveOrg(org)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500"
                          aria-label="退出组织"
                        >
                          <LogOut className="h-4 w-4" strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 基础信息 */}
          <div className="box-border flex w-full flex-col gap-3">
            {/* 学籍信息 */}
            <div className="box-border flex flex-col gap-0">
              <div className="flex items-center gap-1.5 px-1 pb-1.5">
                <div className="h-3 w-[3px] rounded-full bg-[#1E40AF]" />
                <span className="text-[11px] font-bold tracking-wide text-[#1F2937] uppercase">学籍信息</span>
              </div>
              <div className="box-border flex w-full flex-col rounded-xl bg-white shadow-soft">
                <InfoItem
                  label="学号"
                  value={displayStudentId}
                  icon={<Hash className="h-[18px] w-[18px]" strokeWidth={2} />}
                />
                <InfoItem
                  label="班级"
                  value={displayClassName}
                  icon={<Users className="h-[18px] w-[18px]" strokeWidth={2} />}
                />
                <InfoItem
                  label="入学年份"
                  value={enrollYear}
                  icon={<BookOpen className="h-[18px] w-[18px]" strokeWidth={2} />}
                  isLast
                />
              </div>
            </div>

            {/* 联系方式 */}
            <div className="box-border flex flex-col gap-0">
              <div className="flex items-center gap-1.5 px-1 pb-1.5">
                <div className="h-3 w-[3px] rounded-full bg-[#059669]" />
                <span className="text-[11px] font-bold tracking-wide text-[#1F2937] uppercase">联系方式</span>
              </div>
              <div className="box-border flex w-full flex-col rounded-xl bg-white shadow-soft">
                <InfoItem
                  label="手机号"
                  value={displayPhone}
                  icon={<Phone className="h-[18px] w-[18px]" strokeWidth={2} />}
                  isLast
                />
              </div>
            </div>

            {/* 身份信息 */}
            <div className="box-border flex flex-col gap-0">
              <div className="flex items-center gap-1.5 px-1 pb-1.5">
                <div className="h-3 w-[3px] rounded-full bg-[#D97706]" />
                <span className="text-[11px] font-bold tracking-wide text-[#1F2937] uppercase">身份信息</span>
              </div>
              <div className="box-border flex w-full flex-col rounded-xl bg-white shadow-soft">
                <InfoItem
                  label="角色"
                  value={displayRole}
                  icon={<Star className="h-[18px] w-[18px]" strokeWidth={2} />}
                />
                <InfoItem
                  label="班委职务"
                  value={displayCommitteeRole}
                  icon={<Award className="h-[18px] w-[18px]" strokeWidth={2} />}
                  isLast
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 编辑弹窗 */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full rounded-t-2xl bg-white p-6 animate-in slide-in-from-bottom">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[18px] font-heading font-bold text-[#1A1A1A]">编辑资料</h3>
              <button
                type="button"
                onClick={() => { setShowEditModal(false); setEditingField(null); }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F3F4F6] text-[#6B7280]"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>

            {!editingField && (
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleEditName}
                  className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] p-4 text-left transition-colors hover:bg-[#F9FAFB] active:bg-[#F3F4F6]"
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

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#E5E7EB] p-4 text-left transition-colors hover:bg-[#F9FAFB] active:bg-[#F3F4F6]">
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

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#E5E7EB] p-4 text-left transition-colors hover:bg-[#F9FAFB] active:bg-[#F3F4F6]">
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
              <div className="flex flex-col gap-4">
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
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setEditingField(null); setShowEditModal(false); }}
                    className="flex-1 rounded-xl border border-[#E5E7EB] px-4 py-3 text-[14px] font-medium text-[#4B5563] transition-colors hover:bg-[#F9FAFB]"
                    disabled={saving}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveName}
                    className="flex-1 rounded-xl bg-[#0062FF] px-4 py-3 text-[14px] font-medium text-white transition-colors hover:bg-[#0052DD] disabled:opacity-50"
                    disabled={saving}
                  >
                    {saving ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </PhoneFrame>
  );
}
