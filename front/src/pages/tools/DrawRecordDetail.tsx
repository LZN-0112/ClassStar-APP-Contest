import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Calendar, Star, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
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
  status?: string;
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function DrawRecordDetail() {
  const navigate = useNavigate();
  const { drawId } = useParams<{ drawId: string }>();
  const { user } = useCurrentUser();
  const classId = user?.classId;

  const [detail, setDetail] = useState<DrawDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!classId || !drawId) { setLoading(false); return; }
    setLoading(true);
    api.get(`/classes/${classId}/random-draws/${drawId}`)
      .then((res) => {
        setDetail(res.data.data);
      })
      .catch((err) => {
        console.error('[DrawRecordDetail] error:', err);
        toast.error('加载抽签详情失败');
      })
      .finally(() => setLoading(false));
  }, [classId, drawId]);

  const isCommittee = user?.roleLevel === 'owner' || user?.roleLevel === 'admin' || user?.isCommittee;

  const handleCancel = async () => {
    if (!classId || !drawId) return;
    if (!window.confirm('确定作废本次抽签？作废后不可恢复')) return;
    setCancelling(true);
    try {
      await api.post(`/classes/${classId}/random-draws/${drawId}/cancel`);
      toast.success('已作废');
      // 刷新详情
      const res = await api.get(`/classes/${classId}/random-draws/${drawId}`);
      setDetail(res.data.data);
    } catch (err: any) {
      toast.error(err.message || '作废失败');
    } finally {
      setCancelling(false);
    }
  };

  const renderMember = (member: Member, index: number) => (
    <div
      key={member.userId}
      className="box-border flex h-[36px] w-full shrink-0 flex-row items-center justify-start gap-3 rounded-lg bg-[#F3F4F6] p-[0px_12px]"
    >
      <div className="box-border flex h-[22px] w-[22px] shrink-0 flex-row items-center justify-center rounded-[6px] bg-[#1986E6]">
        <div className="text-left font-data text-[11px]/[normal] font-bold text-white">{index + 1}</div>
      </div>
      <div className="box-border flex h-[24px] w-[24px] shrink-0 flex-row items-center justify-center rounded-full bg-[#1986E6]">
        <div className="text-left font-body text-[11px]/[normal] font-semibold text-white">
          {member.name?.[0] || '?'}
        </div>
      </div>
      <div className="flex flex-col">
        <div className="text-left font-body text-[14px]/[normal] font-medium text-[#1F2937]">
          {member.name || '未知'}
        </div>
        {member.studentId && (
          <div className="text-left font-caption text-[11px]/[normal] text-[#9CA3AF]">
            学号: {member.studentId}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[100dvh] w-full items-start justify-center overflow-x-hidden overflow-y-auto bg-gray-200 sm:items-center sm:p-6">
      <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-background sm:h-phone sm:w-phone sm:rounded-device sm:shadow-lift">
        {/* Status Bar */}
        <div className="box-border flex h-[62px] w-full shrink-0 flex-row items-center justify-between gap-0 bg-[#85C5F4] p-[12px_24px_0px_24px]">
          <div className="box-border text-left font-data text-[14px]/[normal] font-semibold text-[#1A1A1A] [white-space:nowrap]">
            9:41
          </div>
          <div className="box-border flex h-fit w-fit shrink-0 flex-row items-center justify-start gap-[6px]">
            <div className="box-border text-left font-caption text-[14px]/[normal] font-normal text-[#1A1A1A] [white-space:nowrap]">
              ◉◉◉◉
            </div>
            <div className="box-border text-left font-data text-[14px]/[normal] font-normal text-[#1A1A1A] [white-space:nowrap]">
              100%
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative flex w-full flex-1 flex-col items-center justify-start gap-2 bg-cover bg-no-repeat p-[0px_0px_56px_0px] [background-image:linear-gradient(180deg,#85C5F4_0%,#F1F8FE_100%)]">
          {/* Header */}
          <div className="relative box-border flex h-[48px] w-full shrink-0 flex-row items-center justify-between gap-0 bg-[#00000000] p-[0px_20px]">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 shrink-0 items-center justify-center text-[#1A1A1A] transition-opacity active:opacity-70"
              aria-label="返回"
            >
              <ChevronLeft className="h-6 w-6" strokeWidth={2} />
            </button>
            <div className="box-border text-left font-heading text-[16px]/[normal] font-bold text-[#1A1A1A] [white-space:nowrap] [filter:drop-shadow(0px_0px_10px_#FFFFFF66)]">
              抽签详情
            </div>
            <div className="w-10" />
          </div>

          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-[14px] text-[#9CA3AF]">加载中...</div>
            </div>
          ) : !detail ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <Users className="h-16 w-16 text-[#D1D5DB]" />
              <div className="text-[14px] text-[#9CA3AF]">记录不存在</div>
            </div>
          ) : (
            <div className="flex w-full flex-1 min-h-0 flex-col items-center overflow-y-auto px-4">
              {/* Title Card */}
              <div className="box-border flex w-full flex-col gap-2 rounded-[16px] bg-white p-[16px] shadow-sm mb-3">
                <div className="flex items-center justify-between">
                  <div className="text-[16px] font-bold text-[#1F2937]">{detail.title}</div>
                  {detail.status === 'cancelled' && (
                    <div className="rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[11px] text-[#EF4444]">
                      已作废
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[12px] text-[#9CA3AF]">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formatDateTime(detail.createdAt)}</span>
                </div>
                <div className="flex items-center gap-3 text-[12px] text-[#6B7280]">
                  <span>正选 {detail.mainCount} 人</span>
                  <span>候补 {detail.backupCount} 人</span>
                </div>
              </div>

              {/* Main Selected */}
              <div className="box-border flex w-full flex-col gap-2 rounded-[16px] bg-white p-[16px] shadow-sm mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Star className="h-4 w-4 text-[#FCD34D]" fill="#FCD34D" />
                  <div className="text-[14px] font-semibold text-[#1F2937]">
                    正选代表 · 共{detail.main.length}人
                  </div>
                </div>
                {detail.main.map((m, i) => renderMember(m, i))}
              </div>

              {/* Backup Selected */}
              {detail.backup.length > 0 && (
                <div className="box-border flex w-full flex-col gap-2 rounded-[16px] bg-white p-[16px] shadow-sm mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="h-4 w-4 text-[#9CA3AF]" fill="#D1D5DB" />
                    <div className="text-[14px] font-semibold text-[#1F2937]">
                      候补代表 · 共{detail.backup.length}人
                    </div>
                  </div>
                  {detail.backup.map((m, i) => renderMember(m, i))}
                </div>
              )}

              {/* 作废按钮 */}
              {isCommittee && detail.status !== 'cancelled' && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="w-full rounded-lg border border-[#EF4444] bg-[#FEF2F2] py-3 text-[14px] font-semibold text-[#EF4444] active:opacity-70 disabled:opacity-50"
                >
                  {cancelling ? '作废中...' : '作废本次抽签'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
