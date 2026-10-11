'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DemoBanner() {
  const { isDemo, demoInfo } = useAuth();
  const [daysLeft, setDaysLeft] = useState<number>(0);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!demoInfo?.expiry) return;
    const calc = () => {
      const now = new Date().getTime();
      const expiry = new Date(demoInfo.expiry).getTime();
      const diff = expiry - now;
      if (diff <= 0) {
        setExpired(true);
        setDaysLeft(0);
      } else {
        setExpired(false);
        setDaysLeft(Math.ceil(diff / (1000 * 60 * 60 * 24)));
      }
    };
    calc();
    const interval = setInterval(calc, 60000);
    return () => clearInterval(interval);
  }, [demoInfo]);

  if (!isDemo) return null;

  if (expired) {
    return (
      <div className="bg-red-600 text-white px-4 py-2 text-center text-sm flex items-center justify-center gap-2 sticky top-0 z-[60]">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span>این دمو منقضی شده است. برای تمدید با پشتیبانی در ارتباط باشید.</span>
      </div>
    );
  }

  const bgColor = daysLeft <= 3 ? 'bg-red-500' : daysLeft <= 7 ? 'bg-orange-500' : 'bg-blue-600';

  return (
    <div className={cn(bgColor, 'text-white px-4 py-1.5 text-center text-xs sm:text-sm flex items-center justify-center gap-2 sticky top-0 z-[60]')}>
      <Clock className="h-3.5 w-3.5 flex-shrink-0" />
      <span>
        محیط دمو - {daysLeft.toLocaleString('fa-IR')} روز تا پایان
      </span>
    </div>
  );
}
