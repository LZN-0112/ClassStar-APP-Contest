import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import { useNavigate } from 'react-router-dom';

export default function ClassElectronicArchive() {
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
                  <div className="h-8 w-10" />
                  <div
                    data-pencil-name="Text"
                    className="text-[28px]/[normal] box-border text-[#FFFFFF] font-heading font-bold text-left [white-space:nowrap] relative [z-index:0]"
                  >
                    班级电子档案
                  </div>
                  <div
                    data-pencil-name="Decor Icon"
                    className="box-border w-[120px] h-[120px] opacity-[0.12] absolute left-[265px] top-[80px] flex flex-col gap-0 justify-center items-center bg-[#00000000] [z-index:1]"
                  >
                    <svg
                      data-pencil-name="Icon-archive"
                      viewBox="0 0 24 24"
                      preserveAspectRatio="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="box-border w-[112px] h-[112px] shrink-0 overflow-visible"
                    >
                      <path d="M21 8v13h-18v-13m-2-5h22v5h-22z m9 9h4" fill="none"></path>
                      <path
                        d="M21 8v13h-18v-13m-2-5h22v5h-22z m9 9h4"
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
                    data-pencil-name="Group 2024-2025学年"
                    className="box-border w-full h-fit shrink-0 flex flex-col gap-[10px] justify-start items-start bg-[#00000000]"
                  >
                    <div
                      data-pencil-name="Text"
                      className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-semibold text-left [white-space:nowrap]"
                    >
                      2024-2025学年
                    </div>
                    <div
                      data-pencil-name="Group Content"
                      className="box-border w-full h-fit shrink-0 flex flex-col gap-2 justify-start items-start bg-[#00000000]"
                    >
                      <div
                        data-pencil-name="Card"
                        className="box-border w-full h-[88px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-[12px] p-4 justify-start items-center bg-[#FFFFFF] rounded-[16px]"
                      >
                        <div
                          data-pencil-name="Icon Box"
                          className="box-border w-[48px] shrink-0 h-[48px] flex flex-col gap-0 justify-center items-center bg-[#DBEAFE] rounded-lg"
                        >
                          <svg
                            data-pencil-name="Icon-archive"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[24px] h-[24px] shrink-0 overflow-visible"
                          >
                            <path d="M21 8v13h-18v-13m-2-5h22v5h-22z m9 9h4" fill="none"></path>
                            <path
                              d="M21 8v13h-18v-13m-2-5h22v5h-22z m9 9h4"
                              fill="none"
                              stroke="#004ECC"
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
                            2024-2025学年第一学期档案
                          </div>
                          <div
                            data-pencil-name="Text"
                            className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                          >
                            2025-01-15 · 学期档案
                          </div>
                          <div
                            data-pencil-name="Tag"
                            onClick={() => navigate('/archive-detail')}
                            className="box-border w-fit h-[22px] shrink-0 flex flex-col gap-0 p-[4px_8px] justify-center items-center bg-[#004ECC1A] rounded-full"
                          >
                            <div
                              data-pencil-name="Text"
                              className="text-[11px]/[normal] box-border text-[#004ECC] font-body font-semibold text-left [white-space:nowrap]"
                            >
                              查看详情
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    data-pencil-name="Group 2023-2024学年"
                    className="box-border w-full h-fit shrink-0 flex flex-col gap-[10px] justify-start items-start bg-[#00000000]"
                  >
                    <div
                      data-pencil-name="Text"
                      className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-semibold text-left [white-space:nowrap]"
                    >
                      2023-2024学年
                    </div>
                    <div
                      data-pencil-name="Group Content"
                      className="box-border w-full h-fit shrink-0 flex flex-col gap-2 justify-start items-start bg-[#00000000]"
                    >
                      <div
                        data-pencil-name="Card"
                        className="box-border w-full h-[88px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-[12px] p-4 justify-start items-center bg-[#FFFFFF] rounded-[16px]"
                      >
                        <div
                          data-pencil-name="Icon Box"
                          className="box-border w-[48px] shrink-0 h-[48px] flex flex-col gap-0 justify-center items-center bg-[#DBEAFE] rounded-lg"
                        >
                          <svg
                            data-pencil-name="Icon-archive"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[24px] h-[24px] shrink-0 overflow-visible"
                          >
                            <path d="M21 8v13h-18v-13m-2-5h22v5h-22z m9 9h4" fill="none"></path>
                            <path
                              d="M21 8v13h-18v-13m-2-5h22v5h-22z m9 9h4"
                              fill="none"
                              stroke="#004ECC"
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
                            2023-2024学年第二学期档案
                          </div>
                          <div
                            data-pencil-name="Text"
                            className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                          >
                            2024-07-10 · 学期档案
                          </div>
                          <div
                            data-pencil-name="Tag"
                            onClick={() => navigate('/archive-detail')}
                            className="box-border w-fit h-[22px] shrink-0 flex flex-col gap-0 p-[4px_8px] justify-center items-center bg-[#004ECC1A] rounded-full"
                          >
                            <div
                              data-pencil-name="Text"
                              className="text-[11px]/[normal] box-border text-[#004ECC] font-body font-semibold text-left [white-space:nowrap]"
                            >
                              查看详情
                            </div>
                          </div>
                        </div>
                      </div>
                      <div
                        data-pencil-name="Card"
                        className="box-border w-full h-[88px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-[12px] p-4 justify-start items-center bg-[#FFFFFF] rounded-[16px]"
                      >
                        <div
                          data-pencil-name="Icon Box"
                          className="box-border w-[48px] shrink-0 h-[48px] flex flex-col gap-0 justify-center items-center bg-[#DBEAFE] rounded-lg"
                        >
                          <svg
                            data-pencil-name="Icon-archive"
                            viewBox="0 0 24 24"
                            preserveAspectRatio="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="box-border w-[24px] h-[24px] shrink-0 overflow-visible"
                          >
                            <path d="M21 8v13h-18v-13m-2-5h22v5h-22z m9 9h4" fill="none"></path>
                            <path
                              d="M21 8v13h-18v-13m-2-5h22v5h-22z m9 9h4"
                              fill="none"
                              stroke="#004ECC"
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
                            2023-2024学年第一学期档案
                          </div>
                          <div
                            data-pencil-name="Text"
                            className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                          >
                            2024-01-12 · 学期档案
                          </div>
                          <div
                            data-pencil-name="Tag"
                            onClick={() => navigate('/archive-detail')}
                            className="box-border w-fit h-[22px] shrink-0 flex flex-col gap-0 p-[4px_8px] justify-center items-center bg-[#004ECC1A] rounded-full"
                          >
                            <div
                              data-pencil-name="Text"
                              className="text-[11px]/[normal] box-border text-[#004ECC] font-body font-semibold text-left [white-space:nowrap]"
                            >
                              查看详情
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
    </PhoneFrame>
  );
}
