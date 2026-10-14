import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Calendar, Users, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { toast } from 'sonner';

interface DrawRecord {
  id: string;
  title: string;
  mainCount: number;
  backupCount: number;
  memberCount: number;
  createdAt: string;
  createdBy: string | null;
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function DrawRecords() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const classId = user?.classId;

  const [records, setRecords] = useState<DrawRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    if (!classId) { setLoading(false); return; }
    setLoading(true);
    api.get(`/classes/${classId}/random-draws`, { params: { page, pageSize } })
      .then((res) => {
        const data = res.data.data;
        setRecords(Array.isArray(data?.list) ? data.list : []);
        setTotal(data?.total ?? 0);
      })
      .catch((err) => {
        console.error('[DrawRecords] error:', err);
        toast.error('加载抽签记录失败');
      })
      .finally(() => setLoading(false));
  }, [classId, page]);

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
              中签记录
            </div>
            <div className="w-10" />
          </div>

          {/* Summary */}
          <div className="box-border flex w-[calc(100%-48px)] shrink-0 flex-row items-center justify-between gap-0 rounded-[16px] border border-[#FFFFFF30] bg-[#FFFFFF30] p-[12px_16px]">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#0062FF]" />
              <span className="text-[12px] font-medium text-[#1F2937]">共 {total} 次抽签</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#0062FF]" />
              <span className="text-[12px] font-medium text-[#1F2937]">{user?.className}</span>
            </div>
          </div>

          {/* Records List */}
          <div className="flex w-full flex-1 min-h-0 flex-col items-center overflow-y-auto px-4">
            {loading ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="text-[14px] text-[#9CA3AF]">加载中...</div>
              </div>
            ) : records.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3">
                <Users className="h-16 w-16 text-[#D1D5DB]" />
                <div className="text-[14px] text-[#9CA3AF]">暂无抽签记录</div>
              </div>
            ) : (
              <div className="w-full flex flex-col gap-3 pb-4">
                {records.map((record) => (
                  <div
                    key={record.id}
                    onClick={() => navigate(`/draw-record/${record.id}`)}
                    className="box-border flex w-full flex-col gap-2 rounded-[16px] bg-white p-[14px_16px] shadow-sm cursor-pointer transition-transform duration-150 active:scale-[0.98]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-[15px] font-semibold text-[#1F2937] truncate max-w-[200px]">
                        {record.title}
                      </div>
                      <div className="flex items-center gap-1 rounded-full bg-[#0062FF0D] px-2 py-0.5">
                        <Users className="h-3 w-3 text-[#0062FF]" />
                        <span className="text-[11px] font-medium text-[#0062FF]">
                          {record.memberCount}人
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-[#9CA3AF]">
                          正选{record.mainCount}人 · 候补{record.backupCount}人
                        </span>
                        {record.createdBy && (
                          <>
                            <span className="text-[#D1D5DB]">·</span>
                            <span className="text-[11px] text-[#6B7280]">{record.createdBy}</span>
                          </>
                        )}
                      </div>
                      <div className="text-[11px] text-[#9CA3AF]">
                        {formatDateTime(record.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {total > pageSize && (
              <div className="flex items-center justify-center gap-4 pb-4">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-[#0062FF] px-4 py-1.5 text-[13px] font-medium text-[#0062FF] disabled:opacity-40 active:opacity-70"
                >
                  上一页
                </button>
                <span className="text-[13px] text-[#6B7280]">
                  {page} / {Math.ceil(total / pageSize)}
                </span>
                <button
                  type="button"
                  disabled={page * pageSize >= total}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-[#0062FF] px-4 py-1.5 text-[13px] font-medium text-[#0062FF] disabled:opacity-40 active:opacity-70"
                >
                  下一页
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
