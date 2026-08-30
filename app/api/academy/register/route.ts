import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const firstName = String(body.firstName || '').trim();
    const lastName = String(body.lastName || '').trim();
    const username = String(body.username || '').trim().toLowerCase();
    const email = String(body.email || '').trim().toLowerCase() || null;
    const password = String(body.password || '');
    if (!firstName || !lastName || !username || !password) return NextResponse.json({ error: 'نام، نام خانوادگی، نام کاربری و رمز عبور الزامی است' }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: 'رمز عبور باید حداقل ۶ کاراکتر باشد' }, { status: 400 });
    if (!/^[a-z0-9._-]{3,30}$/.test(username)) return NextResponse.json({ error: 'نام کاربری باید انگلیسی و حداقل ۳ کاراکتر باشد' }, { status: 400 });

    const existing = await (prisma as any).academyUser.findFirst({ where: { OR: [{ username }, ...(email ? [{ email }] : [])] } });
    if (existing) return NextResponse.json({ error: 'این نام کاربری یا ایمیل قبلاً ثبت شده است' }, { status: 409 });

    await (prisma as any).academyUser.create({ data: { firstName, lastName, username, email, phone: body.phone ? String(body.phone).trim() : null, passwordHash: bcrypt.hashSync(password, 10), role: 'student' } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'ثبت‌نام انجام نشد' }, { status: 500 });
  }
}