import { ReactNode, useRef } from 'react';
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
 * - 顶部为可折叠的封面头部（滚动时封面收起、顶栏渐变为白底）
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
  /** 交给 PhoneFrame 暴露滚动容器，同时供头部读取滚动进度 */
  const scrollerRef = useRef<HTMLDivElement>(null);

  return (
    <PhoneFrame scrollerRef={scrollerRef} className={cn('flex flex-col', className)}>
      <div className="relative flex min-h-full w-full flex-col">
        <UnifiedHeader
          title={title}
          variant={variant}
          showBack={showBack}
          onBack={onBack}
          right={right}
          decor={decor}
          scrollerRef={scrollerRef}
        />
        <main
          className={cn(
            'relative z-10 min-h-0 w-full flex-1 bg-white px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-4',
            contentClassName
          )}
        >
          {children}
        </main>
      </div>
    </PhoneFrame>
  );
}