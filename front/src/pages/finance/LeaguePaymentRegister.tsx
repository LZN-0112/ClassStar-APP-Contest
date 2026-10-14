import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { toast } from 'sonner';

export default function LeaguePaymentRegister() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const classId = user?.classId;
  const [members, setMembers] = useState<any[]>([]);
  const [paidMap, setPaidMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!classId) return;

    // 获取班级成员
    api.get(`/classes/${classId}/members`)
      .then((res) => {
        const memberList = res.data?.members || [];
        setMembers(memberList);
        // 初始化paidMap
        const initialPaidMap: Record<string, boolean> = {};
        memberList.forEach((m: any) => {
          initialPaidMap[m.userId] = false;
        });
        setPaidMap(initialPaidMap);
      })
      .catch((error) => {
        console.error('获取班级成员失败:', error);
        toast.error('获取班级成员失败');
      });

    // 获取已缴费记录
    api.get('/fee/list', { params: { classId, feeType: 'group', pageNum: 1, pageSize: 100 } })
      .then((res) => {
        const paidUserIds = new Set(
          (res.data?.records || [])
            .filter((r: any) => r.type === 'income' && r.remark?.includes('团费缴纳'))
            .map((r: any) => r.userId)
        );
        setPaidMap((prev) => {
          const updated = { ...prev };
          paidUserIds.forEach((userId: string) => {
            if (userId in updated) {
              updated[userId] = true;
            }
          });
          return updated;
        });
      })
      .catch(console.error);
  }, [classId]);

  const toggle = (id: string) => {
    setPaidMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = async () => {
    if (!classId) {
      toast.error('未找到班级信息');
      return;
    }

    const paidUserIds = Object.entries(paidMap)
      .filter(([_, paid]) => paid)
      .map(([userId]) => userId);

    if (paidUserIds.length === 0) {
      toast.error('请至少选择一个已缴费学生');
      return;
    }

    try {
      // 批量提交缴费记录
      const promises = paidUserIds.map((userId) =>
        api.post('/fee/add', {
          classId,
          feeType: 'group',
          type: 'income',
          amount: 10,
          remark: `团费缴纳 - ${userId}`,
        })
      );
      await Promise.all(promises);
      toast.success(`已登记 ${paidUserIds.length} 人缴费记录`);
      navigate('/fee-ledger', { state: { type: 'league' } });
    } catch (error: any) {
      console.error('缴费登记失败:', error);
      toast.error(error.message || '登记失败，请重试');
    }
  };

  return (
    <PageLayout
      title="团费缴费登记"
      variant="a"
      decor={<CreditCard className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}
    >
      <div className="flex w-full flex-1 flex-col gap-5">
        <div
          data-pencil-name="Info Card"
          className="box-border flex h-fit w-full shrink-0 flex-col items-start justify-start gap-2 rounded-[16px] bg-[#EBF4FF] p-4"
        >
          <div
            data-pencil-name="Text"
            className="text-[14px]/[normal] box-border text-[#1E293B] font-body font-bold text-left [white-space:nowrap]"
          >
            团费缴纳
          </div>
          <div
            data-pencil-name="Text"
            className="text-[14px]/[normal] box-border text-[#64748B] font-body font-medium text-left [white-space:nowrap]"
          >
            金额：¥10.00/人
          </div>
          <div
            data-pencil-name="Text"
            className="text-[11px]/[normal] box-border text-[#1986E6] font-body font-semibold text-left [white-space:nowrap]"
          >
            截止时间：03月30日
          </div>
        </div>

        <div
          data-pencil-name="Group 已缴费人员"
          className="box-border flex w-full flex-col gap-[10px]"
        >
          <div
            data-pencil-name="Text"
            className="text-[11px]/[normal] box-border text-[#6B7280] font-body font-semibold text-left [white-space:nowrap]"
          >
            已缴费人员
          </div>
          <div
            data-pencil-name="Group Content"
            className="box-border flex w-full flex-col gap-2"
          >
            {members.map((student) => {
              const paid = paidMap[student.userId];
              return (
                <button
                  key={student.userId}
                  type="button"
                  onClick={() => toggle(student.userId)}
                  data-pencil-name="Member"
                  className="box-border flex h-[48px] w-full shrink-0 flex-row items-center gap-3 rounded-xl bg-[#FFFFFF] px-3 text-left"
                >
                  <div
                    data-pencil-name="Avatar"
                    className="box-border flex h-[28px] w-[28px] shrink-0 flex-col items-center justify-center rounded-full bg-[#076CAB]"
                  >
                    <div
                      data-pencil-name="Text"
                      className="text-[12px]/[normal] box-border text-[#FFFFFF] font-body font-semibold text-left [white-space:nowrap]"
                    >
                      {student.name.charAt(0)}
                    </div>
                  </div>
                  <div className="flex flex-col items-start justify-center gap-0">
                    <div
                      data-pencil-name="Text"
                      className="text-[14px]/[normal] box-border text-[#1E293B] font-body font-medium text-left [white-space:nowrap]"
                    >
                      {student.name}
                    </div>
                    <div className="text-[11px]/[normal] font-caption font-normal text-[#64748B]">
                      {student.studentId}
                    </div>
                  </div>
                  {paid && (
                    <div
                      data-pencil-name="Check"
                      className="box-border ml-auto flex h-[20px] w-[20px] shrink-0 flex-col items-center justify-center rounded-[6px] bg-[#22C55E]"
                    >
                      <svg
                        data-pencil-name="Icon-check"
                        viewBox="0 0 24 24"
                        preserveAspectRatio="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="box-border h-[14px] w-[14px] shrink-0 overflow-visible"
                      >
                        <path d="M20 6l-11 11-5-5" fill="none"></path>
                        <path
                          d="M20 6l-11 11-5-5"
                          fill="none"
                          stroke="#FFFFFF"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                        ></path>
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="box-border w-full shrink-0 flex-1"></div>

        <button
          type="button"
          onClick={handleSubmit}
          data-pencil-name="Button Primary"
          className="box-border flex h-[52px] w-full shrink-0 flex-col items-center justify-center rounded-xl bg-[#0062FF] [box-shadow:0px_4px_16px_0px_#0000001A] active:opacity-90"
        >
          <div
            data-pencil-name="Text"
            className="text-[16px]/[normal] box-border w-full text-center text-[#FFFFFF] font-body font-semibold [white-space:nowrap]"
          >
            确认登记
          </div>
        </button>
      </div>
    </PageLayout>
  );
}
