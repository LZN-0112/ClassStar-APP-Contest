import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import { useNavigate } from 'react-router-dom';

export default function CheckIn() {
  const navigate = useNavigate();
  return (
    <PhoneFrame>
      <div className="flex h-full flex-col overflow-y-auto">
        <div
      data-pencil-name="签到页面"
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
            className="box-border w-full h-[80px] shrink-0 flex flex-row gap-0 justify-start items-start"
          ></div>
          <div className="relative w-full">
            <BackButton className="absolute left-[-4px] top-[0px] z-10" />
            <div
              data-pencil-name="Title"
              className="text-[28px]/[normal] box-border text-[#1A1A1A] font-heading font-bold text-left [white-space:nowrap] pl-6"
            >
              班会签到
            </div>
          </div>
          <div
            data-pencil-name="Meta"
            className="text-[14px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap]"
          >
            请在指定地点范围内完成签到
          </div>
          <div
            data-pencil-name="Spacer2"
            className="box-border w-full h-[60px] shrink-0 flex flex-row gap-0 justify-start items-start"
          ></div>
          <div
            data-pencil-name="Map Area"
            className="box-border w-full h-[240px] shrink-0 flex flex-col gap-0 justify-center items-center bg-[#FFFFFF] [border:1px_solid_#E5E7EB] rounded-lg"
          >
            <div
              data-pencil-name="Pin"
              className="box-border w-[60px] h-[60px] shrink-0 opacity-[0.3] flex flex-row gap-0 justify-start items-start bg-[#0062FF] rounded-lg"
            ></div>
            <div
              data-pencil-name="Hint"
              className="text-[14px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap]"
            >
              定位中...
            </div>
          </div>
          <div
            data-pencil-name="Checkin Button"
            className="box-border w-full h-[52px] shrink-0 [box-shadow:0px_4px_16px_0px_#0000000D] flex flex-col gap-2 p-[0px_16px] justify-center items-center bg-[#0062FF] rounded-lg" onClick={() => navigate('/attendance-list', { replace: true })}
          >
            <div
              data-pencil-name="Label"
              className="text-[16px]/[normal] box-border text-[#FFFFFF] font-body font-semibold text-left [white-space:nowrap]"
            >
              立即签到
            </div>
          </div>
          <div
            data-pencil-name="Leave Button"
            className="box-border w-full h-[52px] shrink-0 flex flex-col gap-2 p-[0px_16px] justify-center items-center bg-[#0062FF0D] [border:1px_solid_#E5E7EB] rounded-lg" onClick={() => navigate('/leave-apply')}
          >
            <div
              data-pencil-name="Label"
              className="text-[16px]/[normal] box-border text-[#0062FF] font-body font-semibold text-left [white-space:nowrap]"
            >
              请假
            </div>
          </div>
        </div>
      </div>
    </div>
      </div>
    </PhoneFrame>
  );
}
