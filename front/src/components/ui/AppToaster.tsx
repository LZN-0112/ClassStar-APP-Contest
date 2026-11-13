import { Toaster } from 'sonner';
import { Check, AlertCircle, Info } from 'lucide-react';

/**
 * 全局轻提示：白色卡片 + 语义色圆形图标，从上滑入，2.4s 自动消失。
 * 调用方式不变，仍使用 sonner 的 toast.success / toast.error / toast.info。
 */
export default function AppToaster() {
  return (
    <Toaster
      position="top-center"
      duration={2400}
      visibleToasts={3}
      gap={8}
      offset="calc(var(--safe-top, 0px) + 10px)"
      mobileOffset="calc(var(--safe-top, 0px) + 10px)"
      icons={{
        success: (
          <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[#10B981]">
            <Check className="h-3 w-3 text-white" strokeWidth={3} />
          </span>
        ),
        error: (
          <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[#EF4444]">
            <AlertCircle className="h-3 w-3 text-white" strokeWidth={2.6} />
          </span>
        ),
        warning: (
          <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[#F59E0B]">
            <AlertCircle className="h-3 w-3 text-white" strokeWidth={2.6} />
          </span>
        ),
        info: (
          <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[#0062FF]">
            <Info className="h-3 w-3 text-white" strokeWidth={2.6} />
          </span>
        ),
        loading: <span className="h-[22px] w-[22px] shrink-0 animate-spin rounded-full border-2 border-[#E6EEFC] border-t-[#0062FF]" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex w-full flex-row items-center gap-2.5 rounded-[14px] border border-black/[0.04] bg-white px-3.5 py-3 shadow-[0_14px_30px_rgba(15,23,42,0.14)]',
          title: 'text-[13.5px] font-medium leading-snug text-[#1F2937]',
          description: 'mt-0.5 text-[11px] leading-snug text-[#9CA3AF]',
          actionButton: 'ml-auto shrink-0 rounded-lg bg-[#0062FF] px-2.5 py-1 text-[12px] font-semibold text-white',
          cancelButton: 'ml-auto shrink-0 rounded-lg bg-[#F2F5F9] px-2.5 py-1 text-[12px] font-medium text-[#64748B]',
          closeButton: 'hidden',
        },
      }}
    />
  );
}
