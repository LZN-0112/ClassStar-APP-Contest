import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import { toast } from 'sonner';

export default function PrivacySettings() {

  return (
    <PhoneFrame>
      <div
                data-pencil-name="Unified Header"
                className="box-border w-full h-[267.99px] shrink-0 flex flex-col gap-0 justify-start items-start [background-image:linear-gradient(180deg,_#5A7D9A_0%,_#B9C9D9_100%)] bg-no-repeat bg-[length:100%_100%] rounded-[0px_0px_24px_24px]"
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
                    data-pencil-name="Top Row"
                    className="box-border w-full h-[24px] shrink-0 flex flex-row gap-0 justify-between items-center relative [z-index:0]"
                  >

                    <div
                      className="box-border w-[24px] shrink-0 h-[24px] flex flex-row gap-0 justify-start items-start"
                    ></div>
                  </div>
                  <div
                    data-pencil-name="Title"
                    className="text-[28px]/[normal] box-border text-[#FFFFFF] font-heading font-bold text-left [white-space:nowrap] relative [z-index:1]"
                  >
                    隐私设置
                  </div>
                  <div
                    data-pencil-name="Decor Icon"
                    className="box-border w-[120px] h-[120px] opacity-[0.15] absolute left-[285px] top-[80px] flex flex-row gap-0 justify-center items-center [z-index:2]"
                  >
                    <svg
                      data-pencil-name="Icon-lock"
                      viewBox="0 0 24 24"
                      preserveAspectRatio="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="box-border w-[112px] shrink-0 h-[112px] overflow-visible"
                    >
                      <path
                        d="M5 13a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2z m6 3a1 1 0 1 0 2 0 1 1 0 0 0-2 0m-3-5v-4a4 4 0 1 1 8 0v4"
                        fill="none"
                      ></path>
                      <path
                        d="M5 13a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2z m6 3a1 1 0 1 0 2 0 1 1 0 0 0-2 0m-3-5v-4a4 4 0 1 1 8 0v4"
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
                className="box-border w-full [flex:1_1_0] flex flex-col gap-0 justify-start items-start bg-[#FFFFFF]"
              >
                <div
                  data-pencil-name="Body"
                  className="box-border w-full [flex:1_1_0] flex flex-col gap-4 p-[16px_20px_20px_20px] justify-start items-start"
                >
                  <div
                    data-pencil-name="Card"
                    className="box-border w-full h-fit shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-[4px] p-[12px] justify-start items-start bg-[#FFFFFF] rounded-lg"
                  >
                    <div
                      data-pencil-name="Row 班级信息可见"
                      onClick={() => toast.success('设置已保存')}
                      className="box-border w-full h-[72px] shrink-0 flex flex-row gap-[12px] p-[0px_12px] justify-start items-center"
                    >
                      <div
                        data-pencil-name="Icon Container"
                        className="box-border w-[40px] shrink-0 h-[40px] flex flex-row gap-0 justify-center items-center bg-[#0062FF0D] rounded-lg"
                      >
                        <svg
                          data-pencil-name="Icon-eye"
                          viewBox="0 0 24 24"
                          preserveAspectRatio="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
                        >
                          <path
                            d="M10 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0m11 0q-3.6 6-9 6t-9-6q3.6-6 9-6t9 6"
                            fill="#00000000"
                          ></path>
                          <path
                            d="M10 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0m11 0q-3.6 6-9 6t-9-6q3.6-6 9-6t9 6"
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
                        className="box-border [flex:1_1_0] h-full flex flex-col gap-[4px] justify-center items-start"
                      >
                        <div
                          data-pencil-name="Title"
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                        >
                          班级信息可见
                        </div>
                        <div
                          data-pencil-name="Subtitle"
                          className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                        >
                          控制个人资料展示范围
                        </div>
                      </div>
                      <div
                        data-pencil-name="Right"
                        className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center"
                      >
                        <div
                          data-pencil-name="Tag 同班可见"
                          className="box-border w-fit shrink-0 h-[26px] flex flex-row gap-0 p-[0px_10px] justify-center items-center bg-[#DBEAFE] rounded-full"
                        >
                          <div
                            data-pencil-name="Text"
                            className="text-[11px]/[normal] box-border text-[#1E3A8A] font-body font-semibold text-left [white-space:nowrap]"
                          >
                            同班可见
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      data-pencil-name="Row 联系方式可见"
                      onClick={() => toast.success('设置已保存')}
                      className="box-border w-full h-[72px] shrink-0 flex flex-row gap-[12px] p-[0px_12px] justify-start items-center"
                    >
                      <div
                        data-pencil-name="Icon Container"
                        className="box-border w-[40px] shrink-0 h-[40px] flex flex-row gap-0 justify-center items-center bg-[#0062FF0D] rounded-lg"
                      >
                        <svg
                          data-pencil-name="Icon-phone"
                          viewBox="0 0 24 24"
                          preserveAspectRatio="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
                        >
                          <path
                            d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5l1.5-2.5 5 2v4a2 2 0 0 1-2 2 16 16 0 0 1-15-15 2 2 0 0 1 2-2"
                            fill="#00000000"
                          ></path>
                          <path
                            d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5l1.5-2.5 5 2v4a2 2 0 0 1-2 2 16 16 0 0 1-15-15 2 2 0 0 1 2-2"
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
                        className="box-border [flex:1_1_0] h-full flex flex-col gap-[4px] justify-center items-start"
                      >
                        <div
                          data-pencil-name="Title"
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                        >
                          联系方式可见
                        </div>
                        <div
                          data-pencil-name="Subtitle"
                          className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                        >
                          控制手机号展示范围
                        </div>
                      </div>
                      <div
                        data-pencil-name="Right"
                        className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center"
                      >
                        <div
                          data-pencil-name="Tag 仅班委可见"
                          className="box-border w-fit shrink-0 h-[26px] flex flex-row gap-0 p-[0px_10px] justify-center items-center bg-[#93C5FD] rounded-full"
                        >
                          <div
                            data-pencil-name="Text"
                            className="text-[11px]/[normal] box-border text-[#1E40AF] font-body font-semibold text-left [white-space:nowrap]"
                          >
                            仅班委可见
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      data-pencil-name="Row 考勤记录可见"
                      onClick={() => toast.success('设置已保存')}
                      className="box-border w-full h-[72px] shrink-0 flex flex-row gap-[12px] p-[0px_12px] justify-start items-center"
                    >
                      <div
                        data-pencil-name="Icon Container"
                        className="box-border w-[40px] shrink-0 h-[40px] flex flex-row gap-0 justify-center items-center bg-[#0062FF0D] rounded-lg"
                      >
                        <svg
                          data-pencil-name="Icon-calendar-check"
                          viewBox="0 0 24 24"
                          preserveAspectRatio="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
                        >
                          <path
                            d="M11.5 21h-5.5a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6m-4-10v4m-8-4v4m-4 4h16m-5 8l2 2 4-4"
                            fill="#00000000"
                          ></path>
                          <path
                            d="M11.5 21h-5.5a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6m-4-10v4m-8-4v4m-4 4h16m-5 8l2 2 4-4"
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
                        className="box-border [flex:1_1_0] h-full flex flex-col gap-[4px] justify-center items-start"
                      >
                        <div
                          data-pencil-name="Title"
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                        >
                          考勤记录可见
                        </div>
                        <div
                          data-pencil-name="Subtitle"
                          className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                        >
                          控制考勤数据展示范围
                        </div>
                      </div>
                      <div
                        data-pencil-name="Right"
                        className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center"
                      >
                        <div
                          data-pencil-name="Tag 仅自己可见"
                          className="box-border w-fit shrink-0 h-[26px] flex flex-row gap-0 p-[0px_10px] justify-center items-center bg-[#60A5FA] rounded-full"
                        >
                          <div
                            data-pencil-name="Text"
                            className="text-[11px]/[normal] box-border text-[#FFFFFF] font-body font-semibold text-left [white-space:nowrap]"
                          >
                            仅自己可见
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    data-pencil-name="Primary Button"
                    className="box-border w-full h-[52px] shrink-0 [box-shadow:0px_6px_20px_0px_#0062FF33] flex flex-col gap-0 justify-center items-center [background-image:linear-gradient(180deg,_#0062FF_0%,_#3B82F6_100%)] bg-no-repeat bg-[length:100%_100%] rounded-lg"
                  >
                    <div
                      data-pencil-name="Label"
                      className="text-[16px]/[normal] box-border text-[#FFFFFF] font-body font-semibold text-left [white-space:nowrap]"
                    >
                      <span onClick={() => toast.success('设置已保存')}>保存</span>
                    </div>
                  </div>
                </div>
              </div>
    </PhoneFrame>
  );
}
