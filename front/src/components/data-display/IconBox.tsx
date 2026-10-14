import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface IconBoxProps {
  children: ReactNode;
  className?: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'muted';
  size?: 'sm' | 'md' | 'lg';
}

const variants = {
  primary: 'bg-icon-bg text-primary',
  success: 'bg-green-50 text-green-600',
  warning: 'bg-amber-50 text-amber-600',
  danger: 'bg-red-50 text-red-500',
  muted: 'bg-slate-100 text-text-secondary',
};

const sizes = {
  sm: 'h-9 w-9 rounded-lg',
  md: 'h-11 w-11 rounded-xl',
  lg: 'h-14 w-14 rounded-2xl',
};

export default function IconBox({
  children,
  className,
  variant = 'primary',
  size = 'md',
}: IconBoxProps) {
  return (
    <div
      className={cn(
        'flex flex-shrink-0 items-center justify-center',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </div>
  );
}
