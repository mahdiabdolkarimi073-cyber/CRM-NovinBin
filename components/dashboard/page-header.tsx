'use client';

import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 mobile:flex-row mobile:items-center mobile:justify-between">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <div className="h-7 w-1.5 rounded-full bg-accent-gradient" />
          <h1 className="text-xl font-black tracking-tight text-foreground mobile:text-2xl tablet:text-3xl">{title}</h1>
        </div>
        {description && <p className="text-sm font-medium text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
