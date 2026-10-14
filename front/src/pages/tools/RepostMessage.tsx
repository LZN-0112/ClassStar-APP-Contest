import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';

const FOLDERS = ['班会资料', '课程作业', '活动照片', '评优材料'];
const MAX_FILES = 20;

export default function RepostMessage() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [text, setText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedFolder, setSelectedFolder] = useState('班会资料');
  const [requireAck, setRequireAck] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const classId = user?.classId || '';

  const addFiles = (fileList: FileList) => {
    const newFiles = Array.from(fileList);
    const total = selectedFiles.length + newFiles.length;
    if (total > MAX_FILES) {
      toast.error(`单次最多上传 ${MAX_FILES} 个文件，当前已选 ${selectedFiles.length} 个`);
      return;
    }
    setSelectedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
    }
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

  const handleSubmit = async () => {
    if (!text.trim()) {
      toast.error('请输入通知内容');
      return;
    }
    if (selectedFiles.length === 0) {
      toast.error('请至少选择一个文件');
      return;
    }
    if (!classId) {
      toast.error('未找到班级信息，请返回首页重新进入');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('classId', classId);
      formData.append('text', text.trim());
      formData.append('folderName', selectedFolder);
      formData.append('requireAck', String(requireAck));
      selectedFiles.forEach((f) => formData.append('files', f));

      const res = await api.post('/material/repost', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      const count = res.data?.materialCount ?? selectedFiles.length;
      toast.success(`已转载 ${count} 个文件并发布通知`);
      navigate('/file-list');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || '转载失败';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <PhoneFrame>
      <div className="box-border w-full h-[62px] shrink-0 flex flex-row gap-0 p-[12px_24px_0px_24px] justify-between items-center bg-[#FFFFFF]">
        <div className="text-[14px] box-border text-[#1A1A1A] font-semibold text-left [white-space:nowrap]">9:41</div>
        <div className="box-border w-fit shrink-0 h-fit flex flex-row gap-[6px] justify-start items-center">
          <div className="text-[14px] box-border text-[#1A1A1A] font-normal text-left [white-space:nowrap]">◉◉◉◉</div>
          <div className="text-[14px] box-border text-[#1A1A1A] font-normal text-left [white-space:nowrap]">100%</div>
        </div>
      </div>
      <div className="box-border w-full [flex:1_1_0] flex flex-col gap-4 p-[0px_20px] justify-start items-start overflow-y-auto pb-20">
        <div className="box-border w-full h-[20px] shrink-0" />
        <div className="flex flex-row items-center gap-0">
          <BackButton className="-ml-2" />
          <div className="text-[28px] box-border text-[#1A1A1A] font-bold text-left [white-space:nowrap]">一键转载</div>
        </div>
        <div className="box-border w-full h-[20px] shrink-0" />

        {/* 文字粘贴区 */}
        <div className="box-border w-full flex flex-col gap-[8px]">
          <div className="text-[14px] text-[#4B5563] font-normal">通知内容</div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="粘贴辅导员在微信群发的文字通知..."
            maxLength={500}
            className="box-border w-full min-h-[120px] p-[12px_16px] bg-[#FFFFFF] [border:1px_solid_#E5E7EB] rounded-lg text-[14px] text-[#1A1A1A] placeholder:text-[#9CA3AF] resize-none outline-none focus:border-[#0062FF] transition-colors"
          />
          <div className="text-[12px] text-[#9CA3AF] text-right">{text.length}/500</div>
        </div>

        {/* 文件选择区 */}
        <div className="box-border w-full flex flex-col gap-[8px]">
          <div className="text-[14px] text-[#4B5563] font-normal">附件文件</div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`box-border w-full min-h-[120px] shrink-0 flex flex-col gap-[12px] justify-center items-center bg-[#FFFFFF] rounded-lg cursor-pointer transition-colors ${
              dragOver
                ? 'border-2 border-[#0062FF] bg-[#0062FF0D]'
                : selectedFiles.length > 0
                ? 'border-2 border-[#0062FF]'
                : '[border:1px_solid_#E5E7EB]'
            }`}
          >
            {selectedFiles.length === 0 ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[24px] h-[24px]">
                  <path d="M12 3v12m5-7l-5-5-5 5m14 7v4a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2v-4" stroke="#0062FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="text-[14px] text-[#4B5563] font-normal">点击或拖拽多个文件到此处上传</div>
              </>
            ) : (
              <div
                className="box-border w-full max-h-[200px] overflow-y-auto p-[12px_16px] flex flex-col gap-[8px]"
                onClick={(e) => e.stopPropagation()}
              >
                {selectedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="box-border w-full flex flex-row items-center justify-between gap-[8px] bg-[#F9FAFB] rounded-md p-[8px_12px]"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-[#1A1A1A] truncate">{file.name}</div>
                      <div className="text-[11px] text-[#4B5563]">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="shrink-0 w-[20px] h-[20px] flex items-center justify-center text-[#9CA3AF] hover:text-[#EF4444] transition-colors"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="w-[14px] h-[14px]">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                ))}
                <div
                  className="text-[12px] text-[#0062FF] text-center py-[4px] cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  + 继续添加文件
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 分类选择 */}
        <div className="box-border w-full flex flex-col gap-[8px]">
          <div className="text-[14px] text-[#4B5563] font-normal">选择分类</div>
          <div className="box-border w-full flex flex-row gap-[8px] flex-wrap">
            {FOLDERS.map((folder) => (
              <div
                key={folder}
                onClick={() => setSelectedFolder(folder)}
                className={`box-border h-[36px] flex flex-col gap-0 p-[0px_16px] justify-center items-center rounded-full cursor-pointer transition-colors ${
                  selectedFolder === folder
                    ? 'bg-[#0062FF]'
                    : 'bg-[#0062FF0D]'
                }`}
              >
                <div className={`text-[13px] font-semibold text-left [white-space:nowrap] ${
                  selectedFolder === folder ? 'text-[#FFFFFF]' : 'text-[#0062FF]'
                }`}>
                  {folder}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 签收通知开关 */}
        <div className="box-border w-full flex flex-row items-center justify-between p-[12px_16px] bg-[#FFFFFF] [border:1px_solid_#E5E7EB] rounded-lg">
          <div className="text-[14px] text-[#1A1A1A]">同时生成需签收的通知</div>
          <div
            onClick={() => setRequireAck(!requireAck)}
            className={`relative w-[44px] h-[24px] rounded-full cursor-pointer transition-colors ${
              requireAck ? 'bg-[#0062FF]' : 'bg-[#E5E7EB]'
            }`}
          >
            <div
              className={`absolute top-[2px] w-[20px] h-[20px] rounded-full bg-[#FFFFFF] shadow-sm transition-transform ${
                requireAck ? 'translate-x-[22px]' : 'translate-x-[2px]'
              }`}
            />
          </div>
        </div>

        {/* 提交按钮 */}
        <div
          onClick={uploading ? undefined : handleSubmit}
          className={`box-border w-full h-[52px] shrink-0 [box-shadow:0px_4px_16px_0px_#0000000D] flex flex-col gap-2 p-[0px_16px] justify-center items-center bg-[#0062FF] rounded-lg cursor-pointer active:opacity-80 ${
            uploading ? 'opacity-60' : ''
          }`}
        >
          <div className="text-[16px] text-[#FFFFFF] font-semibold [white-space:nowrap]">
            {uploading ? '转载中...' : '一键转载'}
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}
