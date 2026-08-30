import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const weekDays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

function dayName(date: Date) {
  return weekDays[(date.getDay() + 1) % 7];
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

const VALID_STATUSES = ['present', 'absent', 'late', 'excused', 'unexcused', 'scheduled'];

async function getTeacher(req: NextRequest): Promise<any | null> {
  const token = req.cookies.get('academy_token')?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { academyUserId: string };
    const account = await (prisma as any).academyUser.findUnique({ where: { id: payload.academyUserId } });
    if (!account || !account.active || account.role !== 'teacher') return null;
    return account;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const account = await getTeacher(req);
    if (!account) return NextResponse.json({ error: 'دسترسی نامعتبر' }, { status: 403 });

    const teacherName = `${account.firstName} ${account.lastName}`;
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');

    const allCourses = await (prisma as any).academyCourse.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });
    const teacherCourses = allCourses.filter((c: any) => c.teacherName?.trim() === teacherName);
    const courseIds = teacherCourses.map((c: any) => c.id);

    if (classId && !courseIds.includes(classId)) {
      return NextResponse.json({ error: 'این کلاس متعلق به شما نیست' }, { status: 403 });
    }

    const targetCourseIds = classId ? [classId] : courseIds;

    const enrollments = targetCourseIds.length
      ? await (prisma as any).academyCourseEnrollment.findMany({
          where: { courseId: { in: targetCourseIds }, status: 'active' },
        })
      : [];

    const studentIds = Array.from(new Set(enrollments.map((e: any) => e.studentId)));
    const students = studentIds.length
      ? await (prisma as any).academyUser.findMany({ where: { id: { in: studentIds } } })
      : [];
    const studentById = new Map<string, any>(students.map((s: any) => [s.id, s]));

    const sessions = targetCourseIds.length
      ? await (prisma as any).academyClassSession.findMany({
          where: { OR: [{ courseId: { in: targetCourseIds } }, { teacherName: teacherName }] },
          orderBy: { startsAt: 'asc' },
        })
      : [];

    const classes = teacherCourses.map((course: any) => {
      const courseEnrollments = enrollments.filter((e: any) => e.courseId === course.id);
      const courseSessions = sessions.filter((s: any) => s.courseId === course.id);

      const studentList = courseEnrollments.map((e: any) => {
        const student = studentById.get(e.studentId);
        const studentSessions = courseSessions.filter((s: any) => s.studentId === e.studentId);
        return {
          id: e.studentId,
          fullName: student ? `${student.firstName} ${student.lastName}` : 'دانش‌آموز نامشخص',
          presentCount: studentSessions.filter((s: any) => s.status === 'present').length,
          absentCount: studentSessions.filter((s: any) => s.status === 'absent').length,
          lateCount: studentSessions.filter((s: any) => s.status === 'late').length,
          excusedCount: studentSessions.filter((s: any) => s.status === 'excused').length,
          unexcusedCount: studentSessions.filter((s: any) => s.status === 'unexcused').length,
        };
      });

      const sessionList = courseSessions.map((s: any) => {
        const student = studentById.get(s.studentId);
        return {
          id: s.id,
          studentId: s.studentId,
          studentName: student ? `${student.firstName} ${student.lastName}` : 'نامشخص',
          startsAt: s.startsAt,
          weekday: s.weekday || dayName(new Date(s.startsAt)),
          time: timeOnly(s.startsAt),
          durationMin: s.durationMin,
          status: s.status,
          lateMinutes: s.lateMinutes ?? null,
          note: s.attendanceNote ?? null,
        };
      });

      const presentTotal = courseSessions.filter((s: any) => s.status === 'present').length;
      const absentTotal = courseSessions.filter((s: any) => s.status === 'absent').length;
      const lateTotal = courseSessions.filter((s: any) => s.status === 'late').length;
      const excusedTotal = courseSessions.filter((s: any) => s.status === 'excused').length;
      const unexcusedTotal = courseSessions.filter((s: any) => s.status === 'unexcused').length;
      const total = courseSessions.length;

      return {
        id: course.id,
        title: course.title,
        level: course.level || null,
        studentCount: courseEnrollments.length,
        sessionCount: courseSessions.length,
        students: studentList,
        sessions: sessionList,
        attendance: {
          total,
          present: presentTotal,
          absent: absentTotal,
          late: lateTotal,
          excused: excusedTotal,
          unexcused: unexcusedTotal,
          rate: total > 0 ? Math.round(((presentTotal + lateTotal) / total) * 100) : 0,
        },
      };
    });

    return NextResponse.json({
      user: {
        firstName: account.firstName,
        lastName: account.lastName,
        username: account.username,
        avatarUrl: account.avatarUrl,
      },
      classes,
    });
  } catch {
    return NextResponse.json({ error: 'خطا در دریافت داده‌های حضور و غیاب' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const account = await getTeacher(req);
    if (!account) return NextResponse.json({ error: 'دسترسی نامعتبر' }, { status: 403 });

    const body = await req.json();
    const { sessionId, status, lateMinutes, note } = body as {
      sessionId?: string;
      status?: string;
      lateMinutes?: number | null;
      note?: string | null;
    };

    if (!sessionId || !status) {
      return NextResponse.json({ error: 'شناسه جلسه و وضعیت الزامی است' }, { status: 400 });
    }
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'وضعیت نامعتبر است' }, { status: 400 });
    }

    const session = await (prisma as any).academyClassSession.findUnique({ where: { id: sessionId } });
    if (!session) return NextResponse.json({ error: 'جلسه یافت نشد' }, { status: 404 });

    const teacherName = `${account.firstName} ${account.lastName}`;
    if (session.teacherName?.trim() !== teacherName) {
      const course = session.courseId
        ? await (prisma as any).academyCourse.findUnique({ where: { id: session.courseId } })
        : null;
      if (!course || course.teacherName?.trim() !== teacherName) {
        return NextResponse.json({ error: 'این جلسه متعلق به شما نیست' }, { status: 403 });
      }
    }

    const updateData: any = {
      status,
      recordedBy: account.id,
    };
    if (status === 'late') {
      updateData.lateMinutes = lateMinutes != null ? Number(lateMinutes) : null;
    } else {
      updateData.lateMinutes = null;
    }
    if (note != null) updateData.attendanceNote = note.trim() || null;

    const updated = await (prisma as any).academyClassSession.update({
      where: { id: sessionId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      session: {
        id: updated.id,
        status: updated.status,
        lateMinutes: updated.lateMinutes,
        note: updated.attendanceNote,
      },
    });
  } catch {
    return NextResponse.json({ error: 'خطا در ثبت وضعیت حضور و غیاب' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const account = await getTeacher(req);
    if (!account) return NextResponse.json({ error: 'دسترسی نامعتبر' }, { status: 403 });

    const body = await req.json();
    const { updates } = body as { updates?: Array<{ sessionId: string; status: string; lateMinutes?: number | null; note?: string | null }> };

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'لیست به‌روزرسانی‌ها الزامی است' }, { status: 400 });
    }

    const teacherName = `${account.firstName} ${account.lastName}`;
    const results: any[] = [];

    for (const item of updates) {
      if (!item.sessionId || !item.status || !VALID_STATUSES.includes(item.status)) {
        results.push({ sessionId: item.sessionId, success: false, error: 'داده نامعتبر' });
        continue;
      }
      const session = await (prisma as any).academyClassSession.findUnique({ where: { id: item.sessionId } });
      if (!session) {
        results.push({ sessionId: item.sessionId, success: false, error: 'جلسه یافت نشد' });
        continue;
      }
      if (session.teacherName?.trim() !== teacherName) {
        const course = session.courseId
          ? await (prisma as any).academyCourse.findUnique({ where: { id: session.courseId } })
          : null;
        if (!course || course.teacherName?.trim() !== teacherName) {
          results.push({ sessionId: item.sessionId, success: false, error: 'دسترسی ندارید' });
          continue;
        }
      }

      const updateData: any = { status: item.status, recordedBy: account.id };
      if (item.status === 'late') {
        updateData.lateMinutes = item.lateMinutes != null ? Number(item.lateMinutes) : null;
      } else {
        updateData.lateMinutes = null;
      }
      if (item.note != null) updateData.attendanceNote = item.note.trim() || null;

      await (prisma as any).academyClassSession.update({ where: { id: item.sessionId }, data: updateData });
      results.push({ sessionId: item.sessionId, success: true });
    }

    return NextResponse.json({ success: true, results });
  } catch {
    return NextResponse.json({ error: 'خطا در به‌روزرسانی دسته‌ای' }, { status: 500 });
  }
}
