import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import StatusBar from '@/components/layout/StatusBar';
import BottomSheet from '@/components/ui/BottomSheet';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getOrgTypeMeta } from '@/utils/org';
import { isOwner } from '@/utils/role';
import {
  Archive,
  Bell,
  ChevronRight,
  Copy,
  DoorOpen,
  FolderOpen,
  LogOut,
  Pencil,
  QrCode,
  Settings,
  Trash2,
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

export default function ClassSettings() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const classId = user?.classId;
  const ownerRole = isOwner(user?.roleLevel);
  const canManage = ownerRole || user?.roleLevel === 'admin';

  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [generatingQr, setGeneratingQr] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [form, setForm] = useState({ name: '', announcement: '', grade: '', major: '' });
  const [dissolveOpen, setDissolveOpen] = useState(false);
  const [dissolveInput, setDissolveInput] = useState('');
  const [dissolving, setDissolving] = useState(false);

  const fetchClass = async () => {
    if (!classId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const classRes = await api.get(`/classes/${classId}`);
      setClassInfo(classRes.data?.data || classRes.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '获取班级信息失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClass();
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

  const handleGenerateQr = async () => {
    if (!classId || generatingQr) return;
    setGeneratingQr(true);
    try {
      const res = await api.post(`/classes/${classId}/qrcode`);
      const url = res.data?.data?.qrCodeUrl || res.data?.qrCodeUrl;
      if (url) setClassInfo((prev) => (prev ? { ...prev, qrCodeUrl: url } : prev));
      toast.success('二维码已生成');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '生成二维码失败');
    } finally {
      setGeneratingQr(false);
    }
  };

  const handleLeave = async () => {
    if (!classId || leaving) return;
    setLeaving(true);
    try {
      await api.post(`/classes/${classId}/leave`);
      localStorage.removeItem('currentOrgId');
      window.dispatchEvent(new Event('orgChanged'));
      toast.success('已退出班级');
      setShowLeaveConfirm(false);
      navigate('/join-class', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '退出班级失败');
    } finally {
      setLeaving(false);
    }
  };

  const openEdit = () => {
    if (!classInfo) return;
    setForm({
      name: classInfo.name || '',
      announcement: classInfo.announcement || '',
      grade: classInfo.grade || '',
      major: classInfo.major || '',
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!classId || !classInfo || saveLoading) return;
    if (!form.name.trim()) {
      toast.error('班级名称不能为空');
      return;
    }
    setSaveLoading(true);
    try {
      const res = await api.patch(`/classes/${classId}`, {
        name: form.name.trim(),
        announcement: form.announcement,
        grade: form.grade,
        major: form.major,
      });
      const updated = res.data?.data || res.data;
      setClassInfo((prev) =>
        prev
          ? {
              ...prev,
              name: updated.name ?? prev.name,
              announcement: updated.announcement ?? null,
              grade: updated.grade ?? undefined,
              major: updated.major ?? undefined,
            }
          : prev,
      );
      window.dispatchEvent(new Event('classInfoChanged'));
      toast.success('班级信息已更新');
      setEditOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDissolve = async () => {
    if (!classId || !classInfo || dissolving) return;
    if (dissolveInput.trim() !== classInfo.name.trim()) {
      toast.error('请输入完整的班级名称以确认');
      return;
    }
    setDissolving(true);
    try {
      await api.delete(`/classes/${classId}`);
      localStorage.removeItem('currentOrgId');
      window.dispatchEvent(new Event('orgChanged'));
      toast.success('班级已解散');
      setDissolveOpen(false);
      navigate('/join-class', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '解散班级失败');
    } finally {
      setDissolving(false);
    }
  };

  const formattedCode = classInfo?.code
    ? classInfo.code.length > 4
      ? `${classInfo.code.slice(0, 4)} ${classInfo.code.slice(4)}`
      : classInfo.code
    : '';
  const orgMeta = getOrgTypeMeta(classInfo?.orgType);
  const totalMembers = classInfo?.memberCount ?? 0;

  const infoRows = [
    { label: '人数', value: `${totalMembers} 人` },
    { label: '年级', value: classInfo?.grade || '未填写' },
    { label: '专业/方向', value: classInfo?.major || '未填写' },
    { label: '组织类型', value: orgMeta.label },
  ];

  const manageRows = [
    { title: '班级成员', subtitle: `查看和管理 ${totalMembers} 位成员`, icon: Users, path: '/member-list' },
    ...(canManage
      ? [{ title: '导入学生名单', subtitle: '支持 Excel、教务系统、班级群导入', icon: Upload, path: '/import-students' }]
      : []),
    { title: '班级资料库', subtitle: '文件、图片与常用资料', icon: FolderOpen, path: '/material-library' },
    { title: '班级档案', subtitle: '荣誉、活动与班级成长记录', icon: Archive, path: '/class-archive' },
  ];

  return (
    <PhoneFrame reserveSafeAreaTop safeAreaTopClassName="bg-[#F7F8FA]">
      <StatusBar />

      <div className="box-border w-full flex-1 flex flex-col gap-4 px-5 pb-6 bg-[#F7F8FA]">
        <div className="w-full h-2 shrink-0" />

        <div className="flex w-full flex-row items-center gap-0">
          <BackButton className="-ml-2" />
          <div className="text-[20px]/[normal] text-[#1A1A1A] font-heading font-bold">班级设置</div>
        </div>

        {!classId ? (
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
        ) : loading ? (
          <div className="flex flex-col gap-3">
            <div className="h-[190px] w-full animate-pulse rounded-2xl bg-white shadow-soft" />
            <div className="h-[230px] w-full animate-pulse rounded-2xl bg-white shadow-soft" />
          </div>
        ) : classInfo ? (
          <>
            {/* 班级信息 */}
            <div className="flex w-full flex-col gap-4 rounded-2xl bg-white p-4 shadow-soft">
              <div className="flex flex-row items-center gap-3">
                <div className="flex h-[54px] w-[54px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#EBF3FF]">
                  {classInfo.logoUrl ? (
                    <img src={classInfo.logoUrl} alt={classInfo.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[22px] font-heading font-bold text-[#0062FF]">{classInfo.name.charAt(0)}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-row items-center gap-2">
                    <span className="truncate text-[18px] font-heading font-bold text-[#1A1A1A]">{classInfo.name}</span>
                  </div>
                  <div className="mt-1 flex flex-row items-center gap-1.5">
                    <span className="shrink-0 rounded-md bg-[#EBF3FF] px-1.5 py-0.5 text-[10px] font-body font-medium text-[#0062FF]">
                      {orgMeta.label}
                    </span>
                    <span className="truncate text-[12px] font-body text-[#6B7280]">
                      {[classInfo.grade, classInfo.major].filter(Boolean).join(' · ') || '班级信息'}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-row items-center gap-2">
                  {canManage && (
                    <button
                      type="button"
                      onClick={openEdit}
                      aria-label="编辑班级信息"
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EBF3FF] active:scale-95 transition-transform"
                    >
                      <Pencil className="h-[18px] w-[18px] text-[#0062FF]" strokeWidth={2} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowQr(true)}
                    aria-label="查看班级二维码"
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3F4F6] active:scale-95 transition-transform"
                  >
                    <QrCode className="h-5 w-5 text-[#4B5563]" strokeWidth={2} />
                  </button>
                </div>
              </div>

              <div className="flex flex-row items-center justify-between rounded-xl bg-[#F7F8FA] px-3.5 py-3">
                <div>
                  <div className="text-[11px] font-body text-[#9CA3AF]">班级码</div>
                  <div className="mt-0.5 text-[18px] font-data font-bold tracking-wider text-[#0062FF]">{formattedCode}</div>
                </div>
                <button
                  type="button"
                  onClick={() => copyText(classInfo.code, '班级码已复制')}
                  className="flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-[12px] font-body font-medium text-[#0062FF] shadow-soft active:scale-95 transition-transform"
                >
                  <Copy className="h-3.5 w-3.5" strokeWidth={2} />
                  复制
                </button>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {infoRows.map((row) => (
                  <div key={row.label} className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-body text-[#9CA3AF]">{row.label}</span>
                    <span className="truncate text-[13px] font-body font-medium text-[#1A1A1A]">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 班级公告 */}
            {classInfo.announcement && classInfo.announcement.trim() && (
              <div className="flex w-full flex-col gap-2 rounded-2xl bg-white p-4 shadow-soft">
                <div className="flex flex-row items-center justify-between">
                  <div className="flex flex-row items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FFF7ED]">
                      <Bell className="h-3.5 w-3.5 text-[#F97316]" strokeWidth={2} />
                    </div>
                    <span className="text-[14px] font-heading font-semibold text-[#1A1A1A]">班级公告</span>
                  </div>
                  {canManage && (
                    <span className="rounded-full bg-[#FFF7ED] px-2 py-0.5 text-[10px] font-body text-[#C2410C]">班级主页可查看</span>
                  )}
                </div>
                <div className="text-[13px] font-body leading-relaxed text-[#4B5563] whitespace-pre-wrap">
                  {classInfo.announcement}
                </div>
              </div>
            )}

            {/* 管理入口 */}
            <div className="flex w-full flex-col rounded-2xl bg-white p-4 shadow-soft">
              <div className="mb-1 text-[14px] font-heading font-semibold text-[#1A1A1A]">班级管理</div>
              {manageRows.map((row, idx) => {
                const Icon = row.icon;
                return (
                  <button
                    key={row.title}
                    type="button"
                    onClick={() => navigate(row.path)}
                    className={`flex w-full flex-row items-center gap-3 py-3 text-left active:opacity-70 ${
                      idx < manageRows.length - 1 ? 'border-b border-[#F3F4F6]' : ''
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F3F4F6]">
                      <Icon className="h-[18px] w-[18px] text-[#4B5563]" strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-body font-medium text-[#1A1A1A]">{row.title}</div>
                      <div className="mt-0.5 truncate text-[11px] font-body text-[#9CA3AF]">{row.subtitle}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#C0C4CC]" strokeWidth={2} />
                  </button>
                );
              })}
            </div>

            {/* 邀请 */}
            <div className="flex w-full flex-row items-center justify-between gap-3 rounded-2xl bg-[#EBF3FF] p-4">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-heading font-semibold text-[#1A1A1A]">邀请同学加入班级</div>
                <div className="mt-1 text-[11px] font-body text-[#6B7280]">分享班级码或二维码，同学即可加入</div>
              </div>
              <button
                type="button"
                onClick={() => setShowQr(true)}
                className="flex h-9 shrink-0 items-center gap-1 rounded-lg bg-[#0062FF] px-3 text-[12px] font-body font-medium text-white active:scale-95 transition-transform"
              >
                <QrCode className="h-3.5 w-3.5" strokeWidth={2} />
                二维码
              </button>
            </div>

            {/* 退出班级 */}
            <div className="flex w-full flex-col rounded-2xl bg-white p-4 shadow-soft">
              <div className="mb-1 text-[14px] font-heading font-semibold text-[#1A1A1A]">账号与班级</div>
              {ownerRole ? (
                <div className="flex flex-col gap-3 py-2">
                  <div className="flex flex-row items-start gap-3 rounded-xl bg-[#FFF7ED] px-3 py-3">
                    <Settings className="mt-0.5 h-4 w-4 shrink-0 text-[#F97316]" strokeWidth={2} />
                    <div className="text-[12px] font-body leading-relaxed text-[#9A3412]">
                      你是群主，不能直接退出班级。如需退出，请先在成员列表中把群主转让给其他成员。
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/member-list')}
                    className="flex h-[44px] w-full items-center justify-center rounded-xl bg-[#F3F4F6] text-[14px] font-body font-medium text-[#4B5563] active:opacity-80"
                  >
                    去成员列表转让群主
                  </button>
                  <div className="my-1 h-px w-full bg-[#F3F4F6]" />
                  <button
                    type="button"
                    onClick={() => {
                      setDissolveInput('');
                      setDissolveOpen(true);
                    }}
                    className="flex w-full flex-row items-center gap-3 py-2 text-left active:opacity-70"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FEF2F2]">
                      <Trash2 className="h-[18px] w-[18px] text-[#DC2626]" strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-body font-medium text-[#DC2626]">解散班级</div>
                      <div className="mt-0.5 text-[11px] font-body text-[#9CA3AF]">
                        解散后所有成员将无法访问该班级
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#C0C4CC]" strokeWidth={2} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowLeaveConfirm(true)}
                  className="flex w-full flex-row items-center gap-3 py-3 text-left active:opacity-70"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FEF2F2]">
                    <LogOut className="h-[18px] w-[18px] text-[#DC2626]" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-body font-medium text-[#DC2626]">退出班级</div>
                    <div className="mt-0.5 text-[11px] font-body text-[#9CA3AF]">退出后将无法查看该班级内容</div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#C0C4CC]" strokeWidth={2} />
                </button>
              )}
            </div>

            {!canManage && (
              <div className="text-center text-[11px] font-body text-[#9CA3AF]">
                如需修改班级信息或公告，请联系群主或管理员
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 py-16">
            <DoorOpen className="h-10 w-10 text-[#D1D5DB]" strokeWidth={1.5} />
            <div className="text-[14px] font-body text-[#4B5563]">班级信息加载失败</div>
            <button
              type="button"
              onClick={fetchClass}
              className="rounded-lg bg-[#0062FF] px-5 py-2.5 text-[13px] font-body font-semibold text-white active:opacity-80"
            >
              重试
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showLeaveConfirm}
        title="确认退出该班级？"
        description="退出后将无法查看该班级的通知、作业、资料和考勤记录，如需重新加入需要使用新的班级码。"
        confirmText="确认退出"
        danger
        loading={leaving}
        onCancel={() => {
          if (!leaving) setShowLeaveConfirm(false);
        }}
        onConfirm={handleLeave}
      />

      {/* 编辑班级信息 */}
      {editOpen && classInfo && (
        <BottomSheet
          open
          onClose={() => setEditOpen(false)}
          title="编辑班级信息"
          maxHeight="90vh"
          locked={saveLoading}
          footer={
            <div className="flex flex-row gap-3">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                disabled={saveLoading}
                className="h-[48px] flex-1 rounded-[14px] bg-[#F2F5F9] font-body text-[15px]/[normal] font-semibold text-[#475569] active:opacity-80 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saveLoading || !form.name.trim()}
                className="h-[48px] flex-1 rounded-[14px] bg-[linear-gradient(180deg,#2E7DFF_0%,#0062FF_100%)] font-body text-[15px]/[normal] font-semibold text-white shadow-[0_10px_20px_rgba(0,98,255,0.24)] active:opacity-90 disabled:opacity-50"
              >
                {saveLoading ? '保存中...' : '保存'}
              </button>
            </div>
          }
        >
          <div className="flex flex-col gap-4 px-5 pb-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-body text-[#6B7280]">班级名称</label>
              <input
                value={form.name}
                maxLength={100}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="请输入班级名称"
                className="h-[44px] w-full rounded-xl border border-[#E5E7EB] bg-white px-3.5 text-[14px] font-body text-[#1A1A1A] outline-none focus:border-[#0062FF]"
              />
            </div>

            <div className="flex flex-row gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <label className="text-[12px] font-body text-[#6B7280]">年级</label>
                <input
                  value={form.grade}
                  maxLength={20}
                  onChange={(e) => setForm((prev) => ({ ...prev, grade: e.target.value }))}
                  placeholder="如 2024级"
                  className="h-[44px] w-full rounded-xl border border-[#E5E7EB] bg-white px-3.5 text-[14px] font-body text-[#1A1A1A] outline-none focus:border-[#0062FF]"
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <label className="text-[12px] font-body text-[#6B7280]">专业/方向</label>
                <input
                  value={form.major}
                  maxLength={100}
                  onChange={(e) => setForm((prev) => ({ ...prev, major: e.target.value }))}
                  placeholder="如 软件工程"
                  className="h-[44px] w-full rounded-xl border border-[#E5E7EB] bg-white px-3.5 text-[14px] font-body text-[#1A1A1A] outline-none focus:border-[#0062FF]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex flex-row items-center justify-between">
                <label className="text-[12px] font-body text-[#6B7280]">班级公告</label>
                <span className="text-[10px] font-body text-[#9CA3AF]">{form.announcement.length}/2000</span>
              </div>
              <textarea
                value={form.announcement}
                maxLength={2000}
                rows={4}
                onChange={(e) => setForm((prev) => ({ ...prev, announcement: e.target.value }))}
                placeholder="发布班务提醒、活动安排等"
                className="w-full resize-none rounded-xl border border-[#E5E7EB] bg-white p-3 text-[13px] font-body leading-relaxed text-[#1A1A1A] outline-none focus:border-[#0062FF]"
              />
            </div>

          </div>
        </BottomSheet>
      )}

      {/* 解散班级 */}
      {dissolveOpen && classInfo && (
        <BottomSheet
          open
          onClose={() => setDissolveOpen(false)}
          title="解散班级"
          maxHeight="80vh"
          locked={dissolving}
          footer={
            <div className="flex flex-row gap-3">
              <button
                type="button"
                onClick={() => setDissolveOpen(false)}
                disabled={dissolving}
                className="h-[48px] flex-1 rounded-[14px] bg-[#F2F5F9] font-body text-[15px]/[normal] font-semibold text-[#475569] active:opacity-80 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleDissolve}
                disabled={dissolving || dissolveInput.trim() !== classInfo.name.trim()}
                className="h-[48px] flex-1 rounded-[14px] bg-[linear-gradient(180deg,#F76B6B_0%,#E5484D_100%)] font-body text-[15px]/[normal] font-semibold text-white shadow-[0_10px_20px_rgba(229,72,77,0.24)] active:opacity-90 disabled:opacity-50"
              >
                {dissolving ? '解散中...' : '确认解散'}
              </button>
            </div>
          }
        >
          <div className="flex flex-col gap-4 px-5 pb-2">
            <div className="text-[13px] font-body leading-relaxed text-[#4B5563]">
              解散后，所有成员将立即无法访问该班级的通知、作业、资料和考勤数据。此操作不可撤销。
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-[12px] font-body text-[#6B7280]">
                请输入班级名称 <span className="font-semibold text-[#DC2626]">{classInfo.name}</span> 以确认
              </div>
              <input
                value={dissolveInput}
                onChange={(e) => setDissolveInput(e.target.value)}
                placeholder={classInfo.name}
                className="h-[44px] w-full rounded-xl border border-[#E5E7EB] bg-white px-3.5 text-[14px] font-body text-[#1A1A1A] outline-none focus:border-[#DC2626]"
              />
            </div>
          </div>
        </BottomSheet>
      )}

      {/* 二维码弹窗 */}
      {showQr && classInfo && (
        <BottomSheet
          open
          onClose={() => setShowQr(false)}
          title={classInfo.name}
          maxHeight="80vh"
          footer={
            <div className="flex flex-row gap-3">
              <button
                type="button"
                onClick={() => copyText(classInfo.code, '班级码已复制')}
                className="h-[48px] flex-1 rounded-[14px] bg-[#F2F5F9] font-body text-[15px]/[normal] font-semibold text-[#475569] active:opacity-80"
              >
                复制班级码
              </button>
              <button
                type="button"
                onClick={() => setShowQr(false)}
                className="h-[48px] flex-1 rounded-[14px] bg-[linear-gradient(180deg,#2E7DFF_0%,#0062FF_100%)] font-body text-[15px]/[normal] font-semibold text-white shadow-[0_10px_20px_rgba(0,98,255,0.24)] active:opacity-90"
              >
                关闭
              </button>
            </div>
          }
        >
          <div className="flex flex-col items-center gap-5 px-5 pb-2">
            {classInfo.qrCodeUrl ? (
              <img
                src={classInfo.qrCodeUrl}
                alt="班级二维码"
                className="h-[220px] w-[220px] rounded-xl border-2 border-[#EBF3FF]"
              />
            ) : (
              <div className="flex h-[220px] w-[220px] flex-col items-center justify-center gap-2 rounded-xl bg-[#F3F4F6] text-[13px] text-[#9CA3AF]">
                <QrCode className="h-8 w-8 text-[#9CA3AF]" strokeWidth={1.5} />
                二维码未生成
                {canManage && (
                  <button
                    type="button"
                    onClick={handleGenerateQr}
                    disabled={generatingQr}
                    className="mt-1 h-[32px] rounded-lg bg-[#0062FF] px-4 text-[12px] font-body font-semibold text-white active:opacity-80 disabled:bg-[#93C5FD]"
                  >
                    {generatingQr ? '生成中...' : '生成二维码'}
                  </button>
                )}
              </div>
            )}
            <div className="flex flex-col items-center gap-1">
              <div className="text-[13px] font-medium text-[#6B7280]">班级码：{formattedCode}</div>
              <div className="text-[11px] text-[#9CA3AF]">同学扫描二维码或输入班级码即可加入</div>
            </div>
          </div>
        </BottomSheet>
      )}
    </PhoneFrame>
  );
}
