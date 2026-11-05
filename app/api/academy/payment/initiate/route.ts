import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { bpPayRequest, getStartPayUrl, getCallbackUrl, getMellatErrorMessage } from '@/lib/mellat';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

async function getStudent(req: NextRequest) {
  const token = req.cookies.get('academy_token')?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { academyUserId: string };
    const student = await (prisma as any).academyUser.findUnique({ where: { id: payload.academyUserId } });
    return student?.active ? student : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const student = await getStudent(req);
    if (!student) return NextResponse.json({ error: 'نشست کاربری شما نامعتبر یا منقضی شده است. لطفاً مجدداً وارد شوید.' }, { status: 401 });

    const body = await req.json();
    const { type, installmentId, requestId, courseId } = body;

    let amount = 0;
    let description = '';
    let paymentCourseId: string | null = null;

    // محاسبه دقیق و غیرقابل دستکاری مبالغ بر پایه داده‌های سرور
    if (type === 'installment' && installmentId) {
      const installment = await (prisma as any).academyInstallment.findFirst({ where: { id: installmentId, studentId: student.id } });
      if (!installment) return NextResponse.json({ error: 'قسط مورد نظر یافت نشد' }, { status: 404 });
      if (installment.status === 'paid') return NextResponse.json({ error: 'این قسط قبلاً پرداخت شده است' }, { status: 400 });
      amount = Number(installment.amount);
      description = `پرداخت قسط شماره ${installment.installmentNo}`;
      paymentCourseId = installment.courseId || null;
    } else if (type === 'registration' && requestId) {
      const request = await (prisma as any).academyRegistrationRequest.findFirst({ where: { id: requestId, studentId: student.id } });
      if (!request) return NextResponse.json({ error: 'درخواست ثبت‌نام یافت نشد' }, { status: 404 });
      if (request.paymentStatus === 'paid') return NextResponse.json({ error: 'شهریه این درخواست قبلاً پرداخت شده است' }, { status: 400 });
      if (request.status !== 'pending') return NextResponse.json({ error: 'این درخواست در وضعیت قابل پرداخت نیست' }, { status: 400 });
      amount = Number(request.amount);
      description = 'پرداخت شهریه درخواست ثبت‌نام دوره';
      paymentCourseId = request.targetCourseId || null;
    } else if (type === 'course' && courseId) {
      const course = await (prisma as any).academyCourse.findFirst({ where: { id: courseId, active: true } });
      if (!course) return NextResponse.json({ error: 'دوره آموزشی یافت نشد یا غیرفعال است' }, { status: 404 });
      const existing = await (prisma as any).academyCourseEnrollment.findUnique({ where: { studentId_courseId: { studentId: student.id, courseId: course.id } } });
      if (existing && existing.status === 'active') return NextResponse.json({ error: 'شما هم‌اکنون در این دوره ثبت‌نام فعال دارید' }, { status: 400 });
      amount = Number(course.price);
      if (amount <= 0) return NextResponse.json({ error: 'این دوره رایگان است و نیازی به تراکنش بانکی ندارد' }, { status: 400 });
      description = `ثبت‌نام مستقیم در دوره: ${course.title}`;
      paymentCourseId = course.id;
    } else {
      return NextResponse.json({ error: 'نوع پرداخت مشخص‌شده نامعتبر است' }, { status: 400 });
    }

    if (amount <= 0) return NextResponse.json({ error: 'مبلغ محاسبه‌شده برای پرداخت باید بزرگتر از صفر باشد' }, { status: 400 });

    // تولید شماره سفارش یکتا بین ۱ تا ۹۹۹۹۹۹۹۹
    const orderId = Math.floor(Date.now() / 1000) * 1000 + Math.floor(Math.random() * 900 + 100);
    const trackingId = `PAY-${orderId}`;
    const callBackUrl = getCallbackUrl();

    console.info(`[Mellat Initiate][${trackingId}] Payment initiation requested`, {
      trackingId,
      studentId: student.id,
      paymentType: type,
      targetId: installmentId || requestId || courseId,
      amountTomans: amount,
      amountRials: Math.round(amount * 10),
      orderId,
      callBackUrl,
      timestamp: new Date().toISOString(),
    });

    // فراخوانی درگاه بهپرداخت ملت (bpPayRequest)
    const { resultCode, refId, soapFault } = await bpPayRequest(orderId, amount, callBackUrl, trackingId);

    if (resultCode !== '0' || !refId) {
      if (resultCode === 'SOAP_FAULT') {
        console.error(`[Mellat Initiate][${trackingId}] SOAP Fault occurred during PayRequest:`, {
          soapFault,
          orderId,
        });
        return NextResponse.json(
          {
            error: 'خطا در ارتباط با وب‌سرویس بهپرداخت ملت؛ لطفاً دقایقی دیگر مجدداً تلاش فرمایید.',
            trackingId,
            resultCode: 'SOAP_FAULT',
          },
          { status: 502 }
        );
      }

      const persianMsg = getMellatErrorMessage(resultCode);
      console.warn(`[Mellat Initiate][${trackingId}] Payment initiation rejected by gateway or received invalid response:`, {
        trackingId,
        orderId,
        rawResultCode: resultCode || 'EMPTY_OR_UNDEFINED',
        persianMeaning: persianMsg,
        hasRefId: Boolean(refId),
        refIdReceived: refId || 'NONE',
      });

      return NextResponse.json(
        {
          error: `خطا در اتصال به درگاه بهپرداخت ملت: ${persianMsg} (کد خطا: ${resultCode || 'نامشخص'})`,
          trackingId,
          resultCode: resultCode || 'UNSPECIFIED',
        },
        { status: 502 }
      );
    }

    console.info(`[Mellat Initiate][${trackingId}] Payment initiation succeeded in gateway:`, {
      trackingId,
      orderId,
      resultCode,
      refId,
    });

    // ذخیره رکورد تراکنش در دیتابیس به همراه متادیتای مرتبط
    const metadata = {
      type,
      installmentId: installmentId || null,
      requestId: requestId || null,
      courseId: paymentCourseId || null,
      amount,
      description,
    };

    await (prisma as any).academyPayment.create({
      data: {
        studentId: student.id,
        amount: BigInt(amount),
        method: 'mellat',
        trackingCode: String(orderId),
        description: JSON.stringify(metadata),
        courseId: paymentCourseId,
        paymentType: type,
      },
    });

    const startPayUrl = getStartPayUrl(refId);
    const gatewayUrl = `/academy/payment/gateway?refId=${encodeURIComponent(refId)}`;

    return NextResponse.json({
      success: true,
      redirectUrl: gatewayUrl,
      startPayUrl,
      refId,
      orderId,
      trackingId,
      metadata,
    });
  } catch (err: any) {
    console.error(`[Mellat Initiate][EXCEPTION] Unhandled exception in payment initiate route:`, {
      errorName: err?.name,
      errorCode: err?.code || 'N/A',
      errorMessage: err?.message,
      errorCause: err?.cause ? String(err.cause) : undefined,
      stack: err?.stack,
      timestamp: new Date().toISOString(),
    });
    const msg = err?.message || 'خطا در برقراری ارتباط با درگاه بهپرداخت ملت';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
