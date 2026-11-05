import { toEnglishDigits } from '@/lib/format';
import { prisma } from '@/lib/prisma';

export interface PhoneValidationResult {
  isValid: boolean;
  normalized: string;
  error?: string;
}

/**
 * اعتبارسنجی و نرمال‌سازی شماره‌های موبایل ایران
 * پشتیبانی از فرمت‌های:
 * 09123456789
 * 9123456789 (بدون صفر ابتدایی)
 * +989123456789
 * 00989123456789
 * ارقام فارسی و عربی نیز به‌صورت خودکار تبدیل می‌شوند.
 * خروجی یکپارچه: 09xxxxxxxxx (۱۱ رقمی با صفر)
 */
export function normalizeIranianMobile(raw: string | null | undefined): PhoneValidationResult {
  if (!raw || !raw.trim()) {
    return {
      isValid: false,
      normalized: '',
      error: 'شماره تلفن الزامی است',
    };
  }

  // ۱. تبدیل ارقام فارسی و عربی به انگلیسی
  const english = toEnglishDigits(raw.trim());

  // ۲. حذف فاصله‌ها، خط تیره‌ها، پرانتزها و کاراکترهای نامربوط
  const clean = english.replace(/[\s\-\(\)\._]/g, '');

  // ۳. بررسی با الگوی استاندارد شماره‌های موبایل ایران
  // پیشوندهای مجاز: +98 یا 0098 یا 98 یا 0 یا بدون پیشوند به همراه 9 و 9 رقم بعد
  const regex = /^(?:\+98|0098|98|0)?(9\d{9})$/;
  const match = clean.match(regex);

  if (!match) {
    return {
      isValid: false,
      normalized: '',
      error: 'شماره تلفن معتبر نیست (مثال: 09123456789، 9123456789 یا +989123456789)',
    };
  }

  // تبدیل به فرمت یکپارچه استاندارد ایران (09xxxxxxxxx)
  const normalized = `0${match[1]}`;

  return {
    isValid: true,
    normalized,
  };
}

/**
 * بررسی تکراری نبودن شماره موبایل در سرنخ‌های ثبت‌شده
 */
export async function isDuplicateLeadPhone(
  phone: string,
  excludeLeadId?: string,
  orgId?: string | null
): Promise<{ isDuplicate: boolean; existingLeadName?: string }> {
  const norm = normalizeIranianMobile(phone);
  if (!norm.isValid) return { isDuplicate: false };

  try {
    const leads = await prisma.lead.findMany({
      where: {
        ...(orgId ? { orgId } : {}),
        ...(excludeLeadId ? { id: { not: excludeLeadId } } : {}),
        isArchived: false,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        additionalPhones: true,
      },
      take: 200,
    });

    for (const lead of leads) {
      if (lead.phone) {
        const leadNorm = normalizeIranianMobile(lead.phone);
        if (leadNorm.isValid && leadNorm.normalized === norm.normalized) {
          return { isDuplicate: true, existingLeadName: lead.name };
        }
      }

      // بررسی شماره‌های اضافی
      if (Array.isArray(lead.additionalPhones)) {
        for (const ap of lead.additionalPhones) {
          if (typeof ap === 'string') {
            const apNorm = normalizeIranianMobile(ap);
            if (apNorm.isValid && apNorm.normalized === norm.normalized) {
              return { isDuplicate: true, existingLeadName: lead.name };
            }
          }
        }
      }
    }

    return { isDuplicate: false };
  } catch (error) {
    console.error('Error checking duplicate lead phone:', error);
    return { isDuplicate: false };
  }
}
