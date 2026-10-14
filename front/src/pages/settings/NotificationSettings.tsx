import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import { useNavigate } from 'react-router-dom';

export default function NotificationSettings() {
  const navigate = useNavigate();
  return (
    <PhoneFrame>
      <div
                data-pencil-name="Unified Header"
                className="box-border w-full h-[267.99px] shrink-0 flex flex-col gap-0 justify-start items-start [background-image:linear-gradient(179.715deg,_#8CB9FF_0.362%,_#F0E6FF_105.01%,_#bed0ff_52.686%)] bg-no-repeat bg-[length:100%_100%] rounded-[0px_0px_24px_24px]"
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
                    消息通知设置
                  </div>
                  <div
                    data-pencil-name="Decor Icon"
                    className="box-border w-[120px] h-[120px] opacity-[0.15] absolute left-[285px] top-[80px] flex flex-row gap-0 justify-center items-center [z-index:2]"
                  >
                    <svg
                      data-pencil-name="Icon-bell"
                      viewBox="0 0 24 24"
                      preserveAspectRatio="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="box-border w-[112px] shrink-0 h-[112px] overflow-visible"
                    >
                      <path
                        d="M10 5a2 2 0 1 1 4 0 7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2-3v-3a7 7 0 0 1 4-6m-1 12v1a3 3 0 0 0 6 0v-1"
                        fill="none"
                      ></path>
                      <path
                        d="M10 5a2 2 0 1 1 4 0 7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2-3v-3a7 7 0 0 1 4-6m-1 12v1a3 3 0 0 0 6 0v-1"
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
                      data-pencil-name="Row 班级通知"
                      onClick={() => navigate('/reminder-settings')}
                      className="box-border w-full h-[72px] shrink-0 flex flex-row gap-[12px] p-[0px_12px] justify-start items-center"
                    >
                      <div
                        data-pencil-name="Icon Container"
                        className="box-border w-[40px] shrink-0 h-[40px] flex flex-row gap-0 justify-center items-center bg-[#0062FF0D] rounded-lg"
                      >
                        <svg
                          data-pencil-name="Icon-bell"
                          viewBox="0 0 24 24"
                          preserveAspectRatio="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
                        >
                          <path
                            d="M10 5a2 2 0 1 1 4 0 7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2-3v-3a7 7 0 0 1 4-6m-1 12v1a3 3 0 0 0 6 0v-1"
                            fill="#00000000"
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
                        className="box-border [flex:1_1_0] h-full flex flex-col gap-[4px] justify-center items-start"
                      >
                        <div
                          data-pencil-name="Title"
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                        >
                          班级通知
                        </div>
                        <div
                          data-pencil-name="Subtitle"
                          className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                        >
                          接收班级通知
                        </div>
                      </div>
                      <div
                        data-pencil-name="Right"
                        className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center"
                      >
                        <div
                          data-pencil-name="Switch On"
                          className="box-border w-[48px] shrink-0 h-[28px] flex flex-row gap-0 justify-start items-start bg-[#0062FF] rounded-full relative"
                        >
                          <div
                            data-pencil-name="Knob"
                            className="box-border w-[20px] h-[20px] [box-shadow:0px_1px_3px_0px_#0000001A] absolute left-[26px] top-[4px] flex flex-row gap-0 justify-start items-start bg-[#FFFFFF] rounded-full [z-index:0]"
                          ></div>
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
                      data-pencil-name="Row 作业提醒"
                      onClick={() => navigate('/reminder-settings')}
                      className="box-border w-full h-[72px] shrink-0 flex flex-row gap-[12px] p-[0px_12px] justify-start items-center"
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
                        data-pencil-name="Text"
                        className="box-border [flex:1_1_0] h-full flex flex-col gap-[4px] justify-center items-start"
                      >
                        <div
                          data-pencil-name="Title"
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                        >
                          作业提醒
                        </div>
                        <div
                          data-pencil-name="Subtitle"
                          className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                        >
                          截止前提醒
                        </div>
                      </div>
                      <div
                        data-pencil-name="Right"
                        className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center"
                      >
                        <div
                          data-pencil-name="Switch On"
                          className="box-border w-[48px] shrink-0 h-[28px] flex flex-row gap-0 justify-start items-start bg-[#0062FF] rounded-full relative"
                        >
                          <div
                            data-pencil-name="Knob"
                            className="box-border w-[20px] h-[20px] [box-shadow:0px_1px_3px_0px_#0000001A] absolute left-[26px] top-[4px] flex flex-row gap-0 justify-start items-start bg-[#FFFFFF] rounded-full [z-index:0]"
                          ></div>
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
                      data-pencil-name="Row 考勤提醒"
                      onClick={() => navigate('/reminder-settings')}
                      className="box-border w-full h-[72px] shrink-0 flex flex-row gap-[12px] p-[0px_12px] justify-start items-center"
                    >
                      <div
                        data-pencil-name="Icon Container"
                        className="box-border w-[40px] shrink-0 h-[40px] flex flex-row gap-0 justify-center items-center bg-[#0062FF0D] rounded-lg"
                      >
                        <svg
                          data-pencil-name="Icon-clock-check"
                          viewBox="0 0 24 24"
                          preserveAspectRatio="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
                        >
                          <path
                            d="M20.942 13.021a9 9 0 1 0-9.407 7.967m0.465-13.988v5l3 3m0 4l2 2 4-4"
                            fill="#00000000"
                          ></path>
                          <path
                            d="M20.942 13.021a9 9 0 1 0-9.407 7.967m0.465-13.988v5l3 3m0 4l2 2 4-4"
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
                          考勤提醒
                        </div>
                        <div
                          data-pencil-name="Subtitle"
                          className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                        >
                          签到开始前提醒
                        </div>
                      </div>
                      <div
                        data-pencil-name="Right"
                        className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center"
                      >
                        <div
                          data-pencil-name="Switch On"
                          className="box-border w-[48px] shrink-0 h-[28px] flex flex-row gap-0 justify-start items-start bg-[#0062FF] rounded-full relative"
                        >
                          <div
                            data-pencil-name="Knob"
                            className="box-border w-[20px] h-[20px] [box-shadow:0px_1px_3px_0px_#0000001A] absolute left-[26px] top-[4px] flex flex-row gap-0 justify-start items-start bg-[#FFFFFF] rounded-full [z-index:0]"
                          ></div>
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
                      data-pencil-name="Row 活动提醒"
                      onClick={() => navigate('/reminder-settings')}
                      className="box-border w-full h-[72px] shrink-0 flex flex-row gap-[12px] p-[0px_12px] justify-start items-center"
                    >
                      <div
                        data-pencil-name="Icon Container"
                        className="box-border w-[40px] shrink-0 h-[40px] flex flex-row gap-0 justify-center items-center bg-[#0062FF0D] rounded-lg"
                      >
                        <svg
                          data-pencil-name="Icon-flag"
                          viewBox="0 0 24 24"
                          preserveAspectRatio="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
                        >
                          <path
                            d="M5 5a5 5 0 0 1 7 0 5 5 0 0 0 7 0v9a5 5 0 0 1-7 0 5 5 0 0 0-7 0z m0 16v-7"
                            fill="#00000000"
                          ></path>
                          <path
                            d="M5 5a5 5 0 0 1 7 0 5 5 0 0 0 7 0v9a5 5 0 0 1-7 0 5 5 0 0 0-7 0z m0 16v-7"
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
                          活动提醒
                        </div>
                        <div
                          data-pencil-name="Subtitle"
                          className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                        >
                          报名截止提醒
                        </div>
                      </div>
                      <div
                        data-pencil-name="Right"
                        className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center"
                      >
                        <div
                          data-pencil-name="Switch Off"
                          className="box-border w-[48px] shrink-0 h-[28px] flex flex-row gap-0 justify-start items-start bg-[#E5E7EB] rounded-full relative"
                        >
                          <div
                            data-pencil-name="Knob"
                            className="box-border w-[20px] h-[20px] [box-shadow:0px_1px_3px_0px_#0000001A] absolute left-[2px] top-[4px] flex flex-row gap-0 justify-start items-start bg-[#FFFFFF] rounded-full [z-index:0]"
                          ></div>
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
                      data-pencil-name="Row 系统消息"
                      onClick={() => navigate('/reminder-settings')}
                      className="box-border w-full h-[72px] shrink-0 flex flex-row gap-[12px] p-[0px_12px] justify-start items-center"
                    >
                      <div
                        data-pencil-name="Icon Container"
                        className="box-border w-[40px] shrink-0 h-[40px] flex flex-row gap-0 justify-center items-center bg-[#0062FF0D] rounded-lg"
                      >
                        <svg
                          data-pencil-name="Icon-settings"
                          viewBox="0 0 24 24"
                          preserveAspectRatio="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
                        >
                          <path
                            d="M10.325 4.317c0.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-0.94 3.31 0.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 0.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c0.94 1.543-0.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-0.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543 0.94-3.31-0.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-0.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-0.94-1.543 0.826-3.31 2.37-2.37 1 0.608 2.296 0.07 2.572-1.065m-1.325 7.683a3 3 0 1 0 6 0 3 3 0 0 0-6 0"
                            fill="#00000000"
                          ></path>
                          <path
                            d="M10.325 4.317c0.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-0.94 3.31 0.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 0.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c0.94 1.543-0.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-0.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543 0.94-3.31-0.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-0.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-0.94-1.543 0.826-3.31 2.37-2.37 1 0.608 2.296 0.07 2.572-1.065m-1.325 7.683a3 3 0 1 0 6 0 3 3 0 0 0-6 0"
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
                          系统消息
                        </div>
                        <div
                          data-pencil-name="Subtitle"
                          className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                        >
                          版本更新与公告
                        </div>
                      </div>
                      <div
                        data-pencil-name="Right"
                        className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center"
                      >
                        <div
                          data-pencil-name="Switch On"
                          className="box-border w-[48px] shrink-0 h-[28px] flex flex-row gap-0 justify-start items-start bg-[#0062FF] rounded-full relative"
                        >
                          <div
                            data-pencil-name="Knob"
                            className="box-border w-[20px] h-[20px] [box-shadow:0px_1px_3px_0px_#0000001A] absolute left-[26px] top-[4px] flex flex-row gap-0 justify-start items-start bg-[#FFFFFF] rounded-full [z-index:0]"
                          ></div>
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
    </PhoneFrame>
  );
}
