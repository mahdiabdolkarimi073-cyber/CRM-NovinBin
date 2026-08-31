import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

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
  const q = searchParams.get('q') || '';

  const where: any = { role: 'teacher' };
  if (q.trim()) {
    where.OR = [
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { username: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q } },
    ];
  }

  const teachers = await (prisma as any).academyUser.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: { id: true, firstName: true, lastName: true, username: true, phone: true, email: true, nationalId: true, active: true, createdAt: true },
  });

  const enriched = await Promise.all(
    teachers.map(async (t: any) => {
      const [activeClasses, specialties, schedules, settlements, evaluations, documents] = await Promise.all([
        (prisma as any).academyCourseEnrollment.count({ where: { status: 'active' } }).then(() => 0),
        (prisma as any).academyTeacherSpecialty.findMany({ where: { teacherId: t.id } }),
        (prisma as any).academyTeacherSchedule.findMany({ where: { teacherId: t.id } }),
        (prisma as any).academyTeacherSettlement.findMany({ where: { teacherId: t.id } }),
        (prisma as any).academyTeacherEvaluation.findMany({ where: { recordedBy: t.id } }),
        (prisma as any).academyTeacherDocument.findMany({ where: { teacherId: t.id } }),
      ]);

      const courses = await (prisma as any).academyCourse.findMany({ where: { teacherName: { contains: `${t.firstName} ${t.lastName}` } }, select: { id: true, title: true, level: true, active: true } });
      const activeCourses = courses.filter((c: any) => c.active).length;
      const totalSettled = settlements.filter((s: any) => s.status === 'settled').reduce((sum: number, s: any) => sum + Number(s.amount), 0);
      const totalPending = settlements.filter((s: any) => s.status === 'pending').reduce((sum: number, s: any) => sum + Number(s.amount), 0);
      const avgRating = evaluations.length > 0 ? evaluations.reduce((sum: number, e: any) => sum + (e.currentLevel ? 1 : 0), 0) / evaluations.length : 0;

      return {
        ...t,
        specialtyCount: specialties.length,
        scheduleCount: schedules.length,
        activeCourses,
        totalSettled,
        totalPending,
        documentCount: documents.length,
        evaluationCount: evaluations.length,
      };
    })
  );

  return NextResponse.json({ teachers: enriched });
}

export async function POST(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin) return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 });

  const body = await req.json();
  const { firstName, lastName, username, phone, email, nationalId, password } = body;

  if (!firstName || !lastName || !username || !password) {
    return NextResponse.json({ error: 'نام، نام خانوادگی، نام کاربری و رمز عبور الزامی است' }, { status: 400 });
  }

  const existing = await (prisma as any).academyUser.findUnique({ where: { username } });
  if (existing) return NextResponse.json({ error: 'این نام کاربری قبلاً ثبت شده است' }, { status: 400 });

  const passwordHash = await bcrypt.hash(password, 10);
  const teacher = await (prisma as any).academyUser.create({
    data: { firstName, lastName, username, phone, email, nationalId, passwordHash, role: 'teacher', active: true },
  });

  return NextResponse.json({ teacher: { id: teacher.id, firstName: teacher.firstName, lastName: teacher.lastName } });
}

export async function PUT(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin) return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 });

  const body = await req.json();
  const { id, firstName, lastName, phone, email, nationalId, active, password } = body;

  if (!id) return NextResponse.json({ error: 'شناسه مدرس الزامی است' }, { status: 400 });

  const data: any = { firstName, lastName, phone, email, nationalId };
  if (typeof active === 'boolean') data.active = active;
  if (password && password.length > 0) data.passwordHash = await bcrypt.hash(password, 10);
  Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

  await (prisma as any).academyUser.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}
