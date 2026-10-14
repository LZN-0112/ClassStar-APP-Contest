import { useMemo } from 'react';

export type RegisterButtonState =
  | 'loading'
  | 'register'
  | 'cancelRegister'
  | 'registering'
  | 'cancelling'
  | 'inProgress'
  | 'ended';

interface ActivityRegisterButtonProps {
  state: RegisterButtonState;
  onClick?: () => void;
  className?: string;
}

export function ActivityRegisterButton({ state, onClick, className = '' }: ActivityRegisterButtonProps) {
  const { label, disabled, styleClass } = useMemo(() => {
    switch (state) {
      case 'registering':
        return {
          label: '报名中...',
          disabled: true,
          styleClass: 'bg-[#0062FF] opacity-80 cursor-wait',
        };
      case 'cancelling':
        return {
          label: '取消中...',
          disabled: true,
          styleClass: 'bg-[#EF4444] opacity-80 cursor-wait',
        };
      case 'cancelRegister':
        return {
          label: '取消报名',
          disabled: false,
          styleClass: 'bg-[#EF4444] active:opacity-90 hover:opacity-95',
        };
      case 'inProgress':
        return {
          label: '报名',
          disabled: true,
          styleClass: 'bg-[#9CA3AF] cursor-not-allowed',
        };
      case 'ended':
        return {
          label: '活动已截止',
          disabled: true,
          styleClass: 'bg-[#9CA3AF] cursor-not-allowed',
        };
      case 'register':
      default:
        return {
          label: '报名',
          disabled: false,
          styleClass: 'bg-[#0062FF] active:opacity-90 hover:opacity-95',
        };
    }
  }, [state]);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {state === 'inProgress' && (
        <p
          data-pencil-name="Activity Register Hint"
          className="text-[12px]/[normal] box-border text-center font-body font-medium text-[#64748B]"
        >
          活动进行中将无法报名与取消报名
        </p>
      )}
      <button
        type="button"
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        aria-disabled={disabled}
        data-pencil-name="Activity Register Button"
        className={`box-border w-full h-[52px] shrink-0 [box-shadow:0px_4px_16px_0px_#0000001A] flex flex-col gap-0 justify-center items-center rounded-lg transition-opacity ${styleClass}`}
      >
        <span
          data-pencil-name="Text"
          className="text-[16px]/[normal] box-border text-[#FFFFFF] font-body font-semibold text-left [white-space:nowrap]"
        >
          {label}
        </span>
      </button>
    </div>
  );
}
