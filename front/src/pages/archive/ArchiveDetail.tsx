import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { currentIsAdminOrOwner } from '@/utils/role';

interface ArchiveFile {
  id: string;
  fileName: string;
  fileSize: number;
  folderName: string | null;
  downloadCount: number;
  downloadable: boolean;
  createdAt: string;
}

interface ArchiveDetailData {
  id: string;
  title: string;
  archiveYear: string;
  creatorName: string | null;
  createdAt: string;
  files: ArchiveFile[];
}

function formatDate(iso?: string) {
  if (!iso) return '-';
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return '-';
  }
}

function formatSize(bytes?: number) {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ArchiveDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useCurrentUser();
  const classId = user?.classId || '';
  const archivesId = searchParams.get('archivesId') || '';

  const [detail, setDetail] = useState<ArchiveDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!classId || !archivesId) {
        setFailed(true);
        setLoading(false);
        return;
      }
      try {
        const res = await api.get(
          `/classes/${classId}/archives/${archivesId}`,
        );
        setDetail(res.data.data || null);
        setFailed(false);
      } catch (err) {
        console.error('获取档案详情失败:', err);
        setFailed(true);
      } finally {
        setLoading(false);
      }
    };
    setLoading(true);
    setFailed(false);
    fetchDetail();
  }, [classId, archivesId]);

  const handleDownload = async (file: ArchiveFile) => {
    if (!detail) return;
    try {
      const res = await api.get(
        `/classes/${classId}/archives/${detail.id}/files/${file.id}/download`,
        { responseType: 'blob' },
      );
      let fileName = `${file.fileName}`;
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
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        '附件暂无下载地址';
      toast.error(Array.isArray(message) ? message[0] : message);
    }
  };

  return (
    <PhoneFrame>
      <div
        data-pencil-name="Unified Header"
        className="box-border w-full h-[282px] shrink-0 flex flex-col gap-0 justify-start items-start [background-image:linear-gradient(180deg,_#004ECC_0%,_#4B83FF_55%,_#DEFCFF_100%)] bg-no-repeat bg-[length:100%_100%] rounded-[0px_0px_24px_24px]"
      >
        <div
          data-pencil-name="Status Bar"
          className="box-border w-full h-[62px] shrink-0 flex flex-row gap-0 p-[12px_24px_0px_24px] justify-between items-center bg-[#00000000]"
        >
          <div
            data-pencil-name="Text"
            className="text-[14px]/[normal] box-border text-[#FFFFFF] font-data font-semibold text-left [white-space:nowrap]"
          >
            9:41
          </div>
          <div
            data-pencil-name="Status Icons"
            className="box-border w-fit shrink-0 h-fit flex flex-row gap-[6px] justify-start items-center bg-[#00000000]"
          >
            <div
              data-pencil-name="Text"
              className="text-[14px]/[normal] box-border text-[#FFFFFF] font-caption font-medium text-left [white-space:nowrap]"
            >
              OOOO
            </div>
            <div
              data-pencil-name="Text"
              className="text-[14px]/[normal] box-border text-[#FFFFFF] font-data font-medium text-left [white-space:nowrap]"
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
            data-pencil-name="Text"
            className="text-[28px]/[normal] box-border text-[#FFFFFF] font-heading font-bold text-left [white-space:nowrap] relative [z-index:0]"
          >
            档案详情
          </div>
          <div
            data-pencil-name="Decor Icon"
            className="box-border w-[120px] h-[120px] opacity-[0.12] absolute left-[265px] top-[80px] flex flex-col gap-0 justify-center items-center bg-[#00000000] [z-index:1]"
          >
            <svg
              data-pencil-name="Icon-archive"
              viewBox="0 0 24 24"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
              className="box-border w-[112px] h-[112px] shrink-0 overflow-visible"
            >
              <path d="M21 8v13h-18v-13m-2-5h22v5h-22z m9 9h4" fill="none"></path>
              <path
                d="M21 8v13h-18v-13m-2-5h22v5h-22z m9 9h4"
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
        className="box-border w-full [flex:1_1_0] flex flex-col gap-0 justify-start items-start overflow-y-auto overscroll-y-contain bg-[#FFFFFF]"
      >
        <div
          data-pencil-name="Body"
          className="box-border w-full [flex:1_1_0] flex flex-col gap-[20px] p-[16px_20px_96px_20px] justify-start items-start bg-[#FFFFFF]"
        >
          {loading ? (
            <div className="box-border w-full py-12 text-center text-[14px] text-[#4B5563]">
              加载中…
            </div>
          ) : failed || !detail ? (
            <div className="box-border w-full py-12 flex flex-col gap-3 justify-center items-center">
              <div className="text-[16px] text-[#1A1A1A] font-medium">档案不存在</div>
              <div className="text-[12px] text-[#9CA3AF]">请返回选择有效的学期档案</div>
            </div>
          ) : (
            <>
              <div
                data-pencil-name="Info Card"
                className="box-border w-full h-fit shrink-0 flex flex-col gap-2 p-4 justify-start items-start bg-[#EBF4FF] rounded-[16px]"
              >
                <div
                  data-pencil-name="Text"
                  className="text-[16px]/[normal] box-border text-[#1A1A1A] font-body font-bold text-left [white-space:nowrap]"
                >
                  {detail.title || '未命名档案'}
                </div>
                <div
                  data-pencil-name="Text"
                  className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                >
                  生成时间：{formatDate(detail.createdAt)}
                </div>
                <div
                  data-pencil-name="Text"
                  className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                >
                  生成人：{detail.creatorName || '-'}（附件 {detail.files.length} 个）
                </div>
              </div>
              <div
                data-pencil-name="Preview"
                className="box-border w-full h-fit shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-[10px] p-4 justify-start items-start bg-[#FFFFFF] rounded-[16px]"
              >
                <div
                  data-pencil-name="Text"
                  className="text-[14px]/[normal] box-border w-fit shrink-0 text-[#1A1A1A] font-body font-bold text-left"
                >
                  档案内容预览
                </div>
                <div
                  data-pencil-name="Text"
                  className="text-[14px]/[normal] box-border w-fit text-[#4B5563] font-body font-medium text-left"
                >
                  包含班级成员名单、活动记录、考勤统计、班费收支等完整数据。
                </div>
              </div>
              <div
                data-pencil-name="Group 附件列表"
                className="box-border w-full h-fit shrink-0 flex flex-col gap-[10px] justify-start items-start bg-[#00000000]"
              >
                <div
                  data-pencil-name="Text"
                  className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-semibold text-left [white-space:nowrap]"
                >
                  附件列表（{detail.files.length}）
                </div>
                <div
                  data-pencil-name="Group Content"
                  className="box-border w-full h-fit shrink-0 flex flex-col gap-2 justify-start items-start bg-[#00000000]"
                >
                  {detail.files.length === 0 ? (
                    <div className="box-border w-full py-8 text-center text-[13px] text-[#9CA3AF]">
                      该档案暂无附件
                    </div>
                  ) : (
                    detail.files.map((file) => (
                      <div key={file.id} className="box-border w-full h-fit shrink-0 flex flex-col gap-0 justify-start items-start">
                        <div
                          data-pencil-name="List Item"
                          onClick={() =>
                            setActiveFileId(activeFileId === file.id ? null : file.id)
                          }
                          className="box-border w-full h-[64px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-[12px] p-[0px_16px] justify-start items-center bg-[#FFFFFF] rounded-lg"
                        >
                          <div
                            data-pencil-name="Icon Box"
                            className="box-border w-[40px] shrink-0 h-[40px] flex flex-col gap-0 justify-center items-center bg-[#DBEAFE] rounded-lg"
                          >
                            <svg
                              data-pencil-name="Icon-file-text"
                              viewBox="0 0 24 24"
                              preserveAspectRatio="none"
                              xmlns="http://www.w3.org/2000/svg"
                              className="box-border w-[24px] h-[24px] shrink-0 overflow-visible"
                            >
                              <path
                                d="M14 2h-8a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-12m-6-6v6h6m-4 5h-8m8 4h-8m2-8h-2"
                                fill="none"
                              ></path>
                              <path
                                d="M14 2h-8a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-12m-6-6v6h6m-4 5h-8m8 4h-8m2-8h-2"
                                fill="none"
                                stroke="#004ECC"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                vectorEffect="non-scaling-stroke"
                              ></path>
                            </svg>
                          </div>
                          <div
                            data-pencil-name="Text"
                            className="box-border [flex:1_1_0] h-fit flex flex-col gap-[2px] justify-start items-start"
                          >
                            <div className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]">
                              {file.fileName}
                            </div>
                            <div className="text-[11px]/[normal] box-border text-[#9CA3AF] font-body font-normal text-left [white-space:nowrap]">
                              {formatSize(file.fileSize)} · 下载 {file.downloadCount} 次
                            </div>
                          </div>
                          <svg
                            data-pencil-name="Icon-chevron-right"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[20px] shrink-0 h-[20px] overflow-visible"
                          >
                            <path d="M9 18l6-6-6-6" fill="none"></path>
                            <path
                              d="M9 18l6-6-6-6"
                              fill="none"
                              stroke="#9CA3AF"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            ></path>
                          </svg>
                        </div>
                        {activeFileId === file.id && (
                          <div className="box-border w-full shrink-0 flex flex-col gap-3 p-[12px_16px] mt-2 bg-[#F8FAFC] border-[1px] border-[#E5E7EB] rounded-lg">
                            <div className="text-[13px] text-[#1A1A1A] font-semibold">
                              {file.fileName}
                            </div>
                            <div className="text-[12px] text-[#4B5563]">
                              大小：{formatSize(file.fileSize)}　分类：{file.folderName || '-'}　下载次数：{file.downloadCount}
                            </div>
                            <div className="text-[12px] text-[#4B5563]">
                              上传时间：{formatDate(file.createdAt)}
                            </div>
                            <div
                              onClick={() => handleDownload(file)}
                              className="box-border w-full h-[40px] shrink-0 flex flex-col gap-0 justify-center items-center bg-[#0062FF] rounded-lg"
                            >
                              <div className="text-[14px]/[normal] box-border text-[#FFFFFF] font-body font-semibold text-left [white-space:nowrap]">
                                下载附件
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div
                data-pencil-name="Spacer"
                className="box-border w-full h-[12px] shrink-0 flex flex-row gap-0 justify-start items-start bg-[#00000000]"
              ></div>
              {currentIsAdminOrOwner() && (
                <div
                  data-pencil-name="Button Primary"
                  onClick={() => navigate(`/export-archive?archivesId=${detail.id}`)}
                  className="box-border w-full h-[52px] shrink-0 [box-shadow:0px_4px_16px_0px_#0000001A] flex flex-col gap-0 justify-center items-center bg-[#0062FF] rounded-lg"
                >
                  <div
                    data-pencil-name="Text"
                    className="text-[16px]/[normal] box-border text-[#FFFFFF] font-body font-semibold text-left [white-space:nowrap]"
                  >
                    导出档案
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}