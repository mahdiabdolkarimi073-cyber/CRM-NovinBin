import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

function getAuth(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = getAuth(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const actor = await prisma.profile.findUnique({
      where: { id: auth.userId },
      select: { role: true },
    });
    if (!actor || !['super_admin', 'owner', 'admin'].includes(actor.role)) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      where: { profile: { userType: 'staff' } },
      include: {
        profile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            fullName: true,
            role: true,
            phone: true,
            active: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = users
      .filter((u) => u.profile)
      .map((u) => ({
        id: u.id,
        profileId: u.profile!.id,
        firstName: u.profile!.firstName,
        lastName: u.profile!.lastName,
        fullName: u.profile!.fullName,
        role: u.profile!.role,
        email: u.email,
        phone: u.phone || u.profile!.phone,
        active: u.profile!.active,
        createdAt: u.createdAt,
      }));

    return NextResponse.json({ credentials: rows });
  } catch (error: any) {
    return NextResponse.json({ error: 'خطای سرور: ' + error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = getAuth(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const actor = await prisma.profile.findUnique({
      where: { id: auth.userId },
      select: { role: true },
    });
    if (!actor || !['super_admin', 'owner'].includes(actor.role)) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const body = await req.json();
    const { userId, email, phone, password } = body;

    if (!userId) {
      return NextResponse.json({ error: 'شناسه کاربر الزامی است' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });
    }

    const data: any = {};
    if (email !== undefined) {
      const normalized = email ? String(email).toLowerCase() : null;
      if (normalized) {
        const existing = await prisma.user.findUnique({ where: { email: normalized } });
        if (existing && existing.id !== userId) {
          return NextResponse.json({ error: 'این ایمیل قبلاً استفاده شده است' }, { status: 409 });
        }
      }
      data.email = normalized;
    }
    if (phone !== undefined) {
      const normalized = phone ? String(phone).trim() : null;
      if (normalized) {
        const existing = await prisma.user.findFirst({ where: { phone: normalized } });
        if (existing && existing.id !== userId) {
          return NextResponse.json({ error: 'این شماره موبایل قبلاً استفاده شده است' }, { status: 409 });
        }
      }
      data.phone = normalized;
    }

    if (password) {
      if (String(password).length < 6) {
        return NextResponse.json({ error: 'رمز عبور باید حداقل ۶ کاراکتر باشد' }, { status: 400 });
      }
      const bcrypt = await import('bcryptjs');
      data.passwordHash = bcrypt.hashSync(String(password), 10);
    }

    await prisma.user.update({ where: { id: userId }, data });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'خطای سرور: ' + error.message }, { status: 500 });
  }
}
