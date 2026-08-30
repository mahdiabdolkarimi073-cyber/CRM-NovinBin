import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const weekDays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

function dayName(date: Date) {
  const jsDay = date.getDay();
  return weekDays[(jsDay + 1) % 7];
}

function timeOnly(iso: string) {
  try {
    return new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  }
}

function jalaliDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleDateString('fa-IR');
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('academy_token')?.value;
    if (!token) return NextResponse.json({ error: 'نشست نامعتبر' }, { status: 401 });
    const payload = jwt.verify(token, JWT_SECRET) as { academyUserId: string };
    const account = await (prisma as any).academyUser.findUnique({ where: { id: payload.academyUserId } });
    if (!account || !account.active) return NextResponse.json({ error: 'حساب غیرفعال است' }, { status: 403 });
    if (account.role !== 'teacher') return NextResponse.json({ error: 'این صفحه فقط برای مدرس‌ها قابل دسترسی است' }, { status: 403 });

    const teacherName = `${account.firstName} ${account.lastName}`;
    const allCourses = await (prisma as any).academyCourse.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });
    const teacherCourses = allCourses.filter((course: any) => course.teacherName?.trim() === teacherName);
    const courseIds = teacherCourses.map((course: any) => course.id);

    const [enrollments, sessions] = await Promise.all([
      courseIds.length
        ? (prisma as any).academyCourseEnrollment.findMany({ where: { courseId: { in: courseIds } } })
        : [],
      courseIds.length
        ? (prisma as any).academyClassSession.findMany({
            where: { OR: [{ courseId: { in: courseIds } }, { teacherName: teacherName }] },
            orderBy: { startsAt: 'asc' },
          })
        : [],
    ]);

    const studentIds = Array.from(new Set(enrollments.map((e: any) => e.studentId)));
    const students = studentIds.length
      ? await (prisma as any).academyUser.findMany({ where: { id: { in: studentIds } } })
      : [];
    const studentById = new Map<string, any>(students.map((s: any) => [s.id, s]));

    const classes = teacherCourses.map((course: any) => {
      const courseEnrollments = enrollments.filter((e: any) => e.courseId === course.id);
      const courseSessions = sessions.filter((s: any) => s.courseId === course.id);
      const activeEnrollments = courseEnrollments.filter((e: any) => e.status === 'active');

      const studentList = activeEnrollments.map((e: any) => {
        const student = studentById.get(e.studentId);
        const studentSessions = courseSessions.filter((s: any) => s.studentId === e.studentId);
        const presentCount = studentSessions.filter((s: any) => s.status === 'present').length;
        const absentCount = studentSessions.filter((s: any) => s.status === 'absent').length;
        const lateCount = studentSessions.filter((s: any) => s.status === 'late').length;
        return {
          id: e.studentId,
          fullName: student ? `${student.firstName} ${student.lastName}` : 'دانش‌آموز نامشخص',
          phone: student?.phone || null,
          presentCount,
          absentCount,
          lateCount,
          attendanceRate: studentSessions.length > 0
            ? Math.round(((presentCount + lateCount) / studentSessions.length) * 100)
            : 0,
        };
      });

      const schedule = courseSessions
        .filter((s: any) => s.status === 'scheduled')
        .map((s: any) => ({
          weekday: s.weekday || dayName(new Date(s.startsAt)),
          startsAt: s.startsAt,
          time: timeOnly(s.startsAt),
          durationMin: s.durationMin,
        }));

      const uniqueSchedule = Array.from(
        schedule
          .reduce((map: Map<string, any>, item: any) => {
            const key = `${item.weekday}-${item.time}`;
            if (!map.has(key)) map.set(key, item);
            return map;
          }, new Map())
          .values()
      );

      const totalSessions = courseSessions.length;
      const presentTotal = courseSessions.filter((s: any) => s.status === 'present').length;
      const absentTotal = courseSessions.filter((s: any) => s.status === 'absent').length;
      const lateTotal = courseSessions.filter((s: any) => s.status === 'late').length;

      return {
        id: course.id,
        title: course.title,
        code: course.code || null,
        level: course.level || null,
        description: course.description || null,
        room: courseEnrollments[0]?.room || courseSessions[0]?.room || null,
        onlineUrl: courseEnrollments[0]?.onlineUrl || courseSessions[0]?.onlineUrl || null,
        startDate: course.startDate || null,
        endDate: course.endDate || null,
        studentCount: activeEnrollments.length,
        schedule: uniqueSchedule,
        students: studentList,
        attendance: {
          total: totalSessions,
          present: presentTotal,
          absent: absentTotal,
          late: lateTotal,
          rate: totalSessions > 0 ? Math.round(((presentTotal + lateTotal) / totalSessions) * 100) : 0,
        },
      };
    });

    const stats = {
      totalClasses: teacherCourses.length,
      totalStudents: studentIds.length,
      totalSessions: sessions.length,
      avgAttendance: classes.length > 0
        ? Math.round(classes.reduce((sum: number, c: any) => sum + c.attendance.rate, 0) / classes.length)
        : 0,
    };

    return NextResponse.json({
      user: {
        firstName: account.firstName,
        lastName: account.lastName,
        username: account.username,
        role: account.role,
        avatarUrl: account.avatarUrl,
      },
      stats,
      classes,
    });
  } catch {
    return NextResponse.json({ error: 'خطا در دریافت کلاس‌های مدرس' }, { status: 500 });
  }
}
