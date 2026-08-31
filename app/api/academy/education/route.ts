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

export async function GET(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin) return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 });

  const [courses, terms, levels, syllabi, rooms, weeklySchedules, teachers] = await Promise.all([
    (prisma as any).academyCourse.findMany({ orderBy: { createdAt: 'desc' } }),
    (prisma as any).academyTerm.findMany({ orderBy: { createdAt: 'desc' } }),
    (prisma as any).academyLevel.findMany({ orderBy: { order: 'asc' } }),
    (prisma as any).academySyllabus.findMany({ include: { course: { select: { id: true, title: true } } }, orderBy: { order: 'asc' } }),
    (prisma as any).academyRoom.findMany({ orderBy: { createdAt: 'desc' } }),
    (prisma as any).academyWeeklySchedule.findMany({
      include: {
        course: { select: { id: true, title: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        room: { select: { id: true, name: true } },
      },
      orderBy: { weekday: 'asc' },
    }),
    (prisma as any).academyUser.findMany({ where: { role: 'teacher', active: true }, select: { id: true, firstName: true, lastName: true } }),
  ]);

  return NextResponse.json({
    courses: courses.map((c: any) => ({ id: c.id, title: c.title, code: c.code, description: c.description, teacherName: c.teacherName, level: c.level, imageUrl: c.imageUrl, startDate: c.startDate, endDate: c.endDate, active: c.active, createdAt: c.createdAt })),
    terms: terms.map((t: any) => ({ id: t.id, title: t.title, startDate: t.startDate, endDate: t.endDate, active: t.active, createdAt: t.createdAt })),
    levels: levels.map((l: any) => ({ id: l.id, title: l.title, code: l.code, order: l.order, createdAt: l.createdAt })),
    syllabi: syllabi.map((s: any) => ({ id: s.id, courseTitle: s.course?.title || '—', title: s.title, description: s.description, order: s.order, createdAt: s.createdAt })),
    rooms: rooms.map((r: any) => ({ id: r.id, name: r.name, capacity: r.capacity, active: r.active, createdAt: r.createdAt })),
    weeklySchedules: weeklySchedules.map((w: any) => ({
      id: w.id,
      courseTitle: w.course?.title || '—',
      teacherName: w.teacher ? `${w.teacher.firstName} ${w.teacher.lastName}` : '—',
      roomName: w.room?.name || '—',
      weekday: w.weekday,
      startTime: w.startTime,
      endTime: w.endTime,
      capacity: w.capacity,
      enrolled: w.enrolled,
    })),
    teachers: teachers.map((t: any) => ({ id: t.id, name: `${t.firstName} ${t.lastName}` })),
  });
}

export async function POST(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin) return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 });

  const body = await req.json();
  const { type, data } = body;

  if (!type || !data) return NextResponse.json({ error: 'پارامترهای ناقص' }, { status: 400 });

  let result;
  switch (type) {
    case 'course':
      result = await (prisma as any).academyCourse.create({ data: { title: data.title, code: data.code || null, description: data.description || null, teacherName: data.teacherName || null, level: data.level || null, active: data.active ?? true } });
      break;
    case 'term':
      result = await (prisma as any).academyTerm.create({ data: { title: data.title, startDate: data.startDate ? new Date(data.startDate) : new Date(), endDate: data.endDate ? new Date(data.endDate) : null, active: data.active ?? true } });
      break;
    case 'level':
      result = await (prisma as any).academyLevel.create({ data: { title: data.title, code: data.code || null, order: data.order || 0 } });
      break;
    case 'syllabus':
      result = await (prisma as any).academySyllabus.create({ data: { courseId: data.courseId || null, title: data.title, description: data.description || null, order: data.order || 0 } });
      break;
    case 'room':
      result = await (prisma as any).academyRoom.create({ data: { name: data.name, capacity: data.capacity || 0, active: data.active ?? true } });
      break;
    case 'weeklySchedule':
      result = await (prisma as any).academyWeeklySchedule.create({ data: { courseId: data.courseId || null, teacherId: data.teacherId || null, roomId: data.roomId || null, weekday: data.weekday, startTime: data.startTime, endTime: data.endTime, capacity: data.capacity || 0, enrolled: 0 } });
      break;
    case 'assignTeacher':
      if (!data.courseId || !data.teacherName) return NextResponse.json({ error: 'شناسه دوره و نام مدرس الزامی است' }, { status: 400 });
      result = await (prisma as any).academyCourse.update({ where: { id: data.courseId }, data: { teacherName: data.teacherName } });
      break;
    case 'moveStudent':
      if (!data.enrollmentId || !data.targetCourseId) return NextResponse.json({ error: 'شناسه ثبت‌نام و دوره هدف الزامی است' }, { status: 400 });
      result = await (prisma as any).academyCourseEnrollment.update({ where: { id: data.enrollmentId }, data: { courseId: data.targetCourseId } });
      break;
    default:
      return NextResponse.json({ error: 'نوع نامشخص' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, result: { id: result?.id } });
}

export async function PUT(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin) return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 });

  const body = await req.json();
  const { type, id, data } = body;
  if (!type || !id || !data) return NextResponse.json({ error: 'پارامترهای ناقص' }, { status: 400 });

  switch (type) {
    case 'course':
      await (prisma as any).academyCourse.update({ where: { id }, data: { title: data.title, code: data.code, description: data.description, teacherName: data.teacherName, level: data.level, active: data.active } });
      break;
    case 'term':
      await (prisma as any).academyTerm.update({ where: { id }, data: { title: data.title, startDate: data.startDate ? new Date(data.startDate) : undefined, endDate: data.endDate ? new Date(data.endDate) : undefined, active: data.active } });
      break;
    case 'level':
      await (prisma as any).academyLevel.update({ where: { id }, data: { title: data.title, code: data.code, order: data.order } });
      break;
    case 'room':
      await (prisma as any).academyRoom.update({ where: { id }, data: { name: data.name, capacity: data.capacity, active: data.active } });
      break;
    case 'weeklySchedule':
      await (prisma as any).academyWeeklySchedule.update({ where: { id }, data: { courseId: data.courseId, teacherId: data.teacherId, roomId: data.roomId, weekday: data.weekday, startTime: data.startTime, endTime: data.endTime, capacity: data.capacity } });
      break;
    default:
      return NextResponse.json({ error: 'نوع نامشخص' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin) return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id');
  if (!type || !id) return NextResponse.json({ error: 'پارامترهای ناقص' }, { status: 400 });

  switch (type) {
    case 'course':
      await (prisma as any).academyCourse.delete({ where: { id } });
      break;
    case 'term':
      await (prisma as any).academyTerm.delete({ where: { id } });
      break;
    case 'level':
      await (prisma as any).academyLevel.delete({ where: { id } });
      break;
    case 'syllabus':
      await (prisma as any).academySyllabus.delete({ where: { id } });
      break;
    case 'room':
      await (prisma as any).academyRoom.delete({ where: { id } });
      break;
    case 'weeklySchedule':
      await (prisma as any).academyWeeklySchedule.delete({ where: { id } });
      break;
    default:
      return NextResponse.json({ error: 'نوع نامشخص' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
