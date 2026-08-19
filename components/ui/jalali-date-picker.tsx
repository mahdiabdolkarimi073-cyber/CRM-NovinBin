'use client';

import * as React from 'react';
import { format } from 'date-fns-jalali';
import { toPersianDigits } from '@/lib/format';
import { JalaliCalendar } from '@/components/ui/jalali-calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JalaliDatePickerProps {
  value?: Date | null;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
}

export function JalaliDatePicker({
  value,
  onChange,
  placeholder = 'انتخاب تاریخ',
  className,
  minDate,
  maxDate,
}: JalaliDatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center gap-2 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-right ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 opacity-50" />
          {value ? (
            <span>{toPersianDigits(format(value, 'yyyy/MM/dd'))}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <JalaliCalendar
          selected={value || undefined}
          defaultMonth={value || undefined}
          minDate={minDate}
          maxDate={maxDate}
          onSelect={(d) => {
            onChange?.(d);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
