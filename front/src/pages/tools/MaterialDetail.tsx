import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Download,
  FileText,
  Info,
  RefreshCw,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import PageLayout from '@/components/layout/PageLayout';
import { api } from '@/lib/api';
import {
  downloadMaterialFile,
  formatFileSize,
  formatFullDate,
  formatRelativeTime,
  getMaterialType,
  isNewMaterial,
  toMaterialUrl,
} from '@/lib/material';

interface MaterialDetailData {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  folderName: string | null;
  uploaderId: string | null;
  uploaderName: string | null;
  downloadCount: number;
  fileType: string;
  createdAt: string;
}

export default function MaterialDetail() {
  const [searchParams] = useSearchParams();
  const fileId = searchParams.get('fileId') || '';

  const [detail, setDetail] = useState<MaterialDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const type = detail ? getMaterialType(detail.fileName) : null;
  const Icon = type?.icon || FileText;

  const fetchDetail = async () => {
    if (!fileId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      const response = await api.get(`/material/${fileId}`);
      setDetail(response.data?.data ?? response.data);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [fileId]);

  // 文本类文件读取前 3000 字做预览，其余类型交给原生组件展示
  useEffect(() => {
    setPreviewText(null);
    if (!detail || !type || type.preview !== 'text') return;
    let cancelled = false;
    fetch(toMaterialUrl(detail.fileUrl))
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error('读取失败'))))
      .then((text) => {
        if (!cancelled) setPreviewText(text.slice(0, 3000));
      })
      .catch(() => {
        if (!cancelled) setPreviewText(null);
      });
    return () => {
      cancelled = true;
    };
  }, [detail?.id, detail?.fileUrl, type?.preview]);

  const handleDownload = async () => {
    if (!detail || downloading) return;
    setDownloading(true);
    try {
      const result = await downloadMaterialFile(detail.id, detail.fileName);
      if (!result.ok) {
        toast.error('下载失败，请稍后重试');
        return;
      }
      toast.success(result.path ? `已保存到：${result.path}` : '下载成功');
      setDetail((prev) =>
        prev ? { ...prev, downloadCount: (prev.downloadCount || 0) + 1 } : prev,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '下载失败');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="文件详情" variant="b" decor={<FileText className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}>
        <div className="flex flex-col gap-4">
          <div className="h-36 w-full animate-pulse rounded-xl bg-[#E9EEF5]" />
          <div className="h-24 w-full animate-pulse rounded-xl bg-[#E9EEF5]" />
        </div>
      </PageLayout>
    );
  }

  if (loadError || !detail) {
    return (
      <PageLayout title="文件详情" variant="b" decor={<FileText className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}>
        <div className="flex flex-col items-center gap-3 rounded-xl bg-white py-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FEF2F2]">
            <RefreshCw className="h-7 w-7 text-[#DC2626]" strokeWidth={2} />
          </div>
          <div className="text-[15px] font-body font-semibold text-[#1A1A1A]">
            {loadError ? '文件信息加载失败' : '文件不存在'}
          </div>
          {loadError && (
            <button
              type="button"
              onClick={fetchDetail}
              className="rounded-full bg-[#0062FF] px-5 py-2 text-[12px] font-body font-semibold text-white active:opacity-80"
            >
              重新加载
            </button>
          )}
        </div>
      </PageLayout>
    );
  }

  return (
    <>
      <PageLayout
        title="文件详情"
        variant="b"
        decor={<FileText className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}
      >
        <div className="flex w-full flex-col gap-4">
          {/* 文件名片 */}
          <div className="flex w-full flex-col items-center gap-2.5 rounded-xl bg-white px-4 py-5 shadow-soft">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ backgroundColor: type?.bg }}
            >
              <Icon className="h-8 w-8" style={{ color: type?.color }} strokeWidth={2} />
            </div>
            <div className="max-w-full break-all text-center text-[16px] font-heading font-bold leading-6 text-[#1A1A1A]">
              {detail.fileName}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: type?.bg, color: type?.color }}
              >
                {type?.label}
              </span>
              <span className="text-[11px] font-caption text-[#64748B]">
                {formatFileSize(detail.fileSize)}
              </span>
              <span className="text-[11px] font-caption text-[#CBD5E1]">·</span>
              <span className="text-[11px] font-caption text-[#64748B]">
                {formatRelativeTime(detail.createdAt)}上传
              </span>
              {isNewMaterial(detail.createdAt) && (
                <span className="rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[10px] font-semibold text-[#DC2626]">
                  新资料
                </span>
              )}
            </div>
          </div>

          {/* 预览 */}
          {type && type.preview !== 'none' && (
            <div className="flex w-full flex-col gap-2.5 rounded-xl bg-white p-3.5 shadow-soft">
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-body font-semibold text-[#1A1A1A]">预览</div>
                {type.preview === 'image' && (
                  <div className="text-[10px] font-caption text-[#94A3B8]">点击图片放大</div>
                )}
              </div>

              {type.preview === 'image' && (
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="flex w-full items-center justify-center overflow-hidden rounded-xl bg-[#F8FAFC]"
                >
                  <img
                    src={toMaterialUrl(detail.fileUrl)}
                    alt={detail.fileName}
                    className="max-h-[320px] w-full object-contain"
                  />
                </button>
              )}

              {type.preview === 'video' && (
                <video
                  src={toMaterialUrl(detail.fileUrl)}
                  controls
                  playsInline
                  className="max-h-[320px] w-full rounded-xl bg-black"
                />
              )}

              {type.preview === 'audio' && (
                <audio src={toMaterialUrl(detail.fileUrl)} controls className="w-full" />
              )}

              {type.preview === 'text' && (
                <div className="rounded-xl bg-[#F8FAFC] p-3">
                  {previewText ? (
                    <>
                      <pre className="m-0 max-h-[260px] overflow-hidden whitespace-pre-wrap break-all text-[12px] font-body leading-5 text-[#475569]">
                        {previewText}
                      </pre>
                      {previewText.length >= 3000 && (
                        <div className="mt-2 text-[10px] font-caption text-[#94A3B8]">
                          内容较长，仅展示前 3000 字，完整内容请下载查看
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="py-4 text-center text-[11px] font-caption text-[#94A3B8]">
                      预览加载失败，请下载后查看
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {(type?.preview === 'none' || !type) && (
            <div className="flex w-full items-start gap-3 rounded-xl bg-[#F0F7FF] p-3.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#0062FF]" strokeWidth={2} />
              <div className="text-[11px] font-body leading-5 text-[#475569]">
                该类型文件暂不支持 App 内预览，下载后可用手机自带应用打开。
              </div>
            </div>
          )}

          {/* 文件信息 */}
          <div className="flex w-full flex-col overflow-hidden rounded-xl bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] px-4 py-3">
              <div className="text-[12px] font-body text-[#64748B]">上传者</div>
              <div className="text-[13px] font-body font-medium text-[#1A1A1A]">
                {detail.uploaderName || '未知'}
              </div>
            </div>
            <div className="flex items-center justify-between border-b border-[#F1F5F9] px-4 py-3">
              <div className="text-[12px] font-body text-[#64748B]">所属分类</div>
              <div className="text-[13px] font-body font-medium text-[#1A1A1A]">
                {detail.folderName || '未分类'}
              </div>
            </div>
            <div className="flex items-center justify-between border-b border-[#F1F5F9] px-4 py-3">
              <div className="text-[12px] font-body text-[#64748B]">下载次数</div>
              <div className="text-[13px] font-body font-medium text-[#1A1A1A]">
                {detail.downloadCount || 0} 次
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="text-[12px] font-body text-[#64748B]">上传时间</div>
              <div className="text-[13px] font-body font-medium text-[#1A1A1A]">
                {formatFullDate(detail.createdAt)}
              </div>
            </div>
          </div>
        </div>

        {/* 底部固定下载：额外预留系统手势条/导航栏安全区，避免说明文字被遮挡裁切 */}
        <div className="sticky bottom-0 z-10 -mx-5 -mb-[calc(20px+env(safe-area-inset-bottom))] mt-4 border-t border-[#E2E8F0] bg-white px-5 pb-[calc(20px+max(env(safe-area-inset-bottom),var(--safe-bottom,0px)))] pt-3">
          <button
            type="button"
            disabled={downloading}
            onClick={handleDownload}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(-98.571deg,_#0062FF_14.645%,_#3B82F6_85.355%)] text-[15px] font-body font-semibold text-white shadow-[0_8px_20px_-8px_#0062FF99] active:scale-[0.99] disabled:opacity-60"
          >
            <Download className="h-[18px] w-[18px]" strokeWidth={2} />
            {downloading ? '下载中...' : '下载文件'}
          </button>
          <div className="mt-2 text-center text-[10px] font-caption text-[#94A3B8]">
            下载后可在手机「文件管理」中查看
          </div>
        </div>
      </PageLayout>

      {/* 图片全屏预览 */}
      {previewOpen && type?.preview === 'image' && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(15,23,42,0.92)] backdrop-blur-[2px]"
          role="presentation"
          onClick={() => setPreviewOpen(false)}
        >
          <button
            type="button"
            aria-label="关闭预览"
            onClick={() => setPreviewOpen(false)}
            className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-[14px] bg-white/15 text-white active:opacity-80"
            style={{ top: 'calc(var(--safe-top, 0px) + 16px)' }}
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <img
            src={toMaterialUrl(detail.fileUrl)}
            alt={detail.fileName}
            className="max-h-[80vh] max-w-[92vw] rounded-[14px] object-contain"
          />
        </div>
      )}
    </>
  );
}
