import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

async function getAdmin(req: NextRequest) {
  const token = req.cookies.get('academy_token')?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { academyUserId: string };
    const account = await (prisma as any).academyUser.findUnique({ where: { id: payload.academyUserId } });
    if (!account || !account.active || account.role !== 'AdminAcademy') return null;
    return account;
  } catch {
    return null;
  }
}

function serialize(value: any): any {
  if (typeof value === 'bigint') return Number(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serialize(item)]));
  return value;
}

export async function GET(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin) return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || undefined;

  const requests = await (prisma as any).academyRegistrationRequest.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const studentIds = [...new Set(requests.map((r: any) => r.studentId).filter(Boolean))];
  const students = studentIds.length
    ? await (prisma as any).academyUser.findMany({ where: { id: { in: studentIds } }, select: { id: true, firstName: true, lastName: true, username: true, phone: true } })
    : [];
  const studentMap = new Map(students.map((s: any) => [s.id, s]));

  const courseIds = [...new Set([...requests.map((r: any) => r.targetCourseId).filter(Boolean), ...requests.map((r: any) => r.currentCourseId).filter(Boolean)])];
  const courses = courseIds.length
    ? await (prisma as any).academyCourse.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } })
    : [];
  const courseMap = new Map(courses.map((c: any) => [c.id, c]));

  const result = requests.map((r: any) => {
    const student = studentMap.get(r.studentId);
    return {
      id: r.id,
      studentId: r.studentId,
      studentName: student ? `${student.firstName} ${student.lastName}` : '—',
      studentUsername: student?.username || '—',
      studentPhone: student?.phone || null,
      type: r.type,
      status: r.status,
      paymentStatus: r.paymentStatus,
      amount: Number(r.amount),
      trackingCode: r.trackingCode,
      note: r.note,
      currentCourseTitle: r.currentCourseId ? courseMap.get(r.currentCourseId)?.title || '—' : null,
      targetCourseTitle: r.targetCourseId ? courseMap.get(r.targetCourseId)?.title || '—' : null,
      createdAt: r.createdAt,
    };
  });

  return NextResponse.json(serialize({ requests: result }));
}

export async function PATCH(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin) return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 });

  const body = await req.json();
  const { requestId, action } = body;
  if (!requestId || !action) return NextResponse.json({ error: 'پارامترهای ناقص' }, { status: 400 });

  const request = await (prisma as any).academyRegistrationRequest.findUnique({ where: { id: requestId } });
  if (!request) return NextResponse.json({ error: 'درخواست یافت نشد' }, { status: 404 });
  if (request.status !== 'pending') return NextResponse.json({ error: 'این درخواست قبلاً بررسی شده است' }, { status: 400 });

  if (action === 'approve') {
    await (prisma as any).academyRegistrationRequest.update({
      where: { id: requestId },
      data: { status: 'approved' },
    });
    if (request.type === 'enrollment' && request.targetCourseId) {
      await (prisma as any).academyCourseEnrollment.create({
        data: {
          studentId: request.studentId,
          courseId: request.targetCourseId,
          status: 'active',
          fee: request.amount,
          paid: request.paymentStatus === 'paid' ? request.amount : BigInt(0),
        },
      }).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  }

  if (action === 'reject') {
    await (prisma as any).academyRegistrationRequest.update({
      where: { id: requestId },
      data: { status: 'rejected' },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'عملیات نامعتبر' }, { status: 400 });
}
