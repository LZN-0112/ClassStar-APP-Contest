import { isNative } from '@/lib/capacitor';

interface StatusBarProps {
  light?: boolean;
}

export default function StatusBar({ light = false }: StatusBarProps) {
  if (isNative) return null; // 真机/模拟器：不渲染模拟状态栏，交给系统真实状态栏

  const textColor = light ? 'text-white' : 'text-text-primary';

  return (
    <div
      className={`box-border flex h-[62px] w-full shrink-0 flex-row items-center justify-between px-6 pb-0 pt-3 text-sm ${textColor}`}
    >
      <span className="font-data text-[14px] font-semibold">9:41</span>
      <div className="flex w-fit shrink-0 flex-row items-center gap-1.5">
        <span className="font-caption text-[14px] font-normal">◉◉◉◉</span>
        <span className="font-data text-[14px] font-normal">100%</span>
      </div>
    </div>
  );
}
