export type RegisterButtonState =
  | 'loading'
  | 'register'
  | 'cancelRegister'
  | 'registering'
  | 'cancelling'
  | 'inProgress'
  | 'ended'
  | 'full'
  | 'closed'
  | 'rejected';

interface ActivityRegisterButtonProps {
  state: RegisterButtonState;
  onClick?: () => void;
  className?: string;
}

const stateHints: Partial<Record<RegisterButtonState, string>> = {
  inProgress: '活动已开始，报名通道已关闭',
  full: '报名名额已满',
  closed: '报名截止时间已过',
  rejected: '报名审核未通过，如有疑问请联系班委',
};

export function ActivityRegisterButton({
  state,
  onClick,
  className = '',
}: ActivityRegisterButtonProps) {
  const { label, disabled, styleClass } = (() => {
    switch (state) {
      case 'loading':
        return {
          label: '加载中...',
          disabled: true,
          styleClass: 'bg-[#9CA3AF] cursor-wait',
        };
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
          label: '活动进行中',
          disabled: true,
          styleClass: 'bg-[#9CA3AF] cursor-not-allowed',
        };
      case 'ended':
        return {
          label: '活动已结束',
          disabled: true,
          styleClass: 'bg-[#9CA3AF] cursor-not-allowed',
        };
      case 'full':
        return {
          label: '名额已满',
          disabled: true,
          styleClass: 'bg-[#9CA3AF] cursor-not-allowed',
        };
      case 'closed':
        return {
          label: '报名已截止',
          disabled: true,
          styleClass: 'bg-[#9CA3AF] cursor-not-allowed',
        };
      case 'rejected':
        return {
          label: '报名未通过',
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
  })();

  const hint = stateHints[state];

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {hint && (
        <p
          data-pencil-name="Activity Register Hint"
          className="text-[12px]/[normal] box-border text-center font-body font-medium text-[#64748B]"
        >
          {hint}
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