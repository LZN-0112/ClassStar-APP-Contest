import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PrimaryButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
  variant?: 'solid' | 'outline';
}

export default function PrimaryButton({
  children,
  onClick,
  type = 'button',
  disabled = false,
  className,
  variant = 'solid',
}: PrimaryButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full rounded-xl py-3.5 text-center text-base font-semibold transition-opacity active:opacity-90 disabled:opacity-50',
        variant === 'solid'
          ? 'bg-primary text-white shadow-soft'
          : 'border border-primary bg-surface text-primary',
        className
      )}
    >
      {children}
    </button>
  );
}
