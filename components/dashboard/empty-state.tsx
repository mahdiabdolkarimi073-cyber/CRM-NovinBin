'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-20 text-center', className)}>
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-3xl bg-accent/10 blur-2xl" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-muted to-muted/50 text-muted-foreground/60 shadow-premium">
          {icon}
        </div>
      </div>
      <h3 className="mb-1.5 text-lg font-bold text-foreground">{title}</h3>
      {description && <p className="mb-5 max-w-sm text-sm font-medium text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}
