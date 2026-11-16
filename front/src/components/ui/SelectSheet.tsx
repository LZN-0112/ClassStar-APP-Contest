import { useState } from 'react';
import type { ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import BottomSheet from './BottomSheet';

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
}

interface SelectSheetProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  title?: string;
  /** card 变体的左侧图标（放在浅蓝色圆角方块内） */
  icon?: ReactNode;
  disabled?: boolean;
  /** card：整行大卡片；compact：页面内联筛选 */
  variant?: 'card' | 'compact';
  className?: string;
}

/**
 * 主题化下拉选择：统一用白卡片 + 浅蓝图标块 + 圆角抽屉，
 * 替代各端原生 select 的灰边框和系统弹窗样式。
 */
export default function SelectSheet({
  value,
  options,
  onChange,
  placeholder = '请选择',
  title,
  icon,
  disabled = false,
  variant = 'card',
  className = '',
}: SelectSheetProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) || null;
  const displayText = selected?.label || placeholder;

  return (
    <>
      {variant === 'compact' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={disabled}
          className={`box-border flex h-[38px] min-w-0 flex-1 items-center justify-between gap-2 rounded-xl bg-[#F2F5F9] px-3 text-left active:opacity-80 disabled:opacity-50 ${className}`}
        >
          <span
            className={`truncate font-body text-[13px]/[normal] font-medium ${
              selected ? 'text-[#1F2937]' : 'text-[#94A3B8]'
            }`}
          >
            {displayText}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-[#94A3B8]" strokeWidth={2} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={disabled}
          className={`box-border flex w-full flex-row items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-soft active:opacity-90 disabled:opacity-50 ${className}`}
        >
          {icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#DBEAFE]">
              {icon}
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div
              className={`truncate font-body text-[14px]/[normal] font-semibold ${
                selected ? 'text-[#1E293B]' : 'text-[#94A3B8]'
              }`}
            >
              {displayText}
            </div>
            {selected?.hint && (
              <div className="truncate font-caption text-[11px]/[normal] font-medium text-[#64748B]">
                {selected.hint}
              </div>
            )}
          </div>
          <ChevronDown className="h-5 w-5 shrink-0 text-[#9CA3AF]" strokeWidth={2} />
        </button>
      )}

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={title || '请选择'}
        maxHeight="70vh"
      >
        <div className="flex flex-col gap-1 px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-1">
          {options.length === 0 ? (
            <div className="py-10 text-center font-body text-[13px] text-[#94A3B8]">暂无可选项</div>
          ) : (
            options.map((option) => {
              const active = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-[14px] px-3.5 py-3 text-left transition-colors active:bg-[#F7F9FC] ${
                    active ? 'bg-[#EFF6FF]' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div
                      className={`truncate font-body text-[14px]/[normal] ${
                        active ? 'font-semibold text-[#0062FF]' : 'font-medium text-[#1F2937]'
                      }`}
                    >
                      {option.label}
                    </div>
                    {option.hint && (
                      <div className="mt-0.5 truncate font-caption text-[11px]/[normal] text-[#94A3B8]">
                        {option.hint}
                      </div>
                    )}
                  </div>
                  {active && <Check className="h-4 w-4 shrink-0 text-[#0062FF]" strokeWidth={2.5} />}
                </button>
              );
            })
          )}
        </div>
      </BottomSheet>
    </>
  );
}