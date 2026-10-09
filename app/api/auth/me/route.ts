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

    let decoded: { userId: string; demoSlug?: string; demoOrgId?: string; demoExpiry?: string };
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string; demoSlug?: string; demoOrgId?: string; demoExpiry?: string };
    } catch {
      return NextResponse.json({ user: null }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // Server-side demo expiry check: if the demo has expired, treat user as logged out
    if (decoded.demoSlug && decoded.demoExpiry) {
      if (new Date(decoded.demoExpiry) < new Date()) {
        return NextResponse.json({ user: null, demoExpired: true }, { headers: { 'Cache-Control': 'no-store' } });
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { profile: true },
    });

    if (!user || !user.profile) {
      return NextResponse.json({ user: null }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // For demo users, also verify the demo still exists and is active/suspended
    if (decoded.demoSlug) {
      const demo = await prisma.demo.findFirst({
        where: { slug: decoded.demoSlug },
        select: { status: true, expiryDate: true },
      });
      if (!demo || demo.status === 'expired' || new Date() > demo.expiryDate) {
        return NextResponse.json({ user: null, demoExpired: true }, { headers: { 'Cache-Control': 'no-store' } });
      }
    }

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          profile: user.profile,
        },
        demo: decoded.demoSlug ? {
          slug: decoded.demoSlug,
          orgId: decoded.demoOrgId,
          expiry: decoded.demoExpiry,
        } : null,
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
