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
    if (!account || !account.active || account.role !== 'admin') return null;
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

  const where: any = { role: 'student' };
  if (q.trim()) {
    where.OR = [
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { username: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q } },
      { nationalId: { contains: q } },
    ];
  }

  const students = await (prisma as any).academyUser.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
      phone: true,
      email: true,
      nationalId: true,
      active: true,
      createdAt: true,
    },
  });

  const enriched = await Promise.all(
    students.map(async (s: any) => {
      const [enrollments, sessions] = await Promise.all([
        (prisma as any).academyCourseEnrollment.count({ where: { studentId: s.id, status: 'active' } }),
        (prisma as any).academyClassSession.count({ where: { studentId: s.id, status: 'absent' } }),
      ]);
      return { ...s, activeCourses: enrollments, absences: sessions };
    })
  );

  return NextResponse.json({ students: enriched });
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
  const student = await (prisma as any).academyUser.create({
    data: { firstName, lastName, username, phone, email, nationalId, passwordHash, role: 'student', active: true },
  });

  return NextResponse.json({ student: { id: student.id, firstName: student.firstName, lastName: student.lastName } });
}

export async function PUT(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin) return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 });

  const body = await req.json();
  const { id, firstName, lastName, phone, email, nationalId, active, password } = body;

  if (!id) return NextResponse.json({ error: 'شناسه دانش‌آموز الزامی است' }, { status: 400 });

  const data: any = { firstName, lastName, phone, email, nationalId };
  if (typeof active === 'boolean') data.active = active;
  if (password && password.length > 0) data.passwordHash = await bcrypt.hash(password, 10);

  // Remove undefined fields
  Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

  await (prisma as any).academyUser.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}
