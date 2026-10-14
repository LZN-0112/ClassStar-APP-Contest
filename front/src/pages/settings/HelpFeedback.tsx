import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import { toast } from 'sonner';

export default function HelpFeedback() {

  return (
    <PhoneFrame>
      <div
                data-pencil-name="Unified Header"
                className="box-border w-full h-[267.99px] shrink-0 flex flex-col gap-0 justify-start items-start [background-image:linear-gradient(-1.028deg,_#defcff_-2.85%,_#076cab_104.575%,_#32c9fd_50.862%)] bg-no-repeat bg-[length:100%_100%] rounded-[0px_0px_24px_24px]"
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
                    帮助与反馈
                  </div>
                  <div
                    data-pencil-name="Decor Icon"
                    className="box-border w-[120px] h-[120px] opacity-[0.15] absolute left-[285px] top-[80px] flex flex-row gap-0 justify-center items-center [z-index:2]"
                  >
                    <svg
                      data-pencil-name="Icon-help-circle"
                      viewBox="0 0 24 24"
                      preserveAspectRatio="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="box-border w-[112px] shrink-0 h-[112px] overflow-visible"
                    >
                      <path
                        d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0m9 4v0.01m0-3.01a2 2 0 0 0 0.914-3.782 1.98 1.98 0 0 0-2.414 0.483"
                        fill="none"
                      ></path>
                      <path
                        d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0m9 4v0.01m0-3.01a2 2 0 0 0 0.914-3.782 1.98 1.98 0 0 0-2.414 0.483"
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
                    data-pencil-name="Help Entries"
                    className="box-border w-full h-fit shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-[4px] p-[12px] justify-start items-start bg-[#FFFFFF] rounded-lg"
                  >
                    <div
                      data-pencil-name="Row 常见问题"
                      className="box-border w-full h-[56px] shrink-0 flex flex-row gap-[12px] p-[0px_12px] justify-start items-center"
                    >
                      <div
                        data-pencil-name="Icon Container"
                        className="box-border w-[40px] shrink-0 h-[40px] flex flex-row gap-0 justify-center items-center bg-[#0062FF0D] rounded-lg"
                      >
                        <svg
                          data-pencil-name="Icon-help-circle"
                          viewBox="0 0 24 24"
                          preserveAspectRatio="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
                        >
                          <path
                            d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0m9 4v0.01m0-3.01a2 2 0 0 0 0.914-3.782 1.98 1.98 0 0 0-2.414 0.483"
                            fill="#00000000"
                          ></path>
                          <path
                            d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0m9 4v0.01m0-3.01a2 2 0 0 0 0.914-3.782 1.98 1.98 0 0 0-2.414 0.483"
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
                        className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-medium text-left [white-space:nowrap]"
                      >
                        常见问题
                      </div>
                      <div
                        className="box-border [flex:1_1_0] h-0 flex flex-row gap-0 justify-start items-start"
                      ></div>
                      <svg
                        data-pencil-name="Icon-chevron-right"
                        viewBox="0 0 24 24"
                        preserveAspectRatio="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
                      >
                        <path d="M9 18l6-6-6-6" fill="#00000000"></path>
                        <path
                          d="M9 18l6-6-6-6"
                          fill="none"
                          stroke="#4B5563"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                        ></path>
                      </svg>
                    </div>
                    <div
                      data-pencil-name="Row 使用教程"
                      className="box-border w-full h-[56px] shrink-0 flex flex-row gap-[12px] p-[0px_12px] justify-start items-center"
                    >
                      <div
                        data-pencil-name="Icon Container"
                        className="box-border w-[40px] shrink-0 h-[40px] flex flex-row gap-0 justify-center items-center bg-[#0062FF0D] rounded-lg"
                      >
                        <svg
                          data-pencil-name="Icon-book"
                          viewBox="0 0 24 24"
                          preserveAspectRatio="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
                        >
                          <path
                            d="M3 19a9 9 0 0 1 9 0 9 9 0 0 1 9 0m-18-13a9 9 0 0 1 9 0 9 9 0 0 1 9 0m-18 0v13m9-13v13m9-13v13"
                            fill="#00000000"
                          ></path>
                          <path
                            d="M3 19a9 9 0 0 1 9 0 9 9 0 0 1 9 0m-18-13a9 9 0 0 1 9 0 9 9 0 0 1 9 0m-18 0v13m9-13v13m9-13v13"
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
                        className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-medium text-left [white-space:nowrap]"
                      >
                        使用教程
                      </div>
                      <div
                        className="box-border [flex:1_1_0] h-0 flex flex-row gap-0 justify-start items-start"
                      ></div>
                      <svg
                        data-pencil-name="Icon-chevron-right"
                        viewBox="0 0 24 24"
                        preserveAspectRatio="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
                      >
                        <path d="M9 18l6-6-6-6" fill="#00000000"></path>
                        <path
                          d="M9 18l6-6-6-6"
                          fill="none"
                          stroke="#4B5563"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                        ></path>
                      </svg>
                    </div>
                    <div
                      data-pencil-name="Row 在线客服"
                      className="box-border w-full h-[56px] shrink-0 flex flex-row gap-[12px] p-[0px_12px] justify-start items-center"
                    >
                      <div
                        data-pencil-name="Icon Container"
                        className="box-border w-[40px] shrink-0 h-[40px] flex flex-row gap-0 justify-center items-center bg-[#0062FF0D] rounded-lg"
                      >
                        <svg
                          data-pencil-name="Icon-message-circle"
                          viewBox="0 0 24 24"
                          preserveAspectRatio="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
                        >
                          <path
                            d="M3 20l1.3-3.9c-2.324-3.437-1.426-7.872 2.1-10.374 3.526-2.501 8.59-2.296 11.845 0.48 3.255 2.777 3.695 7.266 1.029 10.501s-7.615 4.215-11.574 2.293z"
                            fill="#00000000"
                          ></path>
                          <path
                            d="M3 20l1.3-3.9c-2.324-3.437-1.426-7.872 2.1-10.374 3.526-2.501 8.59-2.296 11.845 0.48 3.255 2.777 3.695 7.266 1.029 10.501s-7.615 4.215-11.574 2.293z"
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
                        className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-medium text-left [white-space:nowrap]"
                      >
                        在线客服
                      </div>
                      <div
                        className="box-border [flex:1_1_0] h-0 flex flex-row gap-0 justify-start items-start"
                      ></div>
                      <svg
                        data-pencil-name="Icon-chevron-right"
                        viewBox="0 0 24 24"
                        preserveAspectRatio="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
                      >
                        <path d="M9 18l6-6-6-6" fill="#00000000"></path>
                        <path
                          d="M9 18l6-6-6-6"
                          fill="none"
                          stroke="#4B5563"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                        ></path>
                      </svg>
                    </div>
                  </div>
                  <div
                    data-pencil-name="Feedback Card"
                    className="box-border w-full h-[220px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-[10px] p-4 justify-start items-start bg-[#FFFFFF] rounded-lg"
                  >
                    <div
                      data-pencil-name="Card Title"
                      className="text-[16px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                    >
                      意见反馈
                    </div>
                    <div
                      data-pencil-name="Input Box"
                      className="box-border w-full [flex:1_1_0] flex flex-row gap-0 p-[12px] justify-start items-start bg-[#FFFFFF] [border:1px_solid_#E5E7EB] rounded-lg"
                    >
                      <div
                        data-pencil-name="Placeholder"
                        className="text-[14px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                      >
                        请输入您的意见或建议
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
                      <span onClick={() => toast.success('反馈已提交')}>提交</span>反馈
                    </div>
                  </div>
                </div>
              </div>
    </PhoneFrame>
  );
}
