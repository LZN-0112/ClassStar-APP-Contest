import { FileText, Film, Mic } from 'lucide-react';
import { resolveFileUrl } from '@/lib/api';

export type HomeworkAttachmentType = 'image' | 'video' | 'audio' | 'file';

export interface HomeworkAttachment {
  url: string;
  name: string;
  size?: number;
  mime?: string;
  type: HomeworkAttachmentType;
  duration?: number;
}

const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'heif'];
const VIDEO_EXT = ['mp4', 'mov', 'm4v', 'avi', 'mkv', 'webm'];
const AUDIO_EXT = ['mp3', 'm4a', 'aac', 'wav', 'ogg', 'amr'];

function detectType(name: string, mime?: string): HomeworkAttachmentType {
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

export function formatFileSize(size?: number): string {
  if (!size || size <= 0) return '';
  if (size < 1024 * 1024) return `${Math.round(size / 1024)}KB`;
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

export function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** 兼容旧版字符串数组、新版对象数组与历史 JSON 字符串 */
export function parseAttachments(raw: unknown): HomeworkAttachment[] {
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
  const result: HomeworkAttachment[] = [];
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

const TYPE_LABEL: Record<HomeworkAttachmentType, string> = {
  image: '图片',
  video: '视频',
  audio: '录音',
  file: '文件',
};

export default function AttachmentView({
  attachments,
  showImageName = false,
}: {
  attachments: HomeworkAttachment[];
  showImageName?: boolean;
}) {
  const images = attachments.filter((item) => item.type === 'image');
  const others = attachments.filter((item) => item.type !== 'image');

  return (
    <div className="flex flex-col gap-2">
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((item, index) => (
            <a
              key={`${item.url}-${index}`}
              href={resolveFileUrl(item.url)}
              target="_blank"
              rel="noreferrer"
              className="relative aspect-square overflow-hidden rounded-lg bg-[#F1F5F9]"
            >
              <img
                src={resolveFileUrl(item.url)}
                alt={item.name || `图片${index + 1}`}
                className="h-full w-full object-cover"
              />
              {showImageName && (
                <span className="absolute inset-x-0 bottom-0 truncate bg-black/40 px-1.5 py-0.5 text-[9px] text-white">
                  {item.name}
                </span>
              )}
            </a>
          ))}
        </div>
      )}

      {others.map((item, index) => (
        <div
          key={`${item.url}-${index}`}
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
              <div className="truncate text-[12px] font-medium text-[#334155]">{item.name}</div>
              <div className="mt-0.5 text-[10px] text-[#94A3B8]">
                {TYPE_LABEL[item.type]}
                {item.duration ? ` · ${formatDuration(item.duration)}` : ''}
                {item.size ? ` · ${formatFileSize(item.size)}` : ''}
              </div>
            </div>
            <a
              href={resolveFileUrl(item.url)}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-[11px] font-medium text-[#0062FF]"
            >
              打开
            </a>
          </div>
          {item.type === 'audio' && (
            <audio controls src={resolveFileUrl(item.url)} className="mt-2 h-9 w-full" />
          )}
          {item.type === 'video' && (
            <video
              controls
              src={resolveFileUrl(item.url)}
              className="mt-2 max-h-[220px] w-full rounded-lg bg-black"
            />
          )}
        </div>
      ))}
    </div>
  );
}