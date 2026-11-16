import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Ban,
  Calendar,
  ChevronLeft,
  Inbox,
  Lock,
  Megaphone,
  Star,
  UserRound,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useStatusBarStyle } from '@/hooks/useStatusBarStyle';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Member {
  userId: string;
  studentId: string | null;
  name: string | null;
}

interface DrawDetail {
  id: string;
  title: string;
  mainCount: number;
  backupCount: number;
  main: Member[];
  backup: Member[];
  createdAt: string;
  createdBy?: string | null;
  createdById?: string | null;
  isCommitteeDraw?: boolean;
  isPublic?: boolean;
  publicizedAt?: string | null;
  status?: string;
}

/** 名单头像底色：按序号循环，避免整列同色 */
const AVATAR_BG = [
  'linear-gradient(135deg, #7CC4F5 0%, #2B7FCC 100%)',
  'linear-gradient(135deg, #FFC2D3 0%, #E24E7C 100%)',
  'linear-gradient(135deg, #FFD79A 0%, #E2841C 100%)',
  'linear-gradient(135deg, #A7E8B8 0%, #48B264 100%)',
  'linear-gradient(135deg, #C4B5FD 0%, #7C5FE0 100%)',
];

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function MetaRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex shrink-0 items-center gap-1.5 text-[12px]/[normal] text-[#8AA6BD]">
        {icon}
        {label}
      </span>
      <span className="min-w-0 truncate text-[12px]/[normal] font-medium text-[#1F2937]">{value}</span>
    </div>
  );
}

function StatCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5">
      <span className={cn('font-data text-[18px]/[normal] font-bold', color)}>{value}</span>
      <span className="text-[10px]/[normal] text-[#8AA6BD]">{label}</span>
    </div>
  );
}

