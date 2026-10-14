import PhoneFrame from '@/components/layout/PhoneFrame';
import { useNavigate } from 'react-router-dom';
import { GradientWave } from '@/components/ui/gradient-wave';

export default function Launch() {
  const navigate = useNavigate();
  return (
    <PhoneFrame className="bg-white">
      <div className="box-border w-full flex-1 flex flex-col gap-8 justify-center items-center bg-[#FFFFFF] relative" onClick={() => navigate('/login')}>
        {/* 动态波浪背景层 */}
        <div className="absolute inset-0 overflow-hidden">
          <GradientWave colors={['#7dd3fc', '#ffffff', '#bfdbfe', '#ffffff', '#93c5fd', '#ffffff']} />
        </div>
      <div
        data-pencil-name="Logo BG"
        className="box-border w-[120px] h-[120px] shrink-0 flex flex-col gap-0 justify-center items-center bg-[url('/images/app-icon.png')] bg-no-repeat bg-cover bg-center rounded-[28px] relative [z-index:1]"
      ></div>
      <div
        data-pencil-name="App Name"
        className="text-[36px]/[normal] box-border text-[#1A1A1A] font-heading font-bold text-left [white-space:nowrap] relative [z-index:2]"
      >
        班务星
      </div>
      <div
        data-pencil-name="Tagline"
        className="text-[14px]/[normal] box-border text-[#4B5563] font-body font-normal text-left [white-space:nowrap] relative [z-index:3]"
      >
        智能管理班级事务
      </div>
      <div
        data-pencil-name="Version"
        className="text-[11px]/[normal] box-border text-[#4B5563] font-caption font-normal text-left [white-space:nowrap] relative [z-index:4]"
      >
        v1.0.0
      </div></div>
    </PhoneFrame>
  );
}
