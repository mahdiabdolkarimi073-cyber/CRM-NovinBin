import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { bpVerifyRequest, bpSettleRequest } from '@/lib/mellat';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const refId = String(formData.get('RefId') || '');
    const resCode = String(formData.get('ResCode') || '');
    const saleOrderId = Number(formData.get('SaleOrderId') || 0);
    const saleReferenceId = Number(formData.get('SaleReferenceId') || 0);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    if (resCode !== '0') {
      const msg = resCode === '0' ? 'موفق' : 'پرداخت ناموفق بود';
      return NextResponse.redirect(baseUrl + '/academy/payment/callback?status=failed&message=' + encodeURIComponent(msg), 302);
    }

    if (!saleReferenceId) {
      return NextResponse.redirect(baseUrl + '/academy/payment/callback?status=failed&message=' + encodeURIComponent('شماره مرجع نامعتبر است'), 302);
    }

    const orderId = saleOrderId;
    const verifyResult = await bpVerifyRequest(orderId, saleOrderId, saleReferenceId);

    if (verifyResult !== '0') {
      return NextResponse.redirect(baseUrl + '/academy/payment/callback?status=failed&message=' + encodeURIComponent('تأیید پرداخت ناموفق بود (کد: ' + verifyResult + ')'), 302);
    }

    const settleResult = await bpSettleRequest(orderId, saleOrderId, saleReferenceId);

    const payment = await (prisma as any).academyPayment.findFirst({ where: { trackingCode: String(orderId) } });
    if (payment) {
      await (prisma as any).academyPayment.update({
        where: { id: payment.id },
        data: {
          trackingCode: String(saleReferenceId),
          paidAt: new Date(),
        },
      });

      await (prisma as any).academyReceipt.create({
        data: {
          studentId: payment.studentId,
          amount: payment.amount,
          trackingCode: String(saleReferenceId),
          receivedDate: new Date(),
        },
      });
    }

    const status = settleResult === '0' ? 'success' : 'success_no_settle';
    return NextResponse.redirect(
      baseUrl + '/academy/payment/callback?status=' + status + '&refId=' + encodeURIComponent(refId) + '&saleReferenceId=' + saleReferenceId,
      302,
    );
  } catch (err) {
    console.error('[mellat-verify] error', err);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    return NextResponse.redirect(baseUrl + '/academy/payment/callback?status=failed&message=' + encodeURIComponent('خطای سرور در تأیید پرداخت'), 302);
  }
}
