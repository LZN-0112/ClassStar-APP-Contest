import PhoneFrame from '@/components/layout/PhoneFrame';
import { useNavigate } from 'react-router-dom';

export default function Onboarding() {
  const navigate = useNavigate();
  return (
    <PhoneFrame className="bg-white">
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
            data-pencil-name="Onboarding Content"
            className="box-border w-full [flex:1_1_0] flex flex-col gap-6 justify-center items-center"
          >
            <div
              data-pencil-name="Logo Placeholder"
              className="box-border w-[120px] h-[120px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-0 justify-start items-start bg-[#FFFFFF] [border:1px_solid_#00000000] rounded-lg"
            ></div>
            <div
              data-pencil-name="Onboarding Title"
              className="text-[28px]/[normal] box-border w-[320px] text-[#1A1A1A] font-heading font-bold text-center"
            >
              校园班级事务智能管理助手
            </div>
            <div
              data-pencil-name="Onboarding Sub"
              className="text-[14px]/[normal] box-border w-[320px] text-[#4B5563] font-body font-normal text-center"
            >
              去群聊化 · 按事务聚合 · 数据闭环
            </div>
            <div
              data-pencil-name="开始体验"
            className="box-border w-full h-[52px] shrink-0 [box-shadow:0px_4px_16px_0px_#0000000D] flex flex-col gap-2 p-[0px_16px] justify-center items-center bg-[#0062FF] rounded-lg"
            onClick={() => navigate('/login')}
          >
            <div
              data-pencil-name="Label"
              className="text-[16px]/[normal] box-border text-[#FFFFFF] font-body font-semibold text-left [white-space:nowrap]"
            >
              开始体验
            </div>
          </div>
          </div>
        </div>
    </PhoneFrame>
  );
}
