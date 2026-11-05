const MELLAT_SOAP_URL = 'https://bpm.shaparak.ir/pgwchannel/services/pgwservice';
export const MELLAT_STARTPAY_URL = 'https://bpm.shaparak.ir/pgwchannel/startpay.mellat';
const MELLAT_NAMESPACE = 'http://interfaces.core.sw.bps.com/';

export interface MellatCredentials {
  terminalId: string;
  userName: string;
  userPassword: string;
}

/**
 * دریافت اطلاعات احراز هویت پذیرنده بهپرداخت ملت از متغیرهای محیطی سرور
 * هیچگونه نام کاربری یا کلمه عبور پیش‌فرضی نباید در کد سورس قرار داشته باشد.
 */
export function getMellatCredentials(): MellatCredentials {
  const terminalId = process.env.MELLAT_TERMINAL_ID?.trim();
  const userName = process.env.MELLAT_USERNAME?.trim();
  const userPassword = process.env.MELLAT_PASSWORD?.trim();

  if (!terminalId || !userName || !userPassword) {
    throw new Error('اطلاعات ترمینال یا پذیرنده درگاه پرداخت بهپرداخت ملت (MELLAT_TERMINAL_ID, MELLAT_USERNAME, MELLAT_PASSWORD) در متغیرهای محیطی سرور تنظیم نشده است.');
  }

  return { terminalId, userName, userPassword };
}

export const MELLAT_ERROR_MESSAGES: Record<string, string> = {
  '0': 'تراکنش با موفقیت انجام شد',
  '11': 'شماره کارت نامعتبر است',
  '12': 'موجودی حساب کافی نیست',
  '13': 'رمز دوم اینترنتی (پویا) نادرست است',
  '14': 'تعداد دفعات ورود رمز غلط بیش از حد مجاز است',
  '15': 'کارت بانکی نامعتبر است',
  '16': 'دفعات برداشت بیش از حد مجاز است',
  '17': 'کاربر از انجام تراکنش در صفحه درگاه منصرف شده است',
  '18': 'تاریخ انقضای کارت بانکی به پایان رسیده است',
  '19': 'مبلغ برداشت وجه بیش از سقف مجاز کارت است',
  '21': 'پذیرنده نامعتبر است؛ ترمینال فعال نیست',
  '23': 'خطای امنیتی در تراکنش رخ داده است',
  '24': 'اطلاعات کاربری پذیرنده در بهپرداخت نامعتبر است',
  '25': 'مبلغ پرداختی نامعتبر است',
  '31': 'پاسخ نامعتبر از سوئیچ بانکی دریافت شد',
  '32': 'فرمت داده‌های ارسالی به درگاه صحیح نمی‌باشد',
  '33': 'حساب بانکی نامعتبر است',
  '34': 'خطای سیستمی رخ داده است',
  '35': 'تاریخ ارسال تراکنش نامعتبر است',
  '41': 'شناسه درخواست پرداخت (OrderId) تکراری است',
  '42': 'تراکنش اولیه (Sale) در سامانه بانک یافت نشد',
  '43': 'این تراکنش قبلاً تأیید (Verify) شده است',
  '44': 'درخواست تأیید (Verify) یافت نشد',
  '45': 'تراکنش قبلاً تسویه (Settle) شده است',
  '46': 'تراکنش در سامانه بانک تسویه نشده است',
  '47': 'تراکنش تسویه در بانک یافت نشد',
  '48': 'تراکنش برگشت داده شده است (Reverse)',
  '412': 'شناسه قبض نادرست است',
  '413': 'شناسه پرداخت نادرست است',
  '414': 'سازمان صادرکننده قبض نامعتبر است',
  '415': 'زمان جلسه کاری در درگاه به پایان رسیده است',
  '416': 'خطا در ثبت اطلاعات در سامانه شاپرک',
  '417': 'شناسه پرداخت‌کننده نامعتبر است',
  '418': 'اشکال در تعریف اطلاعات مشتری در سیستم بانکی',
  '419': 'تعداد دفعات ورود اطلاعات نادرست بیش از حد مجاز است',
  '421': 'آدرس آی‌پی (IP) سرور پذیرنده در بهپرداخت ملت تعریف نشده است',
  '54': 'تراکنش مرجع موجود نیست',
  '55': 'تراکنش نامعتبر است',
  '61': 'خطا در واریز وجه به حساب پذیرنده',
};

