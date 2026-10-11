import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const weekDays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

function dayName(date: Date) {
  const jsDay = date.getDay();
  return weekDays[(jsDay + 1) % 7];
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('academy_token')?.value;
    if (!token) return NextResponse.json({ error: 'نشست نامعتبر' }, { status: 401 });
    const payload = jwt.verify(token, JWT_SECRET) as { academyUserId: string };
    const account = await (prisma as any).academyUser.findUnique({ where: { id: payload.academyUserId } });
    if (!account || !account.active) return NextResponse.json({ error: 'حساب غیرفعال است' }, { status: 403 });

    const studentId = account.id;

    const sessions = await (prisma as any).academyClassSession.findMany({
      where: { studentId, status: { in: ['present', 'absent', 'late'] } },
      orderBy: { startsAt: 'desc' },
    });

    const activeEnrollments = await (prisma as any).academyCourseEnrollment.findMany({
      where: { studentId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });
    const courseIds = Array.from(new Set(activeEnrollments.map((e: any) => e.courseId).filter(Boolean)));
    const courses = courseIds.length
      ? await (prisma as any).academyCourse.findMany({ where: { id: { in: courseIds } } })
      : [];
    const courseById = new Map<string, any>(courses.map((c: any) => [c.id, c]));

    let primaryEnrollment = activeEnrollments[0] || null;
    if (!primaryEnrollment && sessions.length) {
      const firstCourseId = sessions[0].courseId;
      primaryEnrollment = firstCourseId
        ? await (prisma as any).academyCourseEnrollment.findFirst({ where: { studentId, courseId: firstCourseId } })
        : null;
    }
    const primaryCourse = primaryEnrollment ? courseById.get(primaryEnrollment.courseId) : null;

    const classInfo = primaryEnrollment && primaryCourse
      ? {
          title: primaryCourse.title,
          level: primaryCourse.level || null,
          status: primaryEnrollment.status || 'active',
          schedule: primaryCourse.description || null,
        }
      : null;

    const sessionsForClass = primaryEnrollment
      ? sessions.filter((s: any) => s.courseId === primaryEnrollment.courseId)
      : sessions;

    const total = sessionsForClass.length;
    const presentCount = sessionsForClass.filter((s: any) => s.status === 'present').length;
    const absentCount = sessionsForClass.filter((s: any) => s.status === 'absent').length;
    const lateCount = sessionsForClass.filter((s: any) => s.status === 'late').length;
    const attendanceRate = total > 0 ? Math.round(((presentCount + lateCount) / total) * 100) : 0;

    const rows = sessionsForClass.map((s: any) => ({
      id: s.id,
      date: s.startsAt,
      day: s.weekday || dayName(new Date(s.startsAt)),
      status: s.status,
      lateMinutes: s.lateMinutes ?? null,
      note: s.attendanceNote ?? null,
    }));

    return NextResponse.json({
      user: { firstName: account.firstName, lastName: account.lastName, avatarUrl: account.avatarUrl },
      classInfo,
      stats: {
        total,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        attendanceRate,
      },
      sessions: rows,
    });
  } catch {
    return NextResponse.json({ error: 'خطا در دریافت حضور و غیاب' }, { status: 500 });
  }
}
