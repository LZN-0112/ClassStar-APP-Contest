import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock3, Inbox, Lock, Shuffle } from 'lucide-react';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useStatusBarStyle } from '@/hooks/useStatusBarStyle';
import { toast } from 'sonner';

interface DrawRecord {
  id: string;
  title: string;
  mainCount: number;
  backupCount: number;
  memberCount: number;
  createdAt: string;
  createdBy: string | null;
  createdById?: string;
  isCommitteeDraw: boolean;
  isPublic: boolean;
  publicizedAt?: string | null;
  status?: string;
}

const PAGE_SIZE = 10;

/** 列表时间：今天/昨天/月-日，跨年补年份 */
function formatRecordTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const now = new Date();
  const startOfDay = (v: Date) => new Date(v.getFullYear(), v.getMonth(), v.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (diffDays === 0) return `今天 ${hm}`;
  if (diffDays === 1) return `昨天 ${hm}`;
  if (d.getFullYear() === now.getFullYear()) return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${hm}`;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${hm}`;
}

function StatItem({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="flex flex-1 items-baseline justify-center gap-1">
      <span className="text-[11px] text-[#7C99B3]">{label}</span>
      <span className={`font-data text-[15px]/[normal] font-bold ${accent || 'text-[#12395C]'}`}>{value}</span>
      <span className="text-[10px] text-[#A9BFD2]">人</span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="w-full animate-pulse rounded-[18px] bg-white p-3.5 shadow-[0_2px_12px_rgba(18,57,92,0.06)]">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 shrink-0 rounded-[13px] bg-[#E8F1F9]" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3.5 w-1/2 rounded-full bg-[#E8F1F9]" />
          <div className="h-2.5 w-2/3 rounded-full bg-[#F0F5FA]" />
        </div>
      </div>
      <div className="mt-3 h-[34px] rounded-xl bg-[#F5F9FD]" />
    </div>
  );
}

export default function DrawRecords() {
  useStatusBarStyle(false); // 浅蓝渐变头部 → 系统状态栏深色图标
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const classId = user?.classId;

  const [records, setRecords] = useState<DrawRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!classId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setPage(1);
    api
      .get(`/classes/${classId}/random-draws`, { params: { page: 1, pageSize: PAGE_SIZE } })
      .then((res) => {
        if (cancelled) return;
        const data = res.data.data;
        setRecords(Array.isArray(data?.list) ? data.list : []);
        setTotal(data?.total ?? 0);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[DrawRecords] error:', err);
        toast.error('加载抽签记录失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [classId]);

  const loadMore = useCallback(async () => {
    if (!classId || loadingMore) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const res = await api.get(`/classes/${classId}/random-draws`, {
        params: { page: nextPage, pageSize: PAGE_SIZE },
      });
      const data = res.data.data;
      const list: DrawRecord[] = Array.isArray(data?.list) ? data.list : [];
      setRecords((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        return [...prev, ...list.filter((r) => !seen.has(r.id))];
      });
      setTotal(data?.total ?? 0);
      setPage(nextPage);
    } catch (err) {
      console.error('[DrawRecords] load more error:', err);
      toast.error('加载更多失败');
    } finally {
      setLoadingMore(false);
    }
  }, [classId, page, loadingMore]);

  const hasMore = records.length < total;

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
          <div className="font-heading text-[17px]/[normal] font-bold text-[#12395C]">中签记录</div>
          <button
            type="button"
            onClick={() => navigate('/draw-rules')}
            className="flex h-8 shrink-0 items-center justify-center rounded-full bg-white/60 px-3 font-body text-[12px]/[normal] font-medium text-[#1F2937] transition-transform active:scale-95"
          >
            规则
          </button>
        </div>

        {/* 可见性说明 */}
        <div className="mx-4 mt-1 box-border flex shrink-0 items-start gap-2 rounded-2xl border border-white/70 bg-white/55 px-3 py-2.5 backdrop-blur">
          <Lock className="mt-[1px] h-3.5 w-3.5 shrink-0 text-[#2B7FCC]" strokeWidth={2.2} />
          <p className="text-[11px]/[1.5] text-[#3B6E96]">
            班委抽签记录全班可见，个人抽签记录仅自己可见
          </p>
        </div>

        {/* 列表标题 */}
        <div className="mt-4 flex shrink-0 items-center justify-between px-5">
          <span className="text-[13px]/[normal] font-semibold text-[#12395C]">全部记录</span>
          <span className="text-[11px]/[normal] text-[#6B8FAD]">共 {total} 次</span>
        </div>

        {/* Records List */}
        <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-y-auto px-4">
          {loading ? (
            <div className="flex flex-col gap-3 pb-4">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 pb-16">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/70">
                <Inbox className="h-9 w-9 text-[#B9D4E8]" strokeWidth={1.6} />
              </div>
              <div className="text-[14px]/[normal] font-medium text-[#5B87A8]">还没有抽签记录</div>
              <button
                type="button"
                onClick={() => navigate('/random-draw')}
                className="mt-1 rounded-full bg-gradient-to-r from-[#4EA6EA] to-[#2B7FCC] px-5 py-2 text-[13px]/[normal] font-semibold text-white shadow-[0_6px_16px_rgba(43,127,204,0.28)] transition-transform active:scale-95"
              >
                去抽签
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 pb-4">
              {records.map((record) => (
                <div
                  key={record.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/draw-record/${record.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/draw-record/${record.id}`);
                    }
                  }}
                  className="w-full cursor-pointer rounded-[18px] bg-white p-3.5 shadow-[0_2px_12px_rgba(18,57,92,0.06)] transition-transform duration-150 active:scale-[0.985]"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-gradient-to-br from-[#6BB6F2] to-[#2B7FCC] shadow-[0_4px_10px_rgba(43,127,204,0.22)]">
                      <Shuffle className="h-[18px] w-[18px] text-white" strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="min-w-0 truncate text-[15px]/[normal] font-semibold text-[#1A1A1A]">
                          {record.title}
                        </span>
                        {record.isPublic && (
                          <span className="shrink-0 rounded-full bg-[#DCFCE7] px-1.5 py-0.5 text-[10px]/[normal] font-medium text-[#16A34A]">
                            已公示
                          </span>
                        )}
                        {record.status === 'cancelled' && (
                          <span className="shrink-0 rounded-full bg-[#FEE2E2] px-1.5 py-0.5 text-[10px]/[normal] font-medium text-[#DC2626]">
                            已作废
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
                        <span
                          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px]/[normal] font-medium ${
                            record.isCommitteeDraw
                              ? 'bg-[#E0F2FE] text-[#0284C7]'
                              : 'bg-[#F3F4F6] text-[#6B7280]'
                          }`}
                        >
                          {record.isCommitteeDraw ? '班委抽签' : '个人抽签'}
                        </span>
                        <span className="flex min-w-0 items-center gap-1 text-[11px]/[normal] text-[#8AA6BD]">
                          <Clock3 className="h-3 w-3 shrink-0" strokeWidth={2} />
                          <span className="shrink-0">{formatRecordTime(record.createdAt)}</span>
                          {record.createdBy && (
                            <>
                              <span className="text-[#C7D6E4]">·</span>
                              <span className="truncate">{record.createdBy} 发起</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-[#C7D6E4]" strokeWidth={2} />
                  </div>

                  <div className="mt-3 flex items-center rounded-xl bg-[#F5F9FD] px-2 py-2">
                    <StatItem label="正选" value={record.mainCount} accent="text-[#2B7FCC]" />
                    <span className="h-5 w-px bg-[#E2ECF6]" />
                    <StatItem label="候补" value={record.backupCount} />
                    <span className="h-5 w-px bg-[#E2ECF6]" />
                    <StatItem label="参与" value={record.memberCount} />
                  </div>
                </div>
              ))}

              {/* 加载更多 */}
              <div className="flex flex-col items-center gap-1 pb-2 pt-1">
                {hasMore ? (
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="rounded-full border border-[#CFE4F5] bg-white/80 px-5 py-2 text-[12px]/[normal] font-medium text-[#2B7FCC] transition-opacity active:opacity-70 disabled:opacity-50"
                  >
                    {loadingMore ? '加载中...' : '加载更多'}
                  </button>
                ) : (
                  <span className="py-1 text-[11px]/[normal] text-[#A9BFD2]">没有更多了</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}