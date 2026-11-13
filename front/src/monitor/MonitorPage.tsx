import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface MonitorPageProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export default function MonitorPage({ title, description, actions, children }: MonitorPageProps) {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-slate-900">{title}</h1>
          {description && <p className="mt-1 text-[13px] text-slate-500">{description}</p>}
        </div>
        {actions}
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </div>
  );
}

interface MonitorPlaceholderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  items?: string[];
}

export function MonitorPlaceholder({ icon: Icon, title, description, items }: MonitorPlaceholderProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-7">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0062FF]/10">
          <Icon className="h-5 w-5 text-[#0062FF]" />
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-slate-800">{title}</p>
          <p className="mt-1 max-w-3xl text-[13px] leading-6 text-slate-500">{description}</p>
          {items && items.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {items.map((item) => (
                <li
                  key={item}
                  className="rounded-full bg-slate-100 px-2.5 py-1 font-data text-[11px] text-slate-500"
                >
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export function MonitorSkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-5 py-4">
          <div className="h-8 w-8 shrink-0 animate-pulse rounded-lg bg-slate-100" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-50" />
          </div>
          <div className="h-3 w-16 shrink-0 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}