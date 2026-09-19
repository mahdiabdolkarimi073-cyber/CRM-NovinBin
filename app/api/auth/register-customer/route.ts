import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// POST /api/auth/register-customer
// Public route — no auth required.
// Body: { phone, password, fullName?, companyName?, customerType?, email?, birthDate?, address?, postalCode? }
// Creates a registration_request with status 'pending' so an admin can review it.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, phone, password, firstName, lastName, fullName, companyName, customerType, birthDate, address, postalCode } = body;

    if (!phone || !password) {
      return NextResponse.json({ error: 'شماره موبایل و رمز عبور الزامی است' }, { status: 400 });
    }

    if (String(password).length < 6) {
      return NextResponse.json({ error: 'رمز عبور باید حداقل ۶ کاراکتر باشد' }, { status: 400 });
    }

    if (customerType === 'company' && !companyName) {
      return NextResponse.json({ error: 'نام شرکت برای مشتری حقوقی الزامی است' }, { status: 400 });
    }
    if (customerType !== 'company' && !fullName && !firstName) {
      return NextResponse.json({ error: 'نام و نام خانوادگی الزامی است' }, { status: 400 });
    }

    const normalizedPhone = String(phone).trim();
    const normalizedEmail = email ? String(email).toLowerCase() : null;

    // Check for existing user by phone
    const existing = await prisma.user.findFirst({ where: { phone: normalizedPhone } });
    if (existing) {
      return NextResponse.json({ error: 'کاربری با این شماره موبایل قبلاً ثبت شده است' }, { status: 409 });
    }

    // Check for existing pending request
    const existingReq = await prisma.registrationRequest.findFirst({
      where: { phone: normalizedPhone, status: 'pending' },
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

    // Split fullName into firstName/lastName for backward compatibility
    let parsedFirstName = firstName || null;
    let parsedLastName = lastName || null;
    if (!parsedFirstName && !parsedLastName && fullName) {
      const parts = String(fullName).trim().split(/\s+/);
      parsedFirstName = parts[0] || null;
      parsedLastName = parts.slice(1).join(' ') || null;
    }

    await prisma.registrationRequest.create({
      data: {
        email: normalizedEmail || '',
        passwordHash,
        firstName: parsedFirstName,
        lastName: parsedLastName,
        companyName: companyName || null,
        phone: normalizedPhone,
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
