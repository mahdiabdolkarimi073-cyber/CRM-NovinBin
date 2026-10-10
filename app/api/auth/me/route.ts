import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) {
      console.log('[auth/me] No token cookie received');
      return NextResponse.json({ user: null }, { headers: { 'Cache-Control': 'no-store' } });
    }

    let decoded: { userId: string; demoSlug?: string; demoOrgId?: string; demoExpiry?: string };
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string; demoSlug?: string; demoOrgId?: string; demoExpiry?: string };
      console.log('[auth/me] JWT verified', { userId: decoded.userId, isDemo: !!decoded.demoSlug });
    } catch (jwtError) {
      console.log('[auth/me] JWT verification failed:', (jwtError as Error).message);
      return NextResponse.json({ user: null }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // Server-side demo expiry check: if the demo has expired, treat user as logged out
    if (decoded.demoSlug && decoded.demoExpiry) {
      if (new Date(decoded.demoExpiry) < new Date()) {
        console.log('[auth/me] Demo expired, treating as logged out', { demoSlug: decoded.demoSlug });
        return NextResponse.json({ user: null, demoExpired: true }, { headers: { 'Cache-Control': 'no-store' } });
      }
    }

    let user;
    try {
      user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { profile: true },
      });
    } catch (dbError) {
      // Database connection error — don't log the user out, return a retryable error
      console.error('[auth/me] Database error:', dbError);
      return NextResponse.json(
        { user: null, dbError: true },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (!user || !user.profile) {
      console.log('[auth/me] User not found in DB after JWT decode', { userId: decoded.userId });
      return NextResponse.json({ user: null }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // For demo users, also verify the demo still exists and is active/suspended
    if (decoded.demoSlug) {
      try {
        const demo = await prisma.demo.findFirst({
          where: { slug: decoded.demoSlug },
          select: { status: true, expiryDate: true },
        });
        if (!demo || demo.status === 'expired' || new Date() > demo.expiryDate) {
          return NextResponse.json({ user: null, demoExpired: true }, { headers: { 'Cache-Control': 'no-store' } });
        }
      } catch (dbError) {
        // Database error checking demo status — don't log the user out
        console.error('[auth/me] Demo check DB error:', dbError);
        return NextResponse.json(
          { user: null, dbError: true },
          { status: 200, headers: { 'Cache-Control': 'no-store' } }
        );
      }
    }

    console.log('[auth/me] Success, returning user', { userId: user.id, isDemo: !!decoded.demoSlug });
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
    // Unexpected error — return null user so the client can gracefully redirect
    console.error('[auth/me] Unexpected error:', error);
    return NextResponse.json(
      { user: null },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
