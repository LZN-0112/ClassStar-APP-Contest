import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import { useNavigate } from 'react-router-dom';

export default function About() {
  const navigate = useNavigate();
  return (
    <PhoneFrame>
      <div
                data-pencil-name="Unified Header"
                className="box-border w-full h-[282px] shrink-0 flex flex-col gap-0 justify-start items-start [background-image:linear-gradient(180deg,_#004ECC_0%,_#4B83FF_55%,_#DEFCFF_100%)] bg-no-repeat bg-[length:100%_100%] rounded-[0px_0px_24px_24px]"
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
                  <div
                    data-pencil-name="Text"
                    className="text-[28px]/[normal] box-border text-[#FFFFFF] font-heading font-bold text-left [white-space:nowrap] relative [z-index:0] pl-10 pt-2"
                  >
                    关于
                  </div>
                  <div
                    data-pencil-name="Decor Icon"
                    className="box-border w-[120px] h-[120px] opacity-[0.12] absolute left-[265px] top-[80px] flex flex-col gap-0 justify-center items-center bg-[#00000000] [z-index:1]"
                  >
                    <svg
                      data-pencil-name="Icon-info"
                      viewBox="0 0 24 24"
                      preserveAspectRatio="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="box-border w-[112px] h-[112px] shrink-0 overflow-visible"
                    >
                      <path
                        d="M12 22c5.523 0 10-4.477 10-10s-4.477-10-10-10-10 4.477-10 10 4.477 10 10 10m0-6v-4m0-4h0.01"
                        fill="none"
                      ></path>
                      <path
                        d="M12 22c5.523 0 10-4.477 10-10s-4.477-10-10-10-10 4.477-10 10 4.477 10 10 10m0-6v-4m0-4h0.01"
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
                  className="box-border w-full [flex:1_1_0] flex flex-col gap-[20px] p-[16px_20px_20px_20px] justify-start items-start bg-[#FFFFFF]"
                >
                  <div
                    data-pencil-name="Group "
                    className="box-border w-full h-fit shrink-0 flex flex-col gap-[10px] justify-start items-start bg-[#00000000]"
                  >
                    <div
                      data-pencil-name="Text"
                      className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-semibold text-left [white-space:nowrap]"
                    ></div>
                    <div
                      data-pencil-name="Group Content"
                      className="box-border w-full h-fit shrink-0 flex flex-col gap-2 justify-start items-start bg-[#00000000]"
                    >
                      <div
                        data-pencil-name="List Item"
                        onClick={() => navigate('/about')}
                        className="box-border w-full h-[64px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-[12px] p-[0px_16px] justify-start items-center bg-[#FFFFFF] rounded-lg"
                      >
                        <div
                          data-pencil-name="Icon Box"
                          className="box-border w-[40px] shrink-0 h-[40px] flex flex-col gap-0 justify-center items-center bg-[#F3F4F6] rounded-lg"
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
                              stroke="#4B5563"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            ></path>
                          </svg>
                        </div>
                        <div
                          data-pencil-name="Text"
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                        >
                          用户协议
                        </div>
                        <div
                          data-pencil-name="Right"
                          className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center bg-[#00000000]"
                        >
                          <svg
                            data-pencil-name="Icon-chevron-right"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[20px] shrink-0 h-[20px] overflow-visible"
                          >
                            <path d="M9 18l6-6-6-6" fill="none"></path>
                            <path
                              d="M9 18l6-6-6-6"
                              fill="none"
                              stroke="#9CA3AF"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            ></path>
                          </svg>
                        </div>
                      </div>
                      <div
                        data-pencil-name="List Item"
                        onClick={() => navigate('/privacy-settings')}
                        className="box-border w-full h-[64px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-[12px] p-[0px_16px] justify-start items-center bg-[#FFFFFF] rounded-lg"
                      >
                        <div
                          data-pencil-name="Icon Box"
                          className="box-border w-[40px] shrink-0 h-[40px] flex flex-col gap-0 justify-center items-center bg-[#F3F4F6] rounded-lg"
                        >
                          <svg
                            data-pencil-name="Icon-lock"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[24px] h-[24px] shrink-0 overflow-visible"
                          >
                            <path
                              d="M19 11h-14a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2m-12 0v-4a5 5 0 1 1 10 0v4m-5 5a1 1 0 1 0 0 2 1 1 0 0 0 0-2"
                              fill="none"
                            ></path>
                            <path
                              d="M19 11h-14a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2m-12 0v-4a5 5 0 1 1 10 0v4m-5 5a1 1 0 1 0 0 2 1 1 0 0 0 0-2"
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
                          data-pencil-name="Text"
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                        >
                          隐私政策
                        </div>
                        <div
                          data-pencil-name="Right"
                          className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center bg-[#00000000]"
                        >
                          <svg
                            data-pencil-name="Icon-chevron-right"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[20px] shrink-0 h-[20px] overflow-visible"
                          >
                            <path d="M9 18l6-6-6-6" fill="none"></path>
                            <path
                              d="M9 18l6-6-6-6"
                              fill="none"
                              stroke="#9CA3AF"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            ></path>
                          </svg>
                        </div>
                      </div>
                      <div
                        data-pencil-name="List Item"
                        onClick={() => navigate('/about')}
                        className="box-border w-full h-[64px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-[12px] p-[0px_16px] justify-start items-center bg-[#FFFFFF] rounded-lg"
                      >
                        <div
                          data-pencil-name="Icon Box"
                          className="box-border w-[40px] shrink-0 h-[40px] flex flex-col gap-0 justify-center items-center bg-[#F3F4F6] rounded-lg"
                        >
                          <svg
                            data-pencil-name="Icon-refresh"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[24px] h-[24px] shrink-0 overflow-visible"
                          >
                            <path
                              d="M23 4v6h-6m-16 10v-6h6m-3.49-5a9 9 0 0 1 14.85-3.36l4.64 4.36m-22 4l4.64 4.36a9 9 0 0 0 14.85-3.36"
                              fill="none"
                            ></path>
                            <path
                              d="M23 4v6h-6m-16 10v-6h6m-3.49-5a9 9 0 0 1 14.85-3.36l4.64 4.36m-22 4l4.64 4.36a9 9 0 0 0 14.85-3.36"
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
                          data-pencil-name="Text"
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                        >
                          版本更新
                        </div>
                        <div
                          data-pencil-name="Right"
                          className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center bg-[#00000000]"
                        >
                          <div
                            data-pencil-name="Text"
                            className="text-[14px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                          >
                            已是最新
                          </div>
                          <svg
                            data-pencil-name="Icon-chevron-right"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[20px] shrink-0 h-[20px] overflow-visible"
                          >
                            <path d="M9 18l6-6-6-6" fill="none"></path>
                            <path
                              d="M9 18l6-6-6-6"
                              fill="none"
                              stroke="#9CA3AF"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            ></path>
                          </svg>
                        </div>
                      </div>
                      <div
                        data-pencil-name="List Item"
                        onClick={() => navigate('/about')}
                        className="box-border w-full h-[64px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-[12px] p-[0px_16px] justify-start items-center bg-[#FFFFFF] rounded-lg"
                      >
                        <div
                          data-pencil-name="Icon Box"
                          className="box-border w-[40px] shrink-0 h-[40px] flex flex-col gap-0 justify-center items-center bg-[#FEF3C7] rounded-lg"
                        >
                          <svg
                            data-pencil-name="Icon-star"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[24px] h-[24px] shrink-0 overflow-visible"
                          >
                            <path
                              d="M12 2l3.09 6.26 6.91 1.01-5 4.87 1.18 6.88-6.18-3.25-6.18 3.25 1.18-6.88-5-4.87 6.91-1.01 3.09-6.26"
                              fill="none"
                            ></path>
                            <path
                              d="M12 2l3.09 6.26 6.91 1.01-5 4.87 1.18 6.88-6.18-3.25-6.18 3.25 1.18-6.88-5-4.87 6.91-1.01 3.09-6.26"
                              fill="none"
                              stroke="#D97706"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            ></path>
                          </svg>
                        </div>
                        <div
                          data-pencil-name="Text"
                          className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                        >
                          给我们评分
                        </div>
                        <div
                          data-pencil-name="Right"
                          className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center bg-[#00000000]"
                        >
                          <svg
                            data-pencil-name="Icon-chevron-right"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[20px] shrink-0 h-[20px] overflow-visible"
                          >
                            <path d="M9 18l6-6-6-6" fill="none"></path>
                            <path
                              d="M9 18l6-6-6-6"
                              fill="none"
                              stroke="#9CA3AF"
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
