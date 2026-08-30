import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export async function POST(req: NextRequest) {
  try {
    const { identifier, password } = await req.json();
    if (!identifier || !password) return NextResponse.json({ error: 'نام کاربری و رمز عبور الزامی است' }, { status: 400 });

    const account = await (prisma as any).academyUser.findFirst({
      where: { OR: [{ username: String(identifier).trim().toLowerCase() }, { email: String(identifier).trim().toLowerCase() }] },
    });
    if (!account || !account.active || !bcrypt.compareSync(String(password), account.passwordHash)) {
      return NextResponse.json({ error: 'نام کاربری یا رمز عبور اشتباه است' }, { status: 401 });
    }

    const token = jwt.sign({ academyUserId: account.id, role: account.role, username: account.username }, JWT_SECRET, { expiresIn: '7d' });
    const response = NextResponse.json({ user: { id: account.id, username: account.username, role: account.role, firstName: account.firstName, lastName: account.lastName } });
    response.cookies.set('academy_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/' });
    return response;
  } catch {
    return NextResponse.json({ error: 'خطای سرور در ورود' }, { status: 500 });
  }
}