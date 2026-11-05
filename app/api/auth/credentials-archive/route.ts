import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

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

async function checkAccess(auth: { userId: string; role: string }) {
  const actor = await prisma.profile.findUnique({
    where: { id: auth.userId },
    select: { role: true, assignedPages: true },
  });
  if (!actor) return false;
  if (['super_admin', 'owner', 'admin'].includes(actor.role)) return true;
  const pages = actor.assignedPages || [];
  return pages.includes('/dashboard/credentials-archive');
}

export async function GET(req: NextRequest) {
  try {
    const auth = getAuth(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const allowed = await checkAccess(auth);
    if (!allowed) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      where: { profile: { userType: 'staff' } },
      include: {
        profile: {
          select: {
            id: true,
            fullName: true,
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
        fullName: u.profile!.fullName,
        email: u.email,
        phone: u.phone || u.profile!.phone,
        link: u.link,
        active: u.profile!.active,
        createdAt: u.createdAt,
      }));

    return NextResponse.json({ credentials: rows });
  } catch (error: any) {
    return NextResponse.json({ error: 'خطای سرور: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuth(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const allowed = await checkAccess(auth);
    if (!allowed) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const body = await req.json();
    const { fullName, email, phone, password, link } = body;

    if (!fullName || !String(fullName).trim()) {
      return NextResponse.json({ error: 'نام شبکه اجتماعی الزامی است' }, { status: 400 });
    }
    if (!password || String(password).length < 6) {
      return NextResponse.json({ error: 'رمز عبور باید حداقل ۶ کاراکتر باشد' }, { status: 400 });
    }

    const normalizedPhone = phone ? String(phone).trim() : null;
    const normalizedEmail = email ? String(email).toLowerCase() : null;
    const normalizedLink = link ? String(link).trim() : null;

    if (normalizedPhone) {
      const existingPhone = await prisma.user.findFirst({ where: { phone: normalizedPhone } });
      if (existingPhone) {
        return NextResponse.json({ error: 'این شماره موبایل قبلاً استفاده شده است' }, { status: 409 });
      }
    }
    if (normalizedEmail) {
      const existingEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existingEmail) {
        return NextResponse.json({ error: 'این ایمیل قبلاً استفاده شده است' }, { status: 409 });
      }
    }

    const passwordHash = bcrypt.hashSync(String(password), 10);

    const org = await prisma.organization.findFirst({ where: { active: true } });

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail || undefined,
        phone: normalizedPhone || undefined,
        passwordHash,
        link: normalizedLink,
        profile: {
          create: {
            userType: 'staff',
            fullName: String(fullName).trim(),
            phone: normalizedPhone,
            active: true,
            orgId: org?.id || null,
          },
        },
      },
      include: { profile: true },
    });

    return NextResponse.json({ success: true, userId: user.id });
  } catch (error: any) {
    return NextResponse.json({ error: 'خطای سرور: ' + error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = getAuth(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const allowed = await checkAccess(auth);
    if (!allowed) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const body = await req.json();
    const { userId, email, phone, password, link } = body;

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
    if (link !== undefined) {
      data.link = link ? String(link).trim() : null;
    }

    if (password) {
      if (String(password).length < 6) {
        return NextResponse.json({ error: 'رمز عبور باید حداقل ۶ کاراکتر باشد' }, { status: 400 });
      }
      data.passwordHash = bcrypt.hashSync(String(password), 10);
    }

    await prisma.user.update({ where: { id: userId }, data });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'خطای سرور: ' + error.message }, { status: 500 });
  }
}
