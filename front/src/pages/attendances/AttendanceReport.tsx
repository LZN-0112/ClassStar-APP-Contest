import PhoneFrame from '@/components/layout/PhoneFrame';
import { useNavigate } from 'react-router-dom';

export default function AttendanceReport() {
  const navigate = useNavigate();
  return (
    <PhoneFrame>
      <div className="flex h-full flex-col overflow-y-auto">
        <div
      data-pencil-name="考勤报表页"
      className="box-border w-[393px] h-[844px] flex flex-col gap-0 justify-start items-start bg-[#FFFFFF] rounded-[40px] overflow-hidden"
    >
      <div
        data-pencil-name="Phone Frame"
        className="box-border w-[393px] h-[844px] shrink-0 flex flex-col gap-0 justify-start items-start bg-[#FFFFFF] rounded-[40px] overflow-hidden"
      >
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
            data-pencil-name="Spacer"
            className="box-border w-full h-[20px] shrink-0 flex flex-row gap-0 justify-start items-start"
          ></div>
          <div
            data-pencil-name="Title"
            className="text-[28px]/[normal] box-border text-[#1A1A1A] font-heading font-bold text-left [white-space:nowrap]"
          >
            考勤报表
          </div>
          <div
            data-pencil-name="Subtitle"
            className="text-[14px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap]"
          >
            2024-2025 第一学期
          </div>
          <div
            data-pencil-name="Spacer2"
            className="box-border w-full h-[20px] shrink-0 flex flex-row gap-0 justify-start items-start"
          ></div>
          <div
            data-pencil-name="Stats"
            className="box-border w-full h-fit shrink-0 flex flex-row gap-[12px] justify-start items-start"
          >
            <div
              data-pencil-name="出勤率"
              className="box-border [flex:1_1_0] h-[80px] [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-[4px] justify-center items-center bg-[#FFFFFF] [border:1px_solid_#00000000] rounded-lg"
            >
              <div
                data-pencil-name="Value"
                className="text-[20px]/[normal] box-border text-[#1A1A1A] font-heading font-bold text-left [white-space:nowrap]"
              >
                94.2%
              </div>
              <div
                data-pencil-name="Label"
                className="text-[11px]/[normal] box-border text-[#4B5563] font-caption font-normal text-left [white-space:nowrap]"
              >
                出勤率
              </div>
            </div>
            <div
              data-pencil-name="请假"
              className="box-border [flex:1_1_0] h-[80px] [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-[4px] justify-center items-center bg-[#FFFFFF] [border:1px_solid_#00000000] rounded-lg"
            >
              <div
                data-pencil-name="Value"
                className="text-[20px]/[normal] box-border text-[#1A1A1A] font-heading font-bold text-left [white-space:nowrap]"
              >
                12
              </div>
              <div
                data-pencil-name="Label"
                className="text-[11px]/[normal] box-border text-[#4B5563] font-caption font-normal text-left [white-space:nowrap]"
              >
                请假
              </div>
            </div>
            <div
              data-pencil-name="缺勤"
              className="box-border [flex:1_1_0] h-[80px] [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-[4px] justify-center items-center bg-[#FFFFFF] [border:1px_solid_#00000000] rounded-lg"
            >
              <div
                data-pencil-name="Value"
                className="text-[20px]/[normal] box-border text-[#1A1A1A] font-heading font-bold text-left [white-space:nowrap]"
              >
                8
              </div>
              <div
                data-pencil-name="Label"
                className="text-[11px]/[normal] box-border text-[#4B5563] font-caption font-normal text-left [white-space:nowrap]"
              >
                缺勤
              </div>
            </div>
          </div>
          <div
            data-pencil-name="Chart"
            className="box-border w-full h-[200px] shrink-0 flex flex-col gap-[12px] p-4 justify-start items-start bg-[#FFFFFF] [border:1px_solid_#E5E7EB] rounded-lg"
          >
            <div
              data-pencil-name="Title"
              className="text-[16px]/[normal] box-border text-[#1A1A1A] font-heading font-semibold text-left [white-space:nowrap]"
            >
              月度出勤趋势
            </div>
            <div
              data-pencil-name="Bars"
              className="box-border w-full h-[120px] shrink-0 flex flex-row gap-2 justify-start items-end"
            >
              <div
                data-pencil-name="Bar"
                className="box-border [flex:1_1_0] h-[80px] flex flex-row gap-0 justify-start items-start bg-[#0062FF] rounded-sm"
              ></div>
              <div
                data-pencil-name="Bar"
                className="box-border [flex:1_1_0] h-[90px] flex flex-row gap-0 justify-start items-start bg-[#0062FF] rounded-sm"
              ></div>
              <div
                data-pencil-name="Bar"
                className="box-border [flex:1_1_0] h-[75px] flex flex-row gap-0 justify-start items-start bg-[#0062FF] rounded-sm"
              ></div>
              <div
                data-pencil-name="Bar"
                className="box-border [flex:1_1_0] h-[95px] flex flex-row gap-0 justify-start items-start bg-[#0062FF] rounded-sm"
              ></div>
              <div
                data-pencil-name="Bar"
                className="box-border [flex:1_1_0] h-[88px] flex flex-row gap-0 justify-start items-start bg-[#0062FF] rounded-sm"
              ></div>
              <div
                data-pencil-name="Bar"
                className="box-border [flex:1_1_0] h-[92px] flex flex-row gap-0 justify-start items-start bg-[#0062FF] rounded-sm"
              ></div>
              <div
                data-pencil-name="Bar"
                className="box-border [flex:1_1_0] h-[85px] flex flex-row gap-0 justify-start items-start bg-[#0062FF] rounded-sm"
              ></div>
            </div>
          </div>
          <div
            data-pencil-name="Export Button"
            className="box-border w-full h-[52px] shrink-0 [box-shadow:0px_4px_16px_0px_#0000000D] flex flex-col gap-2 p-[0px_16px] justify-center items-center bg-[#0062FF] rounded-lg" onClick={() => navigate('/export-archive')}
          >
            <div
              data-pencil-name="Label"
              className="text-[16px]/[normal] box-border text-[#FFFFFF] font-body font-semibold text-left [white-space:nowrap]"
            >
              导出 Excel
            </div>
          </div>
        </div>
      </div>
    </div>
      </div>
    </PhoneFrame>
  );
}
