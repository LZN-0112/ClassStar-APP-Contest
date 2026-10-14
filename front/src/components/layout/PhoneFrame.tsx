import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useIsPrimaryPage } from '@/hooks/usePrimaryPage';

interface PhoneFrameProps {
  children: ReactNode;
  className?: string;
}

/**
 * 手机外框容器
 * - 移动端：宽度铺满视口、高度固定为 100dvh，内容通过内部滚动查看
 * - 桌面端：固定 393×844 手机尺寸并居中展示
 * - 统一禁止横向滚动
 * - 内容区绝对定位填满父容器，支持滚动；一级页面底部预留导航栏安全间距
 */
export default function PhoneFrame({ children, className }: PhoneFrameProps) {
  const isPrimaryPage = useIsPrimaryPage();

  return (
    <div className="flex h-[100dvh] w-full items-start justify-center overflow-x-hidden bg-gray-200 sm:items-center sm:p-6">
      <div
        className={cn(
          'relative flex h-full w-full flex-col overflow-hidden bg-background sm:h-phone sm:w-phone sm:rounded-device sm:shadow-lift',
          className
        )}
      >
        {/* 可滚动内容区 */}
        <div className="absolute inset-0 w-full flex flex-col overflow-y-auto overflow-x-hidden">
          <div className={cn('w-full flex-1 flex flex-col', isPrimaryPage && 'pb-24')}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
