import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  Camera,
  Check,
  Clock3,
  FileText,
  Film,
  Image as ImageIcon,
  Loader2,
  Mic,
  Plus,
  Send,
  Square,
  Timer,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import PageLayout from '@/components/layout/PageLayout';
import BottomSheet, { SheetRow } from '@/components/ui/BottomSheet';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api, resolveFileUrl } from '@/lib/api';

type AttachmentType = 'image' | 'video' | 'audio' | 'file';

interface Attachment {
  url: string;
  name: string;
  size?: number;
  mime?: string;
  type: AttachmentType;
  duration?: number;
}

interface HomeworkInfo {
  id: string;
  subject: string;
  title: string;
  deadline: string;
  mySubmission: {
    content: string | null;
    status: string;
    reviewComment?: string | null;
    attachments: unknown;
    fileUrls?: unknown;
  } | null;
  myDelayApplication: {
    status: string;
    expected_deadline: string;
  } | null;
}

const MAX_TOTAL = 12;
const MAX_BY_TYPE: Record<AttachmentType, number> = {
  image: 9,
  video: 1,
  audio: 1,
  file: 3,
};
const LIMIT_BY_TYPE: Record<AttachmentType, { size: number; label: string }> = {
  image: { size: 10 * 1024 * 1024, label: '10MB' },
  video: { size: 100 * 1024 * 1024, label: '100MB' },
  audio: { size: 20 * 1024 * 1024, label: '20MB' },
  file: { size: 50 * 1024 * 1024, label: '50MB' },
};
const TYPE_NAME: Record<AttachmentType, string> = {
  image: '图片',
  video: '视频',
  audio: '录音',
  file: '文件',
};
const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'heif'];
const VIDEO_EXT = ['mp4', 'mov', 'm4v', 'avi', 'mkv', 'webm'];
const AUDIO_EXT = ['mp3', 'm4a', 'aac', 'wav', 'ogg', 'amr'];
const MAX_RECORD_MS = 60_000;

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${month}月${day}日 ${hours}:${minutes}`;
}

function formatSize(size?: number): string {
  if (!size || size <= 0) return '';
  if (size < 1024 * 1024) return `${Math.round(size / 1024)}KB`;
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function detectType(name: string, mime?: string): AttachmentType {
  const m = (mime || '').toLowerCase();
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('video/')) return 'video';
  if (m.startsWith('audio/')) return 'audio';
  const ext = name.split('?')[0].split('.').pop()?.toLowerCase() || '';
  if (IMAGE_EXT.includes(ext)) return 'image';
  if (VIDEO_EXT.includes(ext)) return 'video';
  if (AUDIO_EXT.includes(ext)) return 'audio';
  return 'file';
}

/** 兼容旧版字符串数组、新版对象数组与历史 JSON 字符串 */
function parseAttachments(raw: unknown): Attachment[] {
  if (!raw) return [];
  let list: unknown = raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      list = Array.isArray(parsed) ? parsed : [raw];
    } catch {
      list = [raw];
    }
  }
  if (!Array.isArray(list)) return [];
  const result: Attachment[] = [];
  for (const item of list) {
    if (typeof item === 'string' && item) {
      result.push({ url: item, name: '附件', type: detectType(item) });
      continue;
    }
    if (item && typeof item === 'object' && typeof (item as any).url === 'string') {
      const obj = item as any;
      result.push({
        url: obj.url,
        name: obj.name || '附件',
        size: obj.size,
        mime: obj.mime,
        type: obj.type || detectType(obj.name || obj.url, obj.mime),
        duration: obj.duration,
      });
    }
  }
  return result;
}

function countByType(list: Attachment[]): Record<AttachmentType, number> {
  const counts: Record<AttachmentType, number> = { image: 0, video: 0, audio: 0, file: 0 };
  list.forEach((item) => {
    counts[item.type] += 1;
  });
  return counts;
}

function audioExt(mime: string): string {
  const type = mime.toLowerCase();
  if (type.includes('mp4') || type.includes('aac')) return 'm4a';
  if (type.includes('ogg')) return 'ogg';
  if (type.includes('wav')) return 'wav';
  return 'webm';
}

export default function HomeworkSubmit() {
  const navigate = useNavigate();
  const { homeworkId } = useParams<{ homeworkId: string }>();
  const { user } = useCurrentUser();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [homework, setHomework] = useState<HomeworkInfo | null>(null);
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [attachSheetOpen, setAttachSheetOpen] = useState(false);

  // 录音状态
  const [recordOpen, setRecordOpen] = useState(false);
  const [recordState, setRecordState] = useState<'idle' | 'recording' | 'done'>('idle');
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordDuration, setRecordDuration] = useState(0);
  const [recordUrl, setRecordUrl] = useState('');
  const recordBlobRef = useRef<Blob | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordStreamRef = useRef<MediaStream | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordStartedAtRef = useRef(0);
  const recordTimerRef = useRef<number | null>(null);
  const recordAutoStopRef = useRef<number | null>(null);
  const discardRecordRef = useRef(false);

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
        const parsed = parseAttachments(data.mySubmission?.attachments);
        setAttachments(
          parsed.length ? parsed : parseAttachments(data.mySubmission?.fileUrls),
        );
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
  const isRejected = homework?.mySubmission?.status === 'rejected';
  // 被驳回的学生即使过了截止时间也允许重新提交
  const locked = overdue && !hasApprovedDelay && !isRejected;
  const rejectedReason = isRejected ? homework?.mySubmission?.reviewComment : null;

  const clearRecordTimers = () => {
    if (recordTimerRef.current !== null) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (recordAutoStopRef.current !== null) {
      window.clearTimeout(recordAutoStopRef.current);
      recordAutoStopRef.current = null;
    }
  };

  const releaseRecordStream = () => {
    recordStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordStreamRef.current = null;
  };

  useEffect(
    () => () => {
      clearRecordTimers();
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        discardRecordRef.current = true;
        try {
          recorder.stop();
        } catch {
          // ignore
        }
      }
      releaseRecordStream();
    },
    [],
  );

  useEffect(
    () => () => {
      if (recordUrl) URL.revokeObjectURL(recordUrl);
    },
    [recordUrl],
  );

  const uploadOne = async (file: Blob, fileName: string): Promise<Attachment | null> => {
    if (!classId) return null;
    const formData = new FormData();
    formData.append('file', file, fileName);
    const res = await api.post(`/classes/${classId}/homeworks/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    const data = res.data?.data || res.data;
    if (!data?.url) return null;
    return {
      url: data.url,
      name: data.name || fileName,
      size: data.size,
      mime: data.mime,
      type: data.type || detectType(fileName, data.mime),
    };
  };

  const addFiles = async (files: File[], forcedType?: AttachmentType) => {
    if (!classId || locked || files.length === 0) return;
    const counts = countByType(attachments);
    let total = attachments.length;
    const accepted: { file: File; type: AttachmentType }[] = [];

    for (const file of files) {
      const type = forcedType || detectType(file.name, file.type);
      const limit = LIMIT_BY_TYPE[type];
      if (file.size > limit.size) {
        toast.error(`${file.name} 超过 ${limit.label}，已跳过`);
        continue;
      }
      if (counts[type] >= MAX_BY_TYPE[type]) {
        toast.error(`最多添加 ${MAX_BY_TYPE[type]} 个${TYPE_NAME[type]}`);
        continue;
      }
      if (total >= MAX_TOTAL) {
        toast.error(`单次最多提交 ${MAX_TOTAL} 个附件`);
        break;
      }
      counts[type] += 1;
      total += 1;
      accepted.push({ file, type });
    }
    if (accepted.length === 0) return;

    setUploading(true);
    try {
      for (const item of accepted) {
        const uploaded = await uploadOne(item.file, item.file.name);
        if (uploaded) {
          setAttachments((prev) => [...prev, uploaded]);
        } else {
          toast.error(`${item.file.name} 上传失败`);
        }
      }
    } catch (e: any) {
      toast.error(e.message || '附件上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handlePick = (event: ChangeEvent<HTMLInputElement>, forcedType?: AttachmentType) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    void addFiles(files, forcedType);
  };

  const removeAttachment = (url: string) => {
    setAttachments((prev) => prev.filter((item) => item.url !== url));
  };

  const startRecording = async () => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      toast.error('当前设备不支持录音，请改用文件上传');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordStreamRef.current = stream;
      const mimeType =
        ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(
          (type) => MediaRecorder.isTypeSupported(type),
        ) || '';
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recordChunksRef.current = [];
      discardRecordRef.current = false;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        clearRecordTimers();
        const blob = new Blob(recordChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        recordChunksRef.current = [];
        releaseRecordStream();
        recorderRef.current = null;
        if (discardRecordRef.current) {
          discardRecordRef.current = false;
          return;
        }
        recordBlobRef.current = blob;
        setRecordDuration(
          Math.max(1, Math.round((Date.now() - recordStartedAtRef.current) / 1000)),
        );
        setRecordUrl(URL.createObjectURL(blob));
        setRecordState('done');
      };

      recordStartedAtRef.current = Date.now();
      recorder.start();
      setRecordSeconds(0);
      setRecordState('recording');
      recordTimerRef.current = window.setInterval(() => {
        setRecordSeconds(Math.floor((Date.now() - recordStartedAtRef.current) / 1000));
      }, 250);
      recordAutoStopRef.current = window.setTimeout(() => {
        if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      }, MAX_RECORD_MS);
    } catch (err) {
      releaseRecordStream();
      recordStreamRef.current = null;
      recorderRef.current = null;
      setRecordState('idle');
      const name = (err as DOMException)?.name;
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        toast.error('麦克风权限未开启，请在系统设置中允许后重试');
      } else if (name === 'NotFoundError') {
        toast.error('没有检测到麦克风，请检查设备');
      } else {
        toast.error('录音启动失败，请重试');
      }
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
    }
  };

  const resetRecording = () => {
    clearRecordTimers();
    discardRecordRef.current = true;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        releaseRecordStream();
      }
    } else {
      releaseRecordStream();
    }
    recorderRef.current = null;
    recordBlobRef.current = null;
    setRecordUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return '';
    });
    setRecordSeconds(0);
    setRecordDuration(0);
    setRecordState('idle');
  };

  const closeRecordSheet = () => {
    resetRecording();
    setRecordOpen(false);
  };

  const confirmRecording = async () => {
    const blob = recordBlobRef.current;
    if (!blob) return;
    if (!classId) return;
    if (countByType(attachments).audio >= MAX_BY_TYPE.audio) {
      toast.error('最多添加 1 段录音');
      return;
    }
    if (attachments.length >= MAX_TOTAL) {
      toast.error(`单次最多提交 ${MAX_TOTAL} 个附件`);
      return;
    }
    const now = new Date();
    const stamp = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const fileName = `录音-${stamp}.${audioExt(blob.type)}`;

    setUploading(true);
    try {
      const uploaded = await uploadOne(blob, fileName);
      if (!uploaded) {
        toast.error('录音上传失败，请重试');
        return;
      }
      setAttachments((prev) => [
        ...prev,
        { ...uploaded, type: 'audio', duration: recordDuration || recordSeconds },
      ]);
      closeRecordSheet();
      toast.success('录音已添加');
    } catch (e: any) {
      toast.error(e.message || '录音上传失败，请重试');
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
    if (uploading) {
      toast.warning('附件正在上传，请稍候');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/classes/${classId}/homeworks/${homeworkId}/submit`, {
        content: trimmed,
        attachments: attachments.map((item) => ({
          url: item.url,
          name: item.name,
          size: item.size,
          mime: item.mime,
          type: item.type,
          duration: item.duration,
        })),
        fileUrls: attachments.filter((item) => item.type === 'image').map((item) => item.url),
      });
      toast.success('作业提交成功');
      navigate(`/homework-detail/${homeworkId}`, { replace: true });
    } catch (e: any) {
      toast.error(e.message || '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const images = attachments.filter((item) => item.type === 'image');
  const others = attachments.filter((item) => item.type !== 'image');
  const audioAttachment = others.find((item) => item.type === 'audio');

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

          {rejectedReason && (
            <div className="flex items-start gap-2 rounded-xl bg-[#FEF2F2] p-3 text-[12px] leading-5 text-[#B91C1C]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <span className="font-semibold">作业被驳回：</span>
                {rejectedReason}
              </span>
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
              <span className="text-[13px] font-semibold text-[#1E293B]">附件</span>
              <span className="text-[11px] text-[#94A3B8]">
                图片最多 9 张 / 视频 1 个 / 文件 3 个
              </span>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {images.map((item) => (
                  <div
                    key={item.url}
                    className="relative aspect-square overflow-hidden rounded-lg bg-[#F1F5F9]"
                  >
                    <img
                      src={resolveFileUrl(item.url)}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                    {!locked && (
                      <button
                        type="button"
                        onClick={() => removeAttachment(item.url)}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {others.length > 0 && (
              <div className="mt-2 flex flex-col gap-2">
                {others.map((item) => (
                  <div
                    key={item.url}
                    className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EEF4FF] text-[#0062FF]">
                        {item.type === 'video' ? (
                          <Film className="h-4 w-4" />
                        ) : item.type === 'audio' ? (
                          <Mic className="h-4 w-4" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12px] font-medium text-[#334155]">
                          {item.name}
                        </div>
                        <div className="mt-0.5 text-[10px] text-[#94A3B8]">
                          {TYPE_NAME[item.type]}
                          {item.duration ? ` · ${formatDuration(item.duration)}` : ''}
                          {item.size ? ` · ${formatSize(item.size)}` : ''}
                        </div>
                      </div>
                      {!locked && (
                        <button
                          type="button"
                          onClick={() => removeAttachment(item.url)}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-[#94A3B8] active:bg-[#E2E8F0]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {item.type === 'audio' && (
                      <audio controls src={resolveFileUrl(item.url)} className="mt-2 h-9 w-full" />
                    )}
                    {item.type === 'video' && (
                      <video
                        controls
                        src={resolveFileUrl(item.url)}
                        className="mt-2 max-h-[180px] w-full rounded-lg bg-black"
                      />
                    )}
                    {item.type === 'file' && (
                      <a
                        href={resolveFileUrl(item.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block text-[11px] font-medium text-[#0062FF]"
                      >
                        查看文件
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!locked && (
              <button
                type="button"
                onClick={() => setAttachSheetOpen(true)}
                disabled={uploading || attachments.length >= MAX_TOTAL}
                className="mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] text-[12px] font-medium text-[#64748B] disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {uploading ? '上传中...' : '添加附件'}
              </button>
            )}
            {!locked && attachments.length === 0 && (
              <div className="mt-1.5 text-center text-[10px] text-[#CBD5E1]">
                支持图片、视频、录音、文件
              </div>
            )}
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

      {/* 选择附件类型 */}
      <BottomSheet
        open={attachSheetOpen}
        onClose={() => setAttachSheetOpen(false)}
        title="添加附件"
        subtitle={`已选 ${attachments.length}/${MAX_TOTAL}，支持图片、视频、录音、文件`}
      >
        <div className="flex flex-col gap-1 px-2 pb-[max(20px,env(safe-area-inset-bottom))]">
          <SheetRow
            icon={<Camera className="h-4 w-4 text-[#0062FF]" />}
            title="拍照"
            subtitle={`最多 9 张，单张 10MB 以内`}
            onClick={() => {
              setAttachSheetOpen(false);
              cameraRef.current?.click();
            }}
          />
          <SheetRow
            icon={<ImageIcon className="h-4 w-4 text-[#0062FF]" />}
            title="从相册选择"
            subtitle={`最多 9 张，单张 10MB 以内`}
            onClick={() => {
              setAttachSheetOpen(false);
              galleryRef.current?.click();
            }}
          />
          <SheetRow
            icon={<Film className="h-4 w-4 text-[#0062FF]" />}
            title="视频"
            subtitle="最多 1 个，100MB 以内"
            onClick={() => {
              setAttachSheetOpen(false);
              videoRef.current?.click();
            }}
          />
          <SheetRow
            icon={<FileText className="h-4 w-4 text-[#0062FF]" />}
            title="文件"
            subtitle="PDF/Word/Excel/PPT/压缩包，最多 3 个，单个 50MB"
            onClick={() => {
              setAttachSheetOpen(false);
              fileRef.current?.click();
            }}
          />
          <SheetRow
            icon={<Mic className="h-4 w-4 text-[#0062FF]" />}
            title="录音"
            subtitle="最长 60 秒，最多 1 段"
            onClick={() => {
              setAttachSheetOpen(false);
              setRecordOpen(true);
            }}
          />
        </div>
      </BottomSheet>

      {/* 录音抽屉 */}
      <BottomSheet
        open={recordOpen}
        onClose={closeRecordSheet}
        title="录音附件"
        subtitle="最长 60 秒，录音会作为附件随作业一起提交"
        locked={uploading}
        footer={
          recordState === 'recording' ? (
            <button
              type="button"
              onClick={stopRecording}
              className="flex h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#0062FF] text-[15px] font-semibold text-white"
            >
              <Square className="h-4 w-4" />
              完成录音
            </button>
          ) : recordState === 'done' ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetRecording}
                className="flex h-[46px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#F1F5F9] text-[14px] font-semibold text-[#475569]"
              >
                重新录制
              </button>
              <button
                type="button"
                onClick={confirmRecording}
                disabled={uploading}
                className="flex h-[46px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#0062FF] text-[14px] font-semibold text-white disabled:opacity-60"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                添加该录音
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="flex h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#0062FF] text-[15px] font-semibold text-white"
            >
              <Mic className="h-4 w-4" />
              开始录音
            </button>
          )
        }
      >
        <div className="flex flex-col items-center gap-4 px-5 pb-6 pt-2">
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-full ${
              recordState === 'recording' ? 'bg-[#FEF2F2] text-[#EF4444]' : 'bg-[#EEF4FF] text-[#0062FF]'
            }`}
          >
            <Mic className={`h-8 w-8 ${recordState === 'recording' ? 'animate-pulse' : ''}`} />
          </div>
          <div className="font-mono text-[28px] font-semibold tabular-nums text-[#1E293B]">
            {formatDuration(recordState === 'done' ? recordDuration : recordSeconds) || '00:00'}
          </div>
          {recordState === 'recording' && (
            <div className="flex h-10 items-end gap-1">
              {[10, 22, 34, 18, 30, 14, 26, 38, 20, 12, 28, 16].map((height, index) => (
                <span
                  key={index}
                  className="w-1.5 animate-pulse rounded-full bg-[#0062FF]"
                  style={{ height, animationDelay: `${index * 90}ms` }}
                />
              ))}
            </div>
          )}
          {recordState === 'recording' && (
            <div className="text-[12px] text-[#94A3B8]">正在录音，点击下方「完成录音」结束</div>
          )}
          {recordState === 'done' && recordUrl && (
            <audio controls src={recordUrl} className="h-10 w-full" />
          )}
          {recordState === 'idle' && (
            <div className="text-[12px] text-[#94A3B8]">
              {audioAttachment ? '已有一段录音，重新录制会替换列表中的旧录音' : '点击下方按钮开始录音'}
            </div>
          )}
        </div>
      </BottomSheet>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handlePick(e, 'image')}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handlePick(e, 'image')}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => handlePick(e, 'video')}
      />
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z"
        multiple
        className="hidden"
        onChange={(e) => handlePick(e, 'file')}
      />
    </PageLayout>
  );
}