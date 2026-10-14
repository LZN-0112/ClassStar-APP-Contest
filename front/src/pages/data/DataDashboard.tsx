import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';

interface DashboardData {
  attendanceRate: number;
  homeworkSubmitRate: number;
  activityParticipationRate: number;
  feeBalance: number;
  trends: {
    attendance: { date: string; value: number }[];
  };
}

export default function DataDashboard() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [data, setData] = useState<DashboardData | null>(null);
  const [, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.classId) {
      setLoading(false);
      return;
    }

    api
      .get('/data/dashboard', { params: { classId: user.classId } })
      .then((res) => {
        const result = res.data.data || res.data;
        setData(result);
      })
      .catch(() => {
        setData(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user?.classId]);

  const attendanceRate = data?.attendanceRate ?? 0;
  const activityParticipationRate = data?.activityParticipationRate ?? 0;
  const feeBalance = data?.feeBalance ?? 0;
  const trendData = data?.trends?.attendance || [];

  const maxTrend = Math.max(...trendData.map((t) => t.value), 1);

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
                    ◉◉◉◉
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
                  data-pencil-name="Header"
                  className="box-border w-full h-[56px] shrink-0 flex flex-row gap-0 justify-between items-center"
                >
                  <BackButton />
                  <div
                    className="text-[16px]/[normal] box-border text-[#1A1A1A] font-heading font-semibold text-left [white-space:nowrap]"
                  >
                    数据看板
                  </div>
                  <div
                    className="box-border w-[24px] shrink-0 h-[24px] flex flex-row gap-0 justify-start items-start"
                  ></div>
                </div>
                <div
                  data-pencil-name="Metric Grid"
                  className="box-border w-full h-fit shrink-0 flex flex-row gap-[12px] justify-start items-start"
                >
                  <div
                    className="box-border [flex:1_1_0] h-fit flex flex-col gap-[12px] justify-start items-start"
                  >
                    <div
                      data-pencil-name="Card"
                      className="box-border w-full h-fit shrink-0 flex flex-col gap-2 p-4 justify-start items-start bg-[#0062FF0D] [border:1px_solid_#F3F4F6] rounded-lg"
                    >
                      <div
                        data-pencil-name="Accent Bar"
                        className="box-border w-full h-[4px] shrink-0 flex flex-row gap-0 justify-start items-start bg-[#0062FF]"
                      ></div>
                      <div
                        className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap]"
                      >
                        考勤签到率
                      </div>
                      <div
                        className="text-[28px]/[normal] box-border text-[#1A1A1A] font-heading font-bold text-left [white-space:nowrap]"
                      >
                        {attendanceRate}%
                      </div>
                    </div>
                    <div
                      data-pencil-name="Card"
                      className="box-border w-full h-fit shrink-0 flex flex-col gap-2 p-4 justify-start items-start bg-[#0062FF0D] [border:1px_solid_#F3F4F6] rounded-lg"
                    >
                      <div
                        data-pencil-name="Accent Bar"
                        className="box-border w-full h-[4px] shrink-0 flex flex-row gap-0 justify-start items-start bg-[#0062FF]"
                      ></div>
                      <div
                        className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap]"
                      >
                        作业提交率
                      </div>
                      <div
                        className="text-[28px]/[normal] box-border text-[#1A1A1A] font-heading font-bold text-left [white-space:nowrap]"
                      >
                        92%
                      </div>
                    </div>
                  </div>
                  <div
                    className="box-border [flex:1_1_0] h-fit flex flex-col gap-[12px] justify-start items-start"
                  >
                    <div
                      data-pencil-name="Card"
                      className="box-border w-full h-fit shrink-0 flex flex-col gap-2 p-4 justify-start items-start bg-[#0062FF0D] [border:1px_solid_#F3F4F6] rounded-lg"
                    >
                      <div
                        data-pencil-name="Accent Bar"
                        className="box-border w-full h-[4px] shrink-0 flex flex-row gap-0 justify-start items-start bg-[#0062FF]"
                      ></div>
                      <div
                        className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap]"
                      >
                        活动参与率
                      </div>
                      <div
                        className="text-[28px]/[normal] box-border text-[#1A1A1A] font-heading font-bold text-left [white-space:nowrap]"
                      >
                        {activityParticipationRate}%
                      </div>
                    </div>
                    <div
                      data-pencil-name="Card"
                      className="box-border w-full h-fit shrink-0 flex flex-col gap-2 p-4 justify-start items-start bg-[#0062FF0D] [border:1px_solid_#F3F4F6] rounded-lg"
                    >
                      <div
                        data-pencil-name="Accent Bar"
                        className="box-border w-full h-[4px] shrink-0 flex flex-row gap-0 justify-start items-start bg-[#0062FF]"
                      ></div>
                      <div
                        className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap]"
                      >
                        班费结余
                      </div>
                      <div
                        className="text-[28px]/[normal] box-border text-[#1A1A1A] font-heading font-bold text-left [white-space:nowrap]"
                      >
                        ¥{feeBalance.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  data-pencil-name="Card"
                  className="box-border w-full h-fit shrink-0 flex flex-col gap-2 p-4 justify-start items-start bg-[#0062FF0D] rounded-lg"
                >
                  <div
                    className="text-[16px]/[normal] box-border text-[#1A1A1A] font-heading font-semibold text-left [white-space:nowrap]"
                  >
                    出勤趋势
                  </div>
                  <div
                    data-pencil-name="Bars"
                    className="box-border w-full h-[120px] shrink-0 flex flex-row gap-2 justify-between items-end overflow-x-auto"
                  >
                    {trendData.length > 0
                      ? trendData.map((item, index) => {
                          const height = Math.max(
                            8,
                            (item.value / maxTrend) * 110,
                          );
                          return (
                            <div
                              key={index}
                              className="box-border w-[28px] shrink-0 flex flex-col gap-1 justify-end items-center"
                            >
                              <div
                                className="w-full bg-[#0062FF] rounded-sm"
                                style={{ height: `${height}px` }}
                              ></div>
                              <div className="text-[9px] text-[#6B7280]">
                                {item.date.slice(5)}
                              </div>
                            </div>
                          );
                        })
                      : Array.from({ length: 6 }).map((_, i) => (
                          <div
                            key={i}
                            className="box-border w-[28px] shrink-0 h-[20px] bg-[#0062FF] rounded-sm"
                          ></div>
                        ))}
                  </div>
                </div>
                <div
                  data-pencil-name="Button Primary"
                  onClick={() => navigate('/semester-report')}
                  className="box-border w-full h-[52px] shrink-0 [box-shadow:0px_4px_16px_0px_#0000000D] flex flex-col gap-2 p-[0px_16px] justify-center items-center bg-[#0062FF] rounded-lg"
                >
                  <div
                    data-pencil-name="Label"
                    className="text-[16px]/[normal] box-border text-[#FFFFFF] font-body font-semibold text-left [white-space:nowrap]"
                  >
                    生成学期报表
                  </div>
                </div>
              </div>
    </PhoneFrame>
  );
}
