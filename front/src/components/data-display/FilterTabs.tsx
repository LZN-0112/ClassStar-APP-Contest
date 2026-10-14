import { cn } from '@/lib/utils';

interface FilterTabsProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: NoInfer<T>) => void;
  className?: string;
}

export default function FilterTabs<T extends string>({
  options,
  value,
  onChange,
  className,
}: FilterTabsProps<T>) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-white shadow-soft'
                : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
