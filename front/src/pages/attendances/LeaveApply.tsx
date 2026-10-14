import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import { useNavigate } from 'react-router-dom';

export default function LeaveApply() {
  const navigate = useNavigate();
  return (
    <PhoneFrame>
      <div className="flex h-full flex-col overflow-y-auto">
        <div
      data-pencil-name="请假申请页"
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
          <div className="relative w-full">
            <BackButton className="absolute left-0 top-0 z-10" />
            <div
              data-pencil-name="Title"
              className="text-[28px]/[normal] box-border text-[#1A1A1A] font-heading font-bold text-left [white-space:nowrap] pl-10"
            >
              请假申请
            </div>
          </div>
          <div
            data-pencil-name="Spacer2"
            className="box-border w-full h-[20px] shrink-0 flex flex-row gap-0 justify-start items-start"
          ></div>
          <div
            data-pencil-name="Attendance Input"
            className="box-border w-full h-[56px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-2 p-[0px_16px] justify-center items-start bg-[#FFFFFF] [border:1px_solid_#E5E7EB] rounded-lg"
          >
            <div
              data-pencil-name="Placeholder"
              className="text-[14px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap]"
            >
              选择签到任务
            </div>
          </div>
          <div
            data-pencil-name="Reason Input"
            className="box-border w-full h-[56px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-2 p-[0px_16px] justify-center items-start bg-[#FFFFFF] [border:1px_solid_#E5E7EB] rounded-lg"
          >
            <div
              data-pencil-name="Placeholder"
              className="text-[14px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap]"
            >
              请假原因
            </div>
          </div>
          <div
            data-pencil-name="Proof"
            className="box-border w-full h-[140px] shrink-0 flex flex-col gap-2 justify-center items-center bg-[#FFFFFF] [border:1px_solid_#E5E7EB] rounded-lg"
          >
            <svg
              data-pencil-name="Icon-upload"
              viewBox="0 0 24 24"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
              className="box-border w-[24px] h-[24px] shrink-0 overflow-visible"
            >
              <path
                d="M12 3v12m5-7l-5-5-5 5m14 7v4a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2v-4"
                fill="#00000000"
              ></path>
              <path
                d="M12 3v12m5-7l-5-5-5 5m14 7v4a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2v-4"
                fill="none"
                stroke="#0062FF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              ></path>
            </svg>
            <div
              data-pencil-name="Hint"
              className="text-[14px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap]"
            >
              上传证明材料（可选）
            </div>
          </div>
          <div
            data-pencil-name="Submit Button"
            className="box-border w-full h-[52px] shrink-0 [box-shadow:0px_4px_16px_0px_#0000000D] flex flex-col gap-2 p-[0px_16px] justify-center items-center bg-[#0062FF] rounded-lg" onClick={() => navigate('/attendance-list')}
          >
            <div
              data-pencil-name="Label"
              className="text-[16px]/[normal] box-border text-[#FFFFFF] font-body font-semibold text-left [white-space:nowrap]"
            >
              提交申请
            </div>
          </div>
        </div>
      </div>
    </div>
      </div>
    </PhoneFrame>
  );
}
