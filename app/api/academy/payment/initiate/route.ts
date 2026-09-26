import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { bpPayRequest, getStartPayUrl, getCallbackUrl } from '@/lib/mellat';

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
    if (!student) return NextResponse.json({ error: 'نشست نامعتبر' }, { status: 401 });

    const body = await req.json();
    const { type, installmentId, requestId, courseId } = body;

    let amount = 0;
    let description = '';
    let paymentCourseId: string | null = null;

    if (type === 'installment' && installmentId) {
      const installment = await (prisma as any).academyInstallment.findFirst({ where: { id: installmentId, studentId: student.id } });
      if (!installment) return NextResponse.json({ error: 'قسط یافت نشد' }, { status: 404 });
      if (installment.status === 'paid') return NextResponse.json({ error: 'این قسط قبلاً پرداخت شده است' }, { status: 400 });
      amount = Number(installment.amount);
      description = 'قسط شماره ' + installment.installmentNo;
      paymentCourseId = installment.courseId || null;
    } else if (type === 'registration' && requestId) {
      const request = await (prisma as any).academyRegistrationRequest.findFirst({ where: { id: requestId, studentId: student.id } });
      if (!request) return NextResponse.json({ error: 'درخواست یافت نشد' }, { status: 404 });
      if (request.paymentStatus === 'paid') return NextResponse.json({ error: 'این درخواست قبلاً پرداخت شده است' }, { status: 400 });
      if (request.status !== 'pending') return NextResponse.json({ error: 'این درخواست قابل پرداخت نیست' }, { status: 400 });
      amount = Number(request.amount);
      description = 'ثبت‌نام دوره';
      paymentCourseId = request.targetCourseId || null;
    } else if (type === 'course' && courseId) {
      const course = await (prisma as any).academyCourse.findFirst({ where: { id: courseId, active: true } });
      if (!course) return NextResponse.json({ error: 'دوره یافت نشد' }, { status: 404 });
      const existing = await (prisma as any).academyCourseEnrollment.findUnique({ where: { studentId_courseId: { studentId: student.id, courseId: course.id } } });
      if (existing && existing.status === 'active') return NextResponse.json({ error: 'شما در این دوره ثبت‌نام کرده‌اید' }, { status: 400 });
      amount = Number(course.price);
      if (amount <= 0) return NextResponse.json({ error: 'این دوره رایگان است و نیازی به پرداخت ندارد' }, { status: 400 });
      description = 'ثبت‌نام در دوره: ' + course.title;
      paymentCourseId = course.id;
    } else {
      return NextResponse.json({ error: 'نوع پرداخت نامعتبر است' }, { status: 400 });
    }

    if (amount <= 0) return NextResponse.json({ error: 'مبلغ پرداخت باید بزرگتر از صفر باشد' }, { status: 400 });

    const orderId = Math.floor(Date.now() / 1000) % 100000000;
    const callBackUrl = getCallbackUrl();

    const { resultCode, refId } = await bpPayRequest(orderId, amount, callBackUrl);

    if (resultCode !== '0') {
      return NextResponse.json({ error: 'خطا در اتصال به درگاه پرداخت (کد: ' + resultCode + ')' }, { status: 500 });
    }

    await (prisma as any).academyPayment.create({
      data: {
        studentId: student.id,
        amount: BigInt(amount),
        method: 'mellat',
        trackingCode: String(orderId),
        description: description,
        courseId: paymentCourseId,
        paymentType: type,
      },
    });

    const startPayUrl = getStartPayUrl(refId);

    return NextResponse.json({
      success: true,
      redirectUrl: startPayUrl,
      refId,
      orderId,
      metadata: { type, installmentId: installmentId || null, requestId: requestId || null, courseId: courseId || null, amount },
    });
  } catch (err) {
    console.error('[mellat-initiate] error', err);
    return NextResponse.json({ error: 'خطا در شروع پرداخت' }, { status: 500 });
  }
}
