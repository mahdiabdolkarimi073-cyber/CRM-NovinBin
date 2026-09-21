import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('academy_token')?.value;
    if (!token) return NextResponse.json({ user: null }, { status: 401 });
    const payload = jwt.verify(token, JWT_SECRET) as { academyUserId: string };
    const account = await (prisma as any).academyUser.findUnique({ where: { id: payload.academyUserId } });
    if (!account || !account.active) return NextResponse.json({ user: null }, { status: 401 });
    return NextResponse.json({ user: { id: account.id, username: account.username, role: account.role, firstName: account.firstName, lastName: account.lastName, email: account.email, phone: account.phone, avatarUrl: account.avatarUrl } });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = req.cookies.get('academy_token')?.value;
    if (!token) return NextResponse.json({ error: 'نشست نامعتبر' }, { status: 401 });
    const payload = jwt.verify(token, JWT_SECRET) as { academyUserId: string };
    const account = await (prisma as any).academyUser.findUnique({ where: { id: payload.academyUserId } });
    if (!account || !account.active) return NextResponse.json({ error: 'حساب غیرفعال است' }, { status: 403 });

    const body = await req.json();
    const { firstName, lastName, email, phone } = body;

    await (prisma as any).academyUser.update({
      where: { id: account.id },
      data: {
        ...(firstName !== undefined ? { firstName } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(phone !== undefined ? { phone } : {}),
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'خطا در ذخیره‌سازی' }, { status: 500 });
  }
}