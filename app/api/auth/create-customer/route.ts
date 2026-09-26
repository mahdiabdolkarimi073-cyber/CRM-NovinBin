import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
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

export async function POST(req: NextRequest) {
  try {
    const auth = getAuth(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const actor = await prisma.profile.findUnique({
      where: { id: auth.userId },
      select: { role: true },
    });
    if (!actor || (actor.role !== 'super_admin' && actor.role !== 'owner')) {
      return NextResponse.json({ error: 'فقط سوپرادمین می‌تواند مشتری ایجاد کند' }, { status: 403 });
    }

    const body = await req.json();
    const { phone, password, customerType, fullName, companyName, email } = body;

    if (!phone || !password) {
      return NextResponse.json({ error: 'شماره موبایل و رمز عبور الزامی است' }, { status: 400 });
    }
    if (String(password).length < 6) {
      return NextResponse.json({ error: 'رمز عبور باید حداقل ۶ کاراکتر باشد' }, { status: 400 });
    }
    if (customerType === 'company' && !companyName) {
      return NextResponse.json({ error: 'نام شرکت برای مشتری حقوقی الزامی است' }, { status: 400 });
    }
    if (customerType !== 'company' && !fullName) {
      return NextResponse.json({ error: 'نام و نام خانوادگی الزامی است' }, { status: 400 });
    }

    const normalizedPhone = String(phone).trim();
    const normalizedEmail = email ? String(email).toLowerCase() : null;

    const existing = await prisma.user.findFirst({ where: { phone: normalizedPhone } });
    if (existing) {
      return NextResponse.json({ error: 'کاربری با این شماره موبایل قبلاً ثبت شده است' }, { status: 409 });
    }

    if (normalizedEmail) {
      const existingEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existingEmail) {
        return NextResponse.json({ error: 'کاربری با این ایمیل قبلاً ثبت شده است' }, { status: 409 });
      }
    }

    const passwordHash = bcrypt.hashSync(String(password), 10);

    let parsedFirstName: string | null = null;
    let parsedLastName: string | null = null;
    let parsedFullName: string | null = null;

    if (customerType === 'company') {
      parsedFullName = companyName;
    } else {
      const parts = String(fullName).trim().split(/\s+/);
      parsedFirstName = parts[0] || null;
      parsedLastName = parts.slice(1).join(' ') || null;
      parsedFullName = String(fullName).trim();
    }

    const org = await prisma.organization.findFirst({ where: { active: true } });

    const customer = await prisma.customer.create({
      data: {
        orgId: org?.id || null,
        type: customerType === 'company' ? 'company' : 'individual',
        firstName: parsedFirstName,
        lastName: parsedLastName,
        companyName: customerType === 'company' ? companyName : null,
        email: normalizedEmail || null,
        phone: normalizedPhone,
        level: 'bronze',
        score: 0,
        walletBalance: BigInt(0),
        loyaltyPoints: 0,
        createdBy: auth.userId,
      },
    });

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail || undefined,
        phone: normalizedPhone,
        passwordHash,
        profile: {
          create: {
            id: undefined,
            userType: 'customer',
            role: 'personnel',
            customerType: customerType === 'company' ? 'company' : 'individual',
            firstName: parsedFirstName,
            lastName: parsedLastName,
            fullName: parsedFullName,
            companyName: customerType === 'company' ? companyName : null,
            phone: normalizedPhone,
            customerId: customer.id,
            active: true,
            orgId: org?.id || null,
          },
        },
      },
      include: { profile: true },
    });

    return NextResponse.json({ success: true, userId: user.id, customerId: customer.id });
  } catch (error: any) {
    return NextResponse.json({ error: 'خطای سرور: ' + error.message }, { status: 500 });
  }
}
