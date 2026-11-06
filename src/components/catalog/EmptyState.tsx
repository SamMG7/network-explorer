import { SearchX } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line px-4 py-8 text-center" role="status">
      <SearchX size={22} className="text-muted" aria-hidden="true" />
      <p className="text-sm font-medium text-fg">{title}</p>
      {description && <p className="text-xs text-muted">{description}</p>}
      {action}
    </div>
  );
}
