import { useState, useEffect } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { toast } from 'sonner';

type Registration = {
  id: string;
  name: string;
  activity: string;
  status: string;
  time: string;
};

const TOTAL_CLASS = 35;

export default function RegistrationStats() {
  const navigate = useNavigate();
  const { activityId } = useParams();
  const { user } = useCurrentUser();
  const classId = user?.classId;
  const [items, setItems] = useState<Registration[]>([]);

  useEffect(() => {
    if (!classId || !activityId) return;

    api.get(`/classes/${classId}/activities/${activityId}/registrations`)
      .then((res) => {
        const registrations = (res.data?.registrations || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          activity: r.activityTitle || '',
          status: r.status === 'registered' ? '已通过' : r.status === 'rejected' ? '已驳回' : '待审核',
          time: new Date(r.createdAt).toLocaleString('zh-CN'),
        }));
        setItems(registrations);
      })
      .catch((error) => {
        console.error('获取报名列表失败:', error);
        toast.error('获取报名列表失败');
      });
  }, [classId, activityId]);

  const total = items.length;
  const pending = items.filter((i) => i.status === '待审核').length;
  const approved = items.filter((i) => i.status === '已通过').length;
  const rate = Math.round((total / TOTAL_CLASS) * 100);

  const updateStatus = async (id: string, status: string) => {
    if (!classId || !activityId) {
      toast.error('缺少必要信息');
      return;
    }

    const apiStatus = status === '已通过' ? 'registered' : 'rejected';

    try {
      await api.post(`/classes/${classId}/activities/${activityId}/registrations/${id}/review`, {
        status: apiStatus,
      });
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
      toast.success('审核成功');
    } catch (error: any) {
      console.error('审核失败:', error);
      toast.error(error.message || '审核失败，请重试');
    }
  };

  return (
    <PageLayout title="报名统计" variant="a">
      <div className="flex flex-col gap-[20px]">
        <div
          data-pencil-name="Stats Row"
          className="box-border w-full h-fit shrink-0 flex flex-row gap-[12px] justify-start items-start bg-[#00000000]"
        >
          <div
            data-pencil-name="Stat Card"
            className="box-border [flex:1_1_0] h-fit [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-[6px] p-4 justify-start items-center bg-[#FFFFFF] rounded-[16px]"
          >
            <div
              data-pencil-name="Text"
              className="text-[28px]/[normal] box-border text-[#004ECC] font-heading font-bold text-left [white-space:nowrap]"
            >
              {approved + pending}
            </div>
            <div
              data-pencil-name="Text"
              className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-semibold text-left [white-space:nowrap]"
            >
              已报名
            </div>
          </div>
          <div
            data-pencil-name="Stat Card"
            className="box-border [flex:1_1_0] h-fit [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-[6px] p-4 justify-start items-center bg-[#FFFFFF] rounded-[16px]"
          >
            <div
              data-pencil-name="Text"
              className="text-[28px]/[normal] box-border text-[#004ECC] font-heading font-bold text-left [white-space:nowrap]"
            >
              {pending}
            </div>
            <div
              data-pencil-name="Text"
              className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-semibold text-left [white-space:nowrap]"
            >
              待审核
            </div>
          </div>
          <div
            data-pencil-name="Stat Card"
            className="box-border [flex:1_1_0] h-fit [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-[6px] p-4 justify-start items-center bg-[#FFFFFF] rounded-[16px]"
          >
            <div
              data-pencil-name="Text"
              className="text-[28px]/[normal] box-border text-[#004ECC] font-heading font-bold text-left [white-space:nowrap]"
            >
              {rate}%
            </div>
            <div
              data-pencil-name="Text"
              className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-semibold text-left [white-space:nowrap]"
            >
              报名率
            </div>
          </div>
        </div>

        <div
          data-pencil-name="Group 报名人员"
          className="box-border w-full h-fit shrink-0 flex flex-col gap-[10px] justify-start items-start bg-[#00000000]"
        >
          <div
            data-pencil-name="Text"
            className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-semibold text-left [white-space:nowrap]"
          >
            报名人员
          </div>
          <div
            data-pencil-name="Group Content"
            className="box-border w-full h-fit shrink-0 flex flex-col gap-2 justify-start items-start bg-[#00000000]"
          >
            {items.map((item) => (
              <div
                key={item.id}
                data-pencil-name="Card"
                onClick={() => navigate('/activity-detail')}
                className="box-border w-full h-fit shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-[10px] p-4 justify-start items-start bg-[#FFFFFF] rounded-[16px]"
              >
                <div
                  data-pencil-name="Row"
                  className="box-border w-full h-fit shrink-0 flex flex-row gap-0 justify-between items-center"
                >
                  <div
                    data-pencil-name="Name"
                    className="text-[16px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                  >
                    {item.name}
                  </div>
                  <div
                    data-pencil-name="Status"
                    className={`text-[11px]/[normal] box-border font-caption font-medium text-left [white-space:nowrap] ${
                      item.status === '已通过'
                        ? 'text-[#22C55E]'
                        : item.status === '待审核'
                          ? 'text-[#F59E0B]'
                          : 'text-[#EF4444]'
                    }`}
                  >
                    {item.status}
                  </div>
                </div>
                <div
                  data-pencil-name="Info"
                  className="text-[12px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap]"
                >
                  {item.activity} · {item.time}
                </div>
                {item.status === '待审核' && (
                  <div
                    data-pencil-name="Actions"
                    onClick={(e) => e.stopPropagation()}
                    className="box-border w-full h-fit shrink-0 flex flex-row gap-[10px] justify-start items-start"
                  >
                    <button
                      type="button"
                      onClick={() => updateStatus(item.id, '已通过')}
                      data-pencil-name="Approve"
                      className="box-border [flex:1_1_0] h-[36px] flex flex-col gap-0 justify-center items-center bg-[#22C55E] rounded-lg"
                    >
                      <div
                        data-pencil-name="Text"
                        className="text-[13px]/[normal] box-border text-[#FFFFFF] font-body font-semibold text-left [white-space:nowrap]"
                      >
                        通过
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus(item.id, '已驳回')}
                      data-pencil-name="Reject"
                      className="box-border [flex:1_1_0] h-[36px] flex flex-col gap-0 justify-center items-center bg-[#EF44441A] rounded-lg"
                    >
                      <div
                        data-pencil-name="Text"
                        className="text-[13px]/[normal] box-border text-[#EF4444] font-body font-semibold text-left [white-space:nowrap]"
                      >
                        驳回
                      </div>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
