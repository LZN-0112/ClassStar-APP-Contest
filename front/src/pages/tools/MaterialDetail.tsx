import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import { api } from '@/lib/api';

interface MaterialDetailData {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  folderName: string | null;
  uploaderName: string | null;
  downloadCount: number;
  fileType: string;
  createdAt: string;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function MaterialDetail() {
  const [searchParams] = useSearchParams();
  const fileId = searchParams.get('fileId') || '';
  const [detail, setDetail] = useState<MaterialDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!fileId) {
      setLoading(false);
      return;
    }
    fetchDetail();
  }, [fileId]);

  const fetchDetail = async () => {
    try {
      const response = await api.get(`/material/${fileId}`);
      setDetail(response.data.data);
    } catch (err: any) {
      console.error('获取文件详情失败:', err);
      toast.error('获取文件详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!fileId || !detail) return;
    setDownloading(true);
    try {
      const response = await api.get(`/material/${fileId}/download`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = detail.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('下载成功');
      // 刷新下载次数
      fetchDetail();
    } catch (err: any) {
      console.error('下载失败:', err);
      toast.error('下载失败');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <PhoneFrame>
        <div className="box-border w-full h-[62px] shrink-0 flex flex-row gap-0 p-[12px_24px_0px_24px] justify-between items-center bg-[#FFFFFF]">
          <div className="text-[14px] box-border text-[#1A1A1A] font-semibold text-left [white-space:nowrap]">9:41</div>
          <div className="box-border w-fit shrink-0 h-fit flex flex-row gap-[6px] justify-start items-center">
            <div className="text-[14px] box-border text-[#1A1A1A] font-normal text-left [white-space:nowrap]">◉◉◉</div>
            <div className="text-[14px] box-border text-[#1A1A1A] font-normal text-left [white-space:nowrap]">100%</div>
          </div>
        </div>
        <div className="w-full text-center py-20 text-[#4B5563]">加载中...</div>
      </PhoneFrame>
    );
  }

  if (!detail) {
    return (
      <PhoneFrame>
        <div className="box-border w-full h-[62px] shrink-0 flex flex-row gap-0 p-[12px_24px_0px_24px] justify-between items-center bg-[#FFFFFF]">
          <div className="text-[14px] box-border text-[#1A1A1A] font-semibold text-left [white-space:nowrap]">9:41</div>
          <div className="box-border w-fit shrink-0 h-fit flex flex-row gap-[6px] justify-start items-center">
            <div className="text-[14px] box-border text-[#1A1A1A] font-normal text-left [white-space:nowrap]">◉◉◉</div>
            <div className="text-[14px] box-border text-[#1A1A1A] font-normal text-left [white-space:nowrap]">100%</div>
          </div>
        </div>
        <div className="box-border w-full shrink-0 flex flex-row gap-0 p-[20px_20px_12px_20px] justify-between items-center">
          <div className="flex flex-row items-center gap-0">
            <BackButton className="-ml-2" />
            <div className="text-[20px]/[normal] box-border text-[#1A1A1A] font-heading font-bold text-left [white-space:nowrap]">
              文件详情
            </div>
          </div>
          <div className="box-border w-[40px] shrink-0 h-[40px]" />
        </div>
        <div className="w-full text-center py-20 text-[#4B5563]">文件不存在</div>
      </PhoneFrame>
    );
  }

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
        <div data-pencil-name="Spacer" className="box-border w-full h-[60px] shrink-0 flex flex-row gap-0 justify-start items-start" />
        <svg data-pencil-name="Icon-file-text" viewBox="0 0 24 24" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" className="box-border w-[24px] h-[24px] shrink-0 overflow-visible">
          <path d="M6 22a2 2 0 0 1-2-2v-16a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704 0.706l3.588 3.588a2.4 2.4 0 0 1 0.708 1.706v12a2 2 0 0 1-2 2z m8-20v5a1 1 0 0 0 1 1h5m-10 1h-2m8 4h-8m8 4h-8" fill="#00000000" />
          <path d="M6 22a2 2 0 0 1-2-2v-16a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704 0.706l3.588 3.588a2.4 2.4 0 0 1 0.708 1.706v12a2 2 0 0 1-2 2z m8-20v5a1 1 0 0 0 1 1h5m-10 1h-2m8 4h-8m8 4h-8" fill="none" stroke="#0062FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="flex flex-row items-center gap-0">
          <BackButton className="-ml-2" />
          <div data-pencil-name="Title" className="text-[20px]/[normal] box-border text-[#1A1A1A] font-heading font-bold text-left [white-space:nowrap] overflow-hidden text-ellipsis max-w-[250px]">
            {detail.fileName}
          </div>
        </div>
        <div data-pencil-name="Meta" className="text-[14px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap]">
          {formatFileSize(detail.fileSize)} · {formatDate(detail.createdAt)} 上传
        </div>
        <div data-pencil-name="Spacer2" className="box-border w-full h-[40px] shrink-0 flex flex-row gap-0 justify-start items-start" />
        <div data-pencil-name="上传者" className="box-border w-full h-[52px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-0 p-[0px_16px] justify-between items-center bg-[#FFFFFF] [border:1px_solid_#00000000] rounded-lg">
          <div data-pencil-name="Label" className="text-[14px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap]">上传者</div>
          <div data-pencil-name="Value" className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-normal text-left [white-space:nowrap]">{detail.uploaderName || '未知'}</div>
        </div>
        <div data-pencil-name="下载次数" className="box-border w-full h-[52px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-0 p-[0px_16px] justify-between items-center bg-[#FFFFFF] [border:1px_solid_#00000000] rounded-lg">
          <div data-pencil-name="Label" className="text-[14px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap]">下载次数</div>
          <div data-pencil-name="Value" className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-normal text-left [white-space:nowrap]">{detail.downloadCount}</div>
        </div>
        <div data-pencil-name="文件类型" className="box-border w-full h-[52px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-0 p-[0px_16px] justify-between items-center bg-[#FFFFFF] [border:1px_solid_#00000000] rounded-lg">
          <div data-pencil-name="Label" className="text-[14px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap]">文件类型</div>
          <div data-pencil-name="Value" className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-normal text-left [white-space:nowrap]">{detail.fileType}</div>
        </div>
        {detail.folderName && (
          <div data-pencil-name="分类" className="box-border w-full h-[52px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-0 p-[0px_16px] justify-between items-center bg-[#FFFFFF] [border:1px_solid_#00000000] rounded-lg">
            <div data-pencil-name="Label" className="text-[14px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap]">所属分类</div>
            <div data-pencil-name="Value" className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-normal text-left [white-space:nowrap]">{detail.folderName}</div>
          </div>
        )}
        <div
          data-pencil-name="Download Button"
          onClick={downloading ? undefined : handleDownload}
          className={`box-border w-full h-[52px] shrink-0 [box-shadow:0px_4px_16px_0px_#0000000D] flex flex-col gap-2 p-[0px_16px] justify-center items-center bg-[#0062FF] rounded-lg cursor-pointer active:opacity-80 ${downloading ? 'opacity-60' : ''}`}
        >
          <div data-pencil-name="Label" className="text-[16px]/[normal] box-border text-[#FFFFFF] font-body font-semibold text-left [white-space:nowrap]">
            {downloading ? '下载中...' : '下载文件'}
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}
