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

const weekdayLabels: Record<string, string> = {
  saturday: 'شنبه',
  sunday: 'یکشنبه',
  monday: 'دوشنبه',
  tuesday: 'سه‌شنبه',
  wednesday: 'چهارشنبه',
  thursday: 'پنجشنبه',
  friday: 'جمعه',
};

export async function GET(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin) return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 });

  const [weeklySchedules, courses, teachers, rooms, enrollments] = await Promise.all([
    (prisma as any).academyWeeklySchedule.findMany({
      include: {
        course: { select: { id: true, title: true, code: true, level: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        room: { select: { id: true, name: true, capacity: true } },
      },
      orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
    }),
    (prisma as any).academyCourse.findMany({ where: { active: true }, select: { id: true, title: true }, orderBy: { title: 'asc' } }),
    (prisma as any).academyUser.findMany({ where: { role: 'teacher', active: true }, select: { id: true, firstName: true, lastName: true } }),
    (prisma as any).academyRoom.findMany({ where: { active: true }, select: { id: true, name: true, capacity: true }, orderBy: { name: 'asc' } }),
    (prisma as any).academyCourseEnrollment.findMany({ where: { status: 'active' }, select: { id: true, courseId: true, studentId: true } }),
  ]);

  const enrollmentCount = new Map<string, number>();
  for (const e of enrollments) {
    const count = enrollmentCount.get(e.courseId) || 0;
    enrollmentCount.set(e.courseId, count + 1);
  }

  return NextResponse.json({
    classes: weeklySchedules.map((w: any) => ({
      id: w.id,
      courseId: w.courseId,
      courseTitle: w.course?.title || '—',
      courseCode: w.course?.code || null,
      courseLevel: w.course?.level || null,
      teacherId: w.teacherId,
      teacherName: w.teacher ? `${w.teacher.firstName} ${w.teacher.lastName}` : '—',
      roomId: w.roomId,
      roomName: w.room?.name || '—',
      roomCapacity: w.room?.capacity || 0,
      weekday: w.weekday,
      weekdayLabel: weekdayLabels[w.weekday] || w.weekday,
      startTime: w.startTime,
      endTime: w.endTime,
      capacity: w.capacity,
      enrolled: w.enrolled || 0,
      activeEnrolled: enrollmentCount.get(w.courseId) || 0,
    })),
    courses: courses.map((c: any) => ({ id: c.id, title: c.title })),
    teachers: teachers.map((t: any) => ({ id: t.id, name: `${t.firstName} ${t.lastName}` })),
    rooms: rooms.map((r: any) => ({ id: r.id, name: r.name, capacity: r.capacity })),
  });
}
