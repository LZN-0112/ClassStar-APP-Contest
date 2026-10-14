import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface FileItem {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  folderName: string | null;
  uploaderName: string | null;
  downloadCount: number;
  createdAt: string;
}

export default function FileList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useCurrentUser();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [activeTab, setActiveTab] = useState('全部');

  const classId = user?.classId || '';
  const folderFromUrl = searchParams.get('folder') || '';

  useEffect(() => {
    fetchFiles();
  }, [classId, folderFromUrl]);

  const fetchFiles = async () => {
    if (!classId) {
      setLoading(false);
      return;
    }

    try {
      const params: any = { classId };
      if (folderFromUrl) {
        params.folderName = folderFromUrl;
      }
      if (searchKeyword) {
        params.keyword = searchKeyword;
      }

      const response = await api.get('/material/list', { params });
      setFiles(response.data.data || []);
    } catch (err: any) {
      console.error('获取文件列表失败:', err);
      toast.error('获取文件列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setLoading(true);
    fetchFiles();
  };

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!confirm(`确定要删除文件 "${fileName}" 吗？`)) {
      return;
    }

    try {
      await api.delete(`/material/${fileId}`);
      toast.success('删除成功');
      fetchFiles();
    } catch (err: any) {
      toast.error(err.message || '删除失败');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    if (days < 30) return `${Math.floor(days / 7)}周前`;
    return `${Math.floor(days / 30)}月前`;
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const iconColors: Record<string, string> = {
      pdf: '#1E3A8A',
      ppt: '#3B82F6',
      pptx: '#3B82F6',
      zip: '#4B5563',
      rar: '#4B5563',
      doc: '#2563EB',
      docx: '#2563EB',
      xls: '#059669',
      xlsx: '#059669',
    };
    return iconColors[ext || ''] || '#6B7280';
  };

  const filteredFiles = files.filter((file) => {
    if (activeTab === '全部') return true;
    const ext = file.fileName.split('.').pop()?.toLowerCase();
    if (activeTab === '文档') {
      return ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext || '');
    }
    if (activeTab === '压缩包') {
      return ['zip', 'rar', '7z'].includes(ext || '');
    }
    return true;
  });

  const pageTitle = folderFromUrl || '文件列表';

  return (
    <PhoneFrame>
      <div className="box-border w-full h-[267.99px] shrink-0 flex flex-col gap-0 justify-start items-start [background-image:linear-gradient(47.497deg,_#85c5f4_10.918%,_#44a7ec_90.517%)] bg-no-repeat bg-[length:100%_100%] rounded-[0px_0px_24px_24px]">
        <div className="box-border w-full h-[62px] shrink-0 flex flex-row gap-0 p-[12px_24px_0px_24px] justify-between items-center bg-[#00000000]">
          <div className="text-[14px] box-border text-[#FFFFFF] font-semibold text-left [white-space:nowrap]">9:41</div>
          <div className="box-border w-fit shrink-0 h-fit flex flex-row gap-[6px] justify-start items-center">
            <div className="text-[14px] box-border text-[#FFFFFF] font-normal text-left [white-space:nowrap]">◉◉◉◉</div>
            <div className="text-[14px] box-border text-[#FFFFFF] font-normal text-left [white-space:nowrap]">100%</div>
          </div>
        </div>
        <div className="box-border w-full h-[220px] shrink-0 flex flex-col gap-[12px] p-[20px] justify-start items-start bg-[#00000000] relative">
          <BackButton variant="dark" className="absolute left-[-4px] top-[0px] z-10" />
          <div className="box-border w-full h-[24px] shrink-0 flex flex-row gap-0 justify-start items-center relative [z-index:0]">
            <div className="box-border w-[24px] shrink-0 h-[24px]"></div>
          </div>
          <div className="text-[28px] box-border text-[#FFFFFF] font-bold text-left [white-space:nowrap] relative [z-index:1]">
            {pageTitle}
          </div>
          <svg viewBox="0 0 24 24" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" className="box-border w-[120px] h-[120px] opacity-[0.15] absolute left-[260px] top-[50px] overflow-visible [z-index:2]">
            <path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2" fill="none" />
            <path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
      </div>
      <div className="box-border w-full [flex:1_1_0] bg-[#FFFFFF] relative overflow-y-auto pb-20">
        <div className="box-border w-full h-fit flex flex-col gap-[12px] justify-start items-start p-[15px_24px]">
          <div className="box-border w-full h-[40px] shrink-0 flex flex-row gap-2 p-[0px_12px] justify-start items-center bg-[#FFFFFF] [border:1px_solid_#E5E7EB] rounded-full">
            <svg viewBox="0 0 24 24" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" className="box-border w-[18px] shrink-0 h-[18px] overflow-visible">
              <path d="M3 10a7 7 0 1 0 14 0 7 7 0 1 0-14 0m18 11l-6-6" fill="none" />
              <path d="M3 10a7 7 0 1 0 14 0 7 7 0 1 0-14 0m18 11l-6-6" fill="none" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="搜索文件"
              className="flex-1 text-[14px] text-[#1A1A1A] bg-transparent outline-none placeholder:text-[#4B5563]"
            />
          </div>
          <div className="box-border w-full h-[32px] shrink-0 flex flex-row gap-2 justify-start items-center">
            {['全部', '文档', '压缩包'].map((tab) => (
              <div
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`box-border w-fit shrink-0 h-[32px] flex flex-col gap-0 p-[0px_12px] justify-center items-center rounded-full cursor-pointer ${
                  activeTab === tab ? 'bg-[#0062FF]' : 'bg-[#0062FF0D]'
                }`}
              >
                <div className={`text-[11px] font-semibold text-left [white-space:nowrap] ${activeTab === tab ? 'text-[#FFFFFF]' : 'text-[#0062FF]'}`}>
                  {tab}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="box-border w-full flex flex-col gap-[10px] justify-start items-start p-[0px_24px]">
          {loading ? (
            <div className="w-full text-center py-8 text-[#4B5563]">加载中...</div>
          ) : filteredFiles.length === 0 ? (
            <div className="w-full text-center py-8 text-[#4B5563]">暂无文件</div>
          ) : (
            filteredFiles.map((file) => (
              <div
                key={file.id}
                onClick={() => navigate(`/material-detail?fileId=${file.id}`)}
                className="box-border w-full h-[76px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-[12px] p-[12px] justify-start items-center bg-[#FFFFFF] rounded-lg cursor-pointer"
              >
                <div className="box-border w-[48px] shrink-0 h-[48px] flex flex-row gap-0 justify-center items-center bg-[#1E3A8A1A] rounded-lg">
                  <svg viewBox="0 0 24 24" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" className="box-border w-[28px] shrink-0 h-[28px] overflow-visible">
                    <path d="M14 3v4a1 1 0 0 0 1 1h4m-14 4v-7a2 2 0 0 1 2-2h7l5 5v4m-14 6h1.5a1.5 1.5 0 0 0 0-3h-1.5v6m12-3h2m1-3h-3v6m-6-6v6h1a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2z" fill="none" />
                    <path d="M14 3v4a1 1 0 0 0 1 1h4m-14 4v-7a2 2 0 0 1 2-2h7l5 5v4m-14 6h1.5a1.5 1.5 0 0 0 0-3h-1.5v6m12-3h2m1-3h-3v6m-6-6v6h1a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2z" fill="none" stroke={getFileIcon(file.fileName)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                  </svg>
                </div>
                <div className="box-border [flex:1_1_0] h-fit flex flex-col gap-[2px] justify-center items-start">
                  <div className="text-[16px] box-border text-[#1A1A1A] font-semibold text-left [white-space:nowrap] overflow-hidden text-ellipsis w-full">
                    {file.fileName}
                  </div>
                  <div className="text-[11px] box-border text-[#4B5563] font-normal text-left [white-space:nowrap]">
                    {formatFileSize(file.fileSize)} · {formatDate(file.createdAt)}
                    {file.uploaderName ? ` · ${file.uploaderName}` : ''}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(file.id, file.fileName); }}
                  className="box-border w-[24px] h-[24px] flex items-center justify-center text-[#EF4444] hover:bg-[#EF44440D] rounded"
                >
                  <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        <div className="box-border w-full h-fit flex flex-col gap-[10px] p-[20px_24px]">
          <div
            onClick={() => navigate('/upload-material')}
            className="box-border w-full h-[52px] [box-shadow:0px_4px_16px_0px_#0062FF33] flex flex-col gap-0 justify-center items-center [background-image:linear-gradient(-98.571deg,_#0062FF_14.645%,_#3B82F6_85.355%)] bg-no-repeat bg-[length:100%_100%] rounded-lg cursor-pointer active:opacity-80"
          >
            <div className="text-[16px] box-border text-[#FFFFFF] font-semibold text-left [white-space:nowrap]">
              上传文件
            </div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}
