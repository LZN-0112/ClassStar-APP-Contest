import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import ChevronRight from '@/components/icons/ChevronRight';
import StatIcon from '@/components/icons/StatIcon';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { QrCode, Users, Bell } from 'lucide-react';

interface ClassInfo {
  id: string;
  name: string;
  code: string;
  grade?: string;
  major?: string;
  memberCount: number;
  materialCount?: number;
  archiveCount?: number;
  qrCodeUrl?: string;
  announcement?: string;
}

interface Member {
  id: string;
  userId: string;
  name: string;
  role: string;
  roleLevel: 'owner' | 'admin' | 'member';
  isCommittee: boolean;
}

interface Stats {
  unreadNotices: number;
  pendingHomework: number;
  recentAttendance: number;
  upcomingActivity: number;
}

// 单位映射
const STAT_UNITS: Record<string, string> = {
  bell: '条',
  'file-text': '个',
  'circle-check': '次',
  flag: '个',
};

export default function ClassHome() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useCurrentUser();
  const classId = user?.classId;

  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQr, setShowQr] = useState(false);
  const [stats, setStats] = useState<Stats>({
    unreadNotices: 0,
    pendingHomework: 0,
    recentAttendance: 0,
    upcomingActivity: 0,
  });

  // 滚动容器 ref（用于下拉刷新）
  const scrollRef = useRef<HTMLDivElement>(null);

  const refreshKey = (location.state as any)?.refreshKey;

  // ESC 关闭弹窗
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowQr(false);
    };
    if (showQr) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showQr]);

  const fetchData = async () => {
    if (!classId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [classRes, memberRes] = await Promise.all([
        api.get(`/classes/${classId}`),
        api.get(`/classes/${classId}/members`, { params: { pageSize: 200 } }),
      ]);

      setClassInfo(classRes.data?.data || classRes.data);
      const memberList = memberRes.data?.data?.list || [];
      setMembers(memberList);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '获取班级信息失败');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!classId) return;
    try {
      const [msgRes, attRes, hwRes, actRes] = await Promise.allSettled([
        api.get(`/classes/${classId}/messages`, { params: { page: 1, pageSize: 100 } }),
        api.get(`/classes/${classId}/attendances`, { params: { page: 1, pageSize: 100 } }),
        api.get(`/classes/${classId}/homeworks`, { params: { page: 1, pageSize: 100 } }),
        api.get(`/classes/${classId}/activities`, { params: { page: 1, pageSize: 100 } }),
      ]);

      let unreadCount = 0;
      if (msgRes.status === 'fulfilled' && msgRes.value?.data?.data?.list) {
        unreadCount = msgRes.value.data.data.list.filter((m: any) => !m.isRead).length;
      }

      let pendingHw = 0;
      if (hwRes.status === 'fulfilled' && hwRes.value?.data?.data?.list) {
        pendingHw = hwRes.value.data.data.list.filter((h: any) => !h.submitted && h.status !== 'closed').length;
      }

      let recentAtt = 0;
      if (attRes.status === 'fulfilled' && attRes.value?.data?.data?.pagination) {
        recentAtt = attRes.value.data.data.pagination.total;
      }

      let upcomingAct = 0;
      if (actRes.status === 'fulfilled' && actRes.value?.data?.data?.total) {
        upcomingAct = actRes.value.data.data.total;
      }

      setStats({
        unreadNotices: unreadCount,
        pendingHomework: pendingHw,
        recentAttendance: recentAtt,
        upcomingActivity: upcomingAct,
      });
    } catch {
      // 静默失败
    }
  };

  useEffect(() => {
    fetchData();
    loadStats();
  }, [classId, refreshKey]);

  // 静默刷新（不显示骨架屏，避免闪烁）
  const silentRefresh = async () => {
    if (!classId || loading) return;
    try {
      const [classRes, memberRes] = await Promise.all([
        api.get(`/classes/${classId}`),
        api.get(`/classes/${classId}/members`, { params: { pageSize: 200 } }),
      ]);
      setClassInfo(classRes.data?.data || classRes.data);
      const memberList = memberRes.data?.data?.list || [];
      setMembers(memberList);
    } catch {
      // 静默失败
    }
    loadStats();
  };

  const handleScroll = (e: Event) => {
    const el = e.target as HTMLElement;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (isNearBottom) {
      silentRefresh();
    }
  };

  useEffect(() => {
    const container = scrollRef.current?.closest('.overflow-y-auto') as HTMLElement | null;
    if (!container) return;
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [classId, loading]);

  const owner = members.find((m) => m.roleLevel === 'owner');
  const admins = members.filter((m) => m.roleLevel === 'admin');

  // 班级码格式化（容错处理）
  const formattedCode = classInfo?.code
    ? classInfo.code.length > 4
      ? `${classInfo.code.slice(0, 4)} ${classInfo.code.slice(4)}`
      : classInfo.code
    : '';

  // 管理员显示（最多 3 个，超出显示 +N）
  const displayAdmins = admins.slice(0, 3);
  const adminOverflow = admins.length - 3;

  // 骨架屏
  const SkeletonCard = () => (
    <div
      className="box-border w-full h-[180px] shrink-0 flex flex-col justify-center items-center bg-[#F3F4F6] rounded-xl animate-pulse"
    >
      <div className="w-3/4 h-6 bg-[#E5E7EB] rounded mb-3" />
      <div className="w-1/2 h-4 bg-[#E5E7EB] rounded mb-3" />
      <div className="w-2/3 h-4 bg-[#E5E7EB] rounded" />
    </div>
  );

  if (!classId) {
    return (
      <PhoneFrame className="bg-[#F5F5F5]">
        <div className="flex w-full flex-1 flex-col items-center">
          {/* Status Bar */}
          <div className="box-border w-full h-[62px] shrink-0 flex flex-row gap-[40px] p-[12px_24px_0px_24px] justify-between items-center bg-[#F5F5F5]">
            <div className="text-[14px]/[normal] box-border text-[#1A1A1A] font-data font-semibold text-left [white-space:nowrap]">
              9:41
            </div>
            <div className="box-border w-fit shrink-0 h-fit flex flex-row gap-[6px] justify-start items-center">
              <div className="text-[14px]/[normal] box-border text-[#1A1A1A] font-caption font-normal text-left [white-space:nowrap]">
                ◉◉◉◉
              </div>
              <div className="text-[14px]/[normal] box-border text-[#1A1A1A] font-data font-normal text-left [white-space:nowrap]">
                100%
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="box-border w-full flex flex-col gap-0 p-[12px_20px_16px_20px] justify-start items-center bg-[#F5F5F5]">
            <div className="box-border w-full [flex:1_1_0] flex flex-row gap-0 justify-between items-center">
              <div className="flex flex-row items-center gap-0">
                <BackButton className="-ml-2" />
                <div className="text-[20px]/[normal] box-border text-[#1A1A1A] font-heading font-bold text-left [white-space:nowrap]">
                  班级
                </div>
              </div>
              <div
                className="text-[14px]/[normal] box-border text-[#4B5563] font-caption font-normal text-left [white-space:nowrap] cursor-pointer hover:text-[#1A1A1A] transition-colors"
                onClick={() => navigate('/settings')}
              >
                设置
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex w-full flex-col items-center gap-5 px-[15px] pb-4">
            <div className="flex flex-col items-center justify-center py-16 gap-4 w-full">
              <div className="w-20 h-20 rounded-full bg-[#EBF3FF] flex items-center justify-center">
                <Users className="w-10 h-10 text-[#0062FF]" strokeWidth={1.5} />
              </div>
              <div className="text-[16px] text-[#4B5563] font-body font-medium">暂无加入班级</div>
              <button
                className="px-6 py-2.5 bg-[#0062FF] text-white rounded-lg text-[14px] font-body font-semibold active:scale-95 transition-transform shadow-lift"
                onClick={() => navigate('/join-class')}
              >
                去加入/创建班级
              </button>
            </div>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  const statItems = [
    { label: '未读通知', value: stats.unreadNotices, icon: 'bell', path: '/message-list' },
    { label: '待交作业', value: stats.pendingHomework, icon: 'file-text', path: '/homework-list' },
    { label: '签到记录', value: stats.recentAttendance, icon: 'circle-check', path: '/attendance-list' },
    { label: '班级活动', value: stats.upcomingActivity, icon: 'flag', path: '/activity-list' },
  ];

  const menuItems = [
    {
      title: '班级成员',
      subtitle: `${members.length} 人已加入`,
      icon: 'users',
      path: '/member-list',
    },
    {
      title: '导入学生名单',
      subtitle: 'Excel / 教务系统 / 群导入',
      icon: 'upload',
      path: '/import-students',
    },
    {
      title: '班级资料库',
      subtitle: `${classInfo?.materialCount ?? 0} 个文件`,
      icon: 'folder',
      path: '/material-library',
    },
    {
      title: '班级档案',
      subtitle: `${classInfo?.archiveCount ?? 0} 个档案`,
      icon: 'archive',
      path: '/class-archive',
    },
  ];

  return (
    <PhoneFrame className="bg-[#F5F5F5]">
      <div className="flex w-full flex-col items-center">
        {/* Status Bar */}
        <div className="box-border w-full h-[62px] shrink-0 flex flex-row gap-[40px] p-[12px_24px_0px_24px] justify-between items-center bg-[#F5F5F5]">
          <div className="text-[14px]/[normal] box-border text-[#1A1A1A] font-data font-semibold text-left [white-space:nowrap]">
            9:41
          </div>
          <div className="box-border w-fit shrink-0 h-fit flex flex-row gap-[6px] justify-start items-center">
            <div className="text-[14px]/[normal] box-border text-[#1A1A1A] font-caption font-normal text-left [white-space:nowrap]">
              ◉◉◉◉
            </div>
            <div className="text-[14px]/[normal] box-border text-[#1A1A1A] font-data font-normal text-left [white-space:nowrap]">
              100%
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="box-border w-full flex flex-col gap-0 p-[12px_20px_12px_20px] justify-start items-center bg-[#F5F5F5]">
          <div className="box-border w-full [flex:1_1_0] flex flex-row gap-0 justify-between items-center">
            <div className="flex flex-row items-center gap-0">
              <BackButton className="-ml-2" />
              <div className="text-[20px]/[normal] box-border text-[#1A1A1A] font-heading font-bold text-left [white-space:nowrap]">
                班级
              </div>
            </div>
            <div
              className="text-[14px]/[normal] box-border text-[#4B5563] font-caption font-normal text-left [white-space:nowrap] cursor-pointer hover:text-[#1A1A1A] transition-colors"
              onClick={() => navigate('/settings')}
            >
              设置
            </div>
          </div>
        </div>

        {/* 内容卡片区 */}
        <div
          ref={scrollRef}
          className="flex w-full flex-col items-center gap-5 px-[15px] pb-4"
        >
          {/* 班级卡片 */}
          {loading ? (
            <SkeletonCard />
          ) : classInfo ? (
            <div
              className="box-border w-full flex flex-col gap-4 p-6 [background-image:linear-gradient(-141.235deg,_#0062ff_13.008%,_#004ecc_82.977%)] bg-no-repeat bg-[length:100%_100%] rounded-xl shadow-lift"
            >
              {/* 顶部行：班级名称 + 二维码按钮 */}
              <div className="flex flex-row justify-between items-center">
                <div className="text-[24px]/[normal] box-border text-[#ffffff] font-heading font-bold text-left truncate flex-1 mr-3">
                  {classInfo.name}
                </div>
                <button
                  type="button"
                  onClick={() => setShowQr(true)}
                  aria-label="查看班级二维码"
                  className="flex items-center justify-center w-[48px] h-[48px] rounded-xl bg-[#ffffff22] active:bg-[#ffffff44] transition-all hover:bg-[#ffffff33] hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#ffffff66]"
                >
                  <QrCode className="w-[24px] h-[24px] text-white" strokeWidth={2} />
                </button>
              </div>

              {/* 人数 + 班级码 */}
              <div className="flex flex-row items-center gap-3">
                <div className="text-[15px]/[normal] box-border text-[#ffffff] font-body font-medium text-left [white-space:nowrap]">
                  {members.length} 人
                </div>
                <div className="w-1 h-1 rounded-full bg-[#ffffff80]" />
                <div className="text-[14px]/[normal] box-border text-[#ffffff] font-caption font-normal text-left [white-space:nowrap]">
                  班级码 {formattedCode}
                </div>
              </div>

              {/* 公告 */}
              {classInfo.announcement && classInfo.announcement.trim() && (
                <div className="flex flex-row items-start gap-2 p-2.5 bg-[#ffffff15] rounded-lg">
                  <Bell className="w-4 h-4 text-[#ffffffcc] mt-0.5 flex-shrink-0" strokeWidth={2} />
                  <div className="text-[13px] text-[#ffffffee] font-body font-normal leading-relaxed line-clamp-2">
                    {classInfo.announcement}
                  </div>
                </div>
              )}

              {/* 管理员信息 */}
              {(owner || admins.length > 0) && (
                <div className="flex flex-col gap-[8px] pt-[8px] border-t border-[#ffffff22]">
                  {owner && (
                    <div className="flex flex-row gap-[10px] items-center">
                      <div className="w-[36px] h-[36px] rounded-full bg-[#FFFFFF] shadow-md flex items-center justify-center flex-shrink-0">
                        <div className="text-[14px] box-border text-[#0062FF] font-body font-semibold text-left [white-space:nowrap]">
                          {owner.name.charAt(0)}
                        </div>
                      </div>
                      <div className="flex-1 h-fit flex flex-col gap-[2px]">
                        <div className="text-[14px]/[normal] box-border text-[#ffffff] font-body font-semibold text-left [white-space:nowrap]">
                          {owner.name}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#ffffff25] text-[#ffffffee]">
                            群主
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {displayAdmins.length > 0 && (
                    <div className="text-[13px]/[normal] box-border text-[#ffffffcc] font-body font-normal text-left">
                      管理员：{displayAdmins.map((a) => a.name).join('、')}
                      {adminOverflow > 0 && (
                        <span className="text-[#ffffffaa]"> +{adminOverflow}</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}

          {/* 二维码弹窗 */}
          {showQr && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center animate-fadeIn"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
              onClick={() => setShowQr(false)}
            >
              <div
                className="flex flex-col items-center gap-5 p-[24px] bg-white rounded-2xl shadow-xl mx-4 animate-scaleIn"
                style={{ maxWidth: '320px', width: '100%' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-[18px] font-heading font-bold text-[#1A1A1A]">
                  {classInfo?.name}
                </div>
                {classInfo?.qrCodeUrl ? (
                  <img
                    src={classInfo.qrCodeUrl}
                    alt="班级二维码"
                    className="w-[220px] h-[220px] rounded-xl border-2 border-[#EBF3FF]"
                  />
                ) : (
                  <div className="w-[220px] h-[220px] flex flex-col items-center justify-center bg-[#F3F4F6] rounded-xl text-[13px] text-[#9CA3AF] gap-2">
                    <QrCode className="w-8 h-8 text-[#9CA3AF]" strokeWidth={1.5} />
                    二维码未生成
                  </div>
                )}
                <div className="flex flex-col items-center gap-1">
                  <div className="text-[13px] text-[#6B7280] font-medium">
                    班级码：{formattedCode}
                  </div>
                  <div className="text-[11px] text-[#9CA3AF]">
                    同学扫描此二维码即可加入班级
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQr(false)}
                  className="mt-2 w-full h-[44px] rounded-xl bg-[#0062FF] text-white text-[14px] font-body font-semibold active:opacity-80 hover:bg-[#0052DD] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0062FF] focus:ring-offset-2"
                >
                  关闭
                </button>
              </div>
            </div>
          )}

          {/* 数据概览 */}
          <div className="box-border w-full flex flex-row justify-between p-5 bg-[#FFFFFF] rounded-xl shadow-soft">
            {statItems.map((stat) => {
              const unit = STAT_UNITS[stat.icon] || '';
              return (
                <div
                  key={stat.label}
                  className="flex flex-col items-center gap-[6px] flex-1 cursor-pointer active:scale-95 transition-transform duration-150 hover:bg-[#F8FAFC] rounded-lg p-1"
                  onClick={() => navigate(stat.path)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${stat.label}${stat.value}${unit}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      navigate(stat.path);
                    }
                  }}
                >
                  <div className="flex items-center justify-center w-[40px] h-[40px] rounded-xl" style={{ backgroundColor: stat.icon === 'bell' ? '#EF444414' : stat.icon === 'file-text' ? '#F9731614' : stat.icon === 'circle-check' ? '#2563EB14' : '#22C55E14' }}>
                    <StatIcon type={stat.icon} />
                  </div>
                  <div className="text-[20px]/[normal] box-border text-[#1A1A1A] font-heading font-bold text-left [white-space:nowrap]">
                    {stat.value}
                  </div>
                  <div className="text-[11px]/[normal] box-border text-[#9CA3AF] font-caption font-normal text-left [white-space:nowrap]">
                    {stat.label}{stat.value > 0 && unit}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 菜单列表 */}
          <div className="box-border w-full flex flex-col bg-[#FFFFFF] rounded-xl shadow-soft overflow-hidden">
            {menuItems.map((item, index) => (
              <div
                key={item.title}
                className={`box-border w-full h-[64px] flex flex-row gap-[12px] p-[0px_16px] justify-between items-center cursor-pointer active:bg-[#F8FAFC] active:scale-[0.99] transition-all ${
                  index < menuItems.length - 1 ? 'border-b border-[#F3F4F6]' : ''
                }`}
                onClick={() => navigate(item.path)}
                role="button"
                tabIndex={0}
                aria-label={item.title}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    navigate(item.path);
                  }
                }}
              >
                <div className="box-border [flex:1_1_0] h-full flex flex-row gap-[12px] items-center">
                  <div className="w-[36px] h-[36px] rounded-lg flex items-center justify-center bg-[#F3F4F6] flex-shrink-0">
                    <StatIcon type={item.icon} />
                  </div>
                  <div className="flex flex-col gap-[2px] overflow-hidden">
                    <div className="text-[16px]/[normal] box-border text-[#1A1A1A] font-heading font-semibold text-left truncate">
                      {item.title}
                    </div>
                    <div className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-normal text-left truncate">
                      {item.subtitle}
                    </div>
                  </div>
                </div>
                <ChevronRight className="box-border w-[24px] shrink-0 h-[24px] overflow-visible" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}