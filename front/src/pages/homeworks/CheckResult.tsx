import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Users, Download, Bell, FileCheck, Loader2, ArrowLeft } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface CheckResultItem {
  userId: string;
  studentId: string;
  name: string;
}

interface CheckResultData {
  checkId: string;
  totalCount: number;
  submittedCount: number;
  unmatchedCount: number;
  submittedList: CheckResultItem[];
  unsubmittedList: CheckResultItem[];
  unmatchedList: string[];
}

export default function CheckResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const { homeworkId: routeHomeworkId } = useParams<{ homeworkId: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useCurrentUser();

  const homeworkId = routeHomeworkId || searchParams.get('homeworkId') || '';
  const homeworkTitle = searchParams.get('homeworkTitle') || '未选择作业';

  const [loading, setLoading] = useState(true);
  const [reminding, setReminding] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResultData | null>(null);
  const [membersWithoutStudentId, setMembersWithoutStudentId] = useState<number>(0);

  const classId = user?.classId;

  // Check if we have result from location.state (from offline-check API)
  const stateResult = (location.state as { checkResult?: CheckResultData } | null)?.checkResult;

  useEffect(() => {
    if (stateResult) {
      // Use the result from state
      setCheckResult(stateResult);
      setLoading(false);
      return;
    }

    // Otherwise, fetch from API (fallback for direct navigation)
    if (!classId || !homeworkId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch members to count those without student_id
        const membersRes = await api.get(`/classes/${classId}/members`).catch(() => null);

        if (membersRes) {
          const membersData = membersRes.data?.data?.list || membersRes.data?.list || membersRes.data?.data || [];
          const count = membersData.filter((m: any) => !m.user?.studentId && !m.studentId).length;
          setMembersWithoutStudentId(count);
        }

        // For direct navigation without state, we can't reconstruct the check result
        // So we just show a message
        setCheckResult(null);
      } catch (err) {
        console.error('Failed to fetch check result data:', err);
        toast.error('获取核对数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [classId, homeworkId, stateResult]);

  const total = checkResult?.totalCount || 0;
  const submittedList = checkResult?.submittedList || [];
  const unsubmittedList = checkResult?.unsubmittedList || [];
  const unmatchedList = checkResult?.unmatchedList || [];

  const handleExport = () => {
    const csv = ['学号,姓名', ...unsubmittedList.map((m) => `${m.studentId || '-'},${m.name}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `未交名单-${homeworkTitle}.csv`;
    link.click();
  };

  const handleRemind = async () => {
    if (!classId || !homeworkId || reminding || unsubmittedList.length === 0) return;

    setReminding(true);
    try {
      // Create a notification to remind unsubmitted students
      const unsubmittedNames = unsubmittedList.map((m) => m.name).join('、');
      await api.post(`/classes/${classId}/messages`, {
        type: 'reminder',
        title: `【催交作业】${homeworkTitle}`,
        content: `请以下同学尽快提交作业「${homeworkTitle}」：${unsubmittedNames}`,
        status: 'published',
      });
      toast.success(`已发送催交通知给 ${unsubmittedList.length} 位未交同学`);
    } catch (err) {
      console.error('Remind failed:', err);
      toast.error(err instanceof Error ? err.message : '发送催交通知失败');
    } finally {
      setReminding(false);
    }
  };

  const handleBack = () => {
    navigate('/offline-check', { replace: true });
  };

  if (loading) {
    return (
      <PageLayout title="核对结果" variant="a">
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#0062FF]" />
        </div>
      </PageLayout>
    );
  }

  // No result available (direct navigation without state)
  if (!checkResult) {
    return (
      <PageLayout
        title="核对结果"
        variant="a"
        decor={<FileCheck className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}
      >
        <div className="flex w-full flex-1 flex-col items-center justify-center gap-4">
          <AlertCircle className="h-12 w-12 text-[#94A3B8]" strokeWidth={1.5} />
          <div className="text-[14px]/[normal] font-body font-medium text-[#64748B]">暂无核对结果</div>
          <div className="text-[12px]/[normal] font-caption font-normal text-[#94A3B8]">请通过作业核对功能进行操作</div>
          <button
            type="button"
            onClick={() => navigate('/offline-check')}
            className="mt-2 rounded-xl bg-[#0062FF] px-6 py-3 text-[14px] font-body font-semibold text-white active:opacity-90"
          >
            前往作业核对
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="核对结果"
      variant="a"
      decor={<FileCheck className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}
    >
      <div className="flex w-full flex-1 flex-col gap-5">
        <div className="box-border flex w-full flex-col gap-2">
          <div className="text-[11px]/[normal] font-body font-semibold text-[#6B7280]">核对作业</div>
          <div className="text-[14px]/[normal] font-body font-semibold text-[#1E293B]">{homeworkTitle}</div>
        </div>

        {/* 学号为空提示 */}
        {membersWithoutStudentId > 0 && (
          <div className="box-border flex w-full flex-row items-center gap-2 rounded-xl bg-[#FEF3C7] px-4 py-3">
            <AlertCircle className="h-4 w-4 shrink-0 text-[#F59E0B]" />
            <div className="text-[12px]/[normal] font-caption font-medium text-[#92400E]">
              有 {membersWithoutStudentId} 位同学未绑定学号，可能影响核对准确性，请联系班长补全名单
            </div>
          </div>
        )}

        {/* 数据概览 */}
        <div className="box-border flex w-full flex-row gap-3">
          <div className="box-border flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl bg-white p-4 shadow-soft">
            <Users className="h-5 w-5 text-[#0062FF]" strokeWidth={2} />
            <div className="text-[24px]/[normal] font-heading font-bold text-[#1A1A1A]">{total}</div>
            <div className="text-[11px]/[normal] font-caption font-medium text-[#4B5563]">应交人数</div>
          </div>
          <div className="box-border flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl bg-white p-4 shadow-soft">
            <CheckCircle className="h-5 w-5 text-[#22C55E]" strokeWidth={2} />
            <div className="text-[24px]/[normal] font-heading font-bold text-[#1A1A1A]">{submittedList.length}</div>
            <div className="text-[11px]/[normal] font-caption font-medium text-[#4B5563]">已交人数</div>
          </div>
          <div className="box-border flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl bg-white p-4 shadow-soft">
            <AlertCircle className="h-5 w-5 text-[#EF4444]" strokeWidth={2} />
            <div className="text-[24px]/[normal] font-heading font-bold text-[#1A1A1A]">{unsubmittedList.length}</div>
            <div className="text-[11px]/[normal] font-caption font-medium text-[#4B5563]">未交人数</div>
          </div>
        </div>

        {/* 无法匹配的学号 */}
        {unmatchedList.length > 0 && (
          <div className="box-border flex w-full flex-col gap-2">
            <div className="text-[11px]/[normal] font-body font-semibold text-[#F59E0B]">
              无法匹配的学号（{unmatchedList.length}个）
            </div>
            <div className="box-border flex w-full flex-wrap gap-2 rounded-xl bg-[#FEF3C7] p-3">
              {unmatchedList.map((id) => (
                <div key={id} className="rounded-lg bg-white px-3 py-1.5 text-[12px] font-body font-medium text-[#92400E]">
                  {id}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 已交名单 */}
        <div className="box-border flex w-full flex-col gap-3">
          <div className="text-[11px]/[normal] font-body font-semibold text-[#6B7280]">
            已交名单（{submittedList.length}人）
          </div>
          <div className="box-border flex w-full flex-col gap-2">
            {submittedList.map((student) => (
              <div
                key={student.userId}
                className="box-border flex h-[52px] w-full shrink-0 flex-row items-center gap-3 rounded-xl bg-white px-4 shadow-soft"
              >
                <div className="box-border flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-full bg-[#076CAB]">
                  <div className="text-[12px]/[normal] font-body font-semibold text-white">{student.name.charAt(0)}</div>
                </div>
                <div className="flex flex-col items-start justify-center gap-0">
                  <div className="text-[14px]/[normal] font-body font-medium text-[#1A1A1A]">{student.name}</div>
                  <div className="text-[11px]/[normal] font-caption font-normal text-[#4B5563]">{student.studentId || '-'}</div>
                </div>
                <CheckCircle className="ml-auto h-5 w-5 text-[#22C55E]" strokeWidth={2} />
              </div>
            ))}
          </div>
        </div>

        {/* 未交名单 */}
        <div className="box-border flex w-full flex-col gap-3">
          <div className="text-[11px]/[normal] font-body font-semibold text-[#6B7280]">
            未交名单（{unsubmittedList.length}人）
          </div>
          <div className="box-border flex w-full flex-col gap-2">
            {unsubmittedList.map((student) => (
              <div
                key={student.userId}
                className="box-border flex h-[52px] w-full shrink-0 flex-row items-center gap-3 rounded-xl bg-white px-4 shadow-soft"
              >
                <div className="box-border flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-full bg-[#9CA3AF]">
                  <div className="text-[12px]/[normal] font-body font-semibold text-white">{student.name.charAt(0)}</div>
                </div>
                <div className="flex flex-col items-start justify-center gap-0">
                  <div className="text-[14px]/[normal] font-body font-medium text-[#1A1A1A]">{student.name}</div>
                  <div className="text-[11px]/[normal] font-caption font-normal text-[#4B5563]">{student.studentId || '-'}</div>
                </div>
                <AlertCircle className="ml-auto h-5 w-5 text-[#EF4444]" strokeWidth={2} />
              </div>
            ))}
          </div>
        </div>

        <div className="box-border w-full shrink-0 flex-1"></div>

        {/* 底部操作 */}
        <div className="box-border flex w-full flex-col gap-3">
          <button
            type="button"
            onClick={handleExport}
            disabled={unsubmittedList.length === 0}
            className="box-border flex h-[52px] w-full shrink-0 flex-col items-center justify-center rounded-xl border border-[#0062FF] bg-[#0062FF0D] px-4 disabled:opacity-50 active:opacity-90"
          >
            <div className="flex items-center gap-2 text-[16px]/[normal] font-body font-semibold text-[#0062FF]">
              <Download className="h-5 w-5" />
              导出未交名单
            </div>
          </button>
          <button
            type="button"
            onClick={handleRemind}
            disabled={unsubmittedList.length === 0 || reminding}
            className="box-border flex h-[52px] w-full shrink-0 flex-col items-center justify-center rounded-xl bg-[#0062FF] px-4 shadow-soft disabled:opacity-50 active:opacity-90"
          >
            <div className="flex items-center gap-2 text-[16px]/[normal] font-body font-semibold text-white">
              {reminding ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Bell className="h-5 w-5" />
              )}
              {reminding ? '发送中...' : '一键通知提醒未交同学'}
            </div>
          </button>
          <button
            type="button"
            onClick={handleBack}
            className="box-border flex h-[52px] w-full shrink-0 flex-col items-center justify-center rounded-xl bg-white px-4 shadow-soft active:opacity-90"
          >
            <div className="flex items-center gap-2 text-[16px]/[normal] font-body font-semibold text-[#1A1A1A]">
              <ArrowLeft className="h-5 w-5" />
              返回核对首页
            </div>
          </button>
        </div>
      </div>
    </PageLayout>
  );
}