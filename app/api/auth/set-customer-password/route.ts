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
    if (!actor || !['super_admin', 'owner', 'admin', 'personnel'].includes(actor.role)) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const body = await req.json();
    const { customerId, password, phone } = body;

    if (!customerId) {
      return NextResponse.json({ error: 'شناسه مشتری الزامی است' }, { status: 400 });
    }
    if (!password || String(password).length < 6) {
      return NextResponse.json({ error: 'رمز عبور باید حداقل ۶ کاراکتر باشد' }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, phone: true, mobile: true, firstName: true, lastName: true, companyName: true, type: true, email: true },
    });
    if (!customer) {
      return NextResponse.json({ error: 'مشتری یافت نشد' }, { status: 404 });
    }

    const resolvedPhone = phone ? String(phone).trim() : (customer.phone || customer.mobile);
    if (!resolvedPhone) {
      return NextResponse.json({ error: 'شماره موبایل مشتری ثبت نشده است' }, { status: 400 });
    }

    const passwordHash = bcrypt.hashSync(String(password), 10);

    let user = await prisma.user.findFirst({ where: { phone: resolvedPhone } });

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });
    } else {
      const normalizedEmail = customer.email ? String(customer.email).toLowerCase() : undefined;

      let parsedFirstName: string | null = null;
      let parsedLastName: string | null = null;
      let parsedFullName: string | null = null;

      if (customer.type === 'company') {
        parsedFullName = customer.companyName;
      } else {
        parsedFullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || null;
        parsedFirstName = customer.firstName;
        parsedLastName = customer.lastName;
      }

      const org = await prisma.organization.findFirst({ where: { active: true } });

      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          phone: resolvedPhone,
          passwordHash,
          profile: {
            create: {
              id: undefined,
              userType: 'customer',
              role: 'personnel',
              customerType: customer.type === 'company' ? 'company' : 'individual',
              firstName: parsedFirstName,
              lastName: parsedLastName,
              fullName: parsedFullName,
              companyName: customer.type === 'company' ? customer.companyName : null,
              phone: resolvedPhone,
              customerId: customer.id,
              active: true,
              orgId: org?.id || null,
            },
          },
        },
      });

      if (!customer.mobile) {
        await prisma.customer.update({
          where: { id: customerId },
          data: { mobile: resolvedPhone },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'خطای سرور: ' + error.message }, { status: 500 });
  }
}
