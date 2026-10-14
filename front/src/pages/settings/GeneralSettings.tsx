import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import { useNavigate } from 'react-router-dom';

export default function GeneralSettings() {
  const navigate = useNavigate();
  return (
    <PhoneFrame>
      <div
                data-pencil-name="Unified Header"
                className="box-border w-full h-[267.99px] shrink-0 flex flex-col gap-0 justify-start items-start [background-image:linear-gradient(-0.607deg,_#defcff_-5.014%,_#1986e6_101.05%,_#8acae5_48.018%)] bg-no-repeat bg-[length:100%_100%] rounded-[0px_0px_24px_24px]"
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
                    通用设置
                  </div>
                  <div
                    data-pencil-name="Decor Icon"
                    className="box-border w-[120px] h-[120px] opacity-[0.15] absolute left-[285px] top-[80px] flex flex-row gap-0 justify-center items-center [z-index:2]"
                  >
                    <svg
                      data-pencil-name="Icon-settings"
                      viewBox="0 0 24 24"
                      preserveAspectRatio="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="box-border w-[112px] shrink-0 h-[112px] overflow-visible"
                    >
                      <path
                        d="M10.325 4.317c0.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-0.94 3.31 0.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 0.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c0.94 1.543-0.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-0.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543 0.94-3.31-0.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-0.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-0.94-1.543 0.826-3.31 2.37-2.37 1 0.608 2.296 0.07 2.572-1.065m-1.325 7.683a3 3 0 1 0 6 0 3 3 0 0 0-6 0"
                        fill="none"
                      ></path>
                      <path
                        d="M10.325 4.317c0.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-0.94 3.31 0.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 0.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c0.94 1.543-0.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-0.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543 0.94-3.31-0.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-0.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-0.94-1.543 0.826-3.31 2.37-2.37 1 0.608 2.296 0.07 2.572-1.065m-1.325 7.683a3 3 0 1 0 6 0 3 3 0 0 0-6 0"
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
                  className="box-border w-full [flex:1_1_0] flex flex-col gap-6 p-[16px_20px_20px_20px] justify-start items-start"
                >
                  <div
                    data-pencil-name="Group 基础偏好"
                    className="box-border w-full h-fit shrink-0 flex flex-col gap-2 justify-start items-start"
                  >
                    <div
                      data-pencil-name="Group Title"
                      className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-semibold text-left [white-space:nowrap]"
                    >
                      基础偏好
                    </div>
                    <div
                      data-pencil-name="Rows"
                      className="box-border w-full h-fit shrink-0 flex flex-col gap-[4px] justify-start items-start"
                    >
                      <div
                        data-pencil-name="Row 语言"
                        className="box-border w-full h-[56px] shrink-0 flex flex-row gap-[12px] p-[0px_12px] justify-start items-center"
                      >
                        <div
                          data-pencil-name="Label"
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-medium text-left [white-space:nowrap]"
                        >
                          语言
                        </div>
                        <div
                          className="box-border [flex:1_1_0] h-0 flex flex-row gap-0 justify-start items-start"
                        ></div>
                        <div
                          data-pencil-name="Right"
                          className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center"
                        >
                          <div
                            data-pencil-name="Value"
                            className="text-[14px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                          >
                            简体中文
                          </div>
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
                        data-pencil-name="Row 深色模式"
                        className="box-border w-full h-[56px] shrink-0 flex flex-row gap-[12px] p-[0px_12px] justify-start items-center"
                      >
                        <div
                          data-pencil-name="Label"
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-medium text-left [white-space:nowrap]"
                        >
                          深色模式
                        </div>
                        <div
                          className="box-border [flex:1_1_0] h-0 flex flex-row gap-0 justify-start items-start"
                        ></div>
                        <div
                          data-pencil-name="Right"
                          className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center"
                        >
                          <div
                            data-pencil-name="Value"
                            className="text-[14px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                          >
                            跟随系统
                          </div>
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
                    </div>
                  </div>
                  <div
                    data-pencil-name="Group 存储管理"
                    className="box-border w-full h-fit shrink-0 flex flex-col gap-2 justify-start items-start"
                  >
                    <div
                      data-pencil-name="Group Title"
                      className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-semibold text-left [white-space:nowrap]"
                    >
                      存储管理
                    </div>
                    <div
                      data-pencil-name="Rows"
                      className="box-border w-full h-fit shrink-0 flex flex-col gap-[4px] justify-start items-start"
                    >
                      <div
                        data-pencil-name="Row 清除缓存"
                        className="box-border w-full h-[56px] shrink-0 flex flex-row gap-[12px] p-[0px_12px] justify-start items-center"
                      >
                        <div
                          data-pencil-name="Label"
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-medium text-left [white-space:nowrap]"
                        >
                          清除缓存
                        </div>
                        <div
                          className="box-border [flex:1_1_0] h-0 flex flex-row gap-0 justify-start items-start"
                        ></div>
                        <div
                          data-pencil-name="Right"
                          className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center"
                        >
                          <div
                            data-pencil-name="Value"
                            className="text-[14px]/[normal] box-border text-[#0062FF] font-body font-bold text-left [white-space:nowrap]"
                          >
                            12.5 MB
                          </div>
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
                    </div>
                  </div>
                  <div
                    data-pencil-name="Group 关于"
                    className="box-border w-full h-fit shrink-0 flex flex-col gap-2 justify-start items-start"
                  >
                    <div
                      data-pencil-name="Group Title"
                      className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-semibold text-left [white-space:nowrap]"
                    >
                      关于
                    </div>
                    <div
                      data-pencil-name="Rows"
                      className="box-border w-full h-fit shrink-0 flex flex-col gap-[4px] justify-start items-start"
                    >
                      <div
                        data-pencil-name="Row 关于"
                        onClick={() => navigate('/about')}
                        className="box-border w-full h-[56px] shrink-0 flex flex-row gap-[12px] p-[0px_12px] justify-start items-center"
                      >
                        <div
                          data-pencil-name="Label"
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-medium text-left [white-space:nowrap]"
                        >
                          关于
                        </div>
                        <div
                          className="box-border [flex:1_1_0] h-0 flex flex-row gap-0 justify-start items-start"
                        ></div>
                        <div
                          data-pencil-name="Right"
                          className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center"
                        >
                          <div
                            data-pencil-name="Value"
                            className="text-[14px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                          >
                            v1.0.0
                          </div>
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
                    </div>
                  </div>
                </div>
              </div>
    </PhoneFrame>
  );
}
