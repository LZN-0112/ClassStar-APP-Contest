import { Frown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-white px-6 text-center">
      <div className="flex flex-col items-center">
        <Frown className="h-16 w-16 text-[#4B5563]" strokeWidth={1.5} />
        <h1 className="mt-6 text-[20px] font-semibold text-[#1A1A1A]">页面不存在</h1>
        <p className="mt-2 text-[14px] text-[#4B5563]">请返回首页</p>
        <button
          type="button"
          onClick={() => navigate('/home')}
          className="mt-6 rounded-full bg-[#0062FF] px-6 py-2.5 text-[14px] font-medium text-white transition-opacity active:opacity-70"
        >
          返回首页
        </button>
      </div>
    </div>
  );
}
