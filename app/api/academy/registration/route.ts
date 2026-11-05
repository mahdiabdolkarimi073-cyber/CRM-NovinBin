import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

function serialize(value: any): any {
  if (typeof value === 'bigint') return Number(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serialize(item)]));
  return value;
}

async function getStudent(req: NextRequest) {
  const token = req.cookies.get('academy_token')?.value;
  if (!token) return null;
  const payload = jwt.verify(token, JWT_SECRET) as { academyUserId: string };
  const student = await (prisma as any).academyUser.findUnique({ where: { id: payload.academyUserId } });
  return student?.active ? student : null;
}

export async function GET(req: NextRequest) {
  try {
    const student = await getStudent(req);
    if (!student) return NextResponse.json({ error: 'نشست نامعتبر' }, { status: 401 });

    const [enrollments, classOptions, requests] = await Promise.all([
      (prisma as any).academyCourseEnrollment.findMany({ where: { studentId: student.id, status: 'active' }, orderBy: { createdAt: 'desc' } }),
      (prisma as any).academyClassOption.findMany({ where: { active: true }, orderBy: { startDate: 'asc' } }),
      (prisma as any).academyRegistrationRequest.findMany({ where: { studentId: student.id }, orderBy: { createdAt: 'desc' } }),
    ]);

    const courseIds = Array.from(new Set(enrollments.map((item: any) => item.courseId).filter(Boolean)));
    const courses = courseIds.length ? await (prisma as any).academyCourse.findMany({ where: { id: { in: courseIds } } }) : [];
    const courseById = new Map<string, any>(courses.map((course: any) => [course.id, course]));
    const currentCourse = enrollments[0] ? courseById.get(enrollments[0].courseId) : null;
    const availableClasses = classOptions.map((item: any) => ({
      ...item,
      availableSeats: Math.max(0, item.capacity - item.enrolled),
      isFull: item.enrolled >= item.capacity,
    }));

    return NextResponse.json(serialize({
      user: { id: student.id, firstName: student.firstName, lastName: student.lastName, avatarUrl: student.avatarUrl },
      currentCourse: currentCourse ? { ...currentCourse, enrollmentId: enrollments[0].id } : null,
      availableClasses,
      requests,
    }));
  } catch {
    return NextResponse.json({ error: 'خطا در دریافت اطلاعات ثبت‌نام' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const student = await getStudent(req);
    if (!student) return NextResponse.json({ error: 'نشست نامعتبر' }, { status: 401 });
    const body = await req.json();
    const { action, classOptionId, targetCourseId, currentCourseId, note } = body;
    const allowed = ['renewal', 'enrollment', 'class_change', 'waitlist'];
    if (!allowed.includes(action)) return NextResponse.json({ error: 'نوع درخواست نامعتبر است' }, { status: 400 });

    let amount = 0;
    if (classOptionId) {
      const option = await (prisma as any).academyClassOption.findFirst({ where: { id: classOptionId, active: true } });
      if (!option) return NextResponse.json({ error: 'کلاس انتخاب‌شده یافت نشد' }, { status: 404 });
      if (action !== 'waitlist' && option.enrolled >= option.capacity) return NextResponse.json({ error: 'ظرفیت این کلاس تکمیل شده است' }, { status: 409 });
      amount = Number(option.fee);
    }

    if (action === 'class_change' && !targetCourseId) return NextResponse.json({ error: 'کلاس مقصد را انتخاب کنید' }, { status: 400 });
    if (['renewal', 'enrollment', 'waitlist'].includes(action) && !classOptionId) return NextResponse.json({ error: 'یک کلاس را انتخاب کنید' }, { status: 400 });

    const duplicate = await (prisma as any).academyRegistrationRequest.findFirst({
      where: { studentId: student.id, type: action, status: 'pending' },
    });
    if (duplicate) return NextResponse.json({ error: 'یک درخواست مشابه در حال بررسی دارید' }, { status: 409 });

    const request = await (prisma as any).academyRegistrationRequest.create({
      data: {
        studentId: student.id,
        type: action,
        currentCourseId: currentCourseId || null,
        targetCourseId: targetCourseId || null,
        classOptionId: classOptionId || null,
        note: note?.trim() || null,
        amount,
        paymentStatus: amount > 0 && action !== 'waitlist' ? 'pending' : 'unpaid',
      },
    });
    return NextResponse.json({ success: true, request: serialize(request) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'ثبت درخواست انجام نشد' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const student = await getStudent(req);
    if (!student) return NextResponse.json({ error: 'نشست نامعتبر' }, { status: 401 });
    const { requestId, action } = await req.json();
    const request = await (prisma as any).academyRegistrationRequest.findFirst({ where: { id: requestId, studentId: student.id } });
    if (!request) return NextResponse.json({ error: 'درخواست یافت نشد' }, { status: 404 });
    if (action === 'cancel') {
      if (request.status !== 'pending') return NextResponse.json({ error: 'این درخواست قابل لغو نیست' }, { status: 400 });
      const updated = await (prisma as any).academyRegistrationRequest.update({ where: { id: request.id }, data: { status: 'cancelled' } });
      return NextResponse.json({ success: true, request: serialize(updated) });
    }
    if (action === 'pay') {
      if (request.status !== 'pending' || request.paymentStatus === 'paid') return NextResponse.json({ error: 'این پرداخت قابل انجام نیست' }, { status: 400 });
      const trackingCode = `REG-${Date.now().toString().slice(-10)}`;
      const updated = await (prisma as any).academyRegistrationRequest.update({ where: { id: request.id }, data: { paymentStatus: 'paid', trackingCode } });
      await (prisma as any).academyReceipt.create({ data: { studentId: student.id, amount: request.amount, trackingCode, receivedDate: new Date() } });
      return NextResponse.json({ success: true, trackingCode, request: serialize(updated) });
    }
    return NextResponse.json({ error: 'عملیات نامعتبر است' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'عملیات انجام نشد' }, { status: 500 });
  }
}