export function getMellatErrorMessage(code: string): string {
  if (!code) return 'پاسخی از درگاه دریافت نشد';
  return MELLAT_ERROR_MESSAGES[code] || `خطای درگاه بهپرداخت ملت (کد ${code})`;
}

function pad2(n: number) {
  return n < 10 ? '0' + n : String(n);
}

function getLocalDateTime() {
  const now = new Date();
  const dateStr = String(now.getFullYear()) + pad2(now.getMonth() + 1) + pad2(now.getDate());
  const timeStr = pad2(now.getHours()) + pad2(now.getMinutes()) + pad2(now.getSeconds());
  return { dateStr, timeStr };
}

function buildSoapEnvelope(action: string, fields: Record<string, string | number>): string {
  const inner = Object.entries(fields)
    .map(([key, value]) => `<${key}>${value}</${key}>`)
    .join('');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns2="' + MELLAT_NAMESPACE + '">',
    '<soap:Body>',
    `<ns2:${action}>${inner}</ns2:${action}>`,
    '</soap:Body>',
    '</soap:Envelope>',
  ].join('');
}

async function callMellat(
  action: string,
  fields: Record<string, string | number>,
  trackingId: string = 'N/A'
): Promise<string> {
  const startTime = Date.now();
  console.info(`[Mellat SOAP][${trackingId}] Initiating SOAP call to action="${action}"`, {
    action,
    endpoint: MELLAT_SOAP_URL,
    orderId: fields.orderId ?? 'N/A',
    amount: fields.amount ?? 'N/A',
    callBackUrl: fields.callBackUrl ?? 'N/A',
    timestamp: new Date().toISOString(),
  });

  const xml = buildSoapEnvelope(action, fields);
  let res: Response;

  try {
    res = await fetch(MELLAT_SOAP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8' },
      body: xml,
    });
  } catch (networkErr: any) {
    const elapsedMs = Date.now() - startTime;
    console.error(`[Mellat SOAP][${trackingId}] Network transport error connecting to Mellat SOAP:`, {
      action,
      endpoint: MELLAT_SOAP_URL,
      elapsedMs,
      errorName: networkErr?.name,
      errorCode: networkErr?.code || 'N/A',
      errorMessage: networkErr?.message,
      errorCause: networkErr?.cause ? String(networkErr.cause) : undefined,
      stack: networkErr?.stack ? String(networkErr.stack).split('\n').slice(0, 4).join('\n') : undefined,
    });
    throw networkErr;
  }

  const elapsedMs = Date.now() - startTime;
  const httpStatus = res.status;
  const httpStatusText = res.statusText;
  const contentType = res.headers.get('content-type') || 'N/A';

  console.info(`[Mellat SOAP][${trackingId}] HTTP response received:`, {
    action,
    httpStatus,
    httpStatusText,
    contentType,
    elapsedMs,
  });

  const text = await res.text();
  const match = text.match(/<return[^>]*>([\s\S]*?)<\/return>/);

  if (match) {
    const returnVal = match[1].trim();
    const parts = returnVal.split(',');
    console.info(`[Mellat SOAP][${trackingId}] Parsed <return> tag successfully:`, {
      action,
      returnValue: returnVal,
      code: parts[0] || 'EMPTY',
      refIdProvided: Boolean(parts[1]),
      elapsedMs,
    });
    return returnVal;
  }

  // If no <return> element was matched, diagnose SOAP Fault, empty body, or HTTP error response
  const faultCodeMatch = text.match(/<faultcode[^>]*>([\s\S]*?)<\/faultcode>/i);
  const faultStringMatch = text.match(/<faultstring[^>]*>([\s\S]*?)<\/faultstring>/i);
  const faultCode = faultCodeMatch ? faultCodeMatch[1].trim() : '';
  const faultString = faultStringMatch ? faultStringMatch[1].trim() : '';

  const isHtml = text.trim().toLowerCase().startsWith('<!doctype') || text.trim().toLowerCase().startsWith('<html');
  const safeExcerpt = text
    .replace(/<userPassword>[^<]*<\/userPassword>/gi, '<userPassword>***</userPassword>')
    .replace(/<userName>[^<]*<\/userName>/gi, '<userName>***</userName>')
    .slice(0, 400);

  console.error(`[Mellat SOAP][${trackingId}] Failed to find <return> tag in response:`, {
    action,
    httpStatus,
    httpStatusText,
    bodyLength: text.length,
    isHtml,
    hasSoapFault: Boolean(faultCodeMatch || faultStringMatch),
    faultCode: faultCode || 'NONE',
    faultString: faultString || 'NONE',
    responseExcerpt: safeExcerpt,
    elapsedMs,
  });

  if (faultString || faultCode) {
    const error = new Error(`SOAP_FAULT: ${faultString || faultCode}`);
    (error as any).faultCode = faultCode;
    (error as any).faultString = faultString;
    (error as any).isSoapFault = true;
    throw error;
  }

  return '';
}

