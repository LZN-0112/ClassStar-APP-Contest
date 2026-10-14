import PhoneFrame from '@/components/layout/PhoneFrame';
import { useNavigate } from 'react-router-dom';

export default function MemberDetail() {
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
                  data-pencil-name="Spacer"
                  className="box-border w-full h-[40px] shrink-0 flex flex-row gap-0 justify-start items-start"
                ></div>
                <div
                  data-pencil-name="Profile"
                  className="box-border w-full h-fit shrink-0 flex flex-col gap-[12px] justify-start items-center"
                >
                  <div
                    data-pencil-name="Avatar"
                    className="box-border w-[80px] h-[80px] shrink-0 opacity-[0.3] flex flex-row gap-0 justify-start items-start bg-[#0062FF] rounded-[40px]"
                  ></div>
                  <div
                    data-pencil-name="Name"
                    className="text-[20px]/[normal] box-border text-[#1A1A1A] font-heading font-bold text-left [white-space:nowrap]"
                  >
                    张三
                  </div>
                  <div
                    data-pencil-name="Role"
                    className="text-[14px]/[normal] box-border text-[#0062FF] font-body font-normal text-left [white-space:nowrap]"
                  >
                    班长
                  </div>
                </div>
                <div
                  data-pencil-name="Info"
                  className="box-border w-full h-fit shrink-0 flex flex-col gap-[10px] justify-start items-start"
                >
                  <div
                    data-pencil-name="学号"
                    className="box-border w-full h-[52px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-0 p-[0px_16px] justify-between items-center bg-[#FFFFFF] [border:1px_solid_#00000000] rounded-lg"
                  >
                    <div
                      data-pencil-name="Label"
                      className="text-[14px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap]"
                    >
                      学号
                    </div>
                    <div
                      data-pencil-name="Value"
                      className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-normal text-left [white-space:nowrap]"
                    >
                      2022010001
                    </div>
                  </div>
                  <div
                    data-pencil-name="手机号"
                    className="box-border w-full h-[52px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-0 p-[0px_16px] justify-between items-center bg-[#FFFFFF] [border:1px_solid_#00000000] rounded-lg"
                  >
                    <div
                      data-pencil-name="Label"
                      className="text-[14px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap]"
                    >
                      手机号
                    </div>
                    <div
                      data-pencil-name="Value"
                      className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-normal text-left [white-space:nowrap]"
                    >
                      138****1234
                    </div>
                  </div>
                  <div
                    data-pencil-name="加入时间"
                    className="box-border w-full h-[52px] shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-row gap-0 p-[0px_16px] justify-between items-center bg-[#FFFFFF] [border:1px_solid_#00000000] rounded-lg"
                  >
                    <div
                      data-pencil-name="Label"
                      className="text-[14px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap]"
                    >
                      加入时间
                    </div>
                    <div
                      data-pencil-name="Value"
                      className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-normal text-left [white-space:nowrap]"
                    >
                      2024-09-01
                    </div>
                  </div>
                </div>
                <div
                  data-pencil-name="Edit Button"
                  className="box-border w-full h-[52px] shrink-0 [box-shadow:0px_4px_16px_0px_#0000000D] flex flex-col gap-2 p-[0px_16px] justify-center items-center bg-[#0062FF] rounded-lg" onClick={() => navigate('/personal-center')}
                >
                  <div
                    data-pencil-name="Label"
                    className="text-[16px]/[normal] box-border text-[#FFFFFF] font-body font-semibold text-left [white-space:nowrap]"
                  >
                    编辑信息
                  </div>
                </div>
              </div>
    </PhoneFrame>
  );
}
