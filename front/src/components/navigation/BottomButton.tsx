import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import PrimaryButton from '@/components/common/PrimaryButton';

interface BottomButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
}

export default function BottomButton({
  children,
  onClick,
  type = 'button',
  disabled = false,
  className,
}: BottomButtonProps) {
  return (
    <div
      className={cn(
        'absolute bottom-0 left-0 right-0 border-t border-border bg-surface p-5',
        className
      )}
    >
      <PrimaryButton onClick={onClick} type={type} disabled={disabled}>
        {children}
      </PrimaryButton>
    </div>
  );
}
