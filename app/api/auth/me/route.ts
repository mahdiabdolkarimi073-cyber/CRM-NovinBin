import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ user: null }, { headers: { 'Cache-Control': 'no-store' } });
    }

    let decoded: { userId: string };
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    } catch {
      // Invalid or expired token — treat as logged out
      return NextResponse.json({ user: null }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { profile: true },
    });

    if (!user || !user.profile) {
      return NextResponse.json({ user: null }, { headers: { 'Cache-Control': 'no-store' } });
    }

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          profile: user.profile,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    // DB connection error, Prisma error, or anything else — return null user
    // so the client can gracefully redirect to login
    return NextResponse.json(
      { user: null },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
