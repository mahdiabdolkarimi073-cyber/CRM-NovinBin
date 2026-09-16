import { prisma } from '@/lib/prisma';
import { formatJalali } from '@/lib/format';

const SMS_IR_BULK_API = 'https://api.sms.ir/v1/send/bulk';
const SMS_IR_VERIFY_API = 'https://api.sms.ir/v1/send/verify';
const SMS_API_KEY = process.env.SMS_API_KEY || '';
const SMS_SENDER_NUMBER = process.env.SMS_SENDER_NUMBER || '';
const MEETING_REMINDER_TEMPLATE_ID = 474701;

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
    console.log('[SMS API] URL:', SMS_IR_BULK_API);
    console.log('[SMS API] Request Body:', JSON.stringify(body));

    const res = await fetch(SMS_IR_BULK_API, {
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

const HOST_DOMAIN_REMINDER_TEMPLATE_ID = 201741;

export async function sendExpiryReminder(
  hostDomainId: string,
  mobile: string,
  firstName: string,
  lastName: string
): Promise<SendSmsResult> {
  console.log('[RENEWAL SMS] شروع ارسال پیامک تمدید با قالب');
  console.log('[RENEWAL SMS] اطلاعات سرویس:', { serviceId: hostDomainId, customerName: `${firstName} ${lastName}`, mobile });

  const normalizedMobile = normalizeMobile(mobile);
  if (!normalizedMobile) {
    console.error('[RENEWAL SMS] خطا: شماره موبایل نامعتبر است');
    return { success: false, response: 'شماره موبایل نامعتبر است' };
  }

  if (!SMS_API_KEY) {
    console.error('[RENEWAL SMS] خطا: اعتبارنامه پیامک پیکربندی نشده است');
    return { success: false, response: 'اعتبارنامه پیامک پیکربندی نشده است' };
  }

  const customerName = `${firstName || ''} ${lastName || ''}`.trim() || 'مشتری گرامی';

  try {
    const body = {
      mobile: normalizedMobile.startsWith('0')
        ? '98' + normalizedMobile.slice(1)
        : normalizedMobile,
      templateId: HOST_DOMAIN_REMINDER_TEMPLATE_ID,
      parameters: [
        { name: 'NAME', value: customerName },
      ],
    };

    console.log('[RENEWAL SMS] ارسال با قالب:', JSON.stringify(body));

    const res = await fetch(SMS_IR_VERIFY_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/plain',
        'x-api-key': SMS_API_KEY,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    console.log('[RENEWAL SMS] پاسخ API:', JSON.stringify(data));

    const success = data.status === 1 || data.status === 2;
    const responseText = JSON.stringify(data);

    try {
      await prisma.smsLog.create({
        data: {
          mobile: normalizedMobile,
          message: `قالب تمدید هاست/دامنه - ${customerName} (قالب ${HOST_DOMAIN_REMINDER_TEMPLATE_ID})`,
          status: success ? 'sent' : 'failed',
          response: responseText,
          type: 'expiry_reminder',
          relatedId: hostDomainId,
        },
      });
    } catch (e) {
      console.error('[RENEWAL SMS] خطا در ثبت لاگ دیتابیس:', e);
    }

    return { success, response: responseText };
  } catch (error: any) {
    console.error('[RENEWAL SMS] خطا:', error);
    const errMsg = error.message || 'خطا در ارسال پیامک';
    try {
      await prisma.smsLog.create({
        data: {
          mobile: normalizedMobile,
          message: `قالب تمدید هاست/دامنه - ${customerName} (قالب ${HOST_DOMAIN_REMINDER_TEMPLATE_ID})`,
          status: 'failed',
          response: errMsg,
          type: 'expiry_reminder',
          relatedId: hostDomainId,
        },
      });
    } catch (e) {
      console.error('[RENEWAL SMS] خطا در ثبت لاگ دیتابیس:', e);
    }
    return { success: false, response: errMsg };
  }
}

export async function sendMeetingReminderSms(
  meetingId: string,
  mobile: string,
  recipientName: string,
  meetingTitle: string,
  meetingDate: Date
): Promise<SendSmsResult> {
  const normalizedMobile = normalizeMobile(mobile);
  if (!normalizedMobile) {
    return { success: false, response: 'شماره موبایل نامعتبر است' };
  }

  if (!SMS_API_KEY) {
    return { success: false, response: 'اعتبارنامه پیامک پیکربندی نشده است' };
  }

  const dateStr = formatJalali(meetingDate);
  const timeStr = meetingDate.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  const fullDate = `${dateStr} ساعت ${timeStr}`;

  try {
    const body = {
      mobile: normalizedMobile.startsWith('0')
        ? '98' + normalizedMobile.slice(1)
        : normalizedMobile,
      templateId: MEETING_REMINDER_TEMPLATE_ID,
      parameters: [
        { name: 'NAME', value: recipientName },
        { name: 'TITLE', value: meetingTitle },
        { name: 'DATE', value: fullDate },
      ],
    };

    console.log('[MEETING SMS] ارسال با قالب:', JSON.stringify(body));

    const res = await fetch(SMS_IR_VERIFY_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/plain',
        'x-api-key': SMS_API_KEY,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    console.log('[MEETING SMS] پاسخ API:', JSON.stringify(data));

    const success = data.status === 1 || data.status === 2;
    const responseText = JSON.stringify(data);

    try {
      await prisma.smsLog.create({
        data: {
          mobile: normalizedMobile,
          message: `قالب یادآوری جلسه - ${recipientName} - ${meetingTitle} - ${fullDate}`,
          status: success ? 'sent' : 'failed',
          response: responseText,
          type: 'meeting_reminder',
          relatedId: meetingId,
        },
      });
    } catch (e) {
      console.error('[MEETING SMS] خطا در ثبت لاگ:', e);
    }

    return { success, response: responseText };
  } catch (error: any) {
    console.error('[MEETING SMS] خطا:', error);
    const errMsg = error.message || 'خطا در ارسال پیامک';
    try {
      await prisma.smsLog.create({
        data: {
          mobile: normalizedMobile,
          message: `قالب یادآوری جلسه - ${recipientName} - ${meetingTitle} - ${fullDate}`,
          status: 'failed',
          response: errMsg,
          type: 'meeting_reminder',
          relatedId: meetingId,
        },
      });
    } catch (e) {
      console.error('[MEETING SMS] خطا در ثبت لاگ:', e);
    }
    return { success: false, response: errMsg };
  }
}
