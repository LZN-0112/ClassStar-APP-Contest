import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ScanLine, Upload, X, Loader2, Plus } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface RecognizedStudent {
  studentId: string;
  selected: boolean;
}

export default function ScreenshotCheck() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useCurrentUser();
  const { homeworkId, homeworkTitle } = (location.state as { homeworkId?: string; homeworkTitle?: string } | null) || {};

  const classId = user?.classId;

  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [results, setResults] = useState<RecognizedStudent[]>([]);
  const [unmatchedIds, setUnmatchedIds] = useState<string[]>([]);
  const [manualInput, setManualInput] = useState('');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !classId) {
      toast.error('请选择文件或班级信息缺失');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post(`/classes/${classId}/homeworks/offline-check/recognize`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = res.data?.data || res.data;
      const studentIds = data.studentIds || [];
      const unmatched = data.unmatched || [];

      setResults(studentIds.map((id: string) => ({ studentId: id, selected: true })));
      setUnmatchedIds(unmatched);
      setUploaded(true);
      toast.success(`识别完成，共找到 ${studentIds.length} 个学号`);
    } catch (err) {
      console.error('OCR识别失败:', err);
      toast.error(err instanceof Error ? err.message : 'OCR识别失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const toggleSelected = (studentId: string) => {
    setResults((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, selected: !r.selected } : r)));
  };

  const removeStudent = (studentId: string) => {
    setResults((prev) => prev.filter((r) => r.studentId !== studentId));
  };

  const addManualStudent = () => {
    const id = manualInput.trim();
    if (!id) return;
    if (results.some((r) => r.studentId === id)) {
      toast.warning('该学号已存在');
      return;
    }
    setResults((prev) => [...prev, { studentId: id, selected: true }]);
    setManualInput('');
    toast.success('已添加学号');
  };

  const handleConfirm = async () => {
    if (!classId || !homeworkId) {
      toast.error('班级或作业信息缺失');
      return;
    }

    const selectedIds = results.filter((r) => r.selected).map((r) => r.studentId);
    if (selectedIds.length === 0) {
      toast.warning('请至少选择一个学号');
      return;
    }

    try {
      const res = await api.post(`/classes/${classId}/homeworks/offline-check`, {
        homeworkId,
        checkType: 'screenshot',
        studentIds: selectedIds,
      });

      const result = res.data?.data || res.data;
      navigate(`/check-result/${homeworkId}?homeworkTitle=${encodeURIComponent(homeworkTitle || '作业核对')}&source=screenshot`, {
        state: { checkResult: result },
      });
    } catch (err) {
      console.error('核对失败:', err);
      toast.error(err instanceof Error ? err.message : '核对失败，请重试');
    }
  };

  return (
    <PageLayout
      title="截图识别核对"
      variant="a"
      decor={<ScanLine className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}
    >
      <div className="flex w-full flex-1 flex-col gap-5">
        <div className="box-border flex w-full flex-col gap-2">
          <div className="text-[11px]/[normal] font-body font-semibold text-[#6B7280]">核对作业</div>
          <div className="text-[14px]/[normal] font-body font-semibold text-[#1E293B]">{homeworkTitle || '未选择作业'}</div>
        </div>

        {!uploaded ? (
          <label
            className={`box-border flex min-h-[180px] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#E5E7EB] bg-[#F8FAFC] ${uploading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer active:opacity-90'}`}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
            {uploading ? (
              <>
                <Loader2 className="h-[28px] w-[28px] animate-spin text-[#076CAB]" />
                <div className="text-[14px]/[normal] font-body font-semibold text-[#1E293B]">识别中...</div>
              </>
            ) : (
              <>
                <div className="box-border flex h-[56px] w-[56px] flex-col items-center justify-center rounded-full bg-[#DBEAFE]">
                  <Upload className="h-[28px] w-[28px] text-[#076CAB]" strokeWidth={2} />
                </div>
                <div className="text-[14px]/[normal] font-body font-semibold text-[#1E293B]">点击上传截图</div>
                <div className="text-[11px]/[normal] font-caption font-medium text-[#64748B]">支持作业文件夹/压缩包截图</div>
              </>
            )}
          </label>
        ) : (
          <>
            <div className="box-border flex min-h-[120px] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-soft">
              <div className="text-[14px]/[normal] font-body font-semibold text-[#1E293B]">已上传截图</div>
              <div className="text-[11px]/[normal] font-caption font-medium text-[#64748B]">系统已识别 {results.length} 个学号</div>
              <button
                type="button"
                onClick={() => {
                  setUploaded(false);
                  setResults([]);
                  setUnmatchedIds([]);
                }}
                className="mt-1 text-[11px]/[normal] font-body font-medium text-[#EF4444]"
              >
                重新上传
              </button>
            </div>

            {/* 手动添加学号 */}
            <div className="box-border flex w-full flex-col gap-2">
              <div className="text-[11px]/[normal] font-body font-semibold text-[#6B7280]">手动添加学号</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="输入学号"
                  className="box-border flex-1 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-[14px] font-body font-medium text-[#1A1A1A] shadow-soft placeholder:text-[#94A3B8] outline-none"
                />
                <button
                  type="button"
                  onClick={addManualStudent}
                  disabled={!manualInput.trim()}
                  className="box-border flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl bg-[#0062FF] disabled:opacity-50 active:opacity-90"
                >
                  <Plus className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>

            {/* 未匹配学号 */}
            {unmatchedIds.length > 0 && (
              <div className="box-border flex w-full flex-col gap-2">
                <div className="text-[11px]/[normal] font-body font-semibold text-[#F59E0B]">未匹配学号（{unmatchedIds.length}个）</div>
                <div className="box-border flex w-full flex-wrap gap-2 rounded-xl bg-[#FEF3C7] p-3">
                  {unmatchedIds.map((id) => (
                    <div key={id} className="rounded-lg bg-white px-3 py-1.5 text-[12px] font-body font-medium text-[#92400E]">
                      {id}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 识别结果列表 */}
            <div className="box-border flex w-full flex-col gap-3">
              <div className="text-[11px]/[normal] font-body font-semibold text-[#6B7280]">识别结果（点击可修正）</div>
              <div className="box-border flex w-full flex-col gap-2">
                {results.map((student) => (
                  <div
                    key={student.studentId}
                    className={`box-border flex h-[52px] w-full shrink-0 flex-row items-center gap-3 rounded-xl px-4 transition-colors ${
                      student.selected ? 'bg-[#DBEAFE]' : 'bg-white shadow-soft'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSelected(student.studentId)}
                      className="flex flex-1 flex-row items-center gap-3"
                    >
                      <div className="box-border flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-full bg-[#076CAB]">
                        <div className="text-[12px]/[normal] font-body font-semibold text-white">{student.studentId.charAt(0)}</div>
                      </div>
                      <div className="text-[14px]/[normal] font-body font-medium text-[#1A1A1A]">{student.studentId}</div>
                      {student.selected ? (
                        <div className="ml-auto text-[11px]/[normal] font-body font-semibold text-[#0062FF]">已选中</div>
                      ) : (
                        <div className="ml-auto text-[11px]/[normal] font-body font-medium text-[#9CA3AF]">未选中</div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeStudent(student.studentId)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FEE2E2] active:opacity-90"
                    >
                      <X className="h-4 w-4 text-[#EF4444]" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="box-border w-full shrink-0 flex-1"></div>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={!uploaded || results.filter((r) => r.selected).length === 0}
          className="box-border flex h-[52px] w-full shrink-0 flex-col items-center justify-center rounded-xl bg-[#0062FF] [box-shadow:0px_4px_16px_0px_#0000001A] disabled:opacity-50 active:opacity-90"
        >
          <div className="text-[16px]/[normal] font-body font-semibold text-white">确认标记已交</div>
        </button>
      </div>
    </PageLayout>
  );
}
