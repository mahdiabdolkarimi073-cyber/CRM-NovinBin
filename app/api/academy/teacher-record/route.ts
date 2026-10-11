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

  const { searchParams } = new URL(req.url);
  const teacherId = searchParams.get('teacherId');
  if (!teacherId) return NextResponse.json({ error: 'شناسه مدرس الزامی است' }, { status: 400 });

  const teacher = await (prisma as any).academyUser.findUnique({
    where: { id: teacherId },
    select: { id: true, firstName: true, lastName: true, username: true, phone: true, email: true, nationalId: true, avatarUrl: true, active: true, createdAt: true },
  });
  if (!teacher || (teacher as any).role !== 'teacher') return NextResponse.json({ error: 'مدرس یافت نشد' }, { status: 404 });

  const [documents, specialties, schedules, settlements, evaluations, courses, sessions, shares] = await Promise.all([
    (prisma as any).academyTeacherDocument.findMany({ where: { teacherId }, orderBy: { createdAt: 'desc' } }),
    (prisma as any).academyTeacherSpecialty.findMany({ where: { teacherId }, orderBy: { createdAt: 'desc' } }),
    (prisma as any).academyTeacherSchedule.findMany({ where: { teacherId }, orderBy: { weekday: 'asc' } }),
    (prisma as any).academyTeacherSettlement.findMany({ where: { teacherId }, orderBy: { createdAt: 'desc' } }),
    (prisma as any).academyTeacherEvaluation.findMany({ where: { recordedBy: teacherId }, include: { course: { select: { id: true, title: true } } }, orderBy: { createdAt: 'desc' } }),
    (prisma as any).academyCourse.findMany({ where: { teacherName: { contains: `${teacher.firstName} ${teacher.lastName}` } }, orderBy: { createdAt: 'desc' } }),
    (prisma as any).academyClassSession.findMany({ where: { recordedBy: teacherId }, orderBy: { startsAt: 'desc' }, take: 50 }),
    (prisma as any).academyTeacherShare.findMany({ where: { teacherId }, orderBy: { createdAt: 'desc' } }),
  ]);

  const totalSettled = settlements.filter((s: any) => s.status === 'settled').reduce((sum: number, s: any) => sum + Number(s.amount), 0);
  const totalPending = settlements.filter((s: any) => s.status === 'pending').reduce((sum: number, s: any) => sum + Number(s.amount), 0);
  const totalShare = shares.reduce((sum: number, s: any) => sum + Number(s.amount), 0);
  const totalSharePaid = shares.filter((s: any) => s.status === 'paid').reduce((sum: number, s: any) => sum + Number(s.amount), 0);

  return NextResponse.json({
    teacher,
    summary: {
      activeCourses: courses.filter((c: any) => c.active).length,
      totalCourses: courses.length,
      totalSettled,
      totalPending,
      totalShare,
      totalSharePaid,
      totalSharePending: totalShare - totalSharePaid,
      documentCount: documents.length,
      specialtyCount: specialties.length,
      scheduleCount: schedules.length,
      evaluationCount: evaluations.length,
      absentCount: sessions.filter((s: any) => s.status === 'absent').length,
      presentCount: sessions.filter((s: any) => s.status === 'present').length,
    },
    documents: documents.map((d: any) => ({ id: d.id, title: d.title, fileName: d.fileName, fileUrl: d.fileUrl, createdAt: d.createdAt })),
    specialties: specialties.map((s: any) => ({ id: s.id, title: s.title, level: s.level, createdAt: s.createdAt })),
    schedules: schedules.map((s: any) => ({ id: s.id, weekday: s.weekday, startTime: s.startTime, endTime: s.endTime, room: s.room, courseId: s.courseId })),
    settlements: settlements.map((s: any) => ({ id: s.id, amount: Number(s.amount), period: s.period, status: s.status, settledAt: s.settledAt, createdAt: s.createdAt })),
    evaluations: evaluations.map((e: any) => ({ id: e.id, courseTitle: e.course?.title || '—', strengths: e.strengths, weaknesses: e.weaknesses, learningStatus: e.learningStatus, educationalSuggestion: e.educationalSuggestion, currentLevel: e.currentLevel, suggestedLevel: e.suggestedLevel, createdAt: e.createdAt })),
    courses: courses.map((c: any) => ({ id: c.id, title: c.title, level: c.level, active: c.active, createdAt: c.createdAt })),
    sessions: sessions.map((s: any) => ({ id: s.id, title: s.title, startsAt: s.startsAt, status: s.status, lateMinutes: s.lateMinutes, attendanceNote: s.attendanceNote })),
    shares: shares.map((s: any) => ({ id: s.id, courseId: s.courseId, percent: s.percent, amount: Number(s.amount), status: s.status, createdAt: s.createdAt })),
  });
}
