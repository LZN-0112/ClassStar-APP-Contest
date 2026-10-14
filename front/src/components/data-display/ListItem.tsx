import { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import IconBox from './IconBox';

interface ListItemProps {
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  iconVariant?: 'primary' | 'success' | 'warning' | 'danger' | 'muted';
  right?: ReactNode;
  showArrow?: boolean;
  onClick?: () => void;
  className?: string;
  tag?: ReactNode;
}

export default function ListItem({
  title,
  subtitle,
  icon,
  iconVariant = 'primary',
  right,
  showArrow = true,
  onClick,
  className,
  tag,
}: ListItemProps) {
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-card bg-surface p-4 shadow-soft transition-colors',
        onClick && 'active:bg-slate-50',
        className
      )}
    >
      {icon ? (
        <IconBox variant={iconVariant}>{icon}</IconBox>
      ) : null}
      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className="truncate text-[15px] font-semibold text-text-primary">
            {title}
          </span>
          {tag}
        </div>
        {subtitle ? (
          <div className="mt-0.5 text-sm text-text-secondary">{subtitle}</div>
        ) : null}
      </div>
      {right}
      {showArrow && onClick ? (
        <ChevronRight className="h-5 w-5 flex-shrink-0 text-text-muted" />
      ) : null}
    </Wrapper>
  );
}
