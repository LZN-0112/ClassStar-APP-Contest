import { cn } from '@/lib/utils';

interface SectionTitleProps {
  children: string;
  className?: string;
}

export default function SectionTitle({ children, className }: SectionTitleProps) {
  return (
    <h2
      className={cn(
        'text-xs font-semibold uppercase tracking-wide text-text-muted',
        className
      )}
    >
      {children}
    </h2>
  );
}
