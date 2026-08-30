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

    if (account.role === 'admin') {
      return NextResponse.json({
        dashboardType: 'admin',
        user: { id: account.id, firstName: account.firstName, lastName: account.lastName, username: account.username, role: account.role, email: account.email, phone: account.phone, avatarUrl: account.avatarUrl },
      });
    }

    if (account.role === 'teacher') {
      const teacherName = `${account.firstName} ${account.lastName}`;
      const allCourses = await (prisma as any).academyCourse.findMany({ where: { active: true }, orderBy: { createdAt: 'desc' } });
      const teacherCourses = allCourses.filter((course: any) => course.teacherName?.trim() === teacherName);
      const courseIds = teacherCourses.map((course: any) => course.id);
      const teacherFilter = courseIds.length
        ? { OR: [{ courseId: { in: courseIds } }, { teacherName: teacherName }] }
        : { teacherName: teacherName };
      const sessions = await (prisma as any).academyClassSession.findMany({
        where: teacherFilter,
        orderBy: { startsAt: 'asc' },
      });
      const enrollments = courseIds.length
        ? await (prisma as any).academyCourseEnrollment.findMany({ where: { courseId: { in: courseIds }, status: 'active' } })
        : [];
      const assignments = courseIds.length
        ? await (prisma as any).academyAssignment.findMany({ where: { courseId: { in: courseIds }, status: { in: ['pending', 'overdue'] } }, orderBy: { dueDate: 'asc' }, take: 8 })
        : [];
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);
      const todaySessions = sessions.filter((session: any) => session.startsAt >= startOfDay && session.startsAt < endOfDay);
      const upcoming = sessions.find((session: any) => session.startsAt >= now && session.status === 'scheduled') || null;
      const recentAbsences = sessions.filter((session: any) => session.status === 'absent').slice(-5).reverse();
      const courseMap: Map<string, any> = new Map(teacherCourses.map((course: any) => [course.id, course]));
      const uniqueStudentCount = enrollments.length;
      const serializeSession = (session: any) => ({
        id: session.id,
        title: session.title || courseMap.get(session.courseId)?.title || 'کلاس آموزشگاه',
        courseId: session.courseId,
        startsAt: session.startsAt,
        durationMin: session.durationMin,
        weekday: session.weekday,
        room: session.room,
        status: session.status,
        attendanceNote: session.attendanceNote,
      });
      return NextResponse.json({
        dashboardType: 'teacher',
        user: { id: account.id, firstName: account.firstName, lastName: account.lastName, username: account.username, role: account.role, email: account.email, phone: account.phone, avatarUrl: account.avatarUrl },
        stats: { todayClasses: todaySessions.length, studentCount: uniqueStudentCount, recentAbsences: recentAbsences.length, pendingTasks: assignments.length },
        todayClasses: todaySessions.map(serializeSession),
        nextClass: upcoming ? serializeSession(upcoming) : null,
        recentAbsences: recentAbsences.map(serializeSession),
        pendingTasks: assignments.map((assignment: any) => ({ id: assignment.id, title: assignment.title, dueDate: assignment.dueDate, status: assignment.status })),
        weeklySchedule: sessions.map(serializeSession),
        myClasses: teacherCourses.map((course: any) => ({ id: course.id, title: course.title, level: course.level, teacherName: course.teacherName, studentCount: enrollments.filter((enrollment: any) => enrollment.courseId === course.id).length })),
      });
    }

    const studentId = account.id;

    const enrollments = await (prisma as any).academyCourseEnrollment.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
    const courseIds = enrollments.map((enrollment: any) => enrollment.courseId);
    const courses = courseIds.length
      ? await (prisma as any).academyCourse.findMany({ where: { id: { in: courseIds } } })
      : [];
    const courseMap: Map<string, any> = new Map(courses.map((course: any) => [course.id, course]));

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
        title: courseMap.get(e.courseId)?.title || 'دوره بدون نام',
        teacherName: courseMap.get(e.courseId)?.teacherName || null,
        level: courseMap.get(e.courseId)?.level || null,
        imageUrl: courseMap.get(e.courseId)?.imageUrl || null,
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
