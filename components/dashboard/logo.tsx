import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: number;
  className?: string;
  withText?: boolean;
  textClassName?: string;
}

export function Logo({ size = 40, className, withText = true, textClassName }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        className="relative shrink-0 overflow-hidden"
        style={{ width: size, height: size }}
      >
        <Image
          src="/images/1.png"
          alt="نوین‌بین"
          fill
          className="object-contain object-center"
          sizes={`${size}px`}
        />
      </div>
      {withText && (
        <div className={textClassName}>
          <div className="text-sm font-black tracking-tight text-foreground">نوین‌بین</div>
          <div className="text-[10px] font-semibold text-muted-foreground">مدیریت یکپارچه سازمان</div>
        </div>
      )}
    </div>
  );
}
