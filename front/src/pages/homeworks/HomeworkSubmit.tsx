import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, Clock3, ImagePlus, Loader2, Send, Timer, X } from 'lucide-react';
import { toast } from 'sonner';
import PageLayout from '@/components/layout/PageLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api, resolveFileUrl } from '@/lib/api';

interface Attachment {
  url: string;
  name: string;
}

interface HomeworkInfo {
  id: string;
  subject: string;
  title: string;
  deadline: string;
  mySubmission: {
    content: string | null;
    attachments: unknown;
  } | null;
  myDelayApplication: {
    status: string;
    expected_deadline: string;
  } | null;
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${month}月${day}日 ${hours}:${minutes}`;
}

function parseAttachments(raw: unknown): Attachment[] {
  if (!raw) return [];
  const urls: string[] = Array.isArray(raw)
    ? raw.filter((item): item is string => typeof item === 'string')
    : typeof raw === 'string'
      ? (() => {
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [raw];
          } catch {
            return [raw];
          }
        })()
      : [];
  return urls.map((url, index) => ({ url, name: `附件${index + 1}` }));
}

export default function HomeworkSubmit() {
  const navigate = useNavigate();
  const { homeworkId } = useParams<{ homeworkId: string }>();
  const { user } = useCurrentUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [homework, setHomework] = useState<HomeworkInfo | null>(null);
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const classId = user?.classId;

  const load = useCallback(() => {
    if (!classId || !homeworkId) {
      setLoading(false);
      setError('缺少作业信息');
      return;
    }
    setLoading(true);
    setError('');
    api
      .get(`/classes/${classId}/homeworks/${homeworkId}`)
      .then((res) => {
        const data: HomeworkInfo = res.data?.data || res.data;
        setHomework(data);
        setContent(data.mySubmission?.content || '');
        setAttachments(parseAttachments(data.mySubmission?.attachments));
      })
      .catch((e) => setError(e.message || '作业加载失败'))
      .finally(() => setLoading(false));
  }, [classId, homeworkId]);

  useEffect(() => {
    load();
  }, [load]);

  const overdue = homework ? Date.now() > new Date(homework.deadline).getTime() : false;
  const hasApprovedDelay = Boolean(
    homework?.myDelayApplication?.status === 'approved' &&
      new Date(homework.myDelayApplication.expected_deadline).getTime() > Date.now(),
  );
  const locked = overdue && !hasApprovedDelay;

  const handlePickFile = () => {
    if (locked || uploading) return;
    fileInputRef.current?.click();
  };

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length === 0 || !classId) return;

    setUploading(true);
    try {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} 超过 10MB，已跳过`);
          continue;
        }
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post(`/classes/${classId}/homeworks/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const data = res.data?.data || res.data;
        if (data?.url) {
          setAttachments((prev) => [...prev, { url: data.url, name: data.name || file.name }]);
        }
      }
    } catch (e: any) {
      toast.error(e.message || '图片上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!classId || !homeworkId) return;
    const trimmed = content.trim();
    if (!trimmed && attachments.length === 0) {
      toast.error('请填写提交内容或上传附件');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/classes/${classId}/homeworks/${homeworkId}/submit`, {
        content: trimmed,
        fileUrls: attachments.map((item) => item.url),
      });
      toast.success('作业提交成功');
      navigate(`/homework-detail/${homeworkId}`, { replace: true });
    } catch (e: any) {
      toast.error(e.message || '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout title="提交作业" variant="a">
      {loading ? (
        <div className="h-[180px] w-full animate-pulse rounded-2xl bg-[#F1F5F9]" />
      ) : error || !homework ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-[#6B7280]">
          <AlertCircle className="h-10 w-10 text-[#EF4444] opacity-70" />
          <span className="text-[14px]">{error || '作业不存在'}</span>
          <button
            type="button"
            onClick={load}
            className="rounded-full bg-[#F1F5F9] px-4 py-2 text-[13px] font-medium text-[#334155]"
          >
            重新加载
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 pb-4">
          <div className="rounded-2xl bg-[#F8FAFC] p-4">
            <div className="text-[11px] font-semibold text-[#0062FF]">{homework.subject}</div>
            <div className="mt-1 text-[15px] font-semibold text-[#1E293B]">{homework.title}</div>
            <div className="mt-2 flex items-center gap-1 text-[11px] text-[#64748B]">
              <Clock3 className="h-3.5 w-3.5" />
              截止 {formatDateTime(homework.deadline)}
              {hasApprovedDelay && homework.myDelayApplication && (
                <span className="ml-1 text-[#F59E0B]">
                  （已延至 {formatDateTime(homework.myDelayApplication.expected_deadline)}）
                </span>
              )}
            </div>
          </div>

          {locked && (
            <div className="flex items-center gap-2 rounded-xl bg-[#FEF2F2] p-3 text-[12px] text-[#B91C1C]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              作业已截止，如需补交请先申请延时
            </div>
          )}

          <div className="rounded-2xl bg-white p-4 shadow-[0px_2px_8px_0px_#0000000D]">
            <div className="mb-2 text-[13px] font-semibold text-[#1E293B]">提交内容</div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={locked}
              placeholder="填写作业说明或答案..."
              className="h-[140px] w-full resize-none rounded-xl bg-[#F8FAFC] p-3 text-[13px] leading-6 text-[#334155] outline-none placeholder:text-[#CBD5E1] disabled:opacity-60"
              maxLength={2000}
            />
            <div className="mt-1 text-right text-[10px] text-[#CBD5E1]">{content.length}/2000</div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-[0px_2px_8px_0px_#0000000D]">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-[#1E293B]">图片附件</span>
              <span className="text-[11px] text-[#94A3B8]">最多 9 张，单张 10MB 以内</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {attachments.map((item, index) => (
                <div key={`${item.url}-${index}`} className="relative aspect-square overflow-hidden rounded-lg bg-[#F1F5F9]">
                  <img
                    src={resolveFileUrl(item.url)}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                  {!locked && (
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== index))}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              {attachments.length < 9 && !locked && (
                <button
                  type="button"
                  onClick={handlePickFile}
                  disabled={uploading}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] text-[11px] text-[#94A3B8]"
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <ImagePlus className="h-5 w-5" />
                      添加图片
                    </>
                  )}
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFiles}
            />
          </div>

          {locked ? (
            <button
              type="button"
              onClick={() => homeworkId && navigate(`/delay-apply/${homeworkId}`)}
              className="flex h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-[#F59E0B] bg-[#FFFBEB] text-[14px] font-semibold text-[#B45309]"
            >
              <Timer className="h-4 w-4" />
              申请延时补交
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || uploading}
              className="flex h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#0062FF] text-[15px] font-semibold text-white shadow-[0px_4px_12px_0px_#0062FF33] disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {submitting ? '提交中...' : '确认提交'}
            </button>
          )}
        </div>
      )}
    </PageLayout>
  );
}