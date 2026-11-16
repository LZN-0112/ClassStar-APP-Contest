import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import StatusBar from '@/components/layout/StatusBar';
import { useNavigate } from 'react-router-dom';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  Check,
  ChevronRight,
  Database,
  Download,
  FileSpreadsheet,
  Loader2,
  MessageCircle,
  MessageSquare,
  UploadCloud,
  X,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

type Step = 'select' | 'uploading' | 'importing' | 'result';

interface ImportResult {
  successCount: number;
  removedCount: number;
  updatedCount: number;
  sync: boolean;
  duplicateStudentNos: string[];
  errors: { row: number; studentNo: string; reason: string }[];
}

/** Blob 转 base64（去掉 dataURL 前缀），供原生端写入文件 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(new Error('读取模板文件失败'));
    reader.readAsDataURL(blob);
  });
}

export default function ImportStudents() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const classId = user?.classId;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('select');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [syncMode, setSyncMode] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx') {
      toast.error('仅支持 .xlsx 格式，老版 .xls 请先另存为 .xlsx');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('文件不能超过 10MB');
      return;
    }

    setSelectedFile(file);
  };

  const handleDownloadTemplate = async () => {
    if (downloadingTemplate) return;
    setDownloadingTemplate(true);
    const fileName = '学生名单导入模板.xlsx';
    try {
      const res = await api.get('/class/student-excel-template', { responseType: 'blob' });
      if (Capacitor.isNativePlatform()) {
        const base64 = await blobToBase64(res.data as Blob);
        const { uri } = await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Cache,
        });
        await Share.share({
          title: fileName,
          url: uri,
          dialogTitle: '保存或分享模板',
        });
      } else {
        const url = URL.createObjectURL(res.data as Blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      // 用户在系统分享面板取消时不算失败
      if (!/cancel/i.test(msg)) toast.error('模板下载失败，请稍后重试');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !classId) return;

    setStep('uploading');
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (classId) formData.append('classId', classId);

      const uploadRes = await api.post('/class/upload-student-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) {
            setUploadProgress(Math.round((e.loaded * 100) / e.total));
          }
        },
      });

      const fileUrl = uploadRes.data?.data?.fileUrl || uploadRes.data?.fileUrl;
      if (!fileUrl) throw new Error('上传失败，未获取到文件地址');

      setStep('importing');
      const importRes = await api.post('/class/import-student-excel', {
        classId,
        fileUrl,
        sync: syncMode,
      });

      const data = importRes.data?.data || importRes.data;
      setResult(data);
      setStep('result');

      if (data.successCount > 0) {
        toast.success(syncMode ? `同步完成：新增 ${data.successCount} 人` : `导入成功：新增 ${data.successCount} 人`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || '导入失败');
      setStep('select');
    }
  };

  const reset = () => {
    setSelectedFile(null);
    setResult(null);
    setStep('select');
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const finish = () => {
    navigate('/home', { replace: true });
  };

  // ==================== Step: SELECT METHOD ====================
  if (step === 'select') {
    return (
      <PhoneFrame reserveSafeAreaTop safeAreaTopClassName="bg-[#F7F8FA]">
        <StatusBar />
        <div className="box-border w-full flex-1 flex flex-col bg-[#F7F8FA]">
          <div className="flex w-full flex-col gap-4 px-5 pb-8">
            <div className="w-full h-2 shrink-0" />

            <div className="flex w-full flex-row items-center gap-0">
              <BackButton className="-ml-2" />
              <div className="text-[20px]/[normal] text-[#1A1A1A] font-heading font-bold">
                导入学生名单
              </div>
            </div>
            <div className="text-[13px]/[1.7] font-body text-[#6B7280]">
              导入后这份名单就是班级花名册，通知、考勤、班费都将按名单点名。
            </div>

            {/* 推荐方式：Excel 导入 */}
            <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-white shadow-soft">
              <div className="flex w-full items-center gap-2 px-4 pt-4">
                <span className="rounded-md bg-[#EBF3FF] px-1.5 py-0.5 text-[10px] font-body font-semibold text-[#0062FF]">
                  推荐
                </span>
                <span className="text-[15px] font-heading font-semibold text-[#1A1A1A]">
                  Excel 导入
                </span>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-[#F8FAFC]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EBF3FF]">
                  <FileSpreadsheet className="h-5 w-5 text-[#0062FF]" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-body font-semibold text-[#1A1A1A]">
                    {selectedFile ? '重新选择文件' : '上传 .xlsx 表格'}
                  </div>
                  <div className="mt-0.5 text-[11px] font-caption text-[#94A3B8]">
                    需包含 学号 / 姓名 / 手机号 三列
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#CBD5E1]" strokeWidth={2} />
              </button>
              <div className="mx-4 mb-3 flex items-center justify-between rounded-xl bg-[#F8FAFC] px-3 py-2">
                <span className="text-[11px] font-caption text-[#94A3B8]">
                  首次导入建议先下载模板
                </span>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  disabled={downloadingTemplate}
                  className="flex items-center gap-1 text-[12px] font-body font-medium text-[#0062FF] active:opacity-70 disabled:opacity-50"
                >
                  {downloadingTemplate ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
                  ) : (
                    <Download className="h-3.5 w-3.5" strokeWidth={2} />
                  )}
                  {downloadingTemplate ? '下载中' : '下载模板'}
                </button>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileChange} />

            {/* 已选择文件后的确认区 */}
            {selectedFile && (
              <div className="flex w-full flex-col gap-3">
                <div className="flex w-full items-center gap-3 rounded-2xl bg-[#EFF6FF] p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0062FF]">
                    <FileSpreadsheet className="h-5 w-5 text-white" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-body font-medium text-[#1A1A1A]">
                      {selectedFile.name}
                    </div>
                    <div className="mt-0.5 text-[11px] font-caption text-[#64748B]">
                      {(selectedFile.size / 1024).toFixed(1)} KB · 已选择
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={reset}
                    aria-label="清除已选文件"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[#94A3B8] active:opacity-70"
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>

                <div className="flex w-full flex-row items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-soft">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="text-[14px] font-body font-medium text-[#1A1A1A]">同步模式</div>
                    <div className="text-[11px]/[1.6] font-caption text-[#94A3B8]">
                      开启后以新名单为准，移除不在名单中的成员（群主除外）
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={syncMode}
                    onClick={() => setSyncMode(!syncMode)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                      syncMode ? 'bg-[#0062FF]' : 'bg-[#D1D5DB]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        syncMode ? 'translate-x-[22px]' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex w-full flex-col gap-1.5 rounded-2xl bg-[#EFF6FF] p-4">
                  <div className="text-[12px] font-body font-semibold text-[#0062FF]">
                    Excel 表头要求
                  </div>
                  <div className="text-[11px]/[1.7] font-caption text-[#3B82F6]">
                    必须包含三列表头：
                    <span className="font-semibold">学号</span> ｜{' '}
                    <span className="font-semibold">姓名</span> ｜{' '}
                    <span className="font-semibold">手机号</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleUpload}
                  className="flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#0062FF] text-[16px] font-body font-semibold text-white shadow-[0_10px_20px_rgba(0,98,255,0.22)] transition-transform active:scale-[0.99]"
                >
                  {syncMode ? '开始同步名单' : '开始导入名单'}
                </button>
              </div>
            )}

            {/* 更多导入方式 */}
            <div className="mt-1 flex w-full flex-col gap-2">
              <div className="text-[12px] font-body font-semibold text-[#64748B]">
                更多导入方式
              </div>
              <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-white shadow-soft">
                {[
                  { icon: Database, title: '教务系统导入', subtitle: '从学校系统同步' },
                  { icon: MessageCircle, title: 'QQ 群导入', subtitle: '从 QQ 群成员导入' },
                  { icon: MessageSquare, title: '微信群导入', subtitle: '从微信群成员导入' },
                ].map((row, index) => {
                  const Icon = row.icon;
                  return (
                    <div
                      key={row.title}
                      className={`flex w-full items-center gap-3 px-4 py-3.5 ${
                        index > 0 ? 'border-t border-[#F1F5F9]' : ''
                      }`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F1F5F9]">
                        <Icon className="h-5 w-5 text-[#94A3B8]" strokeWidth={1.8} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[14px] font-body font-medium text-[#64748B]">
                            {row.title}
                          </span>
                          <span className="rounded-md bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] font-body text-[#94A3B8]">
                            即将上线
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] font-caption text-[#CBD5E1]">
                          {row.subtitle}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="h-2" />
          </div>
        </div>
      </PhoneFrame>
    );
  }

  // ==================== Step: UPLOADING ====================
  if (step === 'uploading') {
    return (
      <PhoneFrame reserveSafeAreaTop safeAreaTopClassName="bg-[#F7F8FA]">
        <StatusBar />
        <div className="flex w-full flex-1 flex-col items-center justify-center gap-5 bg-[#F7F8FA] px-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EBF3FF]">
            <UploadCloud className="h-7 w-7 text-[#0062FF]" strokeWidth={1.8} />
          </div>
          <div className="text-[17px] font-heading font-bold text-[#1A1A1A]">正在上传名单</div>
          <div className="w-full max-w-[260px] truncate text-center text-[12px] font-body text-[#94A3B8]">
            {selectedFile?.name}
          </div>
          <div className="w-full max-w-[240px]">
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
              <div
                className="h-full rounded-full bg-[#0062FF] transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="mt-2 text-center text-[12px] font-data font-semibold text-[#0062FF]">
              {uploadProgress}%
            </div>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  // ==================== Step: IMPORTING ====================
  if (step === 'importing') {
    return (
      <PhoneFrame reserveSafeAreaTop safeAreaTopClassName="bg-[#F7F8FA]">
        <StatusBar />
        <div className="flex w-full flex-1 flex-col items-center justify-center gap-4 bg-[#F7F8FA] px-8">
          <Loader2 className="h-12 w-12 animate-spin text-[#0062FF]" strokeWidth={2} />
          <div className="text-[17px] font-heading font-bold text-[#1A1A1A]">正在解析名单</div>
          <div className="max-w-[260px] truncate text-center text-[12px] font-body text-[#94A3B8]">
            请稍候，正在处理 {selectedFile?.name}
          </div>
        </div>
      </PhoneFrame>
    );
  }

  // ==================== Step: RESULT ====================
  if (step === 'result' && result) {
    const hasErrors = result.errors.length > 0 || result.duplicateStudentNos.length > 0;

    return (
      <PhoneFrame reserveSafeAreaTop safeAreaTopClassName="bg-[#F7F8FA]">
        <StatusBar />
        <div className="box-border w-full flex-1 flex flex-col items-start gap-4 overflow-y-auto bg-[#F7F8FA] px-5 pb-6">
          <div className="w-full h-2 shrink-0" />

          <div className="flex w-full flex-row items-center gap-0">
            <BackButton className="-ml-2" onClick={finish} />
            <div className="text-[20px]/[normal] text-[#1A1A1A] font-heading font-bold">
              导入结果
            </div>
          </div>

          {/* 结果概览 */}
          <div className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 shadow-soft">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ECFDF5]">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#10B981]">
                <Check className="h-4 w-4 text-white" strokeWidth={3} />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[17px] font-heading font-bold text-[#059669]">
                {result.sync ? '同步完成' : '导入完成'}
              </div>
              <div className="mt-0.5 truncate text-[11px] font-caption text-[#94A3B8]">
                文件：{selectedFile?.name}
              </div>
            </div>
          </div>

          {/* 数据统计 */}
          <div className="grid w-full grid-cols-2 gap-3">
            <div className="flex h-[80px] flex-col items-center justify-center gap-1 rounded-2xl bg-white shadow-soft">
              <div className="text-[24px] font-heading font-bold text-[#0062FF]">
                {result.successCount}
              </div>
              <div className="text-[11px] font-caption text-[#64748B]">新增成员</div>
            </div>
            {result.updatedCount > 0 && (
              <div className="flex h-[80px] flex-col items-center justify-center gap-1 rounded-2xl bg-white shadow-soft">
                <div className="text-[24px] font-heading font-bold text-[#10B981]">
                  {result.updatedCount}
                </div>
                <div className="text-[11px] font-caption text-[#64748B]">补全学号</div>
              </div>
            )}
            {result.sync ? (
              <div className="flex h-[80px] flex-col items-center justify-center gap-1 rounded-2xl bg-white shadow-soft">
                <div className="text-[24px] font-heading font-bold text-[#EF4444]">
                  {result.removedCount}
                </div>
                <div className="text-[11px] font-caption text-[#64748B]">已移除</div>
              </div>
            ) : (
              <div className="flex h-[80px] flex-col items-center justify-center gap-1 rounded-2xl bg-white shadow-soft">
                <div className="text-[24px] font-heading font-bold text-[#F59E0B]">
                  {result.duplicateStudentNos.length}
                </div>
                <div className="text-[11px] font-caption text-[#64748B]">已存在</div>
              </div>
            )}
            <div className="flex h-[80px] flex-col items-center justify-center gap-1 rounded-2xl bg-white shadow-soft">
              <div className="text-[24px] font-heading font-bold text-[#64748B]">
                {result.errors.length}
              </div>
              <div className="text-[11px] font-caption text-[#64748B]">异常</div>
            </div>
          </div>

          {/* 异常明细 */}
          {hasErrors && (
            <div className="flex w-full flex-col gap-2">
              <div className="text-[13px] font-heading font-semibold text-[#1A1A1A]">异常明细</div>
              <div className="flex max-h-[200px] w-full flex-col gap-2 overflow-y-auto">
                {result.duplicateStudentNos.map((sn, idx) => (
                  <div
                    key={`dup-${idx}`}
                    className="flex w-full flex-row items-center gap-2 rounded-xl bg-[#FEF3C7] p-3"
                  >
                    <span className="text-[12px] font-caption text-[#B45309]">⚠️</span>
                    <span className="text-[12px] font-body text-[#92400E]">
                      学号 {sn}：已在班级中存在
                    </span>
                  </div>
                ))}
                {result.errors.map((err, idx) => (
                  <div
                    key={`err-${idx}`}
                    className="flex w-full flex-row items-center gap-2 rounded-xl bg-[#FEE2E2] p-3"
                  >
                    <span className="text-[12px] font-caption text-[#B91C1C]">❌</span>
                    <span className="text-[12px] font-body text-[#991B1B]">
                      第{err.row}行（{err.studentNo || '空学号'}）：{err.reason}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1" />

          <div className="flex w-full flex-col gap-3 pt-2">
            <button
              type="button"
              onClick={finish}
              className="h-[50px] w-full rounded-xl bg-[#0062FF] text-[16px] font-body font-semibold text-white shadow-[0_10px_20px_rgba(0,98,255,0.22)] active:scale-[0.99]"
            >
              进入班级查看
            </button>
            <button
              type="button"
              onClick={reset}
              className="h-[50px] w-full rounded-xl bg-white text-[16px] font-body font-semibold text-[#1A1A1A] shadow-soft active:scale-[0.99]"
            >
              继续导入
            </button>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  return null;
}