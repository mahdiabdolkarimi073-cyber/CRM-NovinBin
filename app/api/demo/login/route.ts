import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
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

export async function POST(req: NextRequest) {
  const traceId = randomUUID();
  diagLog(traceId, 'demo_login_start', { method: req.method, url: req.url });

  try {
    const body = await req.json();
    let { slug, password } = body;

    diagLog(traceId, 'demo_login_body_parsed', { hasSlug: !!slug, hasPassword: !!password });
    console.log('[demo/login] Request received', { hasSlug: !!slug, hasPassword: !!password });

    if (!slug || !password) {
      diagLog(traceId, 'demo_login_missing_fields', { hasSlug: !!slug, hasPassword: !!password });
      console.log('[demo/login] Missing slug or password');
      return NextResponse.json({ error: 'slug و رمز عبور الزامی است' }, { status: 400 });
    }

    if (typeof slug === 'string') {
      try { slug = decodeURIComponent(slug); } catch {}
    }

    diagLog(traceId, 'demo_login_db_lookup_start', { slug });
    const demo = await prisma.demo.findUnique({
      where: { slug },
      include: { org: true },
    });

    diagLog(traceId, 'demo_login_db_lookup_result', { demoFound: !!demo, hasOrg: !!demo?.org });

    if (!demo) {
      diagLog(traceId, 'demo_login_demo_not_found', { slug });
      console.log('[demo/login] Demo not found', { slug });
      return NextResponse.json({ error: 'دمو یافت نشد' }, { status: 404 });
    }

    diagLog(traceId, 'demo_login_status_check', { slug, status: demo.status, isExpired: new Date() > demo.expiryDate });

    if (demo.status === 'expired' || new Date() > demo.expiryDate) {
      diagLog(traceId, 'demo_login_expired', { slug, status: demo.status });
      console.log('[demo/login] Demo expired', { slug, status: demo.status });
      return NextResponse.json({ error: 'این دمو منقضی شده است', expired: true }, { status: 403 });
    }

    if (demo.status === 'suspended') {
      diagLog(traceId, 'demo_login_suspended', { slug });
      console.log('[demo/login] Demo suspended', { slug });
      return NextResponse.json({ error: 'این دمو موقتاً غیرفعال شده است', suspended: true }, { status: 403 });
    }

    if (!demo.demoPassword) {
      diagLog(traceId, 'demo_login_no_password_set', { slug });
      console.log('[demo/login] No demo password set', { slug });
      return NextResponse.json({ error: 'رمز عبور تنظیم نشده است' }, { status: 500 });
    }

    const valid = bcrypt.compareSync(password, demo.demoPassword);
    diagLog(traceId, 'demo_login_password_check', { slug, passwordMatch: valid });

    if (!valid) {
      diagLog(traceId, 'demo_login_password_mismatch', { slug });
      console.log('[demo/login] Password mismatch', { slug });
      return NextResponse.json({ error: 'رمز عبور اشتباه است' }, { status: 401 });
    }

    if (!demo.demoUserId) {
      diagLog(traceId, 'demo_login_no_demo_user_id', { slug });
      console.log('[demo/login] No demo user ID', { slug });
      return NextResponse.json({ error: 'کاربر دمو یافت نشد' }, { status: 500 });
    }

    diagLog(traceId, 'demo_login_credentials_validated', { slug, demoUserId: demo.demoUserId });

    // Get the demo user's profile
    const demoProfile = await prisma.profile.findUnique({
      where: { id: demo.demoUserId },
    });

    diagLog(traceId, 'demo_login_profile_lookup_result', {
      slug,
      demoUserId: demo.demoUserId,
      profileFound: !!demoProfile,
      profileActive: demoProfile?.active,
    });

    if (!demoProfile || !demoProfile.active) {
      diagLog(traceId, 'demo_login_profile_inactive_or_missing', {
        slug,
        hasProfile: !!demoProfile,
        active: demoProfile?.active,
      });
      console.log('[demo/login] Demo profile inactive or missing', { slug, hasProfile: !!demoProfile, active: demoProfile?.active });
      return NextResponse.json({ error: 'حساب کاربری غیرفعال است' }, { status: 403 });
    }

    diagLog(traceId, 'demo_login_jwt_signing', { slug, demoUserId: demo.demoUserId });
    console.log('[demo/login] Credentials validated, signing JWT', { slug, demoUserId: demo.demoUserId });

    // Create JWT token with demo info
    const token = jwt.sign(
      {
        userId: demo.demoUserId,
        email: `demo+${demo.slug}@novinbin.ir`,
        role: demoProfile.role,
        demoSlug: demo.slug,
        demoOrgId: demo.orgId,
        demoExpiry: demo.expiryDate.toISOString(),
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    diagLog(traceId, 'demo_login_jwt_signed', { slug, demoUserId: demo.demoUserId, tokenLength: token.length, expiresIn: '1d' });

    // Update last activity
    await prisma.demo.update({
      where: { id: demo.id },
      data: { lastActivityAt: new Date() },
    });

    // Log login activity
    await prisma.demoActivity.create({
      data: {
        demoId: demo.id,
        orgId: demo.orgId,
        pagePath: `/demo/${demo.slug}`,
        action: 'login',
        duration: 0,
        metadata: { timestamp: new Date().toISOString() },
      },
    });

    const response = NextResponse.json({
      user: {
        id: demo.demoUserId,
        email: `demo+${demo.slug}@novinbin.ir`,
        phone: null,
        profile: demoProfile,
      },
      demo: {
        slug: demo.slug,
        name: demo.name,
        expiryDate: demo.expiryDate.toISOString(),
        startDate: demo.startDate.toISOString(),
        durationDays: demo.durationDays,
        modules: demo.modules,
      },
    });

    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24,
      path: '/',
    };

    response.cookies.set('token', token, cookieOptions);

    diagLog(traceId, 'demo_login_cookie_set', {
      slug,
      demoUserId: demo.demoUserId,
      cookieName: 'token',
      cookieOptions: { httpOnly: true, secure: true, sameSite: 'lax', maxAge: cookieOptions.maxAge, path: '/' },
      hasCookie: true,
    });
    console.log('[demo/login] Cookie set, login success', { slug, hasCookie: true });

    diagLog(traceId, 'demo_login_success_response', { slug, demoUserId: demo.demoUserId, httpStatus: 200 });
    return response;
  } catch (error: any) {
    diagError(traceId, 'demo_login_server_error', error);
    console.error('[demo/login] Server error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
