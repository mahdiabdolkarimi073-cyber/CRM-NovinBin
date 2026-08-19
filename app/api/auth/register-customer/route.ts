import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// POST /api/auth/register-customer
// Public route — no auth required.
// Body: { email, password, firstName, lastName, companyName?, phone?, birthDate?, address?, postalCode? }
// Creates a registration_request with status 'pending' so an admin can review it.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, firstName, lastName, companyName, phone, birthDate, address, postalCode } = body;

    if (!email || !password || (!firstName && !companyName)) {
      return NextResponse.json({ error: 'ایمیل، رمز عبور و نام الزامی است' }, { status: 400 });
    }

    if (String(password).length < 6) {
      return NextResponse.json({ error: 'رمز عبور باید حداقل ۶ کاراکتر باشد' }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase();

    // Check for existing user
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: 'کاربری با این ایمیل قبلاً ثبت شده است' }, { status: 409 });
    }

    // Check for existing pending request
    const existingReq = await prisma.registrationRequest.findFirst({
      where: { email: normalizedEmail, status: 'pending' },
    });
    if (existingReq) {
      return NextResponse.json({ error: 'درخواست ثبت‌نام شما در انتظار بررسی است' }, { status: 409 });
    }

    // Hash the password so it can be used later when the admin approves
    const passwordHash = bcrypt.hashSync(String(password), 10);

    // Find the first active organization to assign the request to
    const org = await prisma.organization.findFirst({ where: { active: true } });
    if (!org) {
      return NextResponse.json({ error: 'سازمانی برای ثبت‌نام یافت نشد' }, { status: 500 });
    }

    await prisma.registrationRequest.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        companyName: companyName || null,
        phone: phone || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        address: address || null,
        postalCode: postalCode || null,
        status: 'pending',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'خطای سرور: ' + error.message }, { status: 500 });
  }
}
