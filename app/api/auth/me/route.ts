import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

function diagLog(traceId: string, step: string, info: Record<string, unknown>) {
  console.info(`[AUTH-DIAG] traceId=${traceId} step=${step}`, info);
}

function diagError(traceId: string, step: string, err: unknown) {
  const e = err as Error;
  console.error(`[AUTH-DIAG] traceId=${traceId} step=${step} ERROR`, {
    name: e?.name || 'Unknown',
    message: e?.message || String(err),
    stack: e?.stack || undefined,
  });
}

export async function GET(req: NextRequest) {
  const traceId = randomUUID();
  diagLog(traceId, 'me_start', { method: req.method, url: req.url });

  try {
    // Enumerate all cookies for diagnostics (names only, no values)
    const allCookieNames: string[] = [];
    req.cookies.getAll().forEach((c) => allCookieNames.push(c.name));

    const token = req.cookies.get('token')?.value;
    const hasTokenCookie = !!token;

    diagLog(traceId, 'me_cookie_check', {
      hasTokenCookie,
      allCookieNames,
      tokenLength: token?.length || 0,
    });

    if (!token) {
      diagLog(traceId, 'me_no_token_cookie', {
        allCookieNames,
        reason: 'No "token" cookie found in request',
        outcome: 'user=null',
      });
      console.log('[auth/me] No token cookie received');
      return NextResponse.json({ user: null }, { headers: { 'Cache-Control': 'no-store' } });
    }

    let decoded: { userId: string; demoSlug?: string; demoOrgId?: string; demoExpiry?: string };
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string; demoSlug?: string; demoOrgId?: string; demoExpiry?: string };
      diagLog(traceId, 'me_jwt_verified', {
        userId: decoded.userId,
        isDemo: !!decoded.demoSlug,
        hasDemoExpiry: !!decoded.demoExpiry,
        jwtSecretAvailable: !!JWT_SECRET,
        jwtSecretIsFallback: JWT_SECRET === 'fallback-secret',
      });
      console.log('[auth/me] JWT verified', { userId: decoded.userId, isDemo: !!decoded.demoSlug });
    } catch (jwtError) {
      const jwtErr = jwtError as Error;
      diagLog(traceId, 'me_jwt_verification_failed', {
        errorName: jwtErr?.name || 'Unknown',
        errorMessage: jwtErr?.message || String(jwtError),
        jwtSecretAvailable: !!JWT_SECRET,
        jwtSecretIsFallback: JWT_SECRET === 'fallback-secret',
        tokenLength: token.length,
        outcome: 'user=null',
      });
      console.log('[auth/me] JWT verification failed:', (jwtError as Error).message);
      return NextResponse.json({ user: null }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // Server-side demo expiry check: if the demo has expired, treat user as logged out
    if (decoded.demoSlug && decoded.demoExpiry) {
      if (new Date(decoded.demoExpiry) < new Date()) {
        diagLog(traceId, 'me_demo_expired', {
          demoSlug: decoded.demoSlug,
          demoExpiry: decoded.demoExpiry,
          now: new Date().toISOString(),
          outcome: 'user=null, demoExpired=true',
        });
        console.log('[auth/me] Demo expired, treating as logged out', { demoSlug: decoded.demoSlug });
        return NextResponse.json({ user: null, demoExpired: true }, { headers: { 'Cache-Control': 'no-store' } });
      }
      diagLog(traceId, 'me_demo_not_expired', { demoSlug: decoded.demoSlug, demoExpiry: decoded.demoExpiry });
    }

    let user;
    try {
      diagLog(traceId, 'me_db_lookup_start', { userId: decoded.userId });
      user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { profile: true },
      });
      diagLog(traceId, 'me_db_lookup_result', {
        userFound: !!user,
        hasProfile: !!user?.profile,
        userId: decoded.userId,
      });
    } catch (dbError) {
      diagError(traceId, 'me_db_lookup_error', dbError);
      // Database connection error — don't log the user out, return a retryable error
      console.error('[auth/me] Database error:', dbError);
      return NextResponse.json(
        { user: null, dbError: true },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (!user || !user.profile) {
      diagLog(traceId, 'me_user_not_found_in_db', {
        userId: decoded.userId,
        userFound: !!user,
        hasProfile: !!user?.profile,
        outcome: 'user=null',
        reason: !user ? 'User record not found' : 'Profile record not found',
      });
      console.log('[auth/me] User not found in DB after JWT decode', { userId: decoded.userId });
      return NextResponse.json({ user: null }, { headers: { 'Cache-Control': 'no-store' } });
    }

    diagLog(traceId, 'me_user_found', { userId: user.id, profileId: user.profile?.id, isDemo: !!decoded.demoSlug });

    // For demo users, also verify the demo still exists and is active/suspended
    if (decoded.demoSlug) {
      try {
        diagLog(traceId, 'me_demo_check_start', { demoSlug: decoded.demoSlug });
        const demo = await prisma.demo.findFirst({
          where: { slug: decoded.demoSlug },
          select: { status: true, expiryDate: true },
        });
        diagLog(traceId, 'me_demo_check_result', {
          demoFound: !!demo,
          demoStatus: demo?.status,
          demoExpired: !demo || demo.status === 'expired' || new Date() > demo.expiryDate,
        });
        if (!demo || demo.status === 'expired' || new Date() > demo.expiryDate) {
          diagLog(traceId, 'me_demo_invalid_or_expired', {
            demoSlug: decoded.demoSlug,
            demoFound: !!demo,
            demoStatus: demo?.status,
            outcome: 'user=null, demoExpired=true',
          });
          return NextResponse.json({ user: null, demoExpired: true }, { headers: { 'Cache-Control': 'no-store' } });
        }
      } catch (dbError) {
        diagError(traceId, 'me_demo_check_db_error', dbError);
        // Database error checking demo status — don't log the user out
        console.error('[auth/me] Demo check DB error:', dbError);
        return NextResponse.json(
          { user: null, dbError: true },
          { status: 200, headers: { 'Cache-Control': 'no-store' } }
        );
      }
    }

    diagLog(traceId, 'me_success', { userId: user.id, isDemo: !!decoded.demoSlug, httpStatus: 200 });
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
    diagError(traceId, 'me_unexpected_error', error);
    // Unexpected error — return null user so the client can gracefully redirect
    console.error('[auth/me] Unexpected error:', error);
    return NextResponse.json(
      { user: null },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
