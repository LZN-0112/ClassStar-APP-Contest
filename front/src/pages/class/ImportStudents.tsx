import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import { useNavigate } from 'react-router-dom';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { FileSpreadsheet, Database, MessageCircle, MessageSquare } from 'lucide-react';

type Step = 'select' | 'uploading' | 'importing' | 'result';

interface ImportResult {
  successCount: number;
  removedCount: number;
  updatedCount: number;
  sync: boolean;
  duplicateStudentNos: string[];
  errors: { row: number; studentNo: string; reason: string }[];
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls'].includes(ext || '')) {
      toast.error('仅支持 .xlsx、.xls 格式');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('文件不能超过 10MB');
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !classId) return;

    setStep('uploading');
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

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
      <PhoneFrame>
        <div className="box-border w-full h-[62px] shrink-0 flex flex-row gap-0 p-[12px_24px_0px_24px] justify-between items-center bg-[#FFFFFF]">
          <div className="text-[14px]/[normal] box-border text-[#1A1A1A] font-data font-semibold text-left [white-space:nowrap]">9:41</div>
          <div className="text-[14px]/[normal] box-border text-[#1A1A1A] font-data font-normal text-left [white-space:nowrap]">100%</div>
        </div>
        <div className="box-border w-full [flex:1_1_0] flex flex-col gap-4 p-[0px_24px] justify-start items-start">
          <div className="box-border w-full h-[60px] shrink-0 flex flex-row gap-0 justify-start items-start"></div>
          <div className="flex flex-row items-center gap-0 w-full">
            <BackButton className="-ml-2" />
            <div className="text-[20px]/[normal] text-[#1A1A1A] font-heading font-bold text-left">导入学生名单</div>
          </div>
          <div className="text-[14px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap] mb-2">
            选择一种方式快速导入班级成员
          </div>

          {/* Excel 导入 */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="box-border w-full h-[64px] shrink-0 flex flex-row gap-3 p-[16px] justify-between items-center bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl active:bg-[#F9FAFB] transition-colors"
          >
            <div className="flex flex-row gap-3 items-center">
              <FileSpreadsheet className="h-6 w-6 text-[#0062FF]" strokeWidth={2} />
              <div className="flex flex-col gap-0.5">
                <div className="text-[15px] text-[#1A1A1A] font-body font-semibold text-left">Excel 导入</div>
                <div className="text-[12px] text-[#9CA3AF] font-caption text-left">上传表格文件</div>
              </div>
            </div>
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#9CA3AF]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />

          {/* 已选择文件后显示上传确认 */}
          {selectedFile && (
            <>
              {/* 文件信息 */}
              <div className="w-full p-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center bg-[#0062FF] rounded-lg">
                    <FileSpreadsheet className="h-5 w-5 text-white" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] text-[#1A1A1A] font-body font-medium truncate">{selectedFile.name}</div>
                    <div className="text-[11px] text-[#4B5563] font-caption">{(selectedFile.size / 1024).toFixed(1)} KB</div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); reset(); }}
                    className="text-[12px] text-[#EF4444] font-body font-medium"
                  >
                    重新选择
                  </button>
                </div>
              </div>

              {/* 同步模式开关 */}
              <div className="w-full flex flex-row items-center justify-between p-4 bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg">
                <div className="flex flex-col gap-1">
                  <div className="text-[14px] text-[#1A1A1A] font-body font-medium">同步模式</div>
                  <div className="text-[11px] text-[#4B5563] font-caption">
                    开启后以新名单为准，移除不在名单中的成员（群主除外）
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSyncMode(!syncMode)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${syncMode ? 'bg-[#0062FF]' : 'bg-[#D1D5DB]'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${syncMode ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* 格式提示 */}
              <div className="w-full p-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg">
                <div className="text-[12px] text-[#1E40AF] font-body font-medium mb-2">Excel 表头要求</div>
                <div className="text-[11px] text-[#3B82F6] font-caption leading-relaxed">
                  必须包含三列表头：<br />
                  <span className="font-semibold">学号</span> | <span className="font-semibold">姓名</span> | <span className="font-semibold">手机号</span>
                </div>
              </div>
            </>
          )}

          {/* 教务系统导入 */}
          <button
            type="button"
            onClick={() => toast.info('教务系统导入功能开发中')}
            className="box-border w-full h-[64px] shrink-0 flex flex-row gap-3 p-[16px] justify-between items-center bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl active:bg-[#F9FAFB] transition-colors"
          >
            <div className="flex flex-row gap-3 items-center">
              <Database className="h-6 w-6 text-[#0062FF]" strokeWidth={2} />
              <div className="flex flex-col gap-0.5">
                <div className="text-[15px] text-[#1A1A1A] font-body font-semibold text-left">教务系统导入</div>
                <div className="text-[12px] text-[#9CA3AF] font-caption text-left">从学校系统同步</div>
              </div>
            </div>
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#9CA3AF]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* QQ 群导入 */}
          <button
            type="button"
            onClick={() => toast.info('QQ 群导入功能开发中')}
            className="box-border w-full h-[64px] shrink-0 flex flex-row gap-3 p-[16px] justify-between items-center bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl active:bg-[#F9FAFB] transition-colors"
          >
            <div className="flex flex-row gap-3 items-center">
              <MessageCircle className="h-6 w-6 text-[#12B7F5]" strokeWidth={2} />
              <div className="flex flex-col gap-0.5">
                <div className="text-[15px] text-[#1A1A1A] font-body font-semibold text-left">QQ 群导入</div>
                <div className="text-[12px] text-[#9CA3AF] font-caption text-left">从 QQ 群成员导入</div>
              </div>
            </div>
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#9CA3AF]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* 微信群导入 */}
          <button
            type="button"
            onClick={() => toast.info('微信群导入功能开发中')}
            className="box-border w-full h-[64px] shrink-0 flex flex-row gap-3 p-[16px] justify-between items-center bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl active:bg-[#F9FAFB] transition-colors"
          >
            <div className="flex flex-row gap-3 items-center">
              <MessageSquare className="h-6 w-6 text-[#07C160]" strokeWidth={2} />
              <div className="flex flex-col gap-0.5">
                <div className="text-[15px] text-[#1A1A1A] font-body font-semibold text-left">微信群导入</div>
                <div className="text-[12px] text-[#9CA3AF] font-caption text-left">从微信群成员导入</div>
              </div>
            </div>
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#9CA3AF]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <div className="flex-1" />

          {/* 开始导入按钮（选择文件后显示） */}
          {selectedFile && (
            <button
              type="button"
              onClick={handleUpload}
              className="w-full h-[52px] rounded-lg bg-[#0062FF] text-white text-[16px] font-body font-semibold active:opacity-80 transition-opacity"
            >
              {syncMode ? '开始同步名单' : '开始导入名单'}
            </button>
          )}
          <div className="w-full h-[24px]" />
        </div>
      </PhoneFrame>
    );
  }

  // ==================== Step: UPLOADING ====================
  if (step === 'uploading') {
    return (
      <PhoneFrame>
        <div className="w-full [flex:1_1_0] flex flex-col gap-4 p-[20px] justify-center items-center">
          <div className="text-[20px] text-[#1A1A1A] font-heading font-bold">正在上传文件...</div>
          <div className="w-full h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
            <div className="h-full bg-[#0062FF] transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
          </div>
          <div className="text-[14px] text-[#4B5563] font-body">{uploadProgress}%</div>
        </div>
      </PhoneFrame>
    );
  }

  // ==================== Step: IMPORTING ====================
  if (step === 'importing') {
    return (
      <PhoneFrame>
        <div className="w-full [flex:1_1_0] flex flex-col gap-4 p-[20px] justify-center items-center">
          <div className="w-16 h-16 border-4 border-[#0062FF] border-t-transparent rounded-full animate-spin" />
          <div className="text-[20px] text-[#1A1A1A] font-heading font-bold">正在解析名单...</div>
          <div className="text-[14px] text-[#4B5563] font-body">请稍候，正在处理 {selectedFile?.name}</div>
        </div>
      </PhoneFrame>
    );
  }

  // ==================== Step: RESULT ====================
  if (step === 'result' && result) {
    const hasErrors = result.errors.length > 0 || result.duplicateStudentNos.length > 0;

    return (
      <PhoneFrame>
        <div className="box-border w-full h-[62px] shrink-0 flex flex-row gap-0 p-[12px_24px_0px_24px] justify-between items-center bg-[#FFFFFF]">
          <div className="text-[14px]/[normal] text-[#1A1A1A] font-data font-semibold text-left">9:41</div>
          <div className="text-[14px]/[normal] text-[#1A1A1A] font-data font-normal text-left">100%</div>
        </div>
        <div className="box-border w-full [flex:1_1_0] flex flex-col gap-4 p-[0px_24px] justify-start items-start overflow-y-auto">
          <div className="box-border w-full h-[60px] shrink-0 flex flex-row gap-0 justify-start items-start"></div>
          <div className="flex flex-row items-center gap-0 w-full">
            <BackButton className="-ml-2" onClick={finish} />
            <div className="text-[20px]/[normal] text-[#1A1A1A] font-heading font-bold text-left">导入结果</div>
          </div>

          {/* Success card */}
          <div className="w-full flex flex-col gap-3 p-6 bg-[#0062FF0D] border border-[#BFDBFE] rounded-xl">
            <div className="flex flex-row gap-3 items-center">
              <div className="w-10 h-10 flex flex-row gap-0 justify-center items-center bg-[#10B981] rounded-full">
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="flex flex-col">
                <div className="text-[18px] text-[#059669] font-heading font-bold">{result.sync ? '同步完成' : '导入完成'}</div>
                <div className="text-[12px] text-[#6B7280] font-caption">文件：{selectedFile?.name}</div>
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="w-full grid grid-cols-2 gap-3">
            <div className="h-[80px] flex flex-col gap-1 justify-center items-center bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg">
              <div className="text-[24px] text-[#0062FF] font-heading font-bold">{result.successCount}</div>
              <div className="text-[11px] text-[#4B5563] font-caption">新增成员</div>
            </div>
            {result.updatedCount > 0 && (
              <div className="h-[80px] flex flex-col gap-1 justify-center items-center bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg">
                <div className="text-[24px] text-[#10B981] font-heading font-bold">{result.updatedCount}</div>
                <div className="text-[11px] text-[#4B5563] font-caption">补全学号</div>
              </div>
            )}
            {result.sync ? (
              <div className="h-[80px] flex flex-col gap-1 justify-center items-center bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg">
                <div className="text-[24px] text-[#EF4444] font-heading font-bold">{result.removedCount}</div>
                <div className="text-[11px] text-[#4B5563] font-caption">已移除</div>
              </div>
            ) : (
              <div className="h-[80px] flex flex-col gap-1 justify-center items-center bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg">
                <div className="text-[24px] text-[#F59E0B] font-heading font-bold">{result.duplicateStudentNos.length}</div>
                <div className="text-[11px] text-[#4B5563] font-caption">已存在</div>
              </div>
            )}
            <div className="h-[80px] flex flex-col gap-1 justify-center items-center bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg">
              <div className="text-[24px] text-[#4B5563] font-heading font-bold">{result.errors.length}</div>
              <div className="text-[11px] text-[#4B5563] font-caption">异常</div>
            </div>
          </div>

          {/* Error list */}
          {hasErrors && (
            <div className="w-full flex flex-col gap-2">
              <div className="text-[14px] text-[#1A1A1A] font-heading font-semibold">异常明细</div>
              <div className="w-full flex flex-col gap-2 max-h-[200px] overflow-y-auto">
                {result.duplicateStudentNos.map((sn, idx) => (
                  <div key={`dup-${idx}`} className="w-full flex flex-row gap-2 items-center p-3 bg-[#FEF3C7] border border-[#FDE68A] rounded-lg">
                    <span className="text-[12px] text-[#B45309] font-caption">⚠️</span>
                    <span className="text-[12px] text-[#92400E] font-body">学号 {sn}：已在班级中存在</span>
                  </div>
                ))}
                {result.errors.map((err, idx) => (
                  <div key={`err-${idx}`} className="w-full flex flex-row gap-2 items-center p-3 bg-[#FEE2E2] border border-[#FECACA] rounded-lg">
                    <span className="text-[12px] text-[#B91C1C] font-caption">❌</span>
                    <span className="text-[12px] text-[#991B1B] font-body">第{err.row}行（{err.studentNo || '空学号'}）：{err.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1" />

          {/* Actions */}
          <div className="w-full flex flex-col gap-3">
            <button
              type="button"
              onClick={finish}
              className="w-full h-[52px] rounded-lg bg-[#0062FF] text-white text-[16px] font-body font-semibold"
            >
              进入班级查看
            </button>
            <button
              type="button"
              onClick={reset}
              className="w-full h-[52px] rounded-lg bg-[#FFFFFF] border border-[#E5E7EB] text-[#1A1A1A] text-[16px] font-body font-semibold"
            >
              继续导入
            </button>
          </div>
          <div className="w-full h-[24px]" />
        </div>
      </PhoneFrame>
    );
  }

  return null;
}
