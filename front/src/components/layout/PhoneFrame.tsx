import { ReactNode, RefObject } from 'react';
import { cn } from '@/lib/utils';
import { isNative } from '@/lib/capacitor';
import { useIsPrimaryPage } from '@/hooks/usePrimaryPage';

interface PhoneFrameProps {
  children: ReactNode;
  className?: string;
  /** 真机下在滚动容器之外预留系统状态栏安全区，避免整页滚动时内容进入状态栏/挖孔区域 */
  reserveSafeAreaTop?: boolean;
  /** 安全区填充层的背景色，用于与页面顶部渐变色无缝衔接 */
  safeAreaTopClassName?: string;
  /** 暴露内部滚动容器，供页面做滚动驱动动画（如顶部折叠） */
  scrollerRef?: RefObject<HTMLDivElement>;
}

/**
 * 手机外框容器
 * - 移动端：宽度铺满视口、高度固定为 100dvh，内容通过内部滚动查看
 * - 桌面端：固定 393×844 手机尺寸并居中展示
 * - 统一禁止横向滚动
 * - 内容区绝对定位填满父容器，支持滚动；一级页面底部预留导航栏安全间距
 */
export default function PhoneFrame({
  children,
  className,
  reserveSafeAreaTop = false,
  safeAreaTopClassName,
  scrollerRef,
}: PhoneFrameProps) {
  const isPrimaryPage = useIsPrimaryPage();
  const reserveTop = reserveSafeAreaTop && isNative;

  return (
    <div className="flex h-[100dvh] w-full items-start justify-center overflow-x-hidden bg-gray-200 sm:items-center sm:p-6">
      <div
        className={cn(
          'relative flex h-full w-full flex-col overflow-hidden bg-background sm:h-phone sm:w-phone sm:rounded-device sm:shadow-lift',
          className
        )}
      >
        {/* 系统状态栏安全区：固定在滚动容器之外，页面滚动时内容不会进入状态栏/挖孔区域 */}
        {reserveTop ? (
          <div
            aria-hidden
            className={cn('pointer-events-none absolute inset-x-0 top-0 z-30', safeAreaTopClassName)}
            style={{ height: 'var(--safe-top, 0px)' }}
          />
        ) : null}
        {/* 可滚动内容区 */}
        <div
          ref={scrollerRef}
          className="absolute inset-0 w-full flex flex-col overflow-y-auto overflow-x-hidden"
          style={reserveTop ? { top: 'var(--safe-top, 0px)' } : undefined}
        >
          <div className={cn('w-full flex-1 flex flex-col', isPrimaryPage && 'pb-24')}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
