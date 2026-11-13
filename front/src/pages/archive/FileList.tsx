import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Download,
  FolderOpen,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import PageLayout from '@/components/layout/PageLayout';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  MaterialFileItem,
  downloadMaterialFile,
  formatFileSize,
  formatRelativeTime,
  getMaterialType,
  isNewMaterial,
} from '@/lib/material';

type TypeFilter = '全部' | '文档' | '图片' | '音视频' | '压缩包' | '其他';
type SortKey = '最新' | '名称' | '下载最多';

const TYPE_GROUPS: Record<TypeFilter, string[]> = {
  全部: [],
  文档: ['pdf', 'word', 'excel', 'ppt', 'text'],
  图片: ['image'],
  音视频: ['video', 'audio'],
  压缩包: ['archive'],
  其他: ['other'],
};

const TYPE_FILTERS: TypeFilter[] = ['全部', '文档', '图片', '音视频', '压缩包', '其他'];
const SORT_KEYS: SortKey[] = ['最新', '名称', '下载最多'];

export default function FileList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useCurrentUser();

  const classId = user?.classId || '';
  const folder = searchParams.get('folder') || '';
  const view = searchParams.get('view') || 'all';
  const initialKeyword = searchParams.get('keyword') || '';

  const [files, setFiles] = useState<MaterialFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(initialKeyword);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('全部');
  const [sortKey, setSortKey] = useState<SortKey>(view === 'hot' ? '下载最多' : '最新');

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MaterialFileItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 通过站内导航切换视图时组件不会重挂载，需同步刷新排序方式
  useEffect(() => {
    setSortKey(view === 'hot' ? '下载最多' : '最新');
  }, [view]);

  // 输入防抖 300ms，避免逐个字符请求
  useEffect(() => {
    const timer = window.setTimeout(() => setKeyword(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const fetchFiles = useCallback(async () => {
    if (!classId) {
      setFiles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const params: Record<string, string> = { classId };
      if (folder) params.folderName = folder;
      if (keyword) params.keyword = keyword;
      const response = await api.get('/material/list', { params });
      const body = response.data?.data ?? response.data;
      setFiles(Array.isArray(body) ? body : []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : '获取文件列表失败');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [classId, folder, keyword]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleDownload = async (event: React.MouseEvent, file: MaterialFileItem) => {
    event.stopPropagation();
    if (downloadingId) return;
    setDownloadingId(file.id);
    try {
      const result = await downloadMaterialFile(file.id, file.fileName);
      if (!result.ok) {
        toast.error('下载失败，请稍后重试');
        return;
      }
      toast.success(result.path ? `已保存到：${result.path}` : '下载成功');
      setFiles((prev) =>
        prev.map((item) =>
          item.id === file.id
            ? { ...item, downloadCount: (item.downloadCount || 0) + 1 }
            : item,
        ),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '下载失败');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await api.delete(`/material/${deleteTarget.id}`);
      toast.success('已删除');
      setFiles((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败');
    } finally {
      setDeleting(false);
    }
  };

  const canDelete = (file: MaterialFileItem) =>
    Boolean(user?.isCommittee) ||
    user?.roleLevel === 'owner' ||
    user?.roleLevel === 'admin' ||
    file.uploaderId === user?.id;

  const visibleFiles = useMemo(() => {
    let list = [...files];
    if (view === 'mine') {
      list = list.filter((file) => file.uploaderId === user?.id);
    }
    if (typeFilter !== '全部') {
      const allowed = TYPE_GROUPS[typeFilter];
      list = list.filter((file) => allowed.includes(getMaterialType(file.fileName).key));
    }
    if (sortKey === '下载最多') {
      list.sort((a, b) => b.downloadCount - a.downloadCount);
    } else if (sortKey === '名称') {
      list.sort((a, b) => a.fileName.localeCompare(b.fileName, 'zh-CN'));
    } else {
      list.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    return list;
  }, [files, view, typeFilter, sortKey, user?.id]);

  const pageTitle = folder || (view === 'mine' ? '我上传的' : view === 'hot' ? '热门下载' : '全部资料');

  return (
    <>
      <PageLayout
        title={pageTitle}
        variant="b"
        decor={<FolderOpen className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}
        right={
          classId ? (
            <button
              type="button"
              onClick={() => navigate('/upload-material')}
              className="mr-2 flex h-9 items-center gap-1 rounded-full bg-white/20 px-3 text-sm font-medium text-white backdrop-blur"
            >
              <Plus className="h-4 w-4" />
              上传
            </button>
          ) : undefined
        }
      >
        <div className="flex w-full flex-col gap-4">
          {/* 搜索 */}
          <div className="flex h-11 w-full items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4">
            <Search className="h-[18px] w-[18px] shrink-0 text-[#64748B]" strokeWidth={2} />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="搜索当前分类下的文件"
              className="min-w-0 flex-1 bg-transparent text-[14px] font-body text-[#1A1A1A] outline-none placeholder:text-[#94A3B8]"
            />
            {searchInput && (
              <button
                type="button"
                aria-label="清空搜索"
                onClick={() => setSearchInput('')}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[#64748B]"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            )}
          </div>

          {/* 类型筛选：收紧内边距与间距，保证 6 个胶囊在窄屏上也能完整显示（极窄屏仍可横向滑动） */}
          <div className="-mx-5 flex w-[calc(100%+40px)] flex-row gap-1.5 overflow-x-auto px-5 pb-1">
            {TYPE_FILTERS.map((tab) => {
              const active = typeFilter === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setTypeFilter(tab)}
                  className={`h-8 shrink-0 rounded-full px-2.5 text-[12px] font-body font-semibold transition-colors ${
                    active
                      ? 'bg-[#0062FF] text-white'
                      : 'bg-[#F1F5F9] text-[#64748B]'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* 数量与排序 */}
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-caption text-[#64748B]">
              共 {visibleFiles.length} 个文件
            </div>
            <div className="flex items-center gap-1">
              {SORT_KEYS.map((key) => {
                const active = sortKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSortKey(key)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-body transition-colors ${
                      active
                        ? 'bg-[#EFF6FF] font-semibold text-[#0062FF]'
                        : 'text-[#94A3B8]'
                    }`}
                  >
                    {key}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 文件列表 */}
          {loading ? (
            <div className="flex flex-col gap-2.5">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="h-[76px] w-full animate-pulse rounded-xl bg-[#E9EEF5]" />
              ))}
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center gap-3 rounded-xl bg-white py-10">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FEF2F2]">
                <RefreshCw className="h-6 w-6 text-[#DC2626]" strokeWidth={2} />
              </div>
              <div className="text-[14px] font-body font-semibold text-[#1A1A1A]">
                文件加载失败
              </div>
              <div className="px-6 text-center text-[12px] font-body text-[#64748B]">
                {loadError}
              </div>
              <button
                type="button"
                onClick={fetchFiles}
                className="rounded-full bg-[#0062FF] px-5 py-2 text-[12px] font-body font-semibold text-white active:opacity-80"
              >
                重新加载
              </button>
            </div>
          ) : visibleFiles.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl bg-white px-6 py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EBF3FF]">
                <FolderOpen className="h-8 w-8 text-[#0062FF]" strokeWidth={1.5} />
              </div>
              <div className="text-[14px] font-body font-semibold text-[#1A1A1A]">
                {keyword ? '没有找到相关文件' : '这个分类还没有文件'}
              </div>
              <div className="text-center text-[12px] font-body leading-5 text-[#64748B]">
                {keyword
                  ? '换个关键词试试，或切换类型筛选'
                  : '上传第一个文件，全班同学都能查看'}
              </div>
              <div className="mt-1 flex items-center gap-2">
                {keyword && (
                  <button
                    type="button"
                    onClick={() => setSearchInput('')}
                    className="rounded-full bg-[#F1F5F9] px-4 py-2 text-[12px] font-body font-semibold text-[#64748B]"
                  >
                    清空搜索
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate('/upload-material')}
                  className="flex items-center gap-1.5 rounded-full bg-[#0062FF] px-5 py-2 text-[12px] font-body font-semibold text-white active:opacity-80"
                >
                  <UploadCloud className="h-4 w-4" strokeWidth={2} />
                  上传文件
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {visibleFiles.map((file) => {
                const type = getMaterialType(file.fileName);
                const Icon = type.icon;
                const deletable = canDelete(file);
                return (
                  <div
                    key={file.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/material-detail?fileId=${file.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/material-detail?fileId=${file.id}`);
                      }
                    }}
                    className="flex w-full items-center gap-3 rounded-xl bg-white p-3 text-left shadow-soft transition-transform active:scale-[0.99]"
                  >
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: type.bg }}
                    >
                      <Icon className="h-[22px] w-[22px]" style={{ color: type.color }} strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="min-w-0 truncate text-[14px] font-body font-semibold text-[#1A1A1A]">
                          {file.fileName}
                        </span>
                        {isNewMaterial(file.createdAt) && (
                          <span className="shrink-0 rounded-full bg-[#FEF2F2] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[#DC2626]">
                            新
                          </span>
                        )}
                      </div>
                      <div className="mt-1 truncate text-[11px] font-caption text-[#64748B]">
                        {formatFileSize(file.fileSize)} · {file.uploaderName || '未知'} ·{' '}
                        {formatRelativeTime(file.createdAt)}
                      </div>
                      <div className="mt-0.5 text-[10px] font-caption text-[#94A3B8]">
                        {file.downloadCount || 0} 次下载
                        {file.folderName ? ` · ${file.folderName}` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="下载"
                      disabled={downloadingId === file.id}
                      onClick={(e) => handleDownload(e, file)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-[#0062FF] active:scale-95 disabled:opacity-60"
                    >
                      <Download className="h-[18px] w-[18px]" strokeWidth={2} />
                    </button>
                    {deletable && (
                      <button
                        type="button"
                        aria-label="删除"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(file);
                        }}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FEF2F2] text-[#DC2626] active:scale-95"
                      >
                        <Trash2 className="h-[18px] w-[18px]" strokeWidth={2} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 底部固定上传 */}
        <div className="sticky bottom-0 z-10 -mx-5 -mb-[calc(20px+env(safe-area-inset-bottom))] mt-4 border-t border-[#E2E8F0] bg-white px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            onClick={() => navigate('/upload-material')}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(-98.571deg,_#0062FF_14.645%,_#3B82F6_85.355%)] text-[15px] font-body font-semibold text-white shadow-[0_8px_20px_-8px_#0062FF99] active:scale-[0.99]"
          >
            <UploadCloud className="h-[18px] w-[18px]" strokeWidth={2} />
            上传资料
          </button>
        </div>
      </PageLayout>

      {/* 删除确认 */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="删除这个文件？"
        description={`${deleteTarget?.fileName ?? ''} · 删除后文件和下载记录将无法恢复，请确认后操作。`}
        confirmText="确认删除"
        danger
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
