import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import { toast } from 'sonner';

export default function ClassSettings() {

  return (
    <PhoneFrame>
      <div
                data-pencil-name="Unified Header"
                className="box-border w-full h-[267.987px] shrink-0 flex flex-col gap-0 justify-start items-start [background-image:linear-gradient(-0.447deg,_#defcff_-2.65%,_#011990_107.966%,_#009bf8_52.658%)] bg-no-repeat bg-[length:100%_100%] rounded-[0px_0px_24px_24px]"
              >
                <div
                  data-pencil-name="Status Bar"
                  className="box-border w-full h-[62px] shrink-0 flex flex-row gap-0 p-[12px_24px_0px_24px] justify-between items-center bg-[#00000000]"
                >
                  <div
                    data-pencil-name="Time"
                    className="text-[14px]/[normal] box-border text-[#FFFFFF] font-data font-semibold text-left [white-space:nowrap]"
                  >
                    9:41
                  </div>
                  <div
                    data-pencil-name="Status Icons"
                    className="box-border w-fit shrink-0 h-fit flex flex-row gap-[6px] justify-start items-center"
                  >
                    <div
                      data-pencil-name="Signal"
                      className="text-[14px]/[normal] box-border text-[#FFFFFF] font-caption font-normal text-left [white-space:nowrap]"
                    >
                      ◉◉◉◉
                    </div>
                    <div
                      data-pencil-name="Battery"
                      className="text-[14px]/[normal] box-border text-[#FFFFFF] font-data font-normal text-left [white-space:nowrap]"
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
                  <div
                    data-pencil-name="Nav"
                    className="box-border w-full h-[24px] shrink-0 flex flex-row gap-0 justify-start items-center relative [z-index:0]"
                  >
                    <div className="box-border w-[24px] shrink-0 h-[24px]"></div>
                  </div>
                  <div
                    data-pencil-name="Title"
                    className="text-[28px]/[normal] box-border text-[#FFFFFF] font-body font-bold text-left [white-space:nowrap] relative [z-index:1]"
                  >
                    班级设置
                  </div>
                  <svg
                    data-pencil-name="Icon-certificate"
                    viewBox="0 0 24 24"
                    preserveAspectRatio="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="box-border w-[120px] h-[120px] opacity-[0.15] absolute left-[260px] top-[50px] overflow-visible [z-index:2]"
                  >
                    <path
                      d="M12 15a3 3 0 1 0 6 0 3 3 0 1 0-6 0m1 2.5v4.5l2-1.5 2 1.5v-4.5m-7 1.5h-5a2 2 0 0 1-2-2v-10c0-1.1 0.9-2 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-1 1.73m-14-9.73h12m-12 3h3m-3 3h2"
                      fill="none"
                    ></path>
                    <path
                      d="M12 15a3 3 0 1 0 6 0 3 3 0 1 0-6 0m1 2.5v4.5l2-1.5 2 1.5v-4.5m-7 1.5h-5a2 2 0 0 1-2-2v-10c0-1.1 0.9-2 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-1 1.73m-14-9.73h12m-12 3h3m-3 3h2"
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
              <div
                data-pencil-name="Content"
                className="box-border w-full [flex:1_1_0] bg-[#FFFFFF] relative"
              >
                <div
                  data-pencil-name="GroupTitle"
                  className="box-border w-[345px] h-[16px] absolute left-[24px] top-[21.404px] [z-index:0]"
                >
                  <div
                    data-pencil-name="Text"
                    className="text-[11px]/[normal] box-border absolute left-0 top-0 text-[#4B5563] font-body font-semibold text-left [white-space:nowrap] [z-index:0]"
                  >
                    基础信息
                  </div>
                </div>
                <div
                  data-pencil-name="BasicInfo"
                  className="box-border w-[350px] h-fit [box-shadow:0px_2px_8px_0px_#0000000D] absolute left-[24px] top-[48.576px] flex flex-row gap-0 justify-start items-start bg-[#FFFFFF] rounded-lg [z-index:1]"
                >
                  <div
                    data-pencil-name="Bar"
                    className="box-border w-[4px] shrink-0 h-full flex flex-row gap-0 justify-start items-start bg-[#0062FF]"
                  ></div>
                  <div
                    data-pencil-name="Rows"
                    className="box-border w-[355.854px] shrink-0 h-fit flex flex-col gap-[4px] p-[12px] justify-start items-start"
                  >
                    <div
                      data-pencil-name="班级名称"
                      className="box-border w-full h-[52px] shrink-0 flex flex-row gap-[12px] justify-start items-center"
                    >
                      <div
                        data-pencil-name="IconBox"
                        className="box-border w-[32px] shrink-0 h-[32px] flex flex-row gap-0 justify-center items-center bg-[#0062FF1A] rounded-lg"
                      >
                        <svg
                          data-pencil-name="users"
                          viewBox="0 0 24 24"
                          preserveAspectRatio="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="box-border w-[20px] shrink-0 h-[20px] overflow-visible"
                        >
                          <path
                            d="M5 7a4 4 0 1 0 8 0 4 4 0 1 0-8 0m-2 14v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2m1-17.87a4 4 0 0 1 0 7.75m5 10.12v-2a4 4 0 0 0-3-3.85"
                            fill="none"
                          ></path>
                          <path
                            d="M5 7a4 4 0 1 0 8 0 4 4 0 1 0-8 0m-2 14v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2m1-17.87a4 4 0 0 1 0 7.75m5 10.12v-2a4 4 0 0 0-3-3.85"
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
                        data-pencil-name="Text"
                        className="box-border [flex:1_1_0] h-fit flex flex-col gap-[2px] justify-center items-start"
                      >
                        <div
                          data-pencil-name="Title"
                          className="text-[16px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                        >
                          班级名称
                        </div>
                        <div
                          data-pencil-name="Subtitle"
                          className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap]"
                        ></div>
                      </div>
                      <div
                        data-pencil-name="Summary"
                        className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap]"
                      >
                        计算机科学与技术1班
                      </div>
                    </div>
                    <div
                      data-pencil-name="班级公告"
                      className="box-border w-full h-[52px] shrink-0 flex flex-row gap-[12px] justify-start items-center"
                    >
                      <div
                        data-pencil-name="IconBox"
                        className="box-border w-[32px] shrink-0 h-[32px] flex flex-row gap-0 justify-center items-center bg-[#0062FF1A] rounded-lg"
                      >
                        <svg
                          data-pencil-name="bell"
                          viewBox="0 0 24 24"
                          preserveAspectRatio="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="box-border w-[20px] shrink-0 h-[20px] overflow-visible"
                        >
                          <path
                            d="M10 5a2 2 0 1 1 4 0 7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2-3v-3a7 7 0 0 1 4-6m-1 12v1a3 3 0 0 0 6 0v-1"
                            fill="none"
                          ></path>
                          <path
                            d="M10 5a2 2 0 1 1 4 0 7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2-3v-3a7 7 0 0 1 4-6m-1 12v1a3 3 0 0 0 6 0v-1"
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
                        data-pencil-name="Text"
                        className="box-border w-[171.85px] shrink-0 h-fit flex flex-col gap-[2px] justify-center items-start"
                      >
                        <div
                          data-pencil-name="Title"
                          className="text-[16px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                        >
                          班级公告
                        </div>
                        <div
                          data-pencil-name="Subtitle"
                          className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap]"
                        ></div>
                      </div>
                      <div
                        data-pencil-name="Summary"
                        className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap]"
                      >
                        本周五班会
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  data-pencil-name="GroupTitle"
                  className="box-border w-[345px] h-[16px] absolute left-0 top-[148px] flex flex-row gap-0 justify-start items-start [z-index:2]"
                ></div>
                <div
                  data-pencil-name="Permission"
                  className="box-border w-[350px] h-fit [box-shadow:0px_2px_8px_0px_#0000000D] absolute left-[24px] top-[223.159px] flex flex-row gap-0 justify-start items-start bg-[#FFFFFF] rounded-lg [z-index:3]"
                >
                  <div
                    data-pencil-name="Bar"
                    className="box-border w-[4px] shrink-0 h-full flex flex-row gap-0 justify-start items-start bg-[#0062FF]"
                  ></div>
                  <div
                    data-pencil-name="Rows"
                    className="box-border [flex:1_1_0] h-fit flex flex-col gap-[4px] p-[12px] justify-start items-start"
                  >
                    <div
                      data-pencil-name="入班审核"
                      className="box-border w-full h-[52px] shrink-0 flex flex-row gap-[12px] justify-start items-center"
                    >
                      <div
                        data-pencil-name="IconBox"
                        className="box-border w-[32px] shrink-0 h-[32px] flex flex-row gap-0 justify-center items-center bg-[#0062FF1A] rounded-lg"
                      >
                        <svg
                          data-pencil-name="user-check"
                          viewBox="0 0 24 24"
                          preserveAspectRatio="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="box-border w-[20px] shrink-0 h-[20px] overflow-visible"
                        >
                          <path
                            d="M8 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0m-2 14v-2a4 4 0 0 1 4-4h4m1 4l2 2 4-4"
                            fill="none"
                          ></path>
                          <path
                            d="M8 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0m-2 14v-2a4 4 0 0 1 4-4h4m1 4l2 2 4-4"
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
                        data-pencil-name="Text"
                        className="box-border [flex:1_1_0] h-fit flex flex-col gap-[2px] justify-center items-start"
                      >
                        <div
                          data-pencil-name="Title"
                          className="text-[16px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                        >
                          入班审核
                        </div>
                        <div
                          data-pencil-name="Subtitle"
                          className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap]"
                        >
                          开启后需班委同意
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  data-pencil-name="GroupTitle"
                  className="box-border w-[345px] h-[16px] absolute left-[29.695px] top-[257.322px] flex flex-row gap-0 justify-start items-start [z-index:4]"
                ></div>
                <div
                  data-pencil-name="DangerCard"
                  className="box-border w-[345px] h-[56px] absolute left-[24px] top-[338.504px] flex flex-row gap-[12px] p-[0px_16px] justify-start items-center bg-[#FEF2F2] rounded-lg [z-index:5]"
                >
                  <div
                    data-pencil-name="IconBox"
                    className="box-border w-[32px] shrink-0 h-[32px] flex flex-row gap-0 justify-center items-center bg-[#FEE2E2] rounded-lg"
                  >
                    <svg
                      data-pencil-name="trash"
                      viewBox="0 0 24 24"
                      preserveAspectRatio="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="box-border w-[20px] shrink-0 h-[20px] overflow-visible"
                    >
                      <path
                        d="M4 7h16m-10 4v6m4-6v6m-9-10l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12m-10 0v-3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"
                        fill="none"
                      ></path>
                      <path
                        d="M4 7h16m-10 4v6m4-6v6m-9-10l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12m-10 0v-3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"
                        fill="none"
                        stroke="#B91C1C"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      ></path>
                    </svg>
                  </div>
                  <div
                    data-pencil-name="Text"
                    className="box-border [flex:1_1_0] h-fit flex flex-col gap-[2px] justify-center items-start"
                  >
                    <div
                      data-pencil-name="Title"
                      className="text-[16px]/[normal] box-border text-[#B91C1C] font-body font-semibold text-left [white-space:nowrap]"
                    >
                      解散班级
                    </div>
                    <div
                      data-pencil-name="Subtitle"
                      className="text-[11px]/[normal] box-border text-[#B91C1C] font-body font-normal text-left [white-space:nowrap]"
                    >
                      操作不可恢复
                    </div>
                  </div>
                </div>
                <div
                  data-pencil-name="保存设置"
                  className="box-border w-[345px] h-[52px] [box-shadow:0px_4px_16px_0px_#0062FF33] absolute left-[24px] top-[414.12px] flex flex-col gap-0 justify-center items-center [background-image:linear-gradient(-98.571deg,_#0062FF_14.645%,_#3B82F6_85.355%)] bg-no-repeat bg-[length:100%_100%] rounded-lg [z-index:6]"
                >
                  <div
                    data-pencil-name="Label"
                    className="text-[16px]/[normal] box-border text-[#FFFFFF] font-body font-semibold text-left [white-space:nowrap]"
                  >
                    <span onClick={() => toast.success('设置已保存')}>保存</span>设置
                  </div>
                </div>
                <div
                  data-pencil-name="Text"
                  className="text-[11px]/[normal] box-border absolute left-[24px] top-[310.984px] text-[#4B5563] font-body font-semibold text-left [white-space:nowrap] [z-index:7]"
                >
                  危险操作
                </div>
                <div
                  data-pencil-name="Text"
                  className="text-[11px]/[normal] box-border absolute left-[24px] top-[192.333px] text-[#4B5563] font-body font-semibold text-left [white-space:nowrap] [z-index:8]"
                >
                  权限管理
                </div>
              </div>
    </PhoneFrame>
  );
}
