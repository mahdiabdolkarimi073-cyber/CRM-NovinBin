import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// POST /api/auth/login
// Body: { email?, phone?, password }
// Supports login by email OR phone. At least one identifier is required.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, phone, password } = body;

    if (!password) {
      return NextResponse.json({ error: 'رمز عبور الزامی است' }, { status: 400 });
    }
    if (!email && !phone) {
      return NextResponse.json({ error: 'ایمیل یا شماره موبایل الزامی است' }, { status: 400 });
    }

    let user = null as any;

    if (email) {
      user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: { profile: true },
      });
    }

    if (!user && phone) {
      user = await prisma.user.findFirst({
        where: { phone: phone.trim() },
        include: { profile: true },
      });
    }

    if (!user || !user.profile) {
      return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });
    }

    if (!user.profile.active) {
      return NextResponse.json({ error: 'حساب شما غیرفعال است' }, { status: 403 });
    }

    const valid = bcrypt.compareSync(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'رمز عبور اشتباه است' }, { status: 401 });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.profile.role},
      JWT_SECRET,
      { expiresIn: '7d' }
    );

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

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: 'خطای سرور: ' + error.message }, { status: 500 });
  }
}
