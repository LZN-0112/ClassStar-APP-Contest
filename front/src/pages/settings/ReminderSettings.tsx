import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import { toast } from 'sonner';

export default function ReminderSettings() {
  return (
    <PhoneFrame>
      <div
                data-pencil-name="Unified Header"
                className="box-border w-full h-[282px] shrink-0 flex flex-col gap-0 justify-start items-start [background-image:linear-gradient(-133.249deg,_#0062FF_25.619%,_#004ECC_74.381%)] bg-no-repeat bg-[length:100%_100%] rounded-[0px_0px_24px_24px]"
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
                  <BackButton variant="dark" className="absolute left-[-4px] top-[0px] z-10" />
                  <div className="h-8 w-10" />
                  <div
                    data-pencil-name="Text"
                    className="text-[28px]/[normal] box-border text-[#FFFFFF] font-heading font-bold text-left [white-space:nowrap] relative [z-index:0]"
                  >
                    提醒设置
                  </div>
                  <div
                    data-pencil-name="Decor Icon"
                    className="box-border w-[120px] h-[120px] opacity-[0.12] absolute left-[265px] top-[80px] flex flex-col gap-0 justify-center items-center bg-[#00000000] [z-index:1]"
                  >
                    <svg
                      data-pencil-name="Icon-bell"
                      viewBox="0 0 24 24"
                      preserveAspectRatio="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="box-border w-[112px] h-[112px] shrink-0 overflow-visible"
                    >
                      <path
                        d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9m-4.27 13a2 2 0 0 1-3.46 0"
                        fill="none"
                      ></path>
                      <path
                        d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9m-4.27 13a2 2 0 0 1-3.46 0"
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
                  <div
                    data-pencil-name="Group 场景提醒"
                    className="box-border w-full h-fit shrink-0 flex flex-col gap-[10px] justify-start items-start bg-[#00000000]"
                  >
                    <div
                      data-pencil-name="Text"
                      className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-semibold text-left [white-space:nowrap]"
                    >
                      场景提醒
                    </div>
                    <div
                      data-pencil-name="Group Content"
                      className="box-border w-full h-fit shrink-0 flex flex-col gap-2 justify-start items-start bg-[#00000000]"
                    >
                      <div
                        data-pencil-name="Reminder Item"
                        onClick={() => toast.success('设置已保存')}
                        className="box-border w-full h-[64px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-[12px] p-[0px_16px] justify-start items-center bg-[#FFFFFF] rounded-lg"
                      >
                        <div
                          data-pencil-name="Icon Box"
                          className="box-border w-[40px] shrink-0 h-[40px] flex flex-col gap-0 justify-center items-center bg-[#E0F2FE] rounded-lg"
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
                              stroke="#0062FF"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            ></path>
                          </svg>
                        </div>
                        <div
                          data-pencil-name="Label"
                          className="box-border [flex:1_1_0] h-fit flex flex-col gap-[2px] justify-start items-start bg-[#00000000]"
                        >
                          <div
                            data-pencil-name="Text"
                            className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                          >
                            作业截止提醒
                          </div>
                          <div
                            data-pencil-name="Text"
                            className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                          >
                            1小时前
                          </div>
                        </div>
                        <div
                          data-pencil-name="Switch"
                          className="box-border w-[48px] shrink-0 h-[28px] flex flex-col gap-0 justify-start items-start bg-[#0062FF] rounded-full relative"
                        >
                          <div
                            data-pencil-name="Knob"
                            className="box-border w-[22px] h-[22px] absolute left-[23px] top-[3px] flex flex-col gap-0 justify-start items-start bg-[#FFFFFF] rounded-full [z-index:0]"
                          ></div>
                        </div>
                      </div>
                      <div
                        data-pencil-name="Reminder Item"
                        onClick={() => toast.success('设置已保存')}
                        className="box-border w-full h-[64px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-[12px] p-[0px_16px] justify-start items-center bg-[#FFFFFF] rounded-lg"
                      >
                        <div
                          data-pencil-name="Icon Box"
                          className="box-border w-[40px] shrink-0 h-[40px] flex flex-col gap-0 justify-center items-center bg-[#E0F2FE] rounded-lg"
                        >
                          <svg
                            data-pencil-name="Icon-clock"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[24px] h-[24px] shrink-0 overflow-visible"
                          >
                            <path
                              d="M12 22c5.523 0 10-4.477 10-10s-4.477-10-10-10-10 4.477-10 10 4.477 10 10 10m0-16v6l4 2"
                              fill="none"
                            ></path>
                            <path
                              d="M12 22c5.523 0 10-4.477 10-10s-4.477-10-10-10-10 4.477-10 10 4.477 10 10 10m0-16v6l4 2"
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
                          data-pencil-name="Label"
                          className="box-border [flex:1_1_0] h-fit flex flex-col gap-[2px] justify-start items-start bg-[#00000000]"
                        >
                          <div
                            data-pencil-name="Text"
                            className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                          >
                            考勤开始提醒
                          </div>
                          <div
                            data-pencil-name="Text"
                            className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                          >
                            15分钟前
                          </div>
                        </div>
                        <div
                          data-pencil-name="Switch"
                          className="box-border w-[48px] shrink-0 h-[28px] flex flex-col gap-0 justify-start items-start bg-[#0062FF] rounded-full relative"
                        >
                          <div
                            data-pencil-name="Knob"
                            className="box-border w-[22px] h-[22px] absolute left-[23px] top-[3px] flex flex-col gap-0 justify-start items-start bg-[#FFFFFF] rounded-full [z-index:0]"
                          ></div>
                        </div>
                      </div>
                      <div
                        data-pencil-name="Reminder Item"
                        onClick={() => toast.success('设置已保存')}
                        className="box-border w-full h-[64px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-[12px] p-[0px_16px] justify-start items-center bg-[#FFFFFF] rounded-lg"
                      >
                        <div
                          data-pencil-name="Icon Box"
                          className="box-border w-[40px] shrink-0 h-[40px] flex flex-col gap-0 justify-center items-center bg-[#E0F2FE] rounded-lg"
                        >
                          <svg
                            data-pencil-name="Icon-calendar"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[24px] h-[24px] shrink-0 overflow-visible"
                          >
                            <path
                              d="M8 2v4m8-4v4m-13 4h18m-14 4h0.01m3.99 0h0.01m3.99 0h0.01m-8.01 4h0.01m3.99 0h0.01m3.99 0h0.01m-10.01-12h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2"
                              fill="none"
                            ></path>
                            <path
                              d="M8 2v4m8-4v4m-13 4h18m-14 4h0.01m3.99 0h0.01m3.99 0h0.01m-8.01 4h0.01m3.99 0h0.01m3.99 0h0.01m-10.01-12h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2"
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
                          data-pencil-name="Label"
                          className="box-border [flex:1_1_0] h-fit flex flex-col gap-[2px] justify-start items-start bg-[#00000000]"
                        >
                          <div
                            data-pencil-name="Text"
                            className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                          >
                            活动报名提醒
                          </div>
                          <div
                            data-pencil-name="Text"
                            className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                          >
                            1天前
                          </div>
                        </div>
                        <div
                          data-pencil-name="Switch"
                          className="box-border w-[48px] shrink-0 h-[28px] flex flex-col gap-0 justify-start items-start bg-[#0062FF] rounded-full relative"
                        >
                          <div
                            data-pencil-name="Knob"
                            className="box-border w-[22px] h-[22px] absolute left-[23px] top-[3px] flex flex-col gap-0 justify-start items-start bg-[#FFFFFF] rounded-full [z-index:0]"
                          ></div>
                        </div>
                      </div>
                      <div
                        data-pencil-name="Reminder Item"
                        onClick={() => toast.success('设置已保存')}
                        className="box-border w-full h-[64px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-[12px] p-[0px_16px] justify-start items-center bg-[#FFFFFF] rounded-lg"
                      >
                        <div
                          data-pencil-name="Icon Box"
                          className="box-border w-[40px] shrink-0 h-[40px] flex flex-col gap-0 justify-center items-center bg-[#E0F2FE] rounded-lg"
                        >
                          <svg
                            data-pencil-name="Icon-bar-chart"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[24px] h-[24px] shrink-0 overflow-visible"
                          >
                            <path d="M18 20v-10m-6 10v-16m-6 16v-6" fill="none"></path>
                            <path
                              d="M18 20v-10m-6 10v-16m-6 16v-6"
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
                          data-pencil-name="Label"
                          className="box-border [flex:1_1_0] h-fit flex flex-col gap-[2px] justify-start items-start bg-[#00000000]"
                        >
                          <div
                            data-pencil-name="Text"
                            className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                          >
                            投票截止提醒
                          </div>
                          <div
                            data-pencil-name="Text"
                            className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                          >
                            30分钟前
                          </div>
                        </div>
                        <div
                          data-pencil-name="Switch"
                          className="box-border w-[48px] shrink-0 h-[28px] flex flex-col gap-0 justify-start items-start bg-[#0062FF] rounded-full relative"
                        >
                          <div
                            data-pencil-name="Knob"
                            className="box-border w-[22px] h-[22px] absolute left-[23px] top-[3px] flex flex-col gap-0 justify-start items-start bg-[#FFFFFF] rounded-full [z-index:0]"
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
    </PhoneFrame>
  );
}
