import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';

const FOLDERS = [
  { name: '班会资料', icon: 'folder' },
  { name: '课程作业', icon: 'file-text' },
  { name: '活动照片', icon: 'image' },
  { name: '评优材料', icon: 'award' },
];

interface FileItem {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  folderName: string | null;
  createdAt: string;
}

function FolderIcon({ type }: { type: string }) {
  const paths: Record<string, string> = {
    folder: 'M20 20a2 2 0 0 0 2-2v-10a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-0.9l-0.81-1.2a2 2 0 0 0-1.67-0.9h-3.93a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z',
    'file-text': 'M6 22a2 2 0 0 1-2-2v-16a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704 0.706l3.588 3.588a2.4 2.4 0 0 1 0.708 1.706v12a2 2 0 0 1-2 2z m8-20v5a1 1 0 0 0 1 1h5m-10 1h-2m8 4h-8m8 4h-8',
    image: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2v-14a2 2 0 0 1 2-2z m6 6a2 2 0 1 0-4 0 2 2 0 1 0 4 0m21 15l-3.086-3.086a2 2 0 0 0-2.828 0l-20.086 0.086',
    award: 'M15.477 12.89l1.515 8.526a0.5 0.5 0 0 1-0.81 0.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a0.5 0.5 0 0 1-0.81-0.469l1.514-8.526m9.477-4.89a6 6 0 1 0-12 0 6 6 0 1 0 12 0',
  };
  return (
    <svg viewBox="0 0 24 24" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" className="box-border w-[24px] h-[24px] shrink-0 overflow-visible">
      <path d={paths[type] || paths.folder} fill="#00000000" />
      <path d={paths[type] || paths.folder} fill="none" stroke="#0062FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" className="box-border w-[24px] shrink-0 h-[24px] overflow-visible relative [z-index:0]">
      <path d="M9 18l6-6-6-6" fill="#00000000" />
      <path d="M9 18l6-6-6-6" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" className="box-border w-[24px] shrink-0 h-[24px] overflow-visible">
      <path d="M9 18l6-6-6-6" fill="#00000000" />
      <path d="M9 18l6-6-6-6" fill="none" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (hours < 1) return '刚刚';
  if (hours < 24) return `${hours}小时前`;
  if (days === 1) return '昨天';
  if (days < 7) return `${days}天前`;
  return `${Math.floor(days / 7)}周前`;
}

export default function MaterialLibrary() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [folderCounts, setFolderCounts] = useState<Record<string, number>>({});
  const [recentFiles, setRecentFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);

  const classId = user?.classId || '';

  useEffect(() => {
    if (!classId) {
      setLoading(false);
      return;
    }
    fetchData();
  }, [classId]);

  const fetchData = async () => {
    try {
      // 获取所有文件，前端按分类统计
      const response = await api.get('/material/list', { params: { classId } });
      const files: FileItem[] = response.data.data || [];
      setRecentFiles(files.slice(0, 5));

      const counts: Record<string, number> = {};
      FOLDERS.forEach((f) => {
        counts[f.name] = files.filter((file) => file.folderName === f.name).length;
      });
      setFolderCounts(counts);
    } catch (err) {
      console.error('获取资料库数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PhoneFrame>
      <div data-pencil-name="Status Bar" className="box-border w-full h-[62px] shrink-0 flex flex-row gap-0 p-[12px_24px_0px_24px] justify-between items-center bg-[#FFFFFF]">
        <div data-pencil-name="Time" className="text-[14px]/[normal] box-border text-[#1A1A1A] font-data font-semibold text-left [white-space:nowrap]">9:41</div>
        <div data-pencil-name="Status Icons" className="box-border w-fit shrink-0 h-fit flex flex-row gap-[6px] justify-start items-center">
          <div data-pencil-name="Signal" className="text-[14px]/[normal] box-border text-[#1A1A1A] font-caption font-normal text-left [white-space:nowrap]">◉◉◉◉</div>
          <div data-pencil-name="Battery" className="text-[14px]/[normal] box-border text-[#1A1A1A] font-data font-normal text-left [white-space:nowrap]">100%</div>
        </div>
      </div>
      <div data-pencil-name="Content" className="box-border w-full [flex:1_1_0] flex flex-col gap-4 p-[0px_20px] justify-start items-start">
        <div data-pencil-name="Spacer" className="box-border w-full h-[20px] shrink-0 flex flex-row gap-0 justify-start items-start" />
        <div data-pencil-name="Header" className="box-border w-full h-fit shrink-0 flex flex-row gap-0 justify-between items-center">
          <div className="flex flex-row items-center gap-0">
            <BackButton className="-ml-2" />
            <div data-pencil-name="Title" className="text-[28px]/[normal] box-border text-[#1A1A1A] font-heading font-bold text-left [white-space:nowrap]">班级资料库</div>
          </div>
          <div data-pencil-name="Upload" className="text-[14px]/[normal] box-border text-[#0062FF] font-caption font-normal text-left [white-space:nowrap]">
            <button type="button" className="text-primary" onClick={() => navigate('/upload-material')}>上传</button>
          </div>
        </div>
        <div data-pencil-name="Folders" className="box-border w-full h-fit shrink-0 flex flex-row gap-[12px] justify-start items-start">
          {FOLDERS.map((folder) => (
            <div
              key={folder.name}
              data-pencil-name={folder.name}
              onClick={() => navigate(`/file-list?folder=${encodeURIComponent(folder.name)}`)}
              className="box-border [flex:1_1_0] h-[100px] flex flex-col gap-[6px] p-[12px] justify-start items-start bg-[#FFFFFF] [border:1px_solid_#E5E7EB] rounded-lg"
            >
              <FolderIcon type={folder.icon} />
              <div data-pencil-name="Label" className="text-[11px]/[normal] box-border text-[#1A1A1A] font-body font-medium text-left [white-space:nowrap]">{folder.name}</div>
              <div data-pencil-name="Count" className="text-[11px]/[normal] box-border text-[#4B5563] font-caption font-normal text-left [white-space:nowrap]">
                {loading ? '-' : `${folderCounts[folder.name] ?? 0} 个文件`}
              </div>
            </div>
          ))}
        </div>
        <div data-pencil-name="Recent" className="box-border w-full h-fit shrink-0 flex flex-col gap-[10px] justify-start items-start">
          <div data-pencil-name="Title" className="text-[16px]/[normal] box-border text-[#1A1A1A] font-heading font-semibold text-left [white-space:nowrap]">最近上传</div>
          {loading ? (
            <div className="w-full text-center py-8 text-[#4B5563]">加载中...</div>
          ) : recentFiles.length === 0 ? (
            <div className="w-full text-center py-8 text-[#4B5563]">暂无文件</div>
          ) : (
            recentFiles.map((file) => (
              <div
                key={file.id}
                data-pencil-name={file.fileName}
                onClick={() => navigate(`/material-detail?fileId=${file.id}`)}
                className="box-border w-full h-[64px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-[12px] p-[0px_16px] justify-between items-center bg-[#FFFFFF] [border:1px_solid_#E5E7EB] rounded-lg"
              >
                <div data-pencil-name="Icon Container" className="box-border w-[40px] shrink-0 h-[40px] [box-shadow:0px_2px_6px_0px_#0000000D] flex flex-row gap-0 justify-center items-center bg-[#60A5FA0D] rounded-lg relative">
                  <FileIcon />
                  <div data-pencil-name="Highlight" className="box-border w-[40px] h-[18px] opacity-[0.15] absolute left-0 top-0 flex flex-row gap-0 justify-start items-start bg-[#FFFFFF] rounded-lg [z-index:1]" />
                </div>
                <div data-pencil-name="Text" className="box-border [flex:1_1_0] h-full flex flex-col gap-[4px] justify-center items-start">
                  <div data-pencil-name="Title" className="text-[16px]/[normal] box-border text-[#1A1A1A] font-heading font-semibold text-left [white-space:nowrap] overflow-hidden text-ellipsis w-full">{file.fileName}</div>
                  <div data-pencil-name="Subtitle" className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap]">
                    {formatTime(file.createdAt)} · {formatFileSize(file.fileSize)}
                  </div>
                </div>
                <ArrowIcon />
              </div>
            ))
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}
