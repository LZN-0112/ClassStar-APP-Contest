import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import { toast } from 'sonner';

export default function DownloadStats() {

  return (
    <PhoneFrame>
      <div
                data-pencil-name="Unified Header"
                className="box-border w-full h-[267.99px] shrink-0 flex flex-col gap-0 justify-start items-start [background-image:linear-gradient(-140.233deg,_#6B8CB0_12.918%,_#AFCBE6_88.664%)] bg-no-repeat bg-[length:100%_100%] rounded-[0px_0px_24px_24px]"
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
                      data-pencil-name="Sort Buttons"
                      className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center"
                    >
                      <div
                        data-pencil-name="Sort Active"
                        className="box-border w-fit shrink-0 h-[28px] flex flex-row gap-0 p-[0px_10px] justify-center items-center bg-[#FFFFFF22] rounded-full"
                      >
                        <div
                          data-pencil-name="Text"
                          className="text-[11px]/[normal] box-border text-[#FFFFFF] font-body font-semibold text-left [white-space:nowrap]"
                        >
                          按下载量
                        </div>
                      </div>
                      <div
                        data-pencil-name="Sort Normal"
                        className="box-border w-fit shrink-0 h-[28px] flex flex-row gap-0 p-[0px_10px] justify-start items-start"
                      >
                        <div
                          data-pencil-name="Text"
                          className="text-[11px]/[normal] box-border text-[#FFFFFFAA] font-body font-medium text-left [white-space:nowrap]"
                        >
                          按时间
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    data-pencil-name="Title"
                    className="text-[28px]/[normal] box-border text-[#FFFFFF] font-heading font-bold text-left [white-space:nowrap] relative [z-index:1]"
                  >
                    下载统计
                  </div>
                  <div
                    data-pencil-name="Decor Icon"
                    className="box-border w-[120px] h-[120px] opacity-[0.15] absolute left-[285px] top-[80px] flex flex-row gap-0 justify-center items-center [z-index:2]"
                  >
                    <svg
                      data-pencil-name="Icon-chart-bar"
                      viewBox="0 0 24 24"
                      preserveAspectRatio="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="box-border w-[112px] shrink-0 h-[112px] overflow-visible"
                    >
                      <path
                        d="M3 13a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z m12-4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z m-6-4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z m-5 15h14"
                        fill="none"
                      ></path>
                      <path
                        d="M3 13a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z m12-4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z m-6-4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z m-5 15h14"
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
                <div data-pencil-name="Body" className="box-border w-full [flex:1_1_0] relative">
                  <div
                    data-pencil-name="Stats Card"
                    className="box-border w-[345px] h-fit [box-shadow:0px_4px_16px_0px_#0000000D] absolute left-[20px] top-[16px] flex flex-col gap-[10px] p-[14px] justify-start items-start bg-[#FFFFFF] rounded-lg [z-index:0]"
                  >
                    <div
                      data-pencil-name="File Item 高数资料.pdf"
                      className="box-border w-full h-[88px] shrink-0 [box-shadow:0px_4px_16px_0px_#0000000D] bg-[#FFFFFF] rounded-lg relative"
                    >
                      <div
                        data-pencil-name="Icon Container"
                        className="box-border w-[46px] h-[46px] absolute left-[14px] top-[21px] flex flex-row gap-0 justify-center items-center bg-[#0062FF0D] rounded-lg [z-index:0]"
                      >
                        <svg
                          data-pencil-name="Icon-file-type-pdf"
                          viewBox="0 0 24 24"
                          preserveAspectRatio="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
                        >
                          <path
                            d="M14 3v4a1 1 0 0 0 1 1h4m-14 4v-7a2 2 0 0 1 2-2h7l5 5v4m-14 6h1.5a1.5 1.5 0 0 0 0-3h-1.5v6m12-3h2m1-3h-3v6m-6-6v6h1a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2z"
                            fill="#00000000"
                          ></path>
                          <path
                            d="M14 3v4a1 1 0 0 0 1 1h4m-14 4v-7a2 2 0 0 1 2-2h7l5 5v4m-14 6h1.5a1.5 1.5 0 0 0 0-3h-1.5v6m12-3h2m1-3h-3v6m-6-6v6h1a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2z"
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
                        className="box-border w-[104.772px] h-[88px] absolute left-[72px] top-0 flex flex-col gap-[4px] justify-center items-start [z-index:1]"
                      >
                        <div
                          data-pencil-name="File Name"
                          className="text-[16px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                        >
                          高数资料.pdf
                        </div>
                        <div
                          data-pencil-name="Meta"
                          className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                        >
                          PDF · 2.3 MB
                        </div>
                      </div>
                      <div
                        data-pencil-name="Stats"
                        className="box-border w-[115px] h-[28px] absolute left-[189.35px] top-[35.594px] flex flex-col gap-[6px] justify-start items-end [z-index:2]"
                      >
                        <div
                          data-pencil-name="Progress Track"
                          className="box-border w-full h-[8px] shrink-0 flex flex-row gap-0 justify-start items-start bg-[#0062FF0D] rounded-full"
                        >
                          <div
                            data-pencil-name="Progress Fill"
                            className="box-border w-[120px] shrink-0 h-[8px] flex flex-row gap-0 justify-start items-start [background-image:linear-gradient(180deg,_#0062FF_0%,_#3B82F6_100%)] bg-no-repeat bg-[length:100%_100%] rounded-full"
                          ></div>
                        </div>
                        <div
                          data-pencil-name="Count Row"
                          className="box-border w-fit h-fit shrink-0 flex flex-row gap-[4px] justify-start items-center"
                        >
                          <div
                            data-pencil-name="Count"
                            className="text-[14px]/[normal] box-border text-[#0062FF] font-body font-bold text-left [white-space:nowrap]"
                          >
                            128
                          </div>
                          <svg
                            data-pencil-name="Icon-trending-up"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[16px] shrink-0 h-[16px] overflow-visible"
                          >
                            <path d="M3 17l6-6 4 4 8-8m-7 0h7v7" fill="#00000000"></path>
                            <path
                              d="M3 17l6-6 4 4 8-8m-7 0h7v7"
                              fill="none"
                              stroke="#0062FF"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            ></path>
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div
                      data-pencil-name="File Item 班会PPT.pptx"
                      className="box-border w-full h-[88px] shrink-0 [box-shadow:0px_4px_16px_0px_#0000000D] bg-[#FFFFFF] rounded-lg relative"
                    >
                      <div
                        data-pencil-name="Icon Container"
                        className="box-border w-[46px] h-[46px] absolute left-[14px] top-[21px] flex flex-row gap-0 justify-center items-center bg-[#0062FF0D] rounded-lg [z-index:0]"
                      >
                        <svg
                          data-pencil-name="Icon-file-type-ppt"
                          viewBox="0 0 24 24"
                          preserveAspectRatio="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
                        >
                          <path
                            d="M14 3v4a1 1 0 0 0 1 1h4m-14 10h1.5a1.5 1.5 0 0 0 0-3h-1.5v6m6-3h1.5a1.5 1.5 0 0 0 0-3h-1.5v6m5.5-6h3m-1.5 0v6m-13-9v-7a2 2 0 0 1 2-2h7l5 5v4"
                            fill="#00000000"
                          ></path>
                          <path
                            d="M14 3v4a1 1 0 0 0 1 1h4m-14 10h1.5a1.5 1.5 0 0 0 0-3h-1.5v6m6-3h1.5a1.5 1.5 0 0 0 0-3h-1.5v6m5.5-6h3m-1.5 0v6m-13-9v-7a2 2 0 0 1 2-2h7l5 5v4"
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
                        className="box-border w-[104px] h-[88px] absolute left-[72px] top-0 flex flex-col gap-[4px] justify-center items-start [z-index:1]"
                      >
                        <div
                          data-pencil-name="File Name"
                          className="text-[16px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                        >
                          班会PPT.pptx
                        </div>
                        <div
                          data-pencil-name="Meta"
                          className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                        >
                          PPTX · 5.1 MB
                        </div>
                      </div>
                      <div
                        data-pencil-name="Stats"
                        className="box-border w-[115px] h-[28px] absolute left-[189.35px] top-[35.791px] flex flex-col gap-[6px] justify-start items-end [z-index:2]"
                      >
                        <div
                          data-pencil-name="Progress Track"
                          className="box-border w-full h-[8px] shrink-0 flex flex-row gap-0 justify-start items-start bg-[#0062FF0D] rounded-full"
                        >
                          <div
                            data-pencil-name="Progress Fill"
                            className="box-border w-[90px] shrink-0 h-[8px] flex flex-row gap-0 justify-start items-start [background-image:linear-gradient(180deg,_#0062FF_0%,_#3B82F6_100%)] bg-no-repeat bg-[length:100%_100%] rounded-full"
                          ></div>
                        </div>
                        <div
                          data-pencil-name="Count Row"
                          className="box-border w-fit h-fit shrink-0 flex flex-row gap-[4px] justify-start items-center"
                        >
                          <div
                            data-pencil-name="Count"
                            className="text-[14px]/[normal] box-border text-[#0062FF] font-body font-bold text-left [white-space:nowrap]"
                          >
                            96
                          </div>
                          <svg
                            data-pencil-name="Icon-trending-up"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[16px] shrink-0 h-[16px] overflow-visible"
                          >
                            <path d="M3 17l6-6 4 4 8-8m-7 0h7v7" fill="#00000000"></path>
                            <path
                              d="M3 17l6-6 4 4 8-8m-7 0h7v7"
                              fill="none"
                              stroke="#0062FF"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            ></path>
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div
                      data-pencil-name="File Item 活动照片.zip"
                      className="box-border w-full h-[88px] shrink-0 [box-shadow:0px_4px_16px_0px_#0000000D] bg-[#FFFFFF] rounded-lg relative"
                    >
                      <div
                        data-pencil-name="Icon Container"
                        className="box-border w-[46px] h-[46px] absolute left-[14px] top-[21px] flex flex-row gap-0 justify-center items-center bg-[#0062FF0D] rounded-lg [z-index:0]"
                      >
                        <svg
                          data-pencil-name="Icon-file-zip"
                          viewBox="0 0 24 24"
                          preserveAspectRatio="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
                        >
                          <path
                            d="M6 20.735a2 2 0 0 1-1-1.735v-14a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2h-1m-5-4a2 2 0 0 1 2 2v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2a2 2 0 0 1 2-2m0-12h-1m3 2h-1m-1 2h-1m3 2h-1m-1 2h-1m3 2h-1"
                            fill="#00000000"
                          ></path>
                          <path
                            d="M6 20.735a2 2 0 0 1-1-1.735v-14a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2h-1m-5-4a2 2 0 0 1 2 2v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2a2 2 0 0 1 2-2m0-12h-1m3 2h-1m-1 2h-1m3 2h-1m-1 2h-1m3 2h-1"
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
                        className="box-border w-[104px] h-[88px] absolute left-[72px] top-0 flex flex-col gap-[4px] justify-center items-start [z-index:1]"
                      >
                        <div
                          data-pencil-name="File Name"
                          className="text-[16px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                        >
                          活动照片.zip
                        </div>
                        <div
                          data-pencil-name="Meta"
                          className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                        >
                          ZIP · 12 MB
                        </div>
                      </div>
                      <div
                        data-pencil-name="Stats"
                        className="box-border w-[115px] h-[28px] absolute left-[189.35px] top-[35.212px] flex flex-col gap-[6px] justify-start items-end [z-index:2]"
                      >
                        <div
                          data-pencil-name="Progress Track"
                          className="box-border w-full h-[8px] shrink-0 flex flex-row gap-0 justify-start items-start bg-[#0062FF0D] rounded-full"
                        >
                          <div
                            data-pencil-name="Progress Fill"
                            className="box-border w-[60px] shrink-0 h-[8px] flex flex-row gap-0 justify-start items-start [background-image:linear-gradient(180deg,_#0062FF_0%,_#3B82F6_100%)] bg-no-repeat bg-[length:100%_100%] rounded-full"
                          ></div>
                        </div>
                        <div
                          data-pencil-name="Count Row"
                          className="box-border w-fit h-fit shrink-0 flex flex-row gap-[4px] justify-start items-center"
                        >
                          <div
                            data-pencil-name="Count"
                            className="text-[14px]/[normal] box-border text-[#0062FF] font-body font-bold text-left [white-space:nowrap]"
                          >
                            64
                          </div>
                          <svg
                            data-pencil-name="Icon-trending-up"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[16px] shrink-0 h-[16px] overflow-visible"
                          >
                            <path d="M3 17l6-6 4 4 8-8m-7 0h7v7" fill="#00000000"></path>
                            <path
                              d="M3 17l6-6 4 4 8-8m-7 0h7v7"
                              fill="none"
                              stroke="#0062FF"
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
                    data-pencil-name="Primary Button"
                    className="box-border w-[345px] h-[52px] [box-shadow:0px_6px_20px_0px_#0062FF33] absolute left-[24px] top-[363.662px] flex flex-col gap-0 justify-center items-center [background-image:linear-gradient(180deg,_#0062FF_0%,_#3B82F6_100%)] bg-no-repeat bg-[length:100%_100%] rounded-lg [z-index:1]"
                  >
                    <div
                      data-pencil-name="Label"
                      className="text-[16px]/[normal] box-border text-[#FFFFFF] font-body font-semibold text-left [white-space:nowrap]"
                    >
                      <span onClick={() => toast.success('导出功能开发中')}>导出</span>统计
                    </div>
                  </div>
                </div>
              </div>
    </PhoneFrame>
  );
}
