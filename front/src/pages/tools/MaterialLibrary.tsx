import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Flame,
  FolderOpen,
  HardDrive,
  Info,
  Plus,
  RefreshCw,
  Search,
  UploadCloud,
  X,
} from 'lucide-react';
import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useStatusBarStyle } from '@/hooks/useStatusBarStyle';
import {
  MATERIAL_FOLDERS,
  MaterialFileItem,
  MaterialSummary,
  formatFileSize,
  formatRelativeTime,
  getFolderMeta,
  getMaterialType,
  isNewMaterial,
} from '@/lib/material';

function FileRow({ file }: { file: MaterialFileItem }) {
  const navigate = useNavigate();
  const type = getMaterialType(file.fileName);
  const Icon = type.icon;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/material-detail?fileId=${file.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(`/material-detail?fileId=${file.id}`);
        }
      }}
      className="box-border flex w-full cursor-pointer items-center gap-3 p-3 text-left transition-colors active:bg-[#F8FAFC]"
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: type.bg }}
      >
        <Icon className="h-[20px] w-[20px]" style={{ color: type.color }} strokeWidth={2} />
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
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#CBD5E1]" />
    </div>
  );
}

export default function MaterialLibrary() {
  useStatusBarStyle(true); // 深色渐变头部 → 浅色状态栏图标
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const classId = user?.classId || '';

  const [summary, setSummary] = useState<MaterialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<MaterialFileItem[] | null>(null);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<number | null>(null);
  const searchSeq = useRef(0);

  const fetchSummary = useCallback(async () => {
    if (!classId) {
      setSummary(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      const res = await api.get('/material/summary', { params: { classId } });
      setSummary(res.data?.data ?? res.data);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // 进入资料库即视为已查看：上报已读水位，首页“资料”角标随之清零
  useEffect(() => {
    if (!classId) return;
    api.post('/material/viewed', null, { params: { classId } }).catch(() => {
      // 上报失败不阻塞资料库使用，下次进入会重新上报
    });
  }, [classId]);

  // 搜索防抖 400ms，避免每输入一个字就请求一次
  useEffect(() => {
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    const query = keyword.trim();
    if (!query) {
      setSearchResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = window.setTimeout(async () => {
      const seq = ++searchSeq.current;
      try {
        const res = await api.get('/material/list', { params: { classId, keyword: query } });
        if (seq !== searchSeq.current) return;
        const body = res.data?.data ?? res.data;
        setSearchResults(Array.isArray(body) ? body : []);
      } catch {
        if (seq === searchSeq.current) setSearchResults([]);
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, 400);
    return () => {
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
    };
  }, [keyword, classId]);

  const folderStats = summary?.folders || [];
  const knownNames = MATERIAL_FOLDERS.map((item) => item.name);
  const folderCards = [
    ...MATERIAL_FOLDERS.map((meta) => {
      const stat = folderStats.find((item) => item.name === meta.name);
      return { ...meta, count: stat?.count || 0, latestAt: stat?.latestAt || null };
    }),
    ...folderStats
      .filter((item) => !knownNames.includes(item.name))
      .map((stat) => ({ ...getFolderMeta(stat.name), count: stat.count, latestAt: stat.latestAt })),
  ];

  const quickEntries = [
    {
      label: '全部资料',
      value: `${summary?.totalCount || 0} 份`,
      icon: FolderOpen,
      color: '#2563EB',
      bg: '#EFF6FF',
      path: '/file-list',
    },
    {
      label: '我上传的',
      value: `${summary?.myUploadCount || 0} 份`,
      icon: UploadCloud,
      color: '#0891B2',
      bg: '#ECFEFF',
      path: '/file-list?view=mine',
    },
    {
      label: '热门下载',
      value: summary?.hotFiles?.[0]
        ? `${summary.hotFiles[0].downloadCount} 次`
        : '暂无',
      icon: Flame,
      color: '#EA580C',
      bg: '#FFF7ED',
      path: '/file-list?view=hot',
    },
    {
      label: '上传资料',
      value: '支持批量',
      icon: Plus,
      color: '#7C3AED',
      bg: '#F5F3FF',
      path: '/upload-material',
    },
  ];

  const recentFiles = summary?.recentFiles || [];

  return (
    <PhoneFrame className="flex flex-col bg-[#F5F5F5]">
      {/* 头部：资料概览 + 搜索 */}
      <div className="w-full shrink-0 rounded-b-[26px] bg-[linear-gradient(-133deg,_#004ECC_0%,_#0062FF_52%,_#3B82F6_100%)] px-5 pb-5">
        {/* Status Bar（真机 App 由系统状态栏展示，CSS 会自动折叠为安全占位） */}
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
              班级资料库
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/upload-material')}
            className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-white/20 px-3.5 text-[13px] font-body font-semibold text-white transition-transform active:scale-95"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            上传
          </button>
        </div>
        <div className="mt-1 text-[11px] font-body text-white/70">
          课件、班会记录、班级照片统一归档，随用随取
        </div>

        {/* 概览数据 */}
        <div className="mt-4 flex w-full gap-2">
          {[
            { label: '全部资料', value: `${summary?.totalCount || 0} 份`, icon: FolderOpen },
            { label: '近7天新增', value: `${summary?.newIn7Days || 0} 份`, icon: Flame },
            { label: '存储占用', value: formatFileSize(summary?.totalSize), icon: HardDrive },
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

        {/* 搜索 */}
        <div className="mt-4 flex h-11 w-full shrink-0 flex-row items-center gap-2 rounded-full bg-white px-4 shadow-[0_6px_18px_-10px_#00000066]">
          <Search className="h-[18px] w-[18px] shrink-0 text-[#64748B]" strokeWidth={2} />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索文件名，如 期末复习"
            className="min-w-0 flex-1 bg-transparent text-[14px] font-body text-[#1A1A1A] outline-none placeholder:text-[#94A3B8]"
          />
          {keyword && (
            <button
              type="button"
              aria-label="清空搜索"
              onClick={() => setKeyword('')}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[#64748B]"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      <div className="flex min-h-0 w-full flex-1 flex-col gap-4 overflow-y-auto px-5 pb-8 pt-4">
        {keyword.trim() ? (
          <div className="flex w-full flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="text-[12px] font-body font-semibold text-[#64748B]">
                搜索结果
              </div>
              <div className="text-[11px] font-caption text-[#94A3B8]">
                {searching ? '搜索中...' : `${searchResults?.length || 0} 个文件`}
              </div>
            </div>
            <div className="flex w-full flex-col overflow-hidden rounded-xl bg-[#FFFFFF] shadow-soft">
              {searching ? (
                <div className="py-8 text-center text-[12px] font-body text-[#94A3B8]">
                  正在搜索...
                </div>
              ) : searchResults && searchResults.length > 0 ? (
                searchResults.map((file, index) => (
                  <div
                    key={file.id}
                    className={
                      index === searchResults.length - 1
                        ? 'w-full'
                        : 'w-full border-b border-[#F1F5F9]'
                    }
                  >
                    <FileRow file={file} />
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center gap-2 py-10">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F1F5F9]">
                    <Search className="h-5 w-5 text-[#94A3B8]" strokeWidth={2} />
                  </div>
                  <div className="text-[13px] font-body font-medium text-[#64748B]">
                    没有找到「{keyword.trim()}」相关的文件
                  </div>
                  <button
                    type="button"
                    onClick={() => setKeyword('')}
                    className="mt-1 rounded-full bg-[#EFF6FF] px-4 py-1.5 text-[12px] font-body font-semibold text-[#0062FF]"
                  >
                    返回分类查找
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : loading ? (
          <div className="flex w-full flex-col gap-3">
            <div className="h-20 w-full animate-pulse rounded-xl bg-[#E9EEF5]" />
            <div className="grid w-full grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="h-28 w-full animate-pulse rounded-xl bg-[#E9EEF5]" />
              ))}
            </div>
            <div className="h-36 w-full animate-pulse rounded-xl bg-[#E9EEF5]" />
          </div>
        ) : loadError ? (
          <div className="flex w-full flex-col items-center gap-3 rounded-xl bg-[#FFFFFF] py-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FEF2F2]">
              <RefreshCw className="h-6 w-6 text-[#DC2626]" strokeWidth={2} />
            </div>
            <div className="text-[14px] font-body font-semibold text-[#1A1A1A]">
              资料加载失败
            </div>
            <button
              type="button"
              onClick={fetchSummary}
              className="rounded-full bg-[#0062FF] px-5 py-2 text-[12px] font-body font-semibold text-white active:opacity-80"
            >
              重新加载
            </button>
          </div>
        ) : (summary?.totalCount || 0) === 0 ? (
          <div className="flex w-full flex-col items-center gap-4 rounded-xl bg-[#FFFFFF] px-6 py-12">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#EBF3FF]">
              <FolderOpen className="h-10 w-10 text-[#0062FF]" strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <div className="text-[16px] font-heading font-bold text-[#1A1A1A]">
                资料库还是空的
              </div>
              <div className="mt-1.5 text-[12px] font-body leading-5 text-[#64748B]">
                上传班会记录、课件、照片等资料
                <br />
                全班同学都能在这里查看和下载
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/upload-material')}
              className="flex items-center gap-1.5 rounded-full bg-[#0062FF] px-6 py-2.5 text-[14px] font-body font-semibold text-white shadow-[0_8px_20px_-8px_#0062FF99] active:scale-95"
            >
              <UploadCloud className="h-4 w-4" strokeWidth={2} />
              上传第一份资料
            </button>
          </div>
        ) : (
          <>
            {/* 快捷入口 */}
            <div className="box-border flex w-full flex-col rounded-xl bg-[#FFFFFF] p-3 shadow-soft">
              <div className="grid w-full grid-cols-4 gap-1">
                {quickEntries.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => navigate(item.path)}
                      className="flex flex-col items-center gap-1.5 rounded-lg px-1 py-2 transition-transform active:scale-95 active:bg-[#F8FAFC]"
                    >
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-xl"
                        style={{ backgroundColor: item.bg }}
                      >
                        <Icon
                          className="h-[22px] w-[22px]"
                          style={{ color: item.color }}
                          strokeWidth={2}
                        />
                      </div>
                      <div className="text-[12px] font-body font-semibold text-[#1A1A1A]">
                        {item.label}
                      </div>
                      <div className="-mt-1 text-[10px] font-caption text-[#94A3B8]">
                        {item.value}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 使用提示 */}
            <div className="flex items-start gap-2 rounded-xl bg-[#EFF6FF] px-3 py-2.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#0062FF]" strokeWidth={2} />
              <div className="text-[11px] font-body leading-4 text-[#475569]">
                找不到文件？先在上方搜索文件名；也可以按下面分类逐个查看，点击文件即可预览或下载。
              </div>
            </div>

            {/* 分类 */}
            <div className="flex w-full flex-col gap-3">
              <div className="px-0.5">
                <div className="flex items-center justify-between">
                  <div className="text-[16px] font-heading font-semibold text-[#1A1A1A]">
                    按分类查找
                  </div>
                  <div className="text-[11px] font-caption text-[#94A3B8]">
                    共 {summary?.totalCount || 0} 份 · {formatFileSize(summary?.totalSize)}
                  </div>
                </div>
                <div className="mt-0.5 text-[11px] font-body text-[#94A3B8]">
                  资料按用途归档，点开分类查看全部文件
                </div>
              </div>
              <div className="grid w-full grid-cols-2 gap-3">
                {folderCards.map((folder) => {
                  const Icon = folder.icon;
                  return (
                    <button
                      key={folder.name}
                      type="button"
                      onClick={() =>
                        navigate(`/file-list?folder=${encodeURIComponent(folder.name)}`)
                      }
                      className="box-border flex w-full flex-col items-start gap-2 rounded-xl bg-[#FFFFFF] p-3.5 text-left shadow-soft transition-transform active:scale-[0.98]"
                    >
                      <div className="flex w-full items-start justify-between">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-xl"
                          style={{ backgroundColor: folder.bg }}
                        >
                          <Icon
                            className="h-[22px] w-[22px]"
                            style={{ color: folder.color }}
                            strokeWidth={2}
                          />
                        </div>
                        <div className="rounded-full bg-[#F8FAFC] px-2 py-0.5 text-[10px] font-caption text-[#64748B]">
                          {folder.count > 0 ? `${folder.count} 份` : '待补充'}
                        </div>
                      </div>
                      <div className="w-full">
                        <div className="text-[14px] font-heading font-bold text-[#1A1A1A]">
                          {folder.name}
                        </div>
                        <div className="mt-0.5 line-clamp-2 text-[11px] font-body leading-4 text-[#64748B]">
                          {folder.desc}
                        </div>
                      </div>
                      <div className="text-[10px] font-caption text-[#94A3B8]">
                        {folder.latestAt
                          ? `最近更新 ${formatRelativeTime(folder.latestAt)}`
                          : '暂无文件 · 点击上传'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 最近更新 */}
            <div className="flex w-full flex-col gap-2.5">
              <div className="px-0.5">
                <div className="flex items-center justify-between">
                  <div className="text-[16px] font-heading font-semibold text-[#1A1A1A]">
                    最近更新
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/file-list')}
                    className="flex items-center gap-0.5 text-[12px] font-body font-medium text-[#0062FF] active:opacity-70"
                  >
                    查看全部
                    <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
                <div className="mt-0.5 text-[11px] font-body text-[#94A3B8]">
                  按上传时间倒序，最新的资料排在最前
                </div>
              </div>
              <div className="flex w-full flex-col overflow-hidden rounded-xl bg-[#FFFFFF] shadow-soft">
                {recentFiles.map((file, index) => (
                  <div
                    key={file.id}
                    className={
                      index === recentFiles.length - 1
                        ? 'w-full'
                        : 'w-full border-b border-[#F1F5F9]'
                    }
                  >
                    <FileRow file={file} />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </PhoneFrame>
  );
}
