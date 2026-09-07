import { prisma } from '@/lib/prisma';

const SMS_IR_API = 'https://api.sms.ir/v1/send/bulk';
const SMS_IR_TOKEN = process.env.SMS_IR_TOKEN || '';
const SMS_IR_LINE_NUMBER = process.env.SMS_IR_LINE_NUMBER || '';

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
  const normalizedMobile = normalizeMobile(mobile);
  if (!normalizedMobile) {
    return { success: false, response: 'شماره موبایل نامعتبر است' };
  }
  // جلوگیری از ارسال متن خالی یا فقط فضای خالی
  const trimmedMessage = (message || '').trim();
  if (!trimmedMessage) {
    return { success: false, response: 'متن پیامک خالی است' };
  }
  if (!SMS_IR_TOKEN || !SMS_IR_LINE_NUMBER) {
    return { success: false, response: 'اعتبارنامه پیامک پیکربندی نشده است' };
  }

  try {
    const body: Record<string, any> = {
      messageTexts: [trimmedMessage],
      mobiles: [normalizedMobile],
    };
    if (SMS_IR_LINE_NUMBER) {
      body.lineNumber = SMS_IR_LINE_NUMBER;
    }

    const res = await fetch(SMS_IR_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-api-key': SMS_IR_TOKEN,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    const success = data.status === 1;
    const responseText = JSON.stringify(data);

    if (!success) {
      console.error('SMS.ir error:', responseText);
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
    } catch {}

    return { success, response: responseText };
  } catch (error: any) {
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
    } catch {}
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
  const fullText = `${firstName} ${lastName} یک هفته دیگر هاست شما تمام می‌شود لطفا برای تمدید اقدام نمایید شرکت مهندسان نوین بین`;
  return sendSms(mobile, fullText, 'expiry_reminder', hostDomainId);
}
