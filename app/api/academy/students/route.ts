import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

function isValidStudentPassword(password: unknown): boolean {
  if (typeof password !== 'string') return false;
  return /^[0-9]{8,}$/.test(password);
}

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

  const where: any = { role: 'student' };
  if (q.trim()) {
    where.OR = [
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { username: { contains: q } },
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
  const { firstName, lastName, username, phone, nationalId, password } = body;

  if (!firstName || !lastName || !username || !password) {
    return NextResponse.json({ error: 'نام، نام خانوادگی، نام کاربری و رمز عبور الزامی است' }, { status: 400 });
  }
  if (!/^\d{11}$/.test(String(username).trim())) {
    return NextResponse.json({ error: 'نام کاربری باید دقیقاً ۱۱ رقم و فقط شامل ارقام انگلیسی (0-9) باشد' }, { status: 400 });
  }
  if (!isValidStudentPassword(password)) {
    return NextResponse.json({ error: 'رمز عبور باید حداقل ۸ رقم و فقط شامل اعداد انگلیسی باشد' }, { status: 400 });
  }

  const normalizedUsername = String(username).trim();
  const existing = await (prisma as any).academyUser.findUnique({ where: { username: normalizedUsername } });
  if (existing) return NextResponse.json({ error: 'این نام کاربری قبلاً ثبت شده است؛ نام کاربری دیگری انتخاب کنید' }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 10);
  const student = await (prisma as any).academyUser.create({
    data: { firstName: String(firstName).trim(), lastName: String(lastName).trim(), username: normalizedUsername, phone: phone || null, nationalId: nationalId || null, passwordHash, role: 'student', active: true },
  });

  return NextResponse.json({ student: { id: student.id, firstName: student.firstName, lastName: student.lastName } });
}

export async function PUT(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin) return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 });

  const body = await req.json();
  const { id, firstName, lastName, username, phone, nationalId, active, password } = body;

  if (!id) return NextResponse.json({ error: 'شناسه هنرجو الزامی است' }, { status: 400 });

  const target = await (prisma as any).academyUser.findUnique({ where: { id } });
  if (!target || target.role !== 'student') return NextResponse.json({ error: 'هنرجو یافت نشد' }, { status: 404 });

  const data: any = {};
  if (firstName !== undefined) data.firstName = String(firstName).trim();
  if (lastName !== undefined) data.lastName = String(lastName).trim();
  if (phone !== undefined) data.phone = phone || null;
  if (nationalId !== undefined) data.nationalId = nationalId || null;
  if (typeof active === 'boolean') data.active = active;

  if (username !== undefined && String(username).trim() !== target.username) {
    const newUsername = String(username).trim();
    if (!/^\d{11}$/.test(newUsername)) {
      return NextResponse.json({ error: 'نام کاربری باید دقیقاً ۱۱ رقم و فقط شامل ارقام انگلیسی (0-9) باشد' }, { status: 400 });
    }
    const dupe = await (prisma as any).academyUser.findUnique({ where: { username: newUsername } });
    if (dupe && dupe.id !== id) {
      return NextResponse.json({ error: 'این نام کاربری قبلاً ثبت شده است؛ نام کاربری دیگری انتخاب کنید' }, { status: 409 });
    }
    data.username = newUsername;
  }

  if (password && String(password).length > 0) {
    if (!isValidStudentPassword(password)) {
      return NextResponse.json({ error: 'رمز عبور باید حداقل ۸ رقم و فقط شامل اعداد انگلیسی باشد' }, { status: 400 });
    }
    data.passwordHash = await bcrypt.hash(password, 10);
  }

  await (prisma as any).academyUser.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin) return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'شناسه هنرجو الزامی است' }, { status: 400 });

  const student = await (prisma as any).academyUser.findUnique({ where: { id } });
  if (!student || student.role !== 'student') return NextResponse.json({ error: 'هنرجو یافت نشد' }, { status: 404 });

  try {
    await (prisma as any).$transaction([
      (prisma as any).academyCourseEnrollment.deleteMany({ where: { studentId: id } }),
      (prisma as any).academyStudentGrade.deleteMany({ where: { studentId: id } }),
      (prisma as any).academyClassSession.deleteMany({ where: { studentId: id } }),
      (prisma as any).academyInstallment.deleteMany({ where: { studentId: id } }),
      (prisma as any).academyInvoice.deleteMany({ where: { studentId: id } }),
      (prisma as any).academyReceipt.deleteMany({ where: { studentId: id } }),
      (prisma as any).academyContract.deleteMany({ where: { studentId: id } }),
      (prisma as any).academyStudentNote.deleteMany({ where: { studentId: id } }),
      (prisma as any).academyEducationRecord.deleteMany({ where: { studentId: id } }),
      (prisma as any).academyTeacherEvaluation.deleteMany({ where: { studentId: id } }),
      (prisma as any).academyDiscount.deleteMany({ where: { studentId: id } }),
      (prisma as any).academyPayment.deleteMany({ where: { studentId: id } }),
      (prisma as any).academyUser.delete({ where: { id } }),
    ]);
  } catch {
    return NextResponse.json({ error: 'حذف هنرجو ممکن نشد؛ سوابق مرتبط او را ابتدا بررسی کنید' }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
