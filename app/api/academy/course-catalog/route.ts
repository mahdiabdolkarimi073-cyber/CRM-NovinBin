import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('academy_token')?.value;
    if (!token) return NextResponse.json({ error: 'نشست نامعتبر' }, { status: 401 });
    const payload = jwt.verify(token, JWT_SECRET) as { academyUserId: string };
    const account = await (prisma as any).academyUser.findUnique({ where: { id: payload.academyUserId } });
    if (!account || !account.active) return NextResponse.json({ error: 'حساب غیرفعال است' }, { status: 403 });

    const courses = await (prisma as any).academyCourse.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });

    const enrollments = await (prisma as any).academyCourseEnrollment.findMany({
      where: { studentId: account.id },
      select: { courseId: true, status: true },
    });
    const enrolledCourseIds = new Set(enrollments.map((e: any) => e.courseId));

    const allCourses = courses.map((c: any) => ({
      id: c.id,
      title: c.title,
      code: c.code || null,
      description: c.description || null,
      teacherName: c.teacherName || null,
      level: c.level || null,
      imageUrl: c.imageUrl || null,
      price: Number(c.price) || 0,
      startDate: c.startDate || null,
      endDate: c.endDate || null,
      enrolled: enrolledCourseIds.has(c.id),
    }));

    return NextResponse.json({
      courses: allCourses,
      user: { firstName: account.firstName, lastName: account.lastName, avatarUrl: account.avatarUrl },
    });
  } catch {
    return NextResponse.json({ error: 'خطا در دریافت دوره‌ها' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('academy_token')?.value;
    if (!token) return NextResponse.json({ error: 'نشست نامعتبر' }, { status: 401 });
    const payload = jwt.verify(token, JWT_SECRET) as { academyUserId: string };
    const account = await (prisma as any).academyUser.findUnique({ where: { id: payload.academyUserId } });
    if (!account || !account.active) return NextResponse.json({ error: 'حساب غیرفعال است' }, { status: 403 });

    const body = await req.json();
    const { courseId } = body;
    if (!courseId) return NextResponse.json({ error: 'شناسه دوره الزامی است' }, { status: 400 });

    const course = await (prisma as any).academyCourse.findFirst({ where: { id: courseId, active: true } });
    if (!course) return NextResponse.json({ error: 'دوره یافت نشد' }, { status: 404 });

    const existing = await (prisma as any).academyCourseEnrollment.findUnique({
      where: { studentId_courseId: { studentId: account.id, courseId: course.id } },
    });
    if (existing && existing.status === 'active') {
      return NextResponse.json({ error: 'شما قبلاً در این دوره ثبت‌نام کرده‌اید' }, { status: 400 });
    }

    if (Number(course.price) > 0) {
      return NextResponse.json({ error: 'این دوره نیاز به پرداخت دارد. از دکمه پرداخت استفاده کنید.' }, { status: 400 });
    }

    if (existing) {
      await (prisma as any).academyCourseEnrollment.update({
        where: { id: existing.id },
        data: { status: 'active' },
      });
    } else {
      await (prisma as any).academyCourseEnrollment.create({
        data: {
          studentId: account.id,
          courseId: course.id,
          fee: BigInt(0),
          paid: BigInt(0),
          status: 'active',
        },
      });
    }

    return NextResponse.json({ success: true, message: 'ثبت‌نام با موفقیت انجام شد' });
  } catch {
    return NextResponse.json({ error: 'خطا در ثبت‌نام' }, { status: 500 });
  }
}
