import { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { isNative } from '@/lib/capacitor';
import { useStatusBarStyle } from '@/hooks/useStatusBarStyle';
import StatusBar from './StatusBar';

interface UnifiedHeaderProps {
  title: string;
  variant?: 'a' | 'b';
  showBack?: boolean;
  onBack?: () => void;
  right?: ReactNode;
  className?: string;
  decor?: ReactNode;
}

export default function UnifiedHeader({
  title,
  variant = 'a',
  showBack = true,
  onBack,
  right,
  className,
  decor,
}: UnifiedHeaderProps) {
  const navigate = useNavigate();
  useStatusBarStyle(true); // 渐变深色头部 → 系统状态栏浅色(白)图标

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div
      className={cn(
        'relative flex h-[240px] w-full flex-col',
        variant === 'a' ? 'bg-gradient-a' : 'bg-gradient-b',
        className
      )}
    >
      <StatusBar light />
      <div
        className="relative flex flex-1 flex-col px-5 pb-5"
        style={{ paddingTop: isNative ? 'calc(var(--safe-top, env(safe-area-inset-top, 0px)) + 4px)' : '16px' }}
      >
        <div className="relative flex items-center justify-between">
          {showBack ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex h-10 w-10 items-center justify-center text-white transition-opacity active:opacity-70"
              aria-label="返回"
            >
              <ChevronLeft className="h-6 w-6" strokeWidth={2} />
            </button>
          ) : (
            <div className="h-10 w-10" />
          )}
          {right ? <div>{right}</div> : null}
        </div>
        <h1 className="mt-1 font-heading text-[28px] font-bold leading-tight tracking-tight text-white">
          {title}
        </h1>
        {decor ? (
          <div className="pointer-events-none absolute bottom-5 right-5 opacity-[0.12]">
            {decor}
          </div>
        ) : null}
      </div>
    </div>
  );
}
