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
