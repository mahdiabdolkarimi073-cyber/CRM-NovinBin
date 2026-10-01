import { prisma } from '@/lib/prisma';

const SMS_IR_API = 'https://api.sms.ir/v1/send/bulk';
const SMS_API_KEY = process.env.SMS_API_KEY || '';
const SMS_SENDER_NUMBER = process.env.SMS_SENDER_NUMBER || '';

export interface SendSmsResult {
  success: boolean;
  response: string;
}

export async function sendSms(
  mobile: string,
  message: string,
  type: string = 'manual',
  relatedId?: string
): Promise<SendSmsResult> {
  console.log('[SMS] شروع فرآیند ارسال پیامک');
  console.log('[SMS] بررسی متغیرهای محیطی:', {
    apiKeyExists: !!process.env.SMS_API_KEY,
    apiKeyLength: process.env.SMS_API_KEY?.length,
    senderNumber: process.env.SMS_SENDER_NUMBER,
  });

  const normalizedMobile = normalizeMobile(mobile);
  console.log('[SMS] شماره گیرنده:', mobile, '→ نرمال‌شده:', normalizedMobile);
  if (!normalizedMobile) {
    console.error('[SMS] خطا: شماره موبایل نامعتبر است');
    return { success: false, response: 'شماره موبایل نامعتبر است' };
  }

  const trimmedMessage = (message || '').trim();
  console.log('[SMS] متن پیام:', trimmedMessage);
  if (!trimmedMessage) {
    console.error('[SMS] خطا: متن پیامک خالی است');
    return { success: false, response: 'متن پیامک خالی است' };
  }

  if (!SMS_API_KEY || !SMS_SENDER_NUMBER) {
    console.error('[SMS] خطا: اعتبارنامه پیامک پیکربندی نشده است', {
      hasApiKey: !!SMS_API_KEY,
      hasSenderNumber: !!SMS_SENDER_NUMBER,
    });
    return { success: false, response: 'اعتبارنامه پیامک پیکربندی نشده است' };
  }

  try {
    const body: Record<string, any> = {
      messageTexts: [trimmedMessage],
      mobiles: [normalizedMobile],
      lineNumber: SMS_SENDER_NUMBER,
    };

    console.log('[SMS] در حال ارسال درخواست به API پیامک...');
    console.log('[SMS API] URL:', SMS_IR_API);
    console.log('[SMS API] Request Body:', JSON.stringify(body));

    const res = await fetch(SMS_IR_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-api-key': SMS_API_KEY,
      },
      body: JSON.stringify(body),
    });

    console.log('[SMS API] Status:', res.status);

    const data = await res.json();
    console.log('[SMS] پاسخ API:', JSON.stringify(data));

    const success = data.status === 1;
    const responseText = JSON.stringify(data);

    if (!success) {
      console.error('[SMS] خطا در ارسال:', responseText);
    } else {
      console.log('[SMS] ارسال موفق بود');
    }

    try {
      await prisma.smsLog.create({
        data: {
          mobile: normalizedMobile,
          message: trimmedMessage,
          status: success ? 'sent' : 'failed',
          response: responseText,
          type,
          relatedId: relatedId || null,
        },
      });
    } catch (e) {
      console.error('[SMS] خطا در ثبت لاگ دیتابیس:', e);
    }

    return { success, response: responseText };
  } catch (error: any) {
    console.error('[SMS] خطا در ارسال:', error);
    const errMsg = error.message || 'خطا در ارسال پیامک';
    try {
      await prisma.smsLog.create({
        data: {
          mobile: normalizedMobile,
          message: trimmedMessage,
          status: 'failed',
          response: errMsg,
          type,
          relatedId: relatedId || null,
        },
      });
    } catch (e) {
      console.error('[SMS] خطا در ثبت لاگ دیتابیس:', e);
    }
    return { success: false, response: errMsg };
  }
}

export function normalizeMobile(input: string): string | null {
  let m = input.replace(/\s+/g, '').replace(/-/g, '');
  if (m.startsWith('+98')) m = '0' + m.slice(3);
  else if (m.startsWith('98') && m.length === 12) m = '0' + m.slice(2);
  else if (m.startsWith('0098')) m = '0' + m.slice(4);
  if (/^09\d{9}$/.test(m)) return m;
  return null;
}

export async function sendExpiryReminder(
  hostDomainId: string,
  mobile: string,
  firstName: string,
  lastName: string
): Promise<SendSmsResult> {
  console.log('[RENEWAL SMS] شروع ارسال پیامک تمدید');
  console.log('[RENEWAL SMS] اطلاعات سرویس:', { serviceId: hostDomainId, customerName: `${firstName} ${lastName}`, mobile });
  console.log('[RENEWAL SMS] در حال فراخوانی سرویس پیامک...');

  const fullText = `${firstName} ${lastName} یک هفته دیگر هاست شما تمام می‌شود لطفا برای تمدید اقدام نمایید شرکت مهندسان نوین بین`;
  const result = await sendSms(mobile, fullText, 'expiry_reminder', hostDomainId);

  console.log('[RENEWAL SMS] نتیجه ارسال:', result);
  return result;
}
