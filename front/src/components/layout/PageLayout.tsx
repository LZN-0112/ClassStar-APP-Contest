import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import PhoneFrame from './PhoneFrame';
import UnifiedHeader from './UnifiedHeader';

interface PageLayoutProps {
  title: string;
  variant?: 'a' | 'b';
  showBack?: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  onBack?: () => void;
  right?: ReactNode;
  decor?: ReactNode;
}

/**
 * 通用页面布局
 * - 自动占满 PhoneFrame 剩余高度
 * - 内容不足时 flex-1 拉伸填充，超出时内部垂直滚动
 * - 统一内容区边距与底部安全区
 */
export default function PageLayout({
  title,
  variant = 'a',
  showBack = true,
  children,
  className,
  contentClassName,
  onBack,
  right,
  decor,
}: PageLayoutProps) {
  return (
    <PhoneFrame className={cn('flex flex-col', className)}>
      <UnifiedHeader
        title={title}
        variant={variant}
        showBack={showBack}
        onBack={onBack}
        right={right}
        decor={decor}
      />
      <main
        className={cn(
          'min-h-0 w-full flex-1 bg-white px-5 pb-5 pt-4',
          contentClassName
        )}
      >
        {children}
      </main>
    </PhoneFrame>
  );
}
