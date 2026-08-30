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
    return NextResponse.json({ user: { id: account.id, username: account.username, role: account.role, firstName: account.firstName, lastName: account.lastName, email: account.email } });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}