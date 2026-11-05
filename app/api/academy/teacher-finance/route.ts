import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

function serialize(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data === 'bigint') return Number(data);
  if (data instanceof Date) return data.toISOString();
  if (Array.isArray(data)) return data.map(serialize);
  if (typeof data === 'object') {
    const r: any = {};
    for (const k of Object.keys(data)) r[k] = serialize(data[k]);
    return r;
  }
  return data;
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('academy_token')?.value;
    if (!token) return NextResponse.json({ error: 'نشست نامعتبر' }, { status: 401 });
    const payload = jwt.verify(token, JWT_SECRET) as { academyUserId: string };
    const account = await (prisma as any).academyUser.findUnique({ where: { id: payload.academyUserId } });
    if (!account || !account.active) return NextResponse.json({ error: 'حساب غیرفعال است' }, { status: 403 });

    const teacherId = account.id;

    const [shares, settlements] = await Promise.all([
      (prisma as any).academyTeacherShare.findMany({
        where: { teacherId },
        include: { course: { select: { id: true, title: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      (prisma as any).academyTeacherSettlement.findMany({
        where: { teacherId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalShare = shares.reduce((s: number, t: any) => s + Number(t.amount), 0);
    const paidShare = shares.filter((t: any) => t.status === 'paid').reduce((s: number, t: any) => s + Number(t.amount), 0);
    const pendingShare = totalShare - paidShare;
    const totalSettled = settlements.filter((t: any) => t.status === 'settled').reduce((s: number, t: any) => s + Number(t.amount), 0);
    const pendingSettlement = settlements.filter((t: any) => t.status === 'pending').reduce((s: number, t: any) => s + Number(t.amount), 0);

    return NextResponse.json({
      user: {
        id: account.id,
        firstName: account.firstName,
        lastName: account.lastName,
        username: account.username,
        role: account.role,
        avatarUrl: account.avatarUrl,
      },
      summary: {
        totalShare,
        paidShare,
        pendingShare,
        totalSettled,
        pendingSettlement,
      },
      shares: serialize(shares.map((t: any) => ({
        id: t.id,
        courseTitle: t.course?.title || '—',
        percent: t.percent,
        amount: Number(t.amount),
        status: t.status,
        createdAt: t.createdAt,
      }))),
      settlements: serialize(settlements.map((t: any) => ({
        id: t.id,
        amount: Number(t.amount),
        period: t.period,
        status: t.status,
        settledAt: t.settledAt,
        createdAt: t.createdAt,
      }))),
    });
  } catch {
    return NextResponse.json({ error: 'خطا در دریافت اطلاعات مالی' }, { status: 500 });
  }
}
