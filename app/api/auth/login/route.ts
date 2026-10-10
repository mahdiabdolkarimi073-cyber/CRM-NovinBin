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

// POST /api/auth/login
// Body: { email?, phone?, password }
// Supports login by email OR phone. At least one identifier is required.
export async function POST(req: NextRequest) {
  const traceId = randomUUID();
  diagLog(traceId, 'login_start', { method: req.method, url: req.url });

  try {
    const body = await req.json();
    const { email, phone, password } = body;

    diagLog(traceId, 'login_body_parsed', {
      hasEmail: !!email,
      hasPhone: !!phone,
      hasPassword: !!password,
      identifier: email || phone || 'none',
    });

    console.log('[auth/login] Request received', {
      hasEmail: !!email,
      hasPhone: !!phone,
      hasPassword: !!password,
      identifier: email || phone || 'none',
    });

    if (!password) {
      diagLog(traceId, 'login_missing_password', {});
      console.log('[auth/login] Missing password');
      return NextResponse.json({ error: 'رمز عبور الزامی است' }, { status: 400 });
    }
    if (!email && !phone) {
      diagLog(traceId, 'login_missing_identifier', {});
      console.log('[auth/login] Missing identifier (email and phone)');
      return NextResponse.json({ error: 'ایمیل یا شماره موبایل الزامی است' }, { status: 400 });
    }

    let user = null as any;

    if (email) {
      diagLog(traceId, 'login_db_lookup_email', { emailPrefix: email.toLowerCase().substring(0, 3) + '***' });
      try {
        user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: { profile: true },
        });
        diagLog(traceId, 'login_db_lookup_email_result', { userFound: !!user, hasProfile: !!user?.profile });
      } catch (dbErr) {
        diagError(traceId, 'login_db_lookup_email_error', dbErr);
        throw dbErr;
      }
    }

    if (!user && phone) {
      diagLog(traceId, 'login_db_lookup_phone', { phonePrefix: phone.trim().substring(0, 3) + '***' });
      try {
        user = await prisma.user.findFirst({
          where: { phone: phone.trim() },
          include: { profile: true },
        });
        diagLog(traceId, 'login_db_lookup_phone_result', { userFound: !!user, hasProfile: !!user?.profile });
      } catch (dbErr) {
        diagError(traceId, 'login_db_lookup_phone_error', dbErr);
        throw dbErr;
      }
    }

    if (!user || !user.profile) {
      diagLog(traceId, 'login_user_not_found', { hasEmail: !!email, hasPhone: !!phone, userFound: !!user, hasProfile: !!user?.profile });
      console.log('[auth/login] User not found', { hasEmail: !!email, hasPhone: !!phone });
      return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });
    }

    diagLog(traceId, 'login_user_found', { userId: user.id, profileActive: user.profile.active });

    if (!user.profile.active) {
      diagLog(traceId, 'login_account_inactive', { userId: user.id });
      console.log('[auth/login] Account inactive', { userId: user.id });
      return NextResponse.json({ error: 'حساب شما غیرفعال است' }, { status: 403 });
    }

    const valid = bcrypt.compareSync(password, user.passwordHash);
    diagLog(traceId, 'login_password_check', { userId: user.id, passwordMatch: valid });

    if (!valid) {
      diagLog(traceId, 'login_password_mismatch', { userId: user.id });
      console.log('[auth/login] Password mismatch', { userId: user.id });
      return NextResponse.json({ error: 'رمز عبور اشتباه است' }, { status: 401 });
    }

    diagLog(traceId, 'login_credentials_validated', { userId: user.id });
    console.log('[auth/login] Credentials validated, signing JWT', { userId: user.id });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.profile.role},
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    diagLog(traceId, 'login_jwt_signed', { userId: user.id, tokenLength: token.length, expiresIn: '7d' });

    // Create login notification + notify super-admins
    try {
      await prisma.notification.create({
        data: {
          profileId: user.id,
          title: 'ورود جدید به سیستم',
          body: `یک ورود جدید در تاریخ ${new Date().toLocaleDateString('fa-IR')} ساعت ${new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })} ثبت شد`,
          type: 'login',
          priority: 'normal',
        },
      });

      const superAdmins = await prisma.profile.findMany({
        where: { role: { in: ['super_admin', 'owner'] }, active: true, id: { not: user.id } },
        select: { id: true },
      });
      if (superAdmins.length > 0) {
        const displayName = user.profile.customerType === 'company'
          ? user.profile.companyName || ''
          : user.profile.fullName || `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim();
        const fullName = displayName || user.email || user.phone || 'کاربر';
        const identifier = user.email || user.phone || '';
        await prisma.notification.createMany({
          data: superAdmins.map((sa) => ({
            profileId: sa.id,
            title: `[سوپرادمین] ورود جدید: ${fullName}`,
            body: `کاربر ${fullName} (${identifier}) وارد سیستم شد - ${new Date().toLocaleDateString('fa-IR')} ${new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`,
            type: 'login',
            priority: 'normal',
          })),
        });
      }
    } catch {}

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        profile: user.profile,
      },
    });

    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    };

    response.cookies.set('token', token, cookieOptions);

    diagLog(traceId, 'login_cookie_set', {
      userId: user.id,
      cookieName: 'token',
      cookieOptions: { httpOnly: true, secure: true, sameSite: 'lax', maxAge: cookieOptions.maxAge, path: '/' },
      hasCookie: true,
    });
    console.log('[auth/login] Cookie set, login success', { userId: user.id, hasCookie: true });

    diagLog(traceId, 'login_success_response', { userId: user.id, httpStatus: 200 });
    return response;
  } catch (error: any) {
    diagError(traceId, 'login_server_error', error);
    console.error('[auth/login] Server error:', error.message);
    return NextResponse.json({ error: 'خطای سرور: ' + error.message }, { status: 500 });
  }
}
