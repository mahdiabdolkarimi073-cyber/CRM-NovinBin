'use client';

import * as React from 'react';
import {
  format as jalaliFormat,
  getYear,
  getMonth,
  getDate,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  getDaysInMonth,
  isBefore,
  isAfter,
  startOfDay,
} from 'date-fns-jalali';
import { faIR as jalaliLocale } from 'date-fns-jalali/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { toPersianDigits } from '@/lib/format';

const WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

export interface JalaliCalendarProps {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  defaultMonth?: Date;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
}

export function JalaliCalendar({
  selected,
  onSelect,
  defaultMonth,
  className,
  minDate,
  maxDate,
}: JalaliCalendarProps) {
  const [viewDate, setViewDate] = React.useState<Date>(
    defaultMonth || selected || new Date()
  );

  const year = getYear(viewDate);
  const monthIndex = getMonth(viewDate); // 0-based
  const monthName = jalaliLocale.localize.month(monthIndex as any);
  const daysInMonth = getDaysInMonth(viewDate);

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 6 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 6 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const today = new Date();
  const minDay = minDate ? startOfDay(minDate) : undefined;
  const maxDay = maxDate ? startOfDay(maxDate) : undefined;

  const isDisabled = (day: Date) => {
    const d = startOfDay(day);
    if (minDay && isBefore(d, minDay)) return true;
    if (maxDay && isAfter(d, maxDay)) return true;
    return false;
  };

  return (
    <div className={cn('p-3', className)}>
      {/* Header */}
      <div className="flex justify-center pt-1 relative items-center mb-4">
        <button
          type="button"
          onClick={() => setViewDate(subMonths(viewDate, 1))}
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'absolute right-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100'
          )}
          aria-label="ماه قبل"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <div className="text-sm font-medium">
          {monthName} {toPersianDigits(year)}
        </div>
        <button
          type="button"
          onClick={() => setViewDate(addMonths(viewDate, 1))}
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'absolute left-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100'
          )}
          aria-label="ماه بعد"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Weekday header */}
      <div className="flex">
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className="text-muted-foreground rounded-md w-9 h-9 flex items-center justify-center font-normal text-[0.8rem]"
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="mt-2 space-y-1">
        {Array.from({ length: Math.ceil(days.length / 7) }).map((_, weekIdx) => {
          const weekDays = days.slice(weekIdx * 7, weekIdx * 7 + 7);
          return (
            <div key={weekIdx} className="flex w-full">
              {weekDays.map((day) => {
                const isCurrentMonth = isSameMonth(day, viewDate);
                const isSelected = selected && isSameDay(day, selected);
                const isToday = isSameDay(day, today);
                const disabled = isDisabled(day);
                const dayNum = getDate(day);

                return (
                  <div
                    key={day.toISOString()}
                    className="h-9 w-9 text-center text-sm p-0 relative"
                  >
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => !disabled && onSelect?.(day)}
                      className={cn(
                        buttonVariants({ variant: 'ghost' }),
                        'h-9 w-9 p-0 font-normal',
                        !isCurrentMonth &&
                          'text-muted-foreground opacity-50 hover:opacity-100',
                        isToday && !isSelected && 'bg-accent text-accent-foreground',
                        isSelected &&
                          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                        disabled && 'text-muted-foreground/40 line-through cursor-not-allowed hover:bg-transparent'
                      )}
                    >
                      {toPersianDigits(dayNum)}
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

JalaliCalendar.displayName = 'JalaliCalendar';
