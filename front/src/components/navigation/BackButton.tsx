import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface BackButtonProps {
  variant?: 'light' | 'dark';
  className?: string;
  onClick?: () => void;
}

export default function BackButton({ variant = 'light', className, onClick }: BackButtonProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onClick) {
      onClick();
      return;
    }
    // react-router 会在 history.state 里维护 idx，0 表示当前已是应用内首个历史记录。
    // 不能用 history.length 判断：它统计的是整个 WebView 会话的历史，会误判导致退不出去。
    const depth = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (depth > 0) {
      navigate(-1);
    } else {
      navigate('/home', { replace: true });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter') {
      handleBack();
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      onKeyDown={handleKeyDown}
      className={cn(
        'flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center transition-opacity active:opacity-70',
        variant === 'dark' ? 'text-white' : 'text-[#0062FF]',
        className
      )}
      aria-label="返回"
    >
      <ChevronLeft className="h-6 w-6" strokeWidth={2} />
    </button>
  );
}
