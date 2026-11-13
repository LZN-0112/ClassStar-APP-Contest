import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Plus, UploadCloud, X } from 'lucide-react';
import { toast } from 'sonner';
import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useStatusBarStyle } from '@/hooks/useStatusBarStyle';
import { MATERIAL_FOLDERS, formatFileSize, getMaterialType } from '@/lib/material';

const MAX_FILES = 20;
const MAX_FILE_SIZE = 200 * 1024 * 1024;

export default function UploadMaterial() {
  useStatusBarStyle(false); // 浅色背景 → 深色状态栏图标
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const classId = user?.classId || '';

  const addFiles = (fileList: FileList) => {
    const incoming = Array.from(fileList);
    const oversize = incoming.filter((file) => file.size > MAX_FILE_SIZE).length;
    const empty = incoming.filter((file) => file.size === 0).length;
    const valid = incoming.filter((file) => file.size > 0 && file.size <= MAX_FILE_SIZE);

    if (oversize > 0) toast.error(`${oversize} 个文件超过 200MB，已自动跳过`);
    if (empty > 0) toast.error(`${empty} 个空文件，已自动跳过`);
    if (valid.length === 0) return;

    if (selectedFiles.length + valid.length > MAX_FILES) {
      toast.error(`单次最多上传 ${MAX_FILES} 个文件，当前已选 ${selectedFiles.length} 个`);
      return;
    }
    setSelectedFiles((prev) => [...prev, ...valid]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
    }
    // 重置 input，允许再次选择相同文件
    e.target.value = '';
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files) {
        addFiles(e.dataTransfer.files);
      }
    },
    [selectedFiles.length],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('请先选择文件');
      return;
    }
    if (!selectedFolder) {
      toast.error('请选择文件分类');
      return;
    }
    if (!classId) {
      toast.error('未找到班级信息，请返回首页重新进入');
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const formData = new FormData();
      formData.append('classId', classId);
      formData.append('folderName', selectedFolder);
      selectedFiles.forEach((f) => formData.append('files', f));

      const res = await api.post('/material/batch-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000,
        onUploadProgress: (event) => {
          if (event.total) {
            setProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
          }
        },
      });
      const count = res.data?.uploadedCount ?? selectedFiles.length;
      setProgress(100);
      toast.success(`成功上传 ${count} 个文件`);
      navigate(`/file-list?folder=${encodeURIComponent(selectedFolder)}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '上传失败，请稍后重试';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);

  return (
    <PhoneFrame className="bg-[#F5F5F5]">
      <div
        data-pencil-name="Status Bar"
        className="box-border flex h-[62px] w-full shrink-0 flex-row items-center justify-between gap-0 bg-[#F5F5F5] p-[12px_24px_0px_24px]"
      >
        <div className="text-[14px]/[normal] box-border text-left font-data font-semibold text-[#1A1A1A] [white-space:nowrap]">
          9:41
        </div>
        <div className="box-border flex h-fit w-fit shrink-0 flex-row items-center justify-start gap-[6px]">
          <div className="text-[14px]/[normal] box-border text-left font-caption font-normal text-[#1A1A1A] [white-space:nowrap]">
            ◉◉◉◉
          </div>
          <div className="text-[14px]/[normal] box-border text-left font-data font-normal text-[#1A1A1A] [white-space:nowrap]">
            100%
          </div>
        </div>
      </div>

      <div className="box-border flex w-full shrink-0 flex-row items-center justify-between px-5 py-3">
        <div className="flex flex-row items-center gap-0">
          <BackButton className="-ml-2" />
          <div className="text-[22px]/[normal] box-border text-left font-heading font-bold text-[#1A1A1A] [white-space:nowrap]">
            上传资料
          </div>
        </div>
        <div className="rounded-full bg-[#FFFFFF] px-2.5 py-1 text-[10px] font-caption text-[#64748B]">
          最多 {MAX_FILES} 个 / 单个 200MB
        </div>
      </div>

      <div className="flex w-full flex-col gap-4 px-5 pb-8">
        {/* 文件选择 */}
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`box-border flex min-h-[160px] w-full shrink-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl bg-[#FFFFFF] transition-colors ${
            dragOver
              ? 'border-2 border-[#0062FF] bg-[#EFF6FF]'
              : selectedFiles.length > 0
                ? 'border-2 border-[#0062FF]'
                : 'border border-[#E5E7EB]'
          }`}
        >
          {selectedFiles.length === 0 ? (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EFF6FF]">
                <UploadCloud className="h-7 w-7 text-[#0062FF]" strokeWidth={1.5} />
              </div>
              <div className="text-[14px] font-body font-medium text-[#1A1A1A]">
                点击选择文件
              </div>
              <div className="text-[11px] font-caption text-[#94A3B8]">
                支持一次选择多个文件，也可拖拽到此处
              </div>
            </>
          ) : (
            <div
              className="box-border flex w-full flex-col gap-2 p-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-1">
                <div className="text-[12px] font-body font-semibold text-[#1A1A1A]">
                  已选 {selectedFiles.length} 个文件
                </div>
                <div className="text-[11px] font-caption text-[#64748B]">
                  共 {formatFileSize(totalSize)}
                </div>
              </div>
              {selectedFiles.map((file, index) => {
                const fileType = getMaterialType(file.name);
                const FileIcon = fileType.icon;
                return (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex w-full items-center gap-2.5 rounded-lg bg-[#F8FAFC] p-2.5"
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: fileType.bg }}
                    >
                      <FileIcon
                        className="h-[18px] w-[18px]"
                        style={{ color: fileType.color }}
                        strokeWidth={2}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-body font-medium text-[#1A1A1A]">
                        {file.name}
                      </div>
                      <div className="text-[10px] font-caption text-[#64748B]">
                        {formatFileSize(file.size)}
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="移除文件"
                      onClick={() => removeFile(index)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#94A3B8]"
                    >
                      <X className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </div>
                );
              })}
              <div
                className="flex items-center justify-center gap-1 py-1 text-[12px] font-body font-medium text-[#0062FF]"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                继续添加文件
              </div>
            </div>
          )}
        </div>

        {/* 分类选择 */}
        <div className="flex w-full flex-col gap-2">
          <div className="flex items-center justify-between px-0.5">
            <div className="text-[14px] font-body font-semibold text-[#1A1A1A]">
              选择分类
            </div>
            <div className="text-[10px] font-caption text-[#94A3B8]">必选</div>
          </div>
          <div className="grid w-full grid-cols-2 gap-2.5">
            {MATERIAL_FOLDERS.map((folder) => {
              const Icon = folder.icon;
              const active = selectedFolder === folder.name;
              return (
                <button
                  key={folder.name}
                  type="button"
                  onClick={() => setSelectedFolder(folder.name)}
                  className={`relative flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-colors ${
                    active
                      ? 'border-[#0062FF] bg-[#EFF6FF]'
                      : 'border-[#E5E7EB] bg-[#FFFFFF]'
                  }`}
                >
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{ backgroundColor: folder.bg }}
                  >
                    <Icon
                      className="h-5 w-5"
                      style={{ color: folder.color }}
                      strokeWidth={2}
                    />
                  </div>
                  <div className="text-[13px] font-heading font-bold text-[#1A1A1A]">
                    {folder.name}
                  </div>
                  <div className="text-[10px] font-body leading-4 text-[#64748B]">
                    {folder.hint}
                  </div>
                  {active && (
                    <div className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#0062FF]">
                      <Check className="h-3 w-3 text-white" strokeWidth={2.5} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 上传进度 */}
        {uploading && (
          <div className="flex w-full flex-col gap-1.5 rounded-xl bg-[#FFFFFF] p-3.5">
            <div className="flex items-center justify-between text-[11px] font-body">
              <span className="text-[#475569]">正在上传 {selectedFiles.length} 个文件</span>
              <span className="font-data font-semibold text-[#0062FF]">{progress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
              <div
                className="h-full rounded-full bg-[#0062FF] transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-[10px] font-caption text-[#94A3B8]">
              上传过程中请保持应用在前台，避免中断
            </div>
          </div>
        )}

        {/* 上传按钮 */}
        <button
          type="button"
          disabled={uploading}
          onClick={handleUpload}
          className="flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(-98.571deg,_#0062FF_14.645%,_#3B82F6_85.355%)] text-[15px] font-body font-semibold text-white shadow-[0_8px_20px_-8px_#0062FF99] active:scale-[0.99] disabled:opacity-60"
        >
          <UploadCloud className="h-[18px] w-[18px]" strokeWidth={2} />
          {uploading ? `上传中 ${progress}%` : '开始上传'}
        </button>
        <div className="text-center text-[10px] font-caption text-[#94A3B8]">
          上传成功后，全班同学都可以在资料库中查看和下载
        </div>

        {/* 一键转载 */}
        <button
          type="button"
          onClick={() => navigate('/repost-message')}
          className="flex h-11 w-full shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[13px] font-body font-semibold text-[#0062FF] active:opacity-80"
        >
          一键转载（文字 + 文件）
        </button>
      </div>
    </PhoneFrame>
  );
}
