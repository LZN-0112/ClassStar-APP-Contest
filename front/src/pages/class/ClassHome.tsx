import PhoneFrame from '@/components/layout/PhoneFrame';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { api, resolveFileUrl } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useStatusBarStyle } from '@/hooks/useStatusBarStyle';
import { getOrgTypeMeta } from '@/utils/org';
import BottomSheet from '@/components/ui/BottomSheet';
import {
  Archive,
  Bell,
  Camera,
  ChevronRight,
  Copy,
  Loader2,
  QrCode,
  Settings,
  Share2,
  Upload,
  Users,
} from 'lucide-react';

interface ClassInfo {
  id: string;
  name: string;
  code: string;
  grade?: string;
  major?: string;
  memberCount?: number;
  materialCount?: number;
  archiveCount?: number;
  qrCodeUrl?: string;
  announcement?: string;
  orgType?: string;
  logoUrl?: string | null;
}

interface Member {
  id: string;
  userId: string;
  name: string;
  avatar?: string;
  role: string;
  roleLevel: 'owner' | 'admin' | 'member';
  isCommittee: boolean;
  joinedAt?: string;
}

const AVATAR_COLORS = ['#0062FF', '#10B981', '#F97316', '#8B5CF6', '#EF4444', '#0EA5E9'];

const ROLE_RANK: Record<string, number> = { owner: 0, admin: 1, member: 2 };

