import { Loader2 } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-white">
      <Loader2 className="h-8 w-8 animate-spin text-[#0062FF]" strokeWidth={2} />
      <span className="mt-3 text-[12px] text-[#4B5563]">加载中...</span>
    </div>
  );
}
