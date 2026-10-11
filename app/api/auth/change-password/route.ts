import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let auth: { userId: string; email: string } | null = null;
  try {
    auth = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'رمز فعلی و رمز جدید الزامی است' }, { status: 400 });
  }
  if (String(newPassword).length < 6) {
    return NextResponse.json({ error: 'رمز جدید باید حداقل ۶ کاراکتر باشد' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (!user) return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });

    const valid = bcrypt.compareSync(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'رمز فعلی اشتباه است' }, { status: 401 });
    }

    const newHash = bcrypt.hashSync(String(newPassword), 10);
    await prisma.user.update({
      where: { id: auth.userId },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'تغییر رمز ناموفق' }, { status: 500 });
  }
}