function avatarColor(name: string) {
  let sum = 0;
  for (let i = 0; i < name.length; i += 1) sum += name.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export default function ClassHome() {
  useStatusBarStyle(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useCurrentUser();
  const classId = user?.classId;
  const isManager = user?.roleLevel === 'owner' || user?.roleLevel === 'admin';

  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQr, setShowQr] = useState(false);
  const [generatingQr, setGeneratingQr] = useState(false);
  const [announcementExpanded, setAnnouncementExpanded] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const refreshKey = (location.state as { refreshKey?: number } | null)?.refreshKey;

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
      setMembers(memberRes.data?.data?.list || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '获取班级信息失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, refreshKey]);

  useEffect(() => {
    const handleClassInfoChanged = () => {
      fetchData();
    };
    window.addEventListener('classInfoChanged', handleClassInfoChanged);
    return () => window.removeEventListener('classInfoChanged', handleClassInfoChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const copyText = async (text: string, tip = '已复制') => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(tip);
    } catch {
      const input = document.createElement('textarea');
      input.value = text;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      toast.success(tip);
    }
  };

  const handleLogoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !classId) return;
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过 5MB');
      return;
    }
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post(`/classes/${classId}/logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.data?.logoUrl || res.data?.logoUrl;
      if (!url) {
        toast.error('头像上传失败，请重试');
        return;
      }
      setClassInfo((prev) => (prev ? { ...prev, logoUrl: url } : prev));
      toast.success('班级头像已更新');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '头像上传失败');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleGenerateQr = async () => {
    if (!classId || generatingQr) return;
    setGeneratingQr(true);
    try {
      const res = await api.post(`/classes/${classId}/qrcode`);
      const url = res.data?.data?.qrCodeUrl || res.data?.qrCodeUrl;
      if (url) {
        setClassInfo((prev) => (prev ? { ...prev, qrCodeUrl: url } : prev));
      }
      toast.success('二维码已生成');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '生成二维码失败');
    } finally {
      setGeneratingQr(false);
    }
  };

  const owner = members.find((m) => m.roleLevel === 'owner');
  const admins = members.filter((m) => m.roleLevel === 'admin');

  const rankedMembers = useMemo(
    () => [...members].sort((a, b) => (ROLE_RANK[a.roleLevel] ?? 2) - (ROLE_RANK[b.roleLevel] ?? 2)),
    [members],
  );

  const formattedCode = classInfo?.code
    ? classInfo.code.length > 4
      ? `${classInfo.code.slice(0, 4)} ${classInfo.code.slice(4)}`
      : classInfo.code
    : '';

  const orgMeta = getOrgTypeMeta(classInfo?.orgType);

  const archiveItems = [
    {
      title: '班级成员',
      subtitle: `${classInfo?.memberCount ?? members.length} 人已加入`,
      icon: Users,
      path: '/member-list',
    },
    {
      title: '班级档案',
      subtitle: classInfo?.archiveCount ? `已归档 ${classInfo.archiveCount} 份` : '查看学生与班级档案',
      icon: Archive,
      path: '/class-archive',
    },
  ];

  const manageItems = [
    { title: '导入学生名单', subtitle: 'Excel / 教务系统 / 群导入', icon: Upload, path: '/import-students' },
    { title: '班级设置', subtitle: '班级信息、公告与退出班级', icon: Settings, path: '/class-settings' },
  ];

  const SkeletonCard = () => (
    <div className="box-border w-full h-[188px] shrink-0 flex flex-col justify-center items-center bg-[#F3F4F6] rounded-2xl animate-pulse">
      <div className="w-3/4 h-6 bg-[#E5E7EB] rounded mb-3" />
      <div className="w-1/2 h-4 bg-[#E5E7EB] rounded mb-3" />
      <div className="w-2/3 h-4 bg-[#E5E7EB] rounded" />
    </div>
  );

  const statusBar = (
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
  );

  if (!classId) {
    return (
      <PhoneFrame className="bg-[#F5F5F5]">
        <div className="flex w-full flex-1 flex-col items-center">
          {statusBar}
          <div className="box-border w-full flex flex-col p-[12px_20px_16px_20px] bg-[#F5F5F5]">
            <div className="text-[20px]/[normal] text-[#1A1A1A] font-heading font-bold">班级</div>
          </div>
          <div className="flex w-full flex-col items-center gap-5 px-[15px] pb-4">
            <div className="flex w-full flex-col items-center justify-center gap-4 py-16">
              <div className="w-20 h-20 rounded-full bg-[#EBF3FF] flex items-center justify-center">
                <Users className="w-10 h-10 text-[#0062FF]" strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <div className="text-[17px] text-[#1A1A1A] font-heading font-semibold">还没有加入班级</div>
                <div className="mt-1.5 text-[13px] text-[#6B7280] font-body leading-relaxed">
                  加入后，通知、作业、考勤和班费都会<br />汇总在这里
                </div>
              </div>
              <div className="flex w-full flex-col gap-2.5 mt-2 px-6">
                <button
                  className="h-[48px] w-full rounded-xl bg-[#0062FF] text-white text-[15px] font-body font-semibold active:scale-95 transition-transform shadow-lift"
                  onClick={() => navigate('/join-class')}
                >
                  加入或创建班级
                </button>
                <button
                  className="h-[44px] w-full rounded-xl bg-white text-[#0062FF] text-[14px] font-body font-semibold active:scale-95 transition-transform shadow-soft"
                  onClick={() => navigate('/scan')}
                >
                  扫码加入
                </button>
              </div>
            </div>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame className="bg-[#F5F5F5]">
      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleLogoChange}
      />
      <div className="flex w-full flex-col items-center">
        {statusBar}

        {/* Header */}
        <div className="box-border w-full flex flex-row p-[12px_20px_12px_20px] justify-between items-center bg-[#F5F5F5]">
          <div className="text-[20px]/[normal] text-[#1A1A1A] font-heading font-bold">班级</div>
          <button
            type="button"
            aria-label="班级设置"
            onClick={() => navigate('/class-settings')}
            className="w-[36px] h-[36px] flex items-center justify-center rounded-full bg-white shadow-soft active:scale-95 transition-transform"
          >
            <Settings className="w-[19px] h-[19px] text-[#4B5563]" strokeWidth={2} />
          </button>
        </div>

        <div className="flex w-full flex-col items-center gap-4 px-[15px] pb-6">
          {/* 班级身份卡 */}
          {loading ? (
            <SkeletonCard />
          ) : classInfo ? (
            <div className="relative box-border w-full flex flex-col gap-4 p-5 overflow-hidden rounded-2xl [background-image:linear-gradient(-141.235deg,_#0062ff_13.008%,_#004ecc_82.977%)] bg-no-repeat bg-[length:100%_100%] shadow-lift">
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10" />
              <div className="pointer-events-none absolute -left-8 -bottom-12 h-28 w-28 rounded-full bg-white/5" />

              <div className="relative flex flex-row items-center gap-3">
                {isManager ? (
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                    aria-label="更换班级头像"
                    className="relative flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/15 transition-transform active:scale-95"
                  >
                    {classInfo.logoUrl ? (
                      <img
                        src={resolveFileUrl(classInfo.logoUrl)}
                        alt={classInfo.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[22px] font-heading font-bold text-white">
                        {classInfo.name.charAt(0)}
                      </span>
                    )}
                    <span className="absolute bottom-0.5 right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-black/35">
                      <Camera className="h-3 w-3 text-white" strokeWidth={2} />
                    </span>
                    {uploadingLogo && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Loader2 className="h-5 w-5 animate-spin text-white" strokeWidth={2} />
                      </span>
                    )}
                  </button>
                ) : (
                  <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-white/15 overflow-hidden">
                    {classInfo.logoUrl ? (
                      <img
                        src={resolveFileUrl(classInfo.logoUrl)}
                        alt={classInfo.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[22px] font-heading font-bold text-white">
                        {classInfo.name.charAt(0)}
                      </span>
                    )}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-row items-center gap-2">
                    <span className="truncate text-[21px] font-heading font-bold text-white">
                      {classInfo.name}
                    </span>
                    <span className="shrink-0 rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-body font-medium text-white">
                      {orgMeta.label}
                    </span>
                  </div>
                  <div className="mt-1 truncate text-[12px] font-body text-white/75">
                    {[classInfo.grade, classInfo.major].filter(Boolean).join(' · ') || '欢迎回来，一起把班级事务管清楚'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQr(true)}
                  aria-label="查看班级二维码"
                  className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-white/15 active:bg-white/25 transition-colors"
                >
                  <QrCode className="w-[21px] h-[21px] text-white" strokeWidth={2} />
                </button>
              </div>

              <div className="relative flex flex-row items-center gap-2.5">
                <div className="rounded-lg bg-white/12 px-2.5 py-1 text-[12px] font-body font-medium text-white">
                  {classInfo.memberCount ?? members.length} 人
                </div>
                <button
                  type="button"
                  onClick={() => copyText(classInfo.code, '班级码已复制')}
                  className="flex flex-row items-center gap-1.5 rounded-lg bg-white/12 px-2.5 py-1 text-[12px] font-body font-medium text-white active:bg-white/20"
                >
                  班级码 {formattedCode}
                  <Copy className="h-3.5 w-3.5 text-white/80" strokeWidth={2} />
                </button>
              </div>

              <div className="relative flex flex-row items-center justify-between gap-2">
                <div className="flex min-w-0 flex-row items-center gap-2.5">
                  <div className="flex shrink-0 flex-row items-center">
                    {rankedMembers.slice(0, 5).map((m, idx) => (
                      <div
                        key={m.id}
                        className="flex h-[28px] w-[28px] items-center justify-center overflow-hidden rounded-full ring-2 ring-[#0055E0]"
                        style={{
                          marginLeft: idx === 0 ? 0 : -8,
                          backgroundColor: m.avatar ? '#fff' : avatarColor(m.name),
                        }}
                      >
                        {m.avatar ? (
                          <img src={m.avatar} alt={m.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[11px] font-body font-semibold text-white">{m.name.charAt(0)}</span>
                        )}
                      </div>
                    ))}
                    {members.length > 5 && (
                      <div className="flex h-[28px] min-w-[28px] items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-body font-medium text-white ring-2 ring-[#0055E0]" style={{ marginLeft: -8 }}>
                        +{members.length - 5}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/member-list')}
                  className="flex shrink-0 flex-row items-center gap-0.5 whitespace-nowrap text-[12px] font-body font-medium text-white/85 active:opacity-70"
                >
                  成员
                  <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
              <div className="relative mt-1.5 truncate text-[12px] font-body text-white/80">
                {owner ? `群主 ${owner.name}` : '班级成员'}
                {admins.length > 0 ? ` · ${admins.length} 位管理员` : ''}
              </div>
            </div>
          ) : null}

          {/* 班级公告 */}
          {classInfo?.announcement && classInfo.announcement.trim() && (
            <button
              type="button"
              onClick={() => setAnnouncementExpanded((v) => !v)}
              className="box-border w-full flex flex-row items-start gap-3 rounded-2xl bg-white p-4 text-left shadow-soft active:scale-[0.99] transition-transform"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF7ED]">
                <Bell className="h-[18px] w-[18px] text-[#F97316]" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-row items-center gap-2">
                  <span className="text-[12px] font-body font-semibold text-[#9A3412]">班级公告</span>
                  <span className="text-[10px] font-body text-[#C2410C]/60">点击{announcementExpanded ? '收起' : '展开'}</span>
                </div>
                <div className={`mt-1 text-[13px] font-body leading-relaxed text-[#4B5563] ${announcementExpanded ? '' : 'line-clamp-2'}`}>
                  {classInfo.announcement}
                </div>
              </div>
            </button>
          )}

          {/* 班级资料 */}
          <div className="box-border w-full rounded-2xl bg-white p-4 shadow-soft">
            <div className="mb-1 text-[15px] font-heading font-semibold text-[#1A1A1A]">班级资料</div>
            {archiveItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`flex w-full flex-row items-center gap-3 py-3 text-left active:opacity-70 ${
                    idx < archiveItems.length - 1 ? 'border-b border-[#F3F4F6]' : ''
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EBF3FF]">
                    <Icon className="h-[18px] w-[18px] text-[#0062FF]" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-body font-medium text-[#1A1A1A]">{item.title}</div>
                    <div className="mt-0.5 truncate text-[11px] font-body text-[#9CA3AF]">{item.subtitle}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#C0C4CC]" strokeWidth={2} />
                </button>
              );
            })}
          </div>

          {/* 班级管理（仅班委可见） */}
          {isManager && (
            <div className="box-border w-full rounded-2xl bg-white p-4 shadow-soft">
              <div className="mb-1 flex flex-row items-center justify-between">
                <div className="text-[15px] font-heading font-semibold text-[#1A1A1A]">班级管理</div>
                <div className="rounded-full bg-[#EBF3FF] px-2 py-0.5 text-[10px] font-body font-medium text-[#0062FF]">仅班委可见</div>
              </div>
              {manageItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => navigate(item.path)}
                    className={`flex w-full flex-row items-center gap-3 py-3 text-left active:opacity-70 ${
                      idx < manageItems.length - 1 ? 'border-b border-[#F3F4F6]' : ''
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F3F4F6]">
                      <Icon className="h-[18px] w-[18px] text-[#4B5563]" strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-body font-medium text-[#1A1A1A]">{item.title}</div>
                      <div className="mt-0.5 truncate text-[11px] font-body text-[#9CA3AF]">{item.subtitle}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#C0C4CC]" strokeWidth={2} />
                  </button>
                );
              })}
            </div>
          )}

          {/* 邀请卡片 */}
          <div className="box-border w-full rounded-2xl bg-[#EBF3FF] p-4">
            <div className="flex flex-row items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-heading font-semibold text-[#1A1A1A]">邀请同学加入</div>
                <div className="mt-1 text-[11px] font-body text-[#6B7280]">
                  班级码 <span className="font-data font-bold tracking-wide text-[#0062FF]">{formattedCode}</span>
                </div>
              </div>
              <div className="flex flex-row items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyText(classInfo?.code || '', '班级码已复制')}
                  className="flex h-9 items-center gap-1 rounded-lg bg-white px-3 text-[12px] font-body font-medium text-[#0062FF] shadow-soft active:scale-95 transition-transform"
                >
                  <Copy className="h-3.5 w-3.5" strokeWidth={2} />
                  复制
                </button>
                <button
                  type="button"
                  onClick={() => setShowQr(true)}
                  className="flex h-9 items-center gap-1 rounded-lg bg-[#0062FF] px-3 text-[12px] font-body font-medium text-white active:scale-95 transition-transform"
                >
                  <Share2 className="h-3.5 w-3.5" strokeWidth={2} />
                  二维码
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 二维码抽屉 */}
        <BottomSheet
          open={showQr}
          onClose={() => setShowQr(false)}
          title="邀请同学加入"
          subtitle={classInfo?.name}
          maxHeight="80vh"
          footer={
            <div className="flex flex-row gap-2.5">
              <button
                type="button"
                onClick={() => copyText(classInfo?.code || '', '班级码已复制')}
                className="h-[48px] flex-1 rounded-[14px] bg-[#F2F5F9] font-body text-[15px]/[normal] font-semibold text-[#475569] active:opacity-80"
              >
                复制班级码
              </button>
              <button
                type="button"
                onClick={() => setShowQr(false)}
                className="h-[48px] flex-1 rounded-[14px] bg-[linear-gradient(180deg,#2E7DFF_0%,#0062FF_100%)] font-body text-[15px]/[normal] font-semibold text-white shadow-[0_10px_20px_rgba(0,98,255,0.24)] active:opacity-90"
              >
                完成
              </button>
            </div>
          }
        >
          <div className="flex flex-col items-center gap-4 px-5 pb-2">
            {classInfo?.qrCodeUrl ? (
              <img
                src={classInfo.qrCodeUrl}
                alt="班级二维码"
                className="h-[220px] w-[220px] rounded-2xl border-2 border-[#EBF3FF]"
              />
            ) : (
              <div className="flex h-[220px] w-[220px] flex-col items-center justify-center gap-2 rounded-2xl bg-[#F3F4F6] font-body text-[13px]/[normal] text-[#9CA3AF]">
                <QrCode className="h-8 w-8 text-[#9CA3AF]" strokeWidth={1.5} />
                二维码未生成
                {isManager && (
                  <button
                    type="button"
                    onClick={handleGenerateQr}
                    disabled={generatingQr}
                    className="mt-1 h-[32px] rounded-lg bg-[#0062FF] px-4 font-body text-[12px]/[normal] font-semibold text-white active:opacity-80 disabled:bg-[#93C5FD]"
                  >
                    {generatingQr ? '生成中...' : '生成二维码'}
                  </button>
                )}
              </div>
            )}
            <div className="flex flex-col items-center gap-1">
              <div className="font-body text-[13px]/[normal] font-medium text-[#6B7280]">班级码：{formattedCode}</div>
              <div className="text-center font-body text-[11px]/[normal] text-[#9CA3AF]">
                {classInfo?.qrCodeUrl ? '同学扫描此二维码即可加入班级' : '生成二维码后可分享给同学扫码加入'}
              </div>
            </div>
          </div>
        </BottomSheet>
      </div>
    </PhoneFrame>
  );
}
