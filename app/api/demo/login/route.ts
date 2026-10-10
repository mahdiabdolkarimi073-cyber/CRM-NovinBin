import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { slug, password } = body;

    console.log('[demo/login] Request received', { hasSlug: !!slug, hasPassword: !!password });

    if (!slug || !password) {
      console.log('[demo/login] Missing slug or password');
      return NextResponse.json({ error: 'slug و رمز عبور الزامی است' }, { status: 400 });
    }

    if (typeof slug === 'string') {
      try { slug = decodeURIComponent(slug); } catch {}
    }

    const demo = await prisma.demo.findUnique({
      where: { slug },
      include: { org: true },
    });

    if (!demo) {
      console.log('[demo/login] Demo not found', { slug });
      return NextResponse.json({ error: 'دمو یافت نشد' }, { status: 404 });
    }

    if (demo.status === 'expired' || new Date() > demo.expiryDate) {
      console.log('[demo/login] Demo expired', { slug, status: demo.status });
      return NextResponse.json({ error: 'این دمو منقضی شده است', expired: true }, { status: 403 });
    }

    if (demo.status === 'suspended') {
      console.log('[demo/login] Demo suspended', { slug });
      return NextResponse.json({ error: 'این دمو موقتاً غیرفعال شده است', suspended: true }, { status: 403 });
    }

    if (!demo.demoPassword) {
      console.log('[demo/login] No demo password set', { slug });
      return NextResponse.json({ error: 'رمز عبور تنظیم نشده است' }, { status: 500 });
    }

    const valid = bcrypt.compareSync(password, demo.demoPassword);
    if (!valid) {
      console.log('[demo/login] Password mismatch', { slug });
      return NextResponse.json({ error: 'رمز عبور اشتباه است' }, { status: 401 });
    }

    if (!demo.demoUserId) {
      console.log('[demo/login] No demo user ID', { slug });
      return NextResponse.json({ error: 'کاربر دمو یافت نشد' }, { status: 500 });
    }

    // Get the demo user's profile
    const demoProfile = await prisma.profile.findUnique({
      where: { id: demo.demoUserId },
    });

    if (!demoProfile || !demoProfile.active) {
      console.log('[demo/login] Demo profile inactive or missing', { slug, hasProfile: !!demoProfile, active: demoProfile?.active });
      return NextResponse.json({ error: 'حساب کاربری غیرفعال است' }, { status: 403 });
    }

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

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });

    console.log('[demo/login] Cookie set, login success', { slug, hasCookie: true });
    return response;
  } catch (error: any) {
    console.error('[demo/login] Server error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