/**
 * مرحله ۱: درخواست شناسه پرداخت (bpPayRequest)
 * مبالغ ورودی به تومان است و در این تابع به ریال تبدیل می‌شوند (Shaparak Standard).
 * طبق ساختار رسمی وب‌سرویس بهپرداخت ملت، نام فیلد مبلغ amount است (نه orderAmount).
 */
export async function bpPayRequest(
  orderId: number,
  amountInTomans: number,
  callBackUrl: string,
  trackingId?: string
): Promise<{ resultCode: string; refId: string; soapFault?: string }> {
  const currentTrackingId = trackingId || `PAY-${orderId}`;
  const cred = getMellatCredentials();
  const { dateStr, timeStr } = getLocalDateTime();
  const amountInRials = Math.round(amountInTomans * 10);

  console.info(`[Mellat][${currentTrackingId}] bpPayRequest started`, {
    orderId,
    amountTomans: amountInTomans,
    amountRials: amountInRials,
    terminalId: cred.terminalId,
    callBackUrl,
    localDate: dateStr,
    localTime: timeStr,
  });

  try {
    const raw = await callMellat('bpPayRequest', {
      terminalId: cred.terminalId,
      userName: cred.userName,
      userPassword: cred.userPassword,
      orderId,
      amount: amountInRials,
      localDate: dateStr,
      localTime: timeStr,
      additionalData: '',
      callBackUrl,
      payerId: 0,
    }, currentTrackingId);

    const parts = raw.split(',');
    const resultCode = parts[0] || '';
    const refId = parts[1] || '';

    if (!resultCode) {
      console.warn(`[Mellat][${currentTrackingId}] bpPayRequest received empty resultCode from callMellat (raw was: "${raw}")`);
    } else {
      console.info(`[Mellat][${currentTrackingId}] bpPayRequest finished with resultCode="${resultCode}", refId="${refId}"`);
    }

    return { resultCode, refId };
  } catch (err: any) {
    if (err?.isSoapFault) {
      console.error(`[Mellat][${currentTrackingId}] bpPayRequest failed due to SOAP Fault:`, {
        faultCode: err.faultCode,
        faultString: err.faultString,
      });
      return { resultCode: 'SOAP_FAULT', refId: '', soapFault: err.faultString || err.faultCode };
    }
    throw err;
  }
}

/**
 * مرحله ۳: استعلام و تأیید پرداخت (bpVerifyRequest)
 */
export async function bpVerifyRequest(
  orderId: number,
  saleOrderId: number,
  saleReferenceId: number,
  trackingId?: string
): Promise<string> {
  const currentTrackingId = trackingId || `VERIFY-${saleOrderId}`;
  const cred = getMellatCredentials();
  return callMellat('bpVerifyRequest', {
    terminalId: cred.terminalId,
    userName: cred.userName,
    userPassword: cred.userPassword,
    orderId,
    saleOrderId,
    saleReferenceId,
  }, currentTrackingId);
}

/**
 * مرحله ۴: تسویه قطعی پرداخت (bpSettleRequest)
 */
export async function bpSettleRequest(
  orderId: number,
  saleOrderId: number,
  saleReferenceId: number,
  trackingId?: string
): Promise<string> {
  const currentTrackingId = trackingId || `SETTLE-${saleOrderId}`;
  const cred = getMellatCredentials();
  return callMellat('bpSettleRequest', {
    terminalId: cred.terminalId,
    userName: cred.userName,
    userPassword: cred.userPassword,
    orderId,
    saleOrderId,
    saleReferenceId,
  }, currentTrackingId);
}

/**
 * دریافت آدرس بازگشت (Callback URL)
 */
export function getCallbackUrl(): string {
  const baseUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
  return `${baseUrl}/api/academy/payment/verify`;
}

export function getStartPayUrl(refId: string): string {
  return `${MELLAT_STARTPAY_URL}?RefId=${encodeURIComponent(refId)}`;
}