export default function DrawRecordDetail() {
  useStatusBarStyle(false); // 浅蓝渐变头部 → 系统状态栏深色图标
  const navigate = useNavigate();
  const { drawId } = useParams<{ drawId: string }>();
  const { user } = useCurrentUser();
  const classId = user?.classId;

  const [detail, setDetail] = useState<DrawDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!classId || !drawId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .get(`/classes/${classId}/random-draws/${drawId}`)
      .then((res) => {
        if (!cancelled) setDetail(res.data.data);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[DrawRecordDetail] error:', err);
        toast.error('加载抽签详情失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [classId, drawId]);

  const isCommittee = user?.roleLevel === 'owner' || user?.roleLevel === 'admin';

  const refresh = async () => {
    if (!classId || !drawId) return;
    const res = await api.get(`/classes/${classId}/random-draws/${drawId}`);
    setDetail(res.data.data);
  };

  const handleCancel = async () => {
    if (!classId || !drawId) return;
    if (!window.confirm('确定作废本次抽签？作废后不可恢复')) return;
    setCancelling(true);
    try {
      await api.post(`/classes/${classId}/random-draws/${drawId}/cancel`);
      toast.success('已作废');
      await refresh();
    } catch (err: any) {
      toast.error(err.message || '作废失败');
    } finally {
      setCancelling(false);
    }
  };

  const handlePublish = async () => {
    if (!classId || !drawId) return;
    if (!window.confirm('确定将本次抽签结果公示给全班？公示后会向全班发送通知')) return;
    setPublishing(true);
    try {
      await api.post(`/classes/${classId}/random-draws/${drawId}/publish`);
      toast.success('已公示给全班');
      await refresh();
    } catch (err: any) {
      toast.error(err.message || '公示失败');
    } finally {
      setPublishing(false);
    }
  };

  const renderMember = (member: Member, index: number) => (
    <div key={`${member.userId}-${index}`} className="flex items-center gap-3 py-2.5">
      <span className="w-4 shrink-0 text-center font-data text-[12px]/[normal] font-semibold text-[#A9BFD2]">
        {index + 1}
      </span>
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px]/[normal] font-semibold text-white"
        style={{ background: AVATAR_BG[index % AVATAR_BG.length] }}
      >
        {member.name?.[0] || '?'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px]/[normal] font-medium text-[#1A1A1A]">
          {member.name || '未知'}
        </div>
        {member.studentId && (
          <div className="mt-0.5 truncate text-[11px]/[normal] text-[#8AA6BD]">
            学号 {member.studentId}
          </div>
        )}
      </div>
    </div>
  );

  const canManage = !!detail && isCommittee && !!detail.isCommitteeDraw && detail.status !== 'cancelled';

  return (
    <div className="flex min-h-[100dvh] w-full items-start justify-center overflow-x-hidden overflow-y-auto bg-gray-200 sm:items-center sm:p-6">
      <div
        className="relative flex h-[100dvh] w-full flex-col overflow-hidden sm:h-phone sm:w-phone sm:rounded-device sm:shadow-lift"
        style={{ backgroundImage: 'linear-gradient(180deg, #D8EDFF 0%, #EAF5FF 46%, #F8FCFF 100%)' }}
      >
        {/* Status Bar */}
        <div className="box-border flex h-[62px] w-full shrink-0 flex-row items-center justify-between gap-0 bg-transparent p-[12px_24px_0px_24px]">
          <div className="font-data text-[14px]/[normal] font-semibold text-[#12395C]">9:41</div>
          <div className="flex h-fit w-fit shrink-0 flex-row items-center justify-start gap-[6px]">
            <div className="font-caption text-[14px]/[normal] font-normal text-[#12395C]">◉◉◉◉</div>
            <div className="font-data text-[14px]/[normal] font-normal text-[#12395C]">100%</div>
          </div>
        </div>

        {/* Header */}
        <div className="relative box-border flex h-[48px] w-full shrink-0 flex-row items-center justify-between px-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 shrink-0 items-center justify-center text-[#12395C] transition-opacity active:opacity-60"
            aria-label="返回"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2} />
          </button>
          <div className="font-heading text-[17px]/[normal] font-bold text-[#12395C]">抽签详情</div>
          <div className="w-10" />
        </div>

        {loading ? (
          <div className="flex w-full flex-1 flex-col gap-3 px-4 pt-1">
            <div className="h-[180px] animate-pulse rounded-[20px] bg-white/80" />
            <div className="h-[188px] animate-pulse rounded-[20px] bg-white/80" />
          </div>
        ) : !detail ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 pb-16">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/70">
              <Inbox className="h-9 w-9 text-[#B9D4E8]" strokeWidth={1.6} />
            </div>
            <div className="text-[14px]/[normal] font-medium text-[#5B87A8]">记录不存在或无权查看</div>
            <button
              type="button"
              onClick={() => navigate('/draw-records')}
              className="mt-1 rounded-full bg-gradient-to-r from-[#4EA6EA] to-[#2B7FCC] px-5 py-2 text-[13px]/[normal] font-semibold text-white shadow-[0_6px_16px_rgba(43,127,204,0.28)] transition-transform active:scale-95"
            >
              返回中签记录
            </button>
          </div>
        ) : (
          <>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4">
              {/* 概览卡 */}
              <div className="relative shrink-0 overflow-hidden rounded-[20px] bg-white p-4 shadow-[0_2px_14px_rgba(18,57,92,0.07)]">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#5AA9F0] via-[#7CC4F5] to-[#B7E0FA]" />
                <div className="flex items-start justify-between gap-2">
                  <h1 className="min-w-0 text-[18px]/[1.4] font-bold text-[#12395C]">{detail.title}</h1>
                  {detail.status === 'cancelled' && (
                    <span className="mt-0.5 shrink-0 rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[10px]/[normal] font-medium text-[#DC2626]">
                      已作废
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px]/[normal] font-medium',
                      detail.isCommitteeDraw
                        ? 'bg-[#E0F2FE] text-[#0284C7]'
                        : 'bg-[#F3F4F6] text-[#6B7280]',
                    )}
                  >
                    {detail.isCommitteeDraw ? '班委抽签' : '个人抽签'}
                  </span>
                  {detail.isPublic && (
                    <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[10px]/[normal] font-medium text-[#16A34A]">
                      已公示
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-col gap-2 rounded-xl bg-[#F7FAFD] px-3 py-2.5">
                  <MetaRow
                    icon={<UserRound className="h-3.5 w-3.5" strokeWidth={2} />}
                    label="发起人"
                    value={detail.createdBy || '未知'}
                  />
                  <MetaRow
                    icon={<Calendar className="h-3.5 w-3.5" strokeWidth={2} />}
                    label="抽签时间"
                    value={formatDateTime(detail.createdAt)}
                  />
                  {detail.isPublic && detail.publicizedAt && (
                    <MetaRow
                      icon={<Megaphone className="h-3.5 w-3.5" strokeWidth={2} />}
                      label="公示时间"
                      value={formatDateTime(detail.publicizedAt)}
                    />
                  )}
                </div>

                <div className="mt-3 flex items-center rounded-xl border border-[#EAF1F8] py-2.5">
                  <StatCell label="正选" value={detail.main.length} color="text-[#E2841C]" />
                  <span className="h-7 w-px bg-[#EAF1F8]" />
                  <StatCell label="候补" value={detail.backup.length} color="text-[#64748B]" />
                  <span className="h-7 w-px bg-[#EAF1F8]" />
                  <StatCell
                    label="参与"
                    value={detail.main.length + detail.backup.length}
                    color="text-[#2B7FCC]"
                  />
                </div>
              </div>

              {/* 正选名单 */}
              <section className="mt-3 shrink-0 rounded-[20px] bg-white p-4 shadow-[0_2px_12px_rgba(18,57,92,0.06)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FEF3C7]">
                      <Star className="h-3.5 w-3.5 text-[#D97706]" fill="#F59E0B" strokeWidth={1.5} />
                    </span>
                    <span className="text-[15px]/[normal] font-semibold text-[#12395C]">正选名单</span>
                  </div>
                  <span className="rounded-full bg-[#FFFBEB] px-2 py-0.5 text-[10px]/[normal] font-semibold text-[#B45309]">
                    {detail.main.length} 人
                  </span>
                </div>
                <div className="mt-1 divide-y divide-[#F1F5F9]">
                  {detail.main.length > 0 ? (
                    detail.main.map((m, i) => renderMember(m, i))
                  ) : (
                    <div className="py-6 text-center text-[12px]/[normal] text-[#A9BFD2]">暂无正选成员</div>
                  )}
                </div>
              </section>

              {/* 候补名单 */}
              <section className="mt-3 shrink-0 rounded-[20px] bg-white p-4 shadow-[0_2px_12px_rgba(18,57,92,0.06)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F1F5F9]">
                      <Star className="h-3.5 w-3.5 text-[#94A3B8]" fill="#CBD5E1" strokeWidth={1.5} />
                    </span>
                    <span className="text-[15px]/[normal] font-semibold text-[#12395C]">候补名单</span>
                  </div>
                  <span className="rounded-full bg-[#F8FAFC] px-2 py-0.5 text-[10px]/[normal] font-semibold text-[#64748B]">
                    {detail.backup.length} 人
                  </span>
                </div>
                <div className="mt-1 divide-y divide-[#F1F5F9]">
                  {detail.backup.length > 0 ? (
                    detail.backup.map((m, i) => renderMember(m, i))
                  ) : (
                    <div className="py-6 text-center text-[12px]/[normal] text-[#A9BFD2]">本次没有候补成员</div>
                  )}
                </div>
              </section>

              {!detail.isCommitteeDraw && (
                <div className="mt-3 flex shrink-0 items-start gap-2 rounded-2xl bg-[#EEF4F9] px-3 py-2.5">
                  <Lock className="mt-[1px] h-3.5 w-3.5 shrink-0 text-[#64748B]" strokeWidth={2.2} />
                  <p className="text-[11px]/[1.5] text-[#64748B]">
                    个人发起的抽签记录仅自己可见，不会公示给全班。
                  </p>
                </div>
              )}
            </div>

            {/* 底部操作栏：仅班委可管理班委发起的抽签 */}
            {canManage && (
              <div
                className="shrink-0 border-t border-white/70 bg-white/85 px-4 pt-3 backdrop-blur-md"
                style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
              >
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={cancelling || publishing}
                    className="flex h-11 w-[104px] shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#F5C6C6] bg-[#FEF2F2] text-[13px]/[normal] font-semibold text-[#DC2626] transition-opacity active:opacity-70 disabled:opacity-50"
                  >
                    <Ban className="h-4 w-4" strokeWidth={2} />
                    {cancelling ? '作废中' : '作废'}
                  </button>
                  <button
                    type="button"
                    onClick={handlePublish}
                    disabled={publishing || !!detail.isPublic}
                    className={cn(
                      'flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl text-[14px]/[normal] font-semibold transition-opacity',
                      detail.isPublic
                        ? 'bg-[#E7F6EE] text-[#16A34A]'
                        : 'bg-gradient-to-r from-[#34D399] to-[#059669] text-white shadow-[0_6px_16px_rgba(5,150,105,0.25)] active:opacity-85',
                    )}
                  >
                    <Megaphone className="h-4 w-4" strokeWidth={2.2} />
                    {detail.isPublic ? '已公示给全班' : publishing ? '公示中...' : '一键公示给全班'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}