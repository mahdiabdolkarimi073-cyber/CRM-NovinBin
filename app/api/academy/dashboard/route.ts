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

    const studentId = account.id;

    const enrollments = await (prisma as any).academyCourseEnrollment.findMany({
      where: { studentId },
      include: { course: true },
      orderBy: { createdAt: 'desc' },
    });

    const upcomingClasses = await (prisma as any).academyClassSession.findMany({
      where: { studentId, startsAt: { gte: new Date() }, status: 'scheduled' },
      orderBy: { startsAt: 'asc' },
      take: 5,
    });

    const assignments = await (prisma as any).academyAssignment.findMany({
      where: { studentId, status: { in: ['pending', 'overdue'] } },
      orderBy: { dueDate: 'asc' },
      take: 5,
    });

    const notices = await (prisma as any).academyNotice.findMany({
      where: { OR: [{ studentId }, { studentId: null }] },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    const activeCourses = enrollments.filter((e: any) => e.status === 'active');
    const avgProgress = activeCourses.length
      ? Math.round(activeCourses.reduce((sum: number, e: any) => sum + (e.progress || 0), 0) / activeCourses.length)
      : 0;
    const pendingAssignments = assignments.length;
    const upcomingCount = upcomingClasses.length;
    const unpaidBalance = enrollments.reduce((sum: number, e: any) => sum + Number(e.fee) - Number(e.paid), 0);

    return NextResponse.json({
      user: {
        id: account.id,
        firstName: account.firstName,
        lastName: account.lastName,
        username: account.username,
        role: account.role,
        email: account.email,
        phone: account.phone,
        avatarUrl: account.avatarUrl,
      },
      stats: {
        activeCourses: activeCourses.length,
        upcomingClasses: upcomingCount,
        pendingAssignments,
        avgProgress,
        unpaidBalance,
      },
      courses: activeCourses.map((e: any) => ({
        id: e.courseId,
        title: e.course?.title || 'دوره بدون نام',
        teacherName: e.course?.teacherName || null,
        level: e.course?.level || null,
        imageUrl: e.course?.imageUrl || null,
        progress: e.progress || 0,
        status: e.status,
      })),
      upcomingClasses: upcomingClasses.map((c: any) => ({
        id: c.id,
        title: c.title,
        teacherName: c.teacherName,
        startsAt: c.startsAt,
        durationMin: c.durationMin,
      })),
      assignments: assignments.map((a: any) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        dueDate: a.dueDate,
        status: a.status,
      })),
      notices: notices.map((n: any) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        type: n.type,
        read: n.read,
        createdAt: n.createdAt,
      })),
    });
  } catch {
    return NextResponse.json({ error: 'خطا در دریافت اطلاعات داشبورد' }, { status: 500 });
  }
}
