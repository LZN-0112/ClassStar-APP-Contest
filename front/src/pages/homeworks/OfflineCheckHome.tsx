import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Keyboard, ScanLine, FileText, Clock, ShieldAlert } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import SelectSheet from '@/components/ui/SelectSheet';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface Homework {
  id: string;
  title: string;
  subject?: string;
}

interface CheckRecord {
  id: string;
  homeworkId: string;
  homeworkTitle: string;
  submittedCount: number;
  totalCount: number;
  checkType: string | null;
  checkedAt: string;
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${month}月${day}日 ${hours}:${minutes}`;
}

export default function OfflineCheckHome() {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useCurrentUser();
  const [homeworkList, setHomeworkList] = useState<Homework[]>([]);
  const [selectedHomework, setSelectedHomework] = useState('');
  const [records, setRecords] = useState<CheckRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const classId = user?.classId;
  const isManager = Boolean(
    user?.isCommittee || user?.roleLevel === 'owner' || user?.roleLevel === 'admin',
  );

  useEffect(() => {
    if (!classId) {
      setLoading(false);
      return;
    }

    Promise.all([
      api.get(`/classes/${classId}/homeworks`, { params: { pageSize: 100 } }),
      api.get(`/classes/${classId}/homeworks/offline-checks`).catch(() => null),
    ])
      .then(([homeworkRes, recordRes]) => {
        const data = homeworkRes.data?.data || homeworkRes.data;
        const list: Homework[] = data?.list || [];
        setHomeworkList(list);
        if (list.length > 0) setSelectedHomework(list[0].id);

        if (recordRes) {
          const recordData = recordRes.data?.data || recordRes.data;
          setRecords(Array.isArray(recordData) ? recordData : []);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch homework list:', err);
        toast.error('获取作业列表失败');
      })
      .finally(() => setLoading(false));
  }, [classId]);

  const selectedTitle = homeworkList.find((h) => h.id === selectedHomework)?.title || '';

  const goCheck = (path: string) => {
    if (!selectedHomework) {
      toast.error('暂无可核对的作业');
      return;
    }
    navigate(path, { state: { homeworkId: selectedHomework, homeworkTitle: selectedTitle } });
  };

  if (!userLoading && !isManager) {
    return (
      <PageLayout title="作业核对" variant="a">
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-[#64748B]">
          <ShieldAlert className="h-12 w-12 text-[#F59E0B] opacity-70" />
          <span className="text-[14px]">仅班委可使用作业核对</span>
          <button
            type="button"
            onClick={() => navigate('/homework-list', { replace: true })}
            className="rounded-full bg-[#EFF6FF] px-5 py-2 text-[13px] font-medium text-[#0062FF]"
          >
            返回作业列表
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="作业核对"
      variant="a"
      decor={<ClipboardCheck className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}
    >
      <div className="flex w-full flex-1 flex-col gap-5">
        {/* 作业选择 */}
        <div className="box-border flex w-full flex-col gap-2">
          <div className="text-[11px]/[normal] font-body font-semibold text-[#6B7280]">选择作业</div>
          <SelectSheet
            value={selectedHomework}
            onChange={setSelectedHomework}
            options={homeworkList.map((h) => ({
              value: h.id,
              label: h.title,
              hint: h.subject,
            }))}
            placeholder={loading ? '加载中...' : '暂无可核对的作业'}
            title="选择作业"
            icon={<FileText className="h-5 w-5 text-[#0062FF]" strokeWidth={2} />}
            disabled={loading || homeworkList.length === 0}
          />
          {!loading && homeworkList.length === 0 && (
            <div className="text-[11px] text-[#94A3B8]">发布作业后即可使用批量或截图核对</div>
          )}
        </div>

        {/* 核对方式 */}
        <div className="box-border flex w-full flex-col gap-3">
          <div className="text-[11px]/[normal] font-body font-semibold text-[#6B7280]">选择核对方式</div>
          <button
            type="button"
            onClick={() => goCheck('/batch-check')}
            disabled={homeworkList.length === 0}
            className="box-border flex w-full flex-row items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-soft active:opacity-90 disabled:opacity-50"
          >
            <div className="box-border flex h-[48px] w-[48px] shrink-0 flex-col items-center justify-center rounded-xl bg-[#DBEAFE]">
              <Keyboard className="h-[24px] w-[24px] text-[#0062FF]" strokeWidth={2} />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <div className="text-[14px]/[normal] font-body font-semibold text-[#1E293B]">批量输入学号核对</div>
              <div className="text-[11px]/[normal] font-caption font-medium text-[#64748B]">粘贴或输入已交学生学号，自动匹配姓名</div>
            </div>
            <svg
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              className="box-border h-5 w-5 shrink-0 text-[#9CA3AF]"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => goCheck('/screenshot-check')}
            disabled={homeworkList.length === 0}
            className="box-border flex w-full flex-row items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-soft active:opacity-90 disabled:opacity-50"
          >
            <div className="box-border flex h-[48px] w-[48px] shrink-0 flex-col items-center justify-center rounded-xl bg-[#DBEAFE]">
              <ScanLine className="h-[24px] w-[24px] text-[#0062FF]" strokeWidth={2} />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <div className="text-[14px]/[normal] font-body font-semibold text-[#1E293B]">上传截图识别核对</div>
              <div className="text-[11px]/[normal] font-caption font-medium text-[#64748B]">上传作业截图，自动识别并支持手动修正</div>
            </div>
            <svg
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              className="box-border h-5 w-5 shrink-0 text-[#9CA3AF]"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        {/* 历史记录 */}
        <div className="box-border flex w-full flex-col gap-3">
          <div className="text-[11px]/[normal] font-body font-semibold text-[#6B7280]">历史核对记录</div>
          {records.length === 0 ? (
            <div className="box-border flex w-full flex-col items-center justify-center gap-2 rounded-2xl bg-white p-6 shadow-soft">
              <Clock className="h-8 w-8 text-[#CBD5E1]" strokeWidth={1.5} />
              <div className="text-[13px]/[normal] font-caption font-medium text-[#94A3B8]">暂无历史记录</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {records.map((record) => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => navigate(`/check-result/${record.homeworkId}`)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-soft active:opacity-90"
                >
                  <div className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF]">
                    <ClipboardCheck className="h-5 w-5 text-[#0062FF]" />
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="max-w-full truncate text-[13px] font-semibold text-[#1E293B]">
                      {record.homeworkTitle}
                    </div>
                    <div className="text-[11px] text-[#64748B]">
                      已交 {record.submittedCount}/{record.totalCount} · {formatDateTime(record.checkedAt)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}