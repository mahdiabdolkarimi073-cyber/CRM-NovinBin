const MELLAT_SOAP_URL = 'https://bpm.shaparak.ir/pgwchannel/services/pgwservice.wsdl';
const MELLAT_STARTPAY_URL = 'https://bpm.shaparak.ir/pgwchannel/startpay/';
const MELLAT_NAMESPACE = 'http://interfaces.core.sw.bps.com/';

function getCredentials() {
  return {
    terminalId: String(process.env.MELLAT_TERMINAL_ID || '9760982'),
    userName: String(process.env.MELLAT_USERNAME || 'IPG9760982'),
    userPassword: String(process.env.MELLAT_PASSWORD || '74282241'),
  };
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

async function callMellat(action: string, fields: Record<string, string | number>): Promise<string> {
  const xml = buildSoapEnvelope(action, fields);
  const res = await fetch(MELLAT_SOAP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
    body: xml,
  });
  const text = await res.text();
  const match = text.match(/<return[^>]*>([\s\S]*?)<\/return>/);
  return match ? match[1].trim() : '';
}

export async function bpPayRequest(orderId: number, amount: number, callBackUrl: string): Promise<{ resultCode: string; refId: string }> {
  const cred = getCredentials();
  const { dateStr, timeStr } = getLocalDateTime();
  const raw = await callMellat('bpPayRequest', {
    terminalId: cred.terminalId,
    userName: cred.userName,
    userPassword: cred.userPassword,
    orderId,
    orderAmount: amount,
    callBackUrl,
    localDate: dateStr,
    localTime: timeStr,
    additionalData: '',
    wsContext: '',
    customerId: '',
    payerId: '0',
  });
  const parts = raw.split(',');
  return { resultCode: parts[0] || '', refId: parts[1] || '' };
}

export async function bpVerifyRequest(orderId: number, saleOrderId: number, saleReferenceId: number): Promise<string> {
  const cred = getCredentials();
  return callMellat('bpVerifyRequest', {
    terminalId: cred.terminalId,
    userName: cred.userName,
    userPassword: cred.userPassword,
    orderId,
    saleOrderId,
    saleReferenceId,
  });
}

export async function bpSettleRequest(orderId: number, saleOrderId: number, saleReferenceId: number): Promise<string> {
  const cred = getCredentials();
  return callMellat('bpSettleRequest', {
    terminalId: cred.terminalId,
    userName: cred.userName,
    userPassword: cred.userPassword,
    orderId,
    saleOrderId,
    saleReferenceId,
  });
}

export function getStartPayUrl(refId: string): string {
  return MELLAT_STARTPAY_URL + refId;
}

export function getCallbackUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return baseUrl + '/api/academy/payment/verify';
}
