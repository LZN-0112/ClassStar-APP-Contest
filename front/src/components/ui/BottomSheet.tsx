import { useEffect, useRef, useState, type ReactNode } from 'react';
import { registerOverlayBack } from '@/lib/overlayBack';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  /** 标题右侧的自定义操作，例如「清空」「编辑」 */
  headerExtra?: ReactNode;
  children: ReactNode;
  /** 固定在底部的主操作区，不随内容滚动 */
  footer?: ReactNode;
  /** 最大高度，默认 85vh */
  maxHeight?: string;
  /** 为 true 时点击遮罩 / 返回键不关闭，用于提交中 */
  locked?: boolean;
}

/**
 * 通用底部抽屉：抓手 + 左对齐标题 + 可滚动内容 + 贴底操作区。
 * 弹簧上滑入场，遮罩带轻微模糊；支持系统返回键关闭。
 */
export default function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  headerExtra,
  children,
  footer,
  maxHeight = '85vh',
  locked = false,
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    return registerOverlayBack(() => {
      if (!locked) onClose();
      return true;
    });
  }, [open, locked, onClose]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !locked) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, locked, onClose]);

  const hasFooter = Boolean(footer);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // 记录内容是否还有更多可滚动（用于底部渐隐提示）
  useEffect(() => {
    if (!open || !hasFooter) {
      setHasMore(false);
      return;
    }
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setHasMore(el.scrollHeight - el.scrollTop - el.clientHeight > 6);
    update();
    el.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [open, hasFooter]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110]">
      <div
        className="absolute inset-0 bg-[rgba(15,23,42,0.42)] backdrop-blur-[2px] animate-[fadeIn_0.24s_ease-out_both]"
        onClick={() => {
          if (!locked) onClose();
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        style={{ maxHeight }}
        className="absolute inset-x-0 bottom-0 flex flex-col rounded-t-[24px] bg-white shadow-[0_-14px_44px_rgba(15,23,42,0.16)] animate-[slideUp_0.34s_cubic-bezier(0.22,1,0.36,1)_both]"
      >
        <div className="flex shrink-0 justify-center pb-1 pt-2.5">
          <div className="h-1 w-[38px] rounded-full bg-[#E2E8F0]" />
        </div>

        {(title || headerExtra) && (
          <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-3 pt-1.5">
            <div className="min-w-0">
              {title && (
                <div className="truncate font-heading text-[17px]/[normal] font-semibold tracking-[0.2px] text-[#1A1A1A]">
                  {title}
                </div>
              )}
              {subtitle && (
                <div className="mt-1 truncate font-body text-[12px]/[normal] font-normal text-[#9CA3AF]">
                  {subtitle}
                </div>
              )}
            </div>
            {headerExtra}
          </div>
        )}

        <div className="relative flex min-h-0 flex-1 flex-col">
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {children}
          </div>
          {/* 仅当下方还有内容时才渐隐，避免被操作区生硬裁切 */}
          {hasFooter && hasMore && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white via-white/70 to-transparent" />
          )}
        </div>

        {footer && (
          <div className="shrink-0 px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-3">{footer}</div>
        )}
      </div>
    </div>
  );
}

/** 抽屉内的操作行：图标 + 主副文案 + 右侧箭头 */
export function SheetRow({
  icon,
  title,
  subtitle,
  danger = false,
  onClick,
  right,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  danger?: boolean;
  onClick?: () => void;
  right?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-row items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition-colors active:bg-[#F7F9FC]"
    >
      {icon && (
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] ${
            danger ? 'bg-[#FDECEC]' : 'bg-[#EEF4FF]'
          }`}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div
          className={`truncate font-body text-[14px]/[normal] font-medium ${
            danger ? 'text-[#EF4444]' : 'text-[#1F2937]'
          }`}
        >
          {title}
        </div>
        {subtitle && (
          <div className="mt-1 truncate font-body text-[11px]/[normal] font-normal text-[#9CA3AF]">{subtitle}</div>
        )}
      </div>
      {right}
    </button>
  );
}
