import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ScrollViewProps {
  children: ReactNode;
  className?: string;
}

/**
 * 可复用垂直滚动容器
 * - 在 PhoneFrame 内占满剩余高度
 * - 内容不足时自动填充，超出时平滑滚动
 * - 默认带水平溢出裁剪，防止子元素撑出横向滚动条
 */
export default function ScrollView({ children, className }: ScrollViewProps) {
  return (
    <div
      className={cn(
        'min-h-0 flex-1 overflow-y-auto overscroll-y-contain overflow-x-hidden',
        className
      )}
    >
      {children}
    </div>
  );
}
