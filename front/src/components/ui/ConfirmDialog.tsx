import { useEffect, type ReactNode } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { registerOverlayBack } from '@/lib/overlayBack';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  cancelText?: string;
  confirmText?: string;
  danger?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * 通用二次确认弹窗：点击遮罩 / 取消 / ESC / 系统返回键均可关闭，loading 时禁止关闭。
 * 视觉：图标 + 居中标题说明 + 整宽主按钮，「取消」降级为文字链接。
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  cancelText = '取消',
  confirmText = '确定',
  danger = false,
  loading = false,
  icon,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  // 系统返回键：弹窗打开时优先关闭弹窗
  useEffect(() => {
    if (!open) return;
    return registerOverlayBack(() => {
      if (!loading) onCancel();
      return true;
    });
  }, [open, loading, onCancel]);

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center px-6"
      onClick={() => {
        if (!loading) onCancel();
      }}
    >
      <div className="absolute inset-0 bg-[rgba(15,23,42,0.42)] backdrop-blur-[2px] animate-[fadeIn_0.24s_ease-out_both]" />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative box-border flex w-full max-w-[306px] flex-col rounded-[24px] bg-white px-[22px] pb-5 pt-[26px] shadow-[0_24px_60px_rgba(15,23,42,0.24)] animate-[popIn_0.3s_cubic-bezier(0.22,1.2,0.36,1)_both]"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`mx-auto mb-4 flex h-[58px] w-[58px] items-center justify-center rounded-[19px] ${
            danger ? 'bg-[#FDECEC]' : 'bg-[#EEF4FF]'
          }`}
        >
          {icon ??
            (danger ? (
              <AlertTriangle className="h-7 w-7 text-[#EF4444]" strokeWidth={1.8} />
            ) : (
              <HelpCircle className="h-7 w-7 text-[#0062FF]" strokeWidth={1.8} />
            ))}
        </div>

        <div
          id="confirm-dialog-title"
          className="text-center font-body text-[17.5px]/[1.4] font-semibold text-[#1A1A1A]"
        >
          {title}
        </div>

        {description && (
          <div className="mt-2 text-center font-body text-[12.5px]/[1.7] font-normal text-[#6B7280]">
            {description}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`box-border h-[47px] w-full rounded-[14px] font-body text-[15px]/[normal] font-semibold tracking-[0.3px] text-white transition-opacity active:opacity-90 disabled:opacity-60 ${
              danger
                ? 'bg-[linear-gradient(180deg,#F76B6B_0%,#E5484D_100%)] shadow-[0_10px_20px_rgba(229,72,77,0.24)]'
                : 'bg-[linear-gradient(180deg,#2E7DFF_0%,#0062FF_100%)] shadow-[0_10px_20px_rgba(0,98,255,0.24)]'
            }`}
          >
            {loading ? '处理中...' : confirmText}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="h-[40px] w-full rounded-[12px] font-body text-[14px]/[normal] font-medium text-[#64748B] transition-opacity active:opacity-70 disabled:opacity-40"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}
