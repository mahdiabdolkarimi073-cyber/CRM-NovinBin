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
    const [enrollments, sessions, assignments] = await Promise.all([
      (prisma as any).academyCourseEnrollment.findMany({ where: { studentId, status: 'active' }, orderBy: { createdAt: 'desc' } }),
      (prisma as any).academyClassSession.findMany({ where: { studentId }, orderBy: { startsAt: 'asc' } }),
      (prisma as any).academyAssignment.findMany({ where: { studentId }, select: { score: true, status: true } }),
    ]);

    const courseIds = Array.from(new Set(enrollments.map((item: any) => item.courseId).filter(Boolean)));
    const courses = courseIds.length
      ? await (prisma as any).academyCourse.findMany({ where: { id: { in: courseIds } } })
      : [];
    const courseById = new Map<string, any>(courses.map((course: any) => [course.id, course]));
    const today = dayName(new Date());

    const classCards = enrollments.map((enrollment: any) => {
      const course = courseById.get(enrollment.courseId);
      const relatedSessions = sessions.filter((session: any) => session.courseId === enrollment.courseId);
      const firstSession = relatedSessions[0];
      return {
        id: enrollment.id,
        courseId: enrollment.courseId,
        course: course?.title || 'دوره بدون نام',
        code: course?.code || null,
        description: course?.description || course?.level || null,
        teacher: firstSession?.teacherName || course?.teacherName || null,
        room: enrollment.room || firstSession?.room || null,
        onlineUrl: enrollment.onlineUrl || firstSession?.onlineUrl || null,
        heldSessions: enrollment.heldSessions || 0,
        totalSessions: enrollment.totalSessions || 0,
        progress: enrollment.progress || 0,
        startDate: course?.startDate || null,
        endDate: course?.endDate || null,
        schedule: relatedSessions.map((session: any) => ({
          id: session.id,
          weekday: session.weekday || dayName(new Date(session.startsAt)),
          startsAt: session.startsAt,
          durationMin: session.durationMin,
          room: session.room || enrollment.room || null,
          onlineUrl: session.onlineUrl || enrollment.onlineUrl || null,
          title: session.title,
          teacherName: session.teacherName || course?.teacherName || null,
          status: session.status,
        })),
      };
    });

    const weeklySchedule = sessions.map((session: any) => {
      const course = courseById.get(session.courseId);
      return {
        id: session.id,
        courseId: session.courseId,
        weekday: session.weekday || dayName(new Date(session.startsAt)),
        title: session.title || course?.title || 'کلاس آموزشی',
        startsAt: session.startsAt,
        durationMin: session.durationMin,
        teacherName: session.teacherName || course?.teacherName || null,
        room: session.room || null,
        onlineUrl: session.onlineUrl || null,
        status: session.status,
      };
    });

    const scored = assignments.filter((assignment: any) => typeof assignment.score === 'number');
    const averageScore = scored.length
      ? Math.round((scored.reduce((sum: number, assignment: any) => sum + assignment.score, 0) / scored.length) * 10) / 10
      : 0;

    return NextResponse.json({
      user: { firstName: account.firstName, lastName: account.lastName, avatarUrl: account.avatarUrl },
      stats: {
        activeClasses: classCards.length,
        todaySessions: weeklySchedule.filter((item: any) => item.weekday === today).length,
        incompleteAssignments: assignments.filter((item: any) => ['pending', 'overdue'].includes(item.status)).length,
        averageScore,
      },
      classes: classCards,
      weeklySchedule,
    });
  } catch {
    return NextResponse.json({ error: 'خطا در دریافت کلاس‌ها' }, { status: 500 });
  }
}
