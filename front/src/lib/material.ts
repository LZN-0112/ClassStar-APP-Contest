import type { LucideIcon } from 'lucide-react';
import {
  Award,
  BookOpen,
  ClipboardList,
  File,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Folder,
  Image,
  Music,
  Presentation,
  Video,
} from 'lucide-react';
import { api, resolveFileUrl } from '@/lib/api';
import { saveBlobFile } from '@/lib/save-file';

export interface MaterialFileItem {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  folderName: string | null;
  uploaderId?: string | null;
  uploaderName?: string | null;
  downloadCount: number;
  createdAt: string;
}

export interface MaterialFolderStat {
  name: string;
  count: number;
  latestAt: string;
}

export interface MaterialSummary {
  totalCount: number;
  totalSize: number;
  newIn7Days: number;
  /** 上次进入资料库后新增、且非本人上传的资料数（首页角标口径） */
  unreadCount: number;
  myUploadCount: number;
  folders: MaterialFolderStat[];
  recentFiles: MaterialFileItem[];
  hotFiles: MaterialFileItem[];
}

export type MaterialPreviewKind = 'image' | 'video' | 'audio' | 'text' | 'none';

export interface MaterialTypeMeta {
  key: string;
  label: string;
  color: string;
  bg: string;
  icon: LucideIcon;
  preview: MaterialPreviewKind;
}

const MATERIAL_TYPES: Record<string, MaterialTypeMeta> = {
  pdf: { key: 'pdf', label: 'PDF', color: '#DC2626', bg: '#FEF2F2', icon: FileText, preview: 'none' },
  word: { key: 'word', label: 'Word', color: '#2563EB', bg: '#EFF6FF', icon: FileText, preview: 'none' },
  excel: { key: 'excel', label: 'Excel', color: '#059669', bg: '#ECFDF5', icon: FileSpreadsheet, preview: 'none' },
  ppt: { key: 'ppt', label: 'PPT', color: '#EA580C', bg: '#FFF7ED', icon: Presentation, preview: 'none' },
  image: { key: 'image', label: '图片', color: '#7C3AED', bg: '#F5F3FF', icon: Image, preview: 'image' },
  video: { key: 'video', label: '视频', color: '#0891B2', bg: '#ECFEFF', icon: Video, preview: 'video' },
  audio: { key: 'audio', label: '音频', color: '#DB2777', bg: '#FDF2F8', icon: Music, preview: 'audio' },
  archive: { key: 'archive', label: '压缩包', color: '#475569', bg: '#F1F5F9', icon: FileArchive, preview: 'none' },
  text: { key: 'text', label: '文本', color: '#64748B', bg: '#F8FAFC', icon: FileText, preview: 'text' },
  other: { key: 'other', label: '文件', color: '#64748B', bg: '#F8FAFC', icon: File, preview: 'none' },
};

const EXT_TYPE_MAP: Record<string, string> = {
  pdf: 'pdf',
  doc: 'word',
  docx: 'word',
  xls: 'excel',
  xlsx: 'excel',
  csv: 'excel',
  ppt: 'ppt',
  pptx: 'ppt',
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  webp: 'image',
  bmp: 'image',
  svg: 'image',
  mp4: 'video',
  mov: 'video',
  webm: 'video',
  avi: 'video',
  mkv: 'video',
  mp3: 'audio',
  wav: 'audio',
  m4a: 'audio',
  aac: 'audio',
  ogg: 'audio',
  zip: 'archive',
  rar: 'archive',
  '7z': 'archive',
  tar: 'archive',
  gz: 'archive',
  txt: 'text',
  md: 'text',
  json: 'text',
  log: 'text',
};

/** 按扩展名识别文件类型，用于图标、色标与预览方式 */
export function getMaterialType(fileName: string): MaterialTypeMeta {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return MATERIAL_TYPES[EXT_TYPE_MAP[ext]] || MATERIAL_TYPES.other;
}

export interface MaterialFolderMeta {
  name: string;
  desc: string;
  hint: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}

/** 资料分类：每个分类都带说明和示例，解决「不知道该传哪」 */
export const MATERIAL_FOLDERS: MaterialFolderMeta[] = [
  {
    name: '班会资料',
    desc: '班会记录、班级公约与制度文件',
    hint: '如：班会纪要、班规制度',
    icon: ClipboardList,
    color: '#2563EB',
    bg: '#EFF6FF',
  },
  {
    name: '课程作业',
    desc: '课件、作业模板与复习资料',
    hint: '如：课件、复习提纲',
    icon: BookOpen,
    color: '#EA580C',
    bg: '#FFF7ED',
  },
  {
    name: '活动照片',
    desc: '活动照片与班级合影',
    hint: '如：运动会、团建照片',
    icon: Image,
    color: '#7C3AED',
    bg: '#F5F3FF',
  },
  {
    name: '评优材料',
    desc: '评优申报与证明材料',
    hint: '如：评优表、获奖证书',
    icon: Award,
    color: '#059669',
    bg: '#ECFDF5',
  },
];

export function getFolderMeta(name?: string | null): MaterialFolderMeta {
  return (
    MATERIAL_FOLDERS.find((item) => item.name === name) || {
      name: name || '未分类',
      desc: '其他资料',
      hint: '',
      icon: Folder,
      color: '#64748B',
      bg: '#F8FAFC',
    }
  );
}

export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (Number.isNaN(date.getTime())) return '';
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days === 1) return '昨天';
  if (days < 7) return `${days}天前`;
  if (days < 30) return `${Math.floor(days / 7)}周前`;
  return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

export function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

export function isNewMaterial(dateStr: string, days = 7): boolean {
  const time = new Date(dateStr).getTime();
  if (Number.isNaN(time)) return false;
  return Date.now() - time <= days * 86400000;
}

/** 相对路径统一补全为可访问地址，绝对地址原样返回 */
export function toMaterialUrl(url?: string | null): string {
  return resolveFileUrl(url);
}

export function getMimeTypeByFileName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    mp4: 'video/mp4',
    mp3: 'audio/mpeg',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

/** 下载资料并交给原生/浏览器保存，大文件放宽超时时间 */
export async function downloadMaterialFile(fileId: string, fileName: string) {
  const response = await api.get(`/material/${fileId}/download`, {
    responseType: 'blob',
    timeout: 120000,
  });
  const blob = new Blob([response.data], { type: getMimeTypeByFileName(fileName) });
  return saveBlobFile(fileName, blob, getMimeTypeByFileName(fileName));
}
