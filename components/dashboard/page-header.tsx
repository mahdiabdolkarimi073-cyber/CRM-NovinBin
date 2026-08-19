'use client';

import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <div className="h-7 w-1.5 rounded-full bg-accent-gradient" />
          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">{title}</h1>
        </div>
        {description && <p className="text-sm font-medium text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
