import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, password } = body;

    if (!slug || !password) {
      return NextResponse.json({ error: 'slug و رمز عبور الزامی است' }, { status: 400 });
    }

    const demo = await prisma.demo.findFirst({
      where: { slug },
      include: { org: true },
    });

    if (!demo) {
      return NextResponse.json({ error: 'دمو یافت نشد' }, { status: 404 });
    }

    if (demo.status === 'expired' || new Date() > demo.expiryDate) {
      return NextResponse.json({ error: 'این دمو منقضی شده است', expired: true }, { status: 403 });
    }

    if (demo.status === 'suspended') {
      return NextResponse.json({ error: 'این دمو موقتاً غیرفعال شده است', suspended: true }, { status: 403 });
    }

    if (!demo.demoPassword) {
      return NextResponse.json({ error: 'رمز عبور تنظیم نشده است' }, { status: 500 });
    }

    const valid = bcrypt.compareSync(password, demo.demoPassword);
    if (!valid) {
      return NextResponse.json({ error: 'رمز عبور اشتباه است' }, { status: 401 });
    }

    if (!demo.demoUserId) {
      return NextResponse.json({ error: 'کاربر دمو یافت نشد' }, { status: 500 });
    }

    // Get the demo user's profile
    const demoProfile = await prisma.profile.findUnique({
      where: { id: demo.demoUserId },
    });

    if (!demoProfile || !demoProfile.active) {
      return NextResponse.json({ error: 'حساب کاربری غیرفعال است' }, { status: 403 });
    }

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
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
