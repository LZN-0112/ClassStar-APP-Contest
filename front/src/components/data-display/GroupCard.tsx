import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GroupCardProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
  onClick?: () => void;
}

export default function GroupCard({ children, className, noPadding = false, onClick }: GroupCardProps) {
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'w-full rounded-card bg-surface text-left shadow-soft',
        onClick && 'active:bg-slate-50',
        !noPadding && 'p-4',
        className
      )}
    >
      {children}
    </Wrapper>
  );
}
