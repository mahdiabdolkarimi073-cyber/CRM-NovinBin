import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { bpVerifyRequest, bpSettleRequest, getMellatErrorMessage } from '@/lib/mellat';

export async function POST(req: NextRequest) {
  const baseUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');

  try {
    const formData = await req.formData();
    const refId = String(formData.get('RefId') || '');
    const resCode = String(formData.get('ResCode') || '');
    const saleOrderId = Number(formData.get('SaleOrderId') || 0);
    const saleReferenceId = Number(formData.get('SaleReferenceId') || 0);

    // ۱. بررسی کد نتیجه بازگشتی از درگاه شاپرک
    if (resCode !== '0') {
      const errorMsg = getMellatErrorMessage(resCode);
      return NextResponse.redirect(
        `${baseUrl}/academy/payment/callback?status=failed&message=${encodeURIComponent(errorMsg)}&code=${resCode}`,
        302
      );
    }

    if (!saleReferenceId || !saleOrderId) {
      return NextResponse.redirect(
        `${baseUrl}/academy/payment/callback?status=failed&message=${encodeURIComponent('اطلاعات مرجع یا شماره سفارش تراکنش شاپرک نامعتبر است')}`,
        302
      );
    }

    const orderId = saleOrderId;

    // ۲. بررسی حالت Idempotent: آیا این پرداخت قبلاً پردازش و نهایی شده است؟
    const existingPaid = await (prisma as any).academyPayment.findFirst({
      where: {
        OR: [
          { trackingCode: String(saleReferenceId) },
          { trackingCode: String(orderId), paidAt: { not: null } },
        ],
      },
    });

    if (existingPaid && existingPaid.paidAt) {
      return NextResponse.redirect(
        `${baseUrl}/academy/payment/callback?status=success&refId=${encodeURIComponent(refId)}&saleReferenceId=${saleReferenceId}`,
        302
      );
    }

    // ۳. مرحله استعلام و اعتبارسنجی پرداخت در سرور بهپرداخت ملت (bpVerifyRequest)
    const verifyResult = await bpVerifyRequest(orderId, saleOrderId, saleReferenceId);

    // کد 0 به معنای موفقیت است و کد 43 یعنی قبلاً verify شده که معتبر است
    if (verifyResult !== '0' && verifyResult !== '43') {
      const verifyErrorMsg = getMellatErrorMessage(verifyResult);
      return NextResponse.redirect(
        `${baseUrl}/academy/payment/callback?status=failed&message=${encodeURIComponent(`تأیید تراکنش در بهپرداخت ملت ناموفق بود: ${verifyErrorMsg}`)}&code=${verifyResult}`,
        302
      );
    }

    // ۴. مرحله تسویه حساب قطعی در بهپرداخت ملت (bpSettleRequest)
    // کد 0 به معنای تسویه موفق و کد 45 یعنی قبلاً settle شده است
    const settleResult = await bpSettleRequest(orderId, saleOrderId, saleReferenceId);

    // ۵. ثبت و نهایی‌سازی تراکنش در پایگاه‌داده
    const payment = await (prisma as any).academyPayment.findFirst({
      where: { trackingCode: String(orderId) },
    });

    if (payment) {
      // تجزیه متادیتای ذخیره‌شده
      let meta: any = {};
      try {
        meta = JSON.parse(payment.description || '{}');
      } catch {
        meta = {};
      }

      // به‌روزرسانی وضعیت پرداخت و رسید
      await prisma.$transaction(async (tx: any) => {
        await tx.academyPayment.update({
          where: { id: payment.id },
          data: {
            trackingCode: String(saleReferenceId),
            paidAt: new Date(),
          },
        });

        await tx.academyReceipt.create({
          data: {
            studentId: payment.studentId,
            amount: payment.amount,
            trackingCode: String(saleReferenceId),
            receivedDate: new Date(),
          },
        });

        // الف) فعال‌سازی یا به‌روزرسانی قسط در صورت پرداخت قسطی
        if (payment.paymentType === 'installment' && meta.installmentId) {
          await tx.academyInstallment.update({
            where: { id: meta.installmentId },
            data: {
              status: 'paid',
              paidDate: new Date(),
            },
          });
        }

        // ب) تأیید درخواست ثبت‌نام در صورت پرداخت درخواست ثبت‌نام
        if (payment.paymentType === 'registration' && meta.requestId) {
          await tx.academyRegistrationRequest.update({
            where: { id: meta.requestId },
            data: {
              paymentStatus: 'paid',
              status: 'approved',
              trackingCode: String(saleReferenceId),
            },
          });
        }

        // ج) فعال‌سازی ثبت‌نام مستقیم دوره
        if (payment.paymentType === 'course' && payment.courseId) {
          const existingEnrollment = await tx.academyCourseEnrollment.findUnique({
            where: {
              studentId_courseId: {
                studentId: payment.studentId,
                courseId: payment.courseId,
              },
            },
          });

          if (!existingEnrollment) {
            const course = await tx.academyCourse.findUnique({
              where: { id: payment.courseId },
            });
            await tx.academyCourseEnrollment.create({
              data: {
                studentId: payment.studentId,
                courseId: payment.courseId,
                fee: course ? course.price : payment.amount,
                paid: payment.amount,
                status: 'active',
              },
            });
          } else if (existingEnrollment.status !== 'active') {
            await tx.academyCourseEnrollment.update({
              where: { id: existingEnrollment.id },
              data: {
                status: 'active',
                paid: { increment: payment.amount },
              },
            });
          }
        }
      });
    }

    const settleStatus = (settleResult === '0' || settleResult === '45') ? 'success' : 'success_no_settle';

    return NextResponse.redirect(
      `${baseUrl}/academy/payment/callback?status=${settleStatus}&refId=${encodeURIComponent(refId)}&saleReferenceId=${saleReferenceId}`,
      302
    );
  } catch (err: any) {
    console.error('[mellat-verify] error:', err);
    return NextResponse.redirect(
      `${baseUrl}/academy/payment/callback?status=failed&message=${encodeURIComponent('خطای سرور در فرآیند تأیید تراکنش بانکی')}`,
      302
    );
  }
}
