import BackButton from '@/components/navigation/BackButton';
import PhoneFrame from '@/components/layout/PhoneFrame';
import { useNavigate } from 'react-router-dom';
import { Wallet, Dices, Vote, Clock } from 'lucide-react';

export default function MoreFeatures() {
  const navigate = useNavigate();

  const features = [
    {
      label: '班费记账',
      icon: Wallet,
      color: '#22C55E',
      path: '/fee-ledger',
    },
    {
      label: '抽签',
      icon: Dices,
      color: '#F97316',
      path: '/random-draw',
    },
    {
      label: '投票',
      icon: Vote,
      color: '#3B82F6',
      path: '/vote-list',
    },
    {
      label: '番茄钟',
      icon: Clock,
      color: '#EF4444',
      path: '/pomodoro',
    },
  ];

  return (
    <PhoneFrame className="bg-white">
      <div className="flex h-full flex-col overflow-hidden">
        {/* Status Bar */}
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

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-[0px_20px_20px_20px]">
          {/* Header */}
          <div
            data-pencil-name="Header"
            className="box-border w-full h-[56px] shrink-0 flex flex-row gap-0 justify-between items-center"
          >
            <BackButton variant="light" />
            <div
              data-pencil-name="Title"
              className="text-[18px]/[normal] box-border text-[#1A1A1A] font-heading font-semibold text-left [white-space:nowrap]"
            >
              更多功能
            </div>
            <div className="box-border w-[40px] shrink-0 h-[40px]"></div>
          </div>

          {/* Feature Grid Card */}
          <div
            data-pencil-name="Feature Grid"
            className="box-border w-full h-fit shrink-0 flex flex-col gap-4 p-4 justify-start items-center bg-[#FFFFFF] [box-shadow:0px_2px_8px_0px_#0000000D] rounded-lg"
          >
            <div
              data-pencil-name="Row 1"
              className="box-border w-full h-[90px] shrink-0 flex flex-row gap-[30px] justify-center items-center"
            >
              {features.slice(0, 2).map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    data-pencil-name={item.label}
                    className="box-border w-[85px] shrink-0 h-[90px] flex flex-col gap-2 p-[8px_0px] justify-center items-center bg-[#FFFFFF] rounded-lg cursor-pointer transition-transform duration-150 active:scale-95"
                    onClick={() => navigate(item.path)}
                  >
                    <div
                      data-pencil-name="Icon Container"
                      className="box-border w-[48px] h-[48px] shrink-0 [box-shadow:0px_2px_6px_0px_#0000000D] flex flex-row gap-0 justify-center items-center rounded-lg relative"
                      style={{ backgroundColor: item.color }}
                    >
                      <Icon className="w-[24px] h-[24px] text-white relative z-0" strokeWidth={2} />
                    </div>
                    <div
                      data-pencil-name="Label"
                      className="text-[12px]/[normal] box-border text-[#1A1A1A] font-body font-medium text-left [white-space:nowrap]"
                    >
                      {item.label}
                    </div>
                  </div>
                );
              })}
            </div>
            <div
              data-pencil-name="Row 2"
              className="box-border w-full h-[90px] shrink-0 flex flex-row gap-[30px] justify-center items-center"
            >
              {features.slice(2).map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    data-pencil-name={item.label}
                    className="box-border w-[85px] shrink-0 h-[90px] flex flex-col gap-2 p-[8px_0px] justify-center items-center bg-[#FFFFFF] rounded-lg cursor-pointer transition-transform duration-150 active:scale-95"
                    onClick={() => navigate(item.path)}
                  >
                    <div
                      data-pencil-name="Icon Container"
                      className="box-border w-[48px] h-[48px] shrink-0 [box-shadow:0px_2px_6px_0px_#0000000D] flex flex-row gap-0 justify-center items-center rounded-lg relative"
                      style={{ backgroundColor: item.color }}
                    >
                      <Icon className="w-[24px] h-[24px] text-white relative z-0" strokeWidth={2} />
                    </div>
                    <div
                      data-pencil-name="Label"
                      className="text-[12px]/[normal] box-border text-[#1A1A1A] font-body font-medium text-left [white-space:nowrap]"
                    >
                      {item.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}
