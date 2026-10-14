import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label?: string;
  children: ReactNode;
  className?: string;
  error?: string;
}

export default function FormField({ label, children, className, error }: FormFieldProps) {
  return (
    <div className={cn('mb-4', className)}>
      {label ? (
        <label className="mb-2 block text-sm font-medium text-text-primary">
          {label}
        </label>
      ) : null}
      {children}
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
