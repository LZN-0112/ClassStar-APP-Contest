import { useEffect, useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

interface RegistrationItem {
  registrationId: string;
  activity: string;
  time: string;
  status: string;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  approved: { bg: 'bg-[#22C55E1A]', text: 'text-[#22C55E]' },
  pending: { bg: 'bg-[#F59E0B1A]', text: 'text-[#F59E0B]' },
  rejected: { bg: 'bg-[#EF44441A]', text: 'text-[#EF4444]' },
};

const statusLabels: Record<string, string> = {
  approved: '已通过',
  pending: '待审核',
  rejected: '未通过',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${month}月${day}日 ${hours}:${minutes}`;
}

export default function MyRegistration() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.classId) {
      setLoading(false);
      return;
    }

    api
      .get(`/classes/${user.classId}/activities/my-registrations`, { params: { pageSize: 100 } })
      .then((res) => {
        const data = res.data.data || res.data;
        const list = data.list || [];
        const mapped: RegistrationItem[] = list.map((item: any) => ({
          registrationId: item.registrationId,
          activity: item.activity?.title || '未知活动',
          time: item.registeredAt ? formatDate(item.registeredAt) : '',
          status: item.status,
        }));
        setRegistrations(mapped);
      })
      .catch(() => {
        setRegistrations([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user?.classId]);

  return (
    <PageLayout title="我的报名" variant="b">
      <div className="flex flex-col gap-[20px]">
        <div
          data-pencil-name="Group 报名记录"
          className="box-border w-full h-fit shrink-0 flex flex-col gap-[10px] justify-start items-start bg-[#00000000]"
        >
          <div
            data-pencil-name="Text"
            className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-semibold text-left [white-space:nowrap]"
          >
            报名记录
          </div>
          <div
            data-pencil-name="Group Content"
            className="box-border w-full h-fit shrink-0 flex flex-col gap-2 justify-start items-start bg-[#00000000]"
          >
            {loading ? (
              <div className="box-border flex h-[120px] w-full flex-col items-center justify-center rounded-[16px] bg-[#F9FAFB] text-[14px] text-[#6B7280]">
                加载中...
              </div>
            ) : registrations.length === 0 ? (
              <div className="box-border flex h-[120px] w-full flex-col items-center justify-center rounded-[16px] bg-[#F9FAFB] text-[14px] text-[#6B7280]">
                暂无报名记录
              </div>
            ) : (
              registrations.map((item) => {
                const colors = statusColors[item.status] || statusColors['pending'];
                const label = statusLabels[item.status] || '待审核';
                return (
                  <div
                    key={item.registrationId}
                    data-pencil-name="Card"
                    onClick={() => navigate('/activity-detail')}
                    className="box-border w-full h-[80px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-[12px] p-4 justify-start items-center bg-[#FFFFFF] rounded-[16px]"
                  >
                    <div
                      data-pencil-name="Icon Box"
                      className="box-border w-[48px] shrink-0 h-[48px] flex flex-col gap-0 justify-center items-center bg-[#E0F2FE] rounded-lg"
                    >
                      <svg
                        data-pencil-name="Icon-clipboard-list"
                        viewBox="0 0 24 24"
                        preserveAspectRatio="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="box-border w-[24px] h-[24px] shrink-0 overflow-visible"
                      >
                        <path
                          d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-12a2 2 0 0 1-2-2v-14a2 2 0 0 1 2-2h2m4-2v6m-4 6h8m-8 4h8m-8-8h2"
                          fill="none"
                        ></path>
                        <path
                          d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-12a2 2 0 0 1-2-2v-14a2 2 0 0 1 2-2h2m4-2v6m-4 6h8m-8 4h8m-8-8h2"
                          fill="none"
                          stroke="#0062FF"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                        ></path>
                      </svg>
                    </div>
                    <div
                      data-pencil-name="Info"
                      className="box-border [flex:1_1_0] h-full flex flex-col gap-[6px] justify-center items-start bg-[#00000000]"
                    >
                      <div
                        data-pencil-name="Text"
                        className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                      >
                        {item.activity}
                      </div>
                      <div
                        data-pencil-name="Text"
                        className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                      >
                        {item.time}
                      </div>
                      <div
                        data-pencil-name="Tag"
                        className={`box-border w-fit h-[22px] shrink-0 flex flex-col gap-0 p-[4px_8px] justify-center items-center rounded-full ${colors.bg}`}
                      >
                        <div
                          data-pencil-name="Text"
                          className={`text-[11px]/[normal] box-border font-body font-semibold text-left [white-space:nowrap] ${colors.text}`}
                        >
                          {label}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
