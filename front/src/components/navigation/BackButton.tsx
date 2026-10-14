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
    if (window.history.length <= 1) {
      navigate('/home');
    } else {
      navigate(-1);
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
        'flex h-10 w-10 shrink-0 items-center justify-center transition-opacity active:opacity-70',
        variant === 'dark' ? 'text-white' : 'text-[#0062FF]',
        className
      )}
      aria-label="返回"
    >
      <ChevronLeft className="h-6 w-6" strokeWidth={2} />
    </button>
  );
}
