import { format } from 'date-fns-jalali';

// Convert English digits in a string to Persian digits.
export function toPersianDigits(input: string | number): string {
  const s = String(input);
  const fa = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return s.replace(/[0-9]/g, (d) => fa[Number(d)]);
}

// Convert Persian/Arabic digits to English for numeric parsing.
export function toEnglishDigits(input: string): string {
  return input
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

export function parseNumber(input: string): number {
  return Number(toEnglishDigits(input).replace(/[^0-9.-]/g, '')) || 0;
}

export function formatToman(n: number): string {
  if (n === null || n === undefined || isNaN(n)) return '۰';
  return Number(n).toLocaleString('fa-IR');
}

export function formatJalali(date: string | Date): string {
  const d = new Date(date);
  return toPersianDigits(format(d, 'd MMMM yyyy'));
}

export function formatJalaliDateTime(date: string | Date): string {
  const d = new Date(date);
  return (
    toPersianDigits(format(d, 'd MMMM yyyy')) +
    ' - ' +
    d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
  );
}

export function relativeTime(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 0) return 'آینده';
  if (diff < 60) return 'همین الان';
  if (diff < 3600) return Math.floor(diff / 60).toLocaleString('fa-IR') + ' دقیقه پیش';
  if (diff < 86400) return Math.floor(diff / 3600).toLocaleString('fa-IR') + ' ساعت پیش';
  if (diff < 2592000) return Math.floor(diff / 86400).toLocaleString('fa-IR') + ' روز پیش';
  return formatJalali(d);
}

export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}
