import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import { useNavigate } from 'react-router-dom';

export default function SemesterReport() {
  const navigate = useNavigate();
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
                    学期报表
                  </div>
                  <div
                    className="box-border w-[24px] shrink-0 h-[24px] flex flex-row gap-0 justify-start items-start"
                  ></div>
                </div>
                <div
                  data-pencil-name="Card"
                  className="box-border w-full h-fit shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-2 p-4 justify-start items-start bg-[#FFFFFF] [border:1px_solid_#00000000] rounded-lg"
                >
                  <div
                    className="text-[16px]/[normal] box-border text-[#1A1A1A] font-heading font-bold text-left [white-space:nowrap]"
                  >
                    2023-2024学年第一学期
                  </div>
                </div>
                <div
                  data-pencil-name="Card"
                  className="box-border w-full h-fit shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-2 p-4 justify-start items-start bg-[#FFFFFF] [border:1px_solid_#00000000] rounded-lg"
                >
                  <div
                    data-pencil-name="Button Primary"
                    className="box-border w-full h-[52px] shrink-0 [box-shadow:0px_4px_16px_0px_#0000000D] flex flex-col gap-2 p-[0px_16px] justify-center items-center bg-[#0062FF] rounded-lg"
                  >
                    <div
                      data-pencil-name="Label"
                      className="text-[16px]/[normal] box-border text-[#FFFFFF] font-body font-semibold text-left [white-space:nowrap]"
                    >
                      生成班级工作总结
                    </div>
                  </div>
                  <div
                    data-pencil-name="Button Primary"
                    className="box-border w-full h-[52px] shrink-0 [box-shadow:0px_4px_16px_0px_#0000000D] flex flex-col gap-2 p-[0px_16px] justify-center items-center bg-[#0062FF] rounded-lg"
                  >
                    <div
                      data-pencil-name="Label"
                      className="text-[16px]/[normal] box-border text-[#FFFFFF] font-body font-semibold text-left [white-space:nowrap]"
                    >
                      生成评优支撑材料
                    </div>
                  </div>
                </div>
                <div
                  data-pencil-name="Card"
                  className="box-border w-full h-fit shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-2 p-4 justify-start items-start bg-[#FFFFFF] [border:1px_solid_#00000000] rounded-lg"
                >
                  <div
                    className="text-[16px]/[normal] box-border text-[#1A1A1A] font-heading font-semibold text-left [white-space:nowrap]"
                  >
                    导出选项
                  </div>
                  <div
                    data-pencil-name="List Item"
                    onClick={() => navigate('/export-archive')}
                    className="box-border w-full h-[64px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-[12px] p-[0px_16px] justify-between items-center bg-[#FFFFFF] [border:1px_solid_#E5E7EB] rounded-lg"
                  >
                    <div
                      data-pencil-name="Icon Container"
                      className="box-border w-[40px] shrink-0 h-[40px] [box-shadow:0px_2px_6px_0px_#0000000D] flex flex-row gap-0 justify-center items-center bg-[#60A5FA0D] rounded-lg relative"
                    >
                      <svg
                        data-pencil-name="Icon-chevron-right"
                        viewBox="0 0 24 24"
                        preserveAspectRatio="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="box-border w-[24px] shrink-0 h-[24px] overflow-visible relative [z-index:0]"
                      >
                        <path d="M9 18l6-6-6-6" fill="#00000000"></path>
                        <path
                          d="M9 18l6-6-6-6"
                          fill="none"
                          stroke="#60A5FA"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                        ></path>
                      </svg>
                      <div
                        data-pencil-name="Highlight"
                        className="box-border w-[40px] h-[18px] opacity-[0.15] absolute left-0 top-0 flex flex-row gap-0 justify-start items-start bg-[#FFFFFF] rounded-lg [z-index:1]"
                      ></div>
                    </div>
                    <div
                      data-pencil-name="Text"
                      className="box-border [flex:1_1_0] h-full flex flex-col gap-[4px] justify-center items-start"
                    >
                      <div
                        data-pencil-name="Title"
                        className="text-[16px]/[normal] box-border text-[#1A1A1A] font-heading font-semibold text-left [white-space:nowrap]"
                      >
                        导出 Excel
                      </div>
                      <div
                        data-pencil-name="Subtitle"
                        className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap]"
                      ></div>
                    </div>
                    <svg
                      data-pencil-name="Arrow"
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
                    data-pencil-name="List Item"
                    onClick={() => navigate('/export-archive')}
                    className="box-border w-full h-[64px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-[12px] p-[0px_16px] justify-between items-center bg-[#FFFFFF] [border:1px_solid_#E5E7EB] rounded-lg"
                  >
                    <div
                      data-pencil-name="Icon Container"
                      className="box-border w-[40px] shrink-0 h-[40px] [box-shadow:0px_2px_6px_0px_#0000000D] flex flex-row gap-0 justify-center items-center bg-[#60A5FA0D] rounded-lg relative"
                    >
                      <svg
                        data-pencil-name="Icon-chevron-right"
                        viewBox="0 0 24 24"
                        preserveAspectRatio="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="box-border w-[24px] shrink-0 h-[24px] overflow-visible relative [z-index:0]"
                      >
                        <path d="M9 18l6-6-6-6" fill="#00000000"></path>
                        <path
                          d="M9 18l6-6-6-6"
                          fill="none"
                          stroke="#60A5FA"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                        ></path>
                      </svg>
                      <div
                        data-pencil-name="Highlight"
                        className="box-border w-[40px] h-[18px] opacity-[0.15] absolute left-0 top-0 flex flex-row gap-0 justify-start items-start bg-[#FFFFFF] rounded-lg [z-index:1]"
                      ></div>
                    </div>
                    <div
                      data-pencil-name="Text"
                      className="box-border [flex:1_1_0] h-full flex flex-col gap-[4px] justify-center items-start"
                    >
                      <div
                        data-pencil-name="Title"
                        className="text-[16px]/[normal] box-border text-[#1A1A1A] font-heading font-semibold text-left [white-space:nowrap]"
                      >
                        导出 PDF
                      </div>
                      <div
                        data-pencil-name="Subtitle"
                        className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap]"
                      ></div>
                    </div>
                    <svg
                      data-pencil-name="Arrow"
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
                  data-pencil-name="Button Primary"
                  onClick={() => navigate('/export-archive')}
                  className="box-border w-full h-[52px] shrink-0 [box-shadow:0px_4px_16px_0px_#0000000D] flex flex-col gap-2 p-[0px_16px] justify-center items-center bg-[#0062FF] rounded-lg"
                >
                  <div
                    data-pencil-name="Label"
                    className="text-[16px]/[normal] box-border text-[#FFFFFF] font-body font-semibold text-left [white-space:nowrap]"
                  >
                    一键导出
                  </div>
                </div>
              </div>
    </PhoneFrame>
  );
}
