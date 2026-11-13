/**
 * 阻断式加载遮罩：浅色模糊（不黑屏）+ 白色小卡 + 环形进度。
 * 用于提交、上传等必须等待的场景。
 */
export default function LoadingVeil({
  open,
  text = '处理中…',
  sub,
}: {
  open: boolean;
  text?: string;
  sub?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-white/70 backdrop-blur-[6px] animate-[fadeIn_0.2s_ease-out_both]">
      <div className="flex flex-col items-center gap-3.5 rounded-[20px] bg-white px-[30px] py-[26px] shadow-[0_20px_48px_rgba(15,23,42,0.16)] animate-[popIn_0.26s_cubic-bezier(0.22,1.2,0.36,1)_both]">
        <div className="h-[34px] w-[34px] animate-spin rounded-full border-[3px] border-[#E6EEFC] border-t-[#0062FF]" />
        <div className="font-body text-[14px]/[normal] font-medium text-[#1F2937]">{text}</div>
        {sub && (
          <div className="-mt-2 font-body text-[11.5px]/[normal] font-normal text-[#9CA3AF]">{sub}</div>
        )}
      </div>
    </div>
  );
}
