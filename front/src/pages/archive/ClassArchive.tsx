import { useState, useEffect } from 'react';
import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface ArchiveItem {
  id: string;
  title: string;
  archiveYear: string;
  creatorName: string | null;
  createdAt: string;
  fileCount: number;
}

function formatDate(iso?: string) {
  if (!iso) return '-';
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return '-';
  }
}

export default function ClassArchive() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const classId = user?.classId || '';
  const [list, setList] = useState<ArchiveItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArchives = async () => {
      if (!classId) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get(`/classes/${classId}/archives`);
        setList(res.data.data || []);
      } catch (err) {
        console.error('获取档案列表失败:', err);
        toast.error('获取档案列表失败');
      } finally {
        setLoading(false);
      }
    };
    fetchArchives();
  }, [classId]);

  return (
    <PhoneFrame>
      <div
        data-pencil-name="Status Bar"
        className="box-border w-full h-[62px] shrink-0 flex flex-row gap-0 p-[12px_24px_0px_24px] justify-between items-center bg-[#FFFFFF]"
      >
        <div
          data-pencil-name="Time"
          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-data font-semibold text-left [white-space:nowrap]"
        >
          9:41
        </div>
        <div
          data-pencil-name="Status Icons"
          className="box-border w-fit shrink-0 h-fit flex flex-row gap-[6px] justify-start items-center"
        >
          <div
            data-pencil-name="Signal"
            className="text-[14px]/[normal] box-border text-[#1A1A1A] font-caption font-normal text-left [white-space:nowrap]"
          >
            OOOO
          </div>
          <div
            data-pencil-name="Battery"
            className="text-[14px]/[normal] box-border text-[#1A1A1A] font-data font-normal text-left [white-space:nowrap]"
          >
            100%
          </div>
        </div>
      </div>
      <div
        data-pencil-name="Content"
        className="box-border w-full [flex:1_1_0] flex flex-col gap-4 p-[0px_20px] justify-start items-start"
      >
        <div
          data-pencil-name="Spacer"
          className="box-border w-full h-[20px] shrink-0 flex flex-row gap-0 justify-start items-start"
        ></div>
        <div className="flex flex-row items-center gap-0">
          <BackButton className="-ml-2" />
          <div
            data-pencil-name="Title"
            className="text-[28px]/[normal] box-border text-[#1A1A1A] font-heading font-bold text-left [white-space:nowrap]"
          >
            班级档案
          </div>
        </div>
        <div
          data-pencil-name="Subtitle"
          className="text-[14px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap]"
        >
          按学期归档的班级数据
        </div>
        <div
          data-pencil-name="Spacer2"
          className="box-border w-full h-[20px] shrink-0 flex flex-row gap-0 justify-start items-start"
        ></div>
        {loading ? (
          <div className="box-border w-full h-[90px] shrink-0 flex flex-row gap-[14px] p-[0px_16px] justify-center items-center bg-[#FFFFFF] [border:1px_solid_#E5E7EB] rounded-lg text-[14px] text-[#4B5563]">
            加载中…
          </div>
        ) : list.length === 0 ? (
          <div className="box-border w-full py-10 flex flex-col gap-3 justify-center items-center bg-[#FFFFFF] [border:1px_solid_#E5E7EB] rounded-lg">
            <div className="text-[16px] text-[#1A1A1A] font-medium">暂无档案</div>
            <div className="text-[12px] text-[#9CA3AF]">该班级还没有生成学期档案</div>
          </div>
        ) : (
          list.map((archive) => (
            <div
              key={archive.id}
              data-pencil-name="Archive Card"
              onClick={() => navigate(`/archive-detail?archivesId=${archive.id}`)}
              className="box-border w-full h-[90px] shrink-0 flex flex-row gap-[14px] p-[0px_16px] justify-start items-center bg-[#FFFFFF] [border:1px_solid_#E5E7EB] rounded-lg"
            >
              <svg
                data-pencil-name="Icon-archive"
                viewBox="0 0 24 24"
                preserveAspectRatio="none"
                xmlns="http://www.w3.org/2000/svg"
                className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
              >
                <path
                  d="M3 3h18a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-18a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1z m1 5v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-11m-10 4h4"
                  fill="#00000000"
                ></path>
                <path
                  d="M3 3h18a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-18a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1z m1 5v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-11m-10 4h4"
                  fill="none"
                  stroke="#0062FF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                ></path>
              </svg>
              <div
                data-pencil-name="Text"
                className="box-border [flex:1_1_0] h-fit flex flex-col gap-[3px] justify-start items-start"
              >
                <div
                  data-pencil-name="Label"
                  className="text-[16px]/[normal] box-border text-[#1A1A1A] font-body font-medium text-left [white-space:nowrap]"
                >
                  {archive.title}
                </div>
                <div
                  data-pencil-name="Desc"
                  className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap]"
                >
                  {formatDate(archive.createdAt)} · {archive.fileCount} 个附件
                </div>
              </div>
              <svg
                data-pencil-name="Arrow"
                viewBox="0 0 24 24"
                preserveAspectRatio="none"
                xmlns="http://www.w3.org/2000/svg"
                className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
              >
                <path d="M9 18l6-6-6-6" fill="#00000000"></path>
                <path
                  d="M9 18l6-6-6-6"
                  fill="none"
                  stroke="#4B5563"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                ></path>
              </svg>
            </div>
          ))
        )}
      </div>
    </PhoneFrame>
  );
}