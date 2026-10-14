import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function ExportArchive() {
  const [searchParams] = useSearchParams();
  const { user } = useCurrentUser();
  const classId = user?.classId || '';
  const archivesId = searchParams.get('archivesId') || '';
  const [format, setFormat] = useState<'xlsx' | 'pdf'>('xlsx');
  const [exporting, setExporting] = useState(false);

  const handleExport = async (passChosenFormat: 'xlsx' | 'pdf') => {
    if (!classId || !archivesId) {
      toast.error('请先从档案详情中选择要导出的档案');
      return;
    }
    if (exporting) return;
    setExporting(true);
    try {
      const res = await api.get(
        `/classes/${classId}/archives/${archivesId}/export?format=${passChosenFormat}`,
        { responseType: 'blob' },
      );
      let fileName = `班级档案.${passChosenFormat === 'pdf' ? 'pdf' : 'xlsx'}`;
      const disposition = res.headers['content-disposition'] as
        | string
        | undefined;
      if (disposition) {
        const m = disposition.match(/filename="?([^";]+)"?/i);
        if (m && m[1]) {
          try {
            fileName = decodeURIComponent(m[1]);
          } catch {
            fileName = m[1];
          }
        }
      }
      const link = document.createElement('a');
      link.href = URL.createObjectURL(res.data as Blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast.success('导出成功');
    } catch (err: any) {
      const message = err?.response?.data?.message || '导出失败';
      toast.error(Array.isArray(message) ? message[0] : message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <PhoneFrame>
      <div
        data-pencil-name="Unified Header"
        className="box-border w-full h-[267.99px] shrink-0 flex flex-col gap-0 justify-start items-start [background-image:linear-gradient(-0.602deg,_#defcff_-5.192%,_#076cab_98.566%,_#32c9fd_46.687%)] bg-no-repeat bg-[length:100%_100%] rounded-[0px_0px_24px_24px]"
      >
        <div
          data-pencil-name="Status Bar"
          className="box-border w-full h-[62px] shrink-0 flex flex-row gap-0 p-[12px_24px_0px_24px] justify-between items-center bg-[#00000000]"
        >
          <div
            data-pencil-name="Time"
            className="text-[14px]/[normal] box-border text-[#FFFFFF] font-data font-semibold text-left [white-space:nowrap]"
          >
            9:41
          </div>
          <div
            data-pencil-name="Status Icons"
            className="box-border w-fit shrink-0 h-fit flex flex-row gap-[6px] justify-start items-center"
          >
            <div
              data-pencil-name="Signal"
              className="text-[14px]/[normal] box-border text-[#FFFFFF] font-caption font-normal text-left [white-space:nowrap]"
            >
              OOOO
            </div>
            <div
              data-pencil-name="Battery"
              className="text-[14px]/[normal] box-border text-[#FFFFFF] font-data font-normal text-left [white-space:nowrap]"
            >
              100%
            </div>
          </div>
        </div>
        <div
          data-pencil-name="Header"
          className="box-border w-full h-[220px] shrink-0 flex flex-col gap-[12px] p-[20px] justify-start items-start bg-[#00000000] relative"
        >
          <BackButton
            variant="dark"
            className="absolute left-[-4px] top-[0px] z-10"
          />
          <div className="h-8 w-10" />
          <div
            data-pencil-name="Title"
            className="text-[28px]/[normal] box-border text-[#FFFFFF] font-heading font-bold text-left [white-space:nowrap] relative [z-index:1]"
          >
            导出档案
          </div>
          <div
            data-pencil-name="Decor Icon"
            className="box-border w-[120px] h-[120px] opacity-[0.15] absolute left-[285px] top-[80px] flex flex-row gap-0 justify-center items-center [z-index:2]"
          >
            <svg
              data-pencil-name="Icon-archive"
              viewBox="0 0 24 24"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
              className="box-border w-[112px] shrink-0 h-[112px] overflow-visible"
            >
              <path
                d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2m2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-10m-9 4h4"
                fill="none"
              ></path>
              <path
                d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2m2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-10m-9 4h4"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              ></path>
            </svg>
          </div>
        </div>
      </div>
      <div
        data-pencil-name="Content"
        className="box-border w-full [flex:1_1_0] flex flex-col gap-0 justify-start items-start bg-[#FFFFFF]"
      >
        <div
          data-pencil-name="Body"
          className="box-border w-full [flex:1_1_0] flex flex-col gap-4 p-[16px_20px_20px_20px] justify-start items-start"
        >
          <div className="box-border w-full h-fit shrink-0 flex flex-col gap-2 p-4 bg-[#F0F7FF] rounded-[16px]">
            <div className="text-[11px] text-[#4B5563] font-body font-medium">当前档案</div>
            <div className="text-[15px]/[normal] text-[#1A1A1A] font-body font-semibold">
              {archivesId ? '本次导出该学期档案元数据与附件清单' : '请先从档案详情进入导出'}
            </div>
          </div>
          <div
            data-pencil-name="Text"
            className="text-[14px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
          >
            导出格式
          </div>
          <div
            data-pencil-name="Format Cards"
            className="box-border w-full h-fit shrink-0 flex flex-col gap-[12px] justify-start items-start"
          >
            <div
              data-pencil-name="Format Card PDF文档"
              onClick={() => setFormat('pdf')}
              className={`box-border w-full h-[150px] shrink-0 [box-shadow:0px_4px_16px_0px_#0000000D] flex flex-col gap-[10px] p-4 justify-center items-center bg-[#FFFFFF] rounded-lg ${
                format === 'pdf' ? '[border:1px_solid_#0062FF] opacity-100' : '[border:1px_solid_#E5E7EB] opacity-70'
              }`}
            >
              <div
                data-pencil-name="Icon Box"
                className="box-border w-[64px] h-[64px] shrink-0 [box-shadow:0px_4px_12px_0px_#0000000D] flex flex-row gap-0 justify-center items-center [background-image:linear-gradient(180deg,_#0062FF_0%,_#3B82F6_100%)] bg-no-repeat bg-[length:100%_100%] rounded-[20px]"
              >
                <svg
                  data-pencil-name="Icon-file-type-pdf"
                  viewBox="0 0 24 24"
                  preserveAspectRatio="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="box-border w-[32px] shrink-0 h-[32px] overflow-visible"
                >
                  <path
                    d="M14 3v4a1 1 0 0 0 1 1h4m-14 4v-7a2 2 0 0 1 2-2h7l5 5v4m-14 6h1.5a1.5 1.5 0 0 0 0-3h-1.5v6m12-3h2m1-3h-3v6m-6-6v6h1a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2z"
                    fill="#00000000"
                  ></path>
                  <path
                    d="M14 3v4a1 1 0 0 0 1 1h4m-14 4v-7a2 2 0 0 1 2-2h7l5 5v4m-14 6h1.5a1.5 1.5 0 0 0 0-3h-1.5v6m12-3h2m1-3h-3v6m-6-6v6h1a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2z"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  ></path>
                </svg>
              </div>
              <div
                data-pencil-name="Title"
                className="text-[16px]/[normal] box-border text-[#1A1A1A] font-body font-bold text-left [white-space:nowrap]"
              >
                PDF文档
              </div>
              <div
                data-pencil-name="Desc"
                className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
              >
                适合打印与汇报
              </div>
            </div>
            <div
              data-pencil-name="Format Card Excel表格"
              onClick={() => setFormat('xlsx')}
              className={`box-border w-full h-[150px] shrink-0 [box-shadow:0px_4px_16px_0px_#0000000D] flex flex-col gap-[10px] p-4 justify-center items-center bg-[#FFFFFF] rounded-lg ${
                format === 'xlsx' ? '[border:1px_solid_#0062FF] opacity-100' : '[border:1px_solid_#E5E7EB] opacity-70'
              }`}
            >
              <div
                data-pencil-name="Icon Box"
                className="box-border w-[64px] h-[64px] shrink-0 [box-shadow:0px_4px_12px_0px_#0000000D] flex flex-row gap-0 justify-center items-center [background-image:linear-gradient(180deg,_#38BDF8_0%,_#60A5FA_100%)] bg-no-repeat bg-[length:100%_100%] rounded-[20px]"
              >
                <svg
                  data-pencil-name="Icon-file-type-xls"
                  viewBox="0 0 24 24"
                  preserveAspectRatio="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="box-border w-[32px] shrink-0 h-[32px] overflow-visible"
                >
                  <path
                    d="M14 3v4a1 1 0 0 0 1 1h4m-14 4v-7a2 2 0 0 1 2-2h7l5 5v4m-15 3l4 6m-4 0l4-6m9 5.25c0 0.414 0.336 0.75 0.75 0.75h1.25a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1h-1a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1h1.25a0.75 0.75 0 0 1 0.75 0.75m-9-0.75v6h3"
                    fill="#00000000"
                  ></path>
                  <path
                    d="M14 3v4a1 1 0 0 0 1 1h4m-14 4v-7a2 2 0 0 1 2-2h7l5 5v4m-15 3l4 6m-4 0l4-6m9 5.25c0 0.414 0.336 0.75 0.75 0.75h1.25a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1h-1a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1h1.25a0.75 0.75 0 0 1 0.75 0.75m-9-0.75v6h3"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  ></path>
                </svg>
              </div>
              <div
                data-pencil-name="Title"
                className="text-[16px]/[normal] box-border text-[#1A1A1A] font-body font-bold text-left [white-space:nowrap]"
              >
                Excel表格
              </div>
              <div
                data-pencil-name="Desc"
                className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
              >
                含详细数据
              </div>
            </div>
          </div>
          <div
            data-pencil-name="Primary Button"
            onClick={() => handleExport(format)}
            className={`box-border w-full h-[52px] shrink-0 [box-shadow:0px_6px_20px_0px_#0062FF33] flex flex-col gap-0 justify-center items-center [background-image:linear-gradient(180deg,_#0062FF_0%,_#3B82F6_100%)] bg-no-repeat bg-[length:100%_100%] rounded-lg ${
              exporting ? 'opacity-60' : ''
            }`}
          >
            <div
              data-pencil-name="Label"
              className="text-[16px]/[normal] box-border text-[#FFFFFF] font-body font-semibold text-left [white-space:nowrap]"
            >
              {exporting ? '正在导出…' : '确认导出'}
            </div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}