import { useCallback, useEffect, useMemo, useState } from 'react';
import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useStatusBarStyle } from '@/hooks/useStatusBarStyle';
import {
  Archive,
  CalendarClock,
  ChevronRight,
  FileSpreadsheet,
  Loader2,
  Plus,
} from 'lucide-react';

interface ArchiveItem {
  id: string;
  title: string;
  archiveYear: string;
  creatorName: string | null;
  createdAt: string;
  fileCount: number;
}

function formatDate(iso?: string) {
  if (!iso) return '-';
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return '-';
  }
}

export default function ClassArchive() {
  useStatusBarStyle(true); // 深色渐变头部 → 白色状态栏图标
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const classId = user?.classId || '';
  const isManager = user?.roleLevel === 'owner' || user?.roleLevel === 'admin';

  const [list, setList] = useState<ArchiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchArchives = useCallback(async () => {
    if (!classId) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get(`/classes/${classId}/archives`);
      setList(res.data?.data || []);
    } catch (err) {
      console.error('获取档案列表失败:', err);
      toast.error('获取档案列表失败');
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchArchives();
  }, [fetchArchives]);

  const summary = useMemo(() => {
    const fileTotal = list.reduce((sum, item) => sum + (item.fileCount || 0), 0);
    return {
      total: list.length,
      latest: list[0]?.createdAt,
      fileTotal,
    };
  }, [list]);

  const handleGenerate = async () => {
    if (!classId || generating) return;
    setGenerating(true);
    try {
      const res = await api.post(`/classes/${classId}/archives/semester`);
      const created = res.data?.data || res.data;
      setConfirmOpen(false);
      await fetchArchives();
      toast.success('本学期档案已生成');
      if (created?.id) {
        navigate(`/archive-detail?archivesId=${created.id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '生成档案失败');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <PhoneFrame className="flex flex-col bg-[#F5F5F5]">
      {/* 头部：档案概览 */}
      <div className="w-full shrink-0 rounded-b-[26px] bg-[linear-gradient(-133deg,_#004ECC_0%,_#0062FF_52%,_#3B82F6_100%)] px-5 pb-5">
        {/* Status Bar（真机 App 由系统状态栏展示） */}
        <div className="flex h-[62px] w-full flex-row items-center justify-between">
          <div className="text-left font-data text-[14px]/[normal] font-semibold text-white [white-space:nowrap]">
            9:41
          </div>
          <div className="flex h-fit w-fit shrink-0 flex-row items-center justify-start gap-[6px] text-white/80">
            <div className="text-left font-caption text-[14px]/[normal] font-normal [white-space:nowrap]">
              ◉◉◉◉
            </div>
            <div className="text-left font-data text-[14px]/[normal] font-normal [white-space:nowrap]">
              100%
            </div>
          </div>
        </div>

        <div className="mt-1 flex w-full items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-0">
            <BackButton variant="dark" className="-ml-2" />
            <div className="text-left font-heading text-[22px]/[normal] font-bold text-white [white-space:nowrap]">
              班级档案
            </div>
          </div>
          {isManager && (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-white/20 px-3.5 text-[13px] font-body font-semibold text-white transition-transform active:scale-95"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              生成档案
            </button>
          )}
        </div>
        <div className="mt-1 text-[11px] font-body text-white/70">
          按学期把成员名单归档，随时回看班级成员变化
        </div>

        {/* 概览数据 */}
        <div className="mt-4 flex w-full gap-2">
          {[
            { label: '已归档', value: `${summary.total} 份`, icon: Archive },
            { label: '最近归档', value: formatDate(summary.latest), icon: CalendarClock },
            { label: '累计附件', value: `${summary.fileTotal} 个`, icon: FileSpreadsheet },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex min-w-0 flex-1 flex-col gap-1 rounded-xl bg-white/12 px-3 py-2.5"
              >
                <div className="flex items-center gap-1 text-[10px] font-caption text-white/70">
                  <Icon className="h-3 w-3" strokeWidth={2} />
                  {item.label}
                </div>
                <div className="truncate text-[16px] font-heading font-bold text-white">
                  {item.value}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto px-5 pb-8 pt-4">
        <div className="flex w-full items-center justify-between">
          <div className="text-[12px] font-body font-semibold text-[#64748B]">学期档案</div>
          <div className="text-[11px] font-caption text-[#94A3B8]">按归档时间倒序</div>
        </div>

        {loading ? (
          <>
            <div className="h-[76px] w-full animate-pulse rounded-2xl bg-white" />
            <div className="h-[76px] w-full animate-pulse rounded-2xl bg-white" />
          </>
        ) : list.length === 0 ? (
          <div className="flex w-full flex-col items-center gap-3 rounded-2xl bg-white px-6 py-10 shadow-soft">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EBF3FF]">
              <Archive className="h-7 w-7 text-[#0062FF]" strokeWidth={1.6} />
            </div>
            <div className="text-[16px] font-heading font-bold text-[#1A1A1A]">
              还没有学期档案
            </div>
            <div className="text-center text-[12px]/[1.7] font-body text-[#94A3B8]">
              生成本学期档案后，系统会把当前成员名单
              <br />
              整理成 Excel 附件保存，之后随时可下载
            </div>
            {isManager ? (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="mt-1 flex h-[42px] items-center gap-1.5 rounded-xl bg-[#0062FF] px-5 text-[14px] font-body font-semibold text-white shadow-[0_10px_20px_rgba(0,98,255,0.22)] transition-transform active:scale-95"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                生成本学期档案
              </button>
            ) : (
              <div className="mt-1 text-[11px] font-caption text-[#CBD5E1]">
                等待班委生成
              </div>
            )}
          </div>
        ) : (
          list.map((archive) => (
            <button
              key={archive.id}
              type="button"
              onClick={() => navigate(`/archive-detail?archivesId=${archive.id}`)}
              className="flex w-full shrink-0 items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-soft transition-transform active:scale-[0.98]"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EBF3FF]">
                <Archive className="h-5 w-5 text-[#0062FF]" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="truncate text-[15px] font-heading font-semibold text-[#1A1A1A]">
                    {archive.title}
                  </div>
                  <span className="shrink-0 rounded-md bg-[#EBF3FF] px-1.5 py-0.5 text-[10px] font-body font-medium text-[#0062FF]">
                    {archive.archiveYear} 学年
                  </span>
                </div>
                <div className="mt-1 truncate text-[11px] font-body text-[#94A3B8]">
                  {formatDate(archive.createdAt)} · {archive.fileCount} 个附件
                  {archive.creatorName ? ` · ${archive.creatorName} 生成` : ''}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-[#CBD5E1]" strokeWidth={2} />
            </button>
          ))
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="生成本学期档案？"
        description="将按当前班级成员名单生成一份 Excel 档案（含班级概况与成员名单），生成后可随时查看和下载。"
        confirmText="生成档案"
        loading={generating}
        icon={<Archive className="h-7 w-7 text-[#0062FF]" strokeWidth={1.8} />}
        onCancel={() => {
          if (!generating) setConfirmOpen(false);
        }}
        onConfirm={handleGenerate}
      />

      {generating && (
        <div className="pointer-events-none fixed bottom-8 left-1/2 z-[120] flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-[12px] font-body text-white">
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} />
          正在生成档案…
        </div>
      )}
    </PhoneFrame>
  );
}