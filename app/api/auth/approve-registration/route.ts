import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/auth/approve-registration
// Body: { requestId, reviewerId }
// Creates a User from the stored passwordHash + a Customer record + Profile,
// then marks the registration request as approved.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { requestId, reviewerId } = body;
    if (!requestId || !reviewerId) {
      return NextResponse.json({ error: 'requestId و reviewerId الزامی است' }, { status: 400 });
    }

    const reqRecord = await prisma.registrationRequest.findUnique({ where: { id: requestId } });
    if (!reqRecord) {
      return NextResponse.json({ error: 'درخواست یافت نشد' }, { status: 404 });
    }
    if (reqRecord.status !== 'pending') {
      return NextResponse.json({ error: 'این درخواست قبلا بررسی شده است' }, { status: 400 });
    }
    if (!reqRecord.passwordHash) {
      return NextResponse.json({ error: 'رمز عبور درخواست یافت نشد' }, { status: 400 });
    }

    // Check for existing user
    const existing = await prisma.user.findUnique({ where: { email: reqRecord.email } });
    if (existing) {
      return NextResponse.json({ error: 'کاربری با این ایمیل قبلا ثبت شده است' }, { status: 409 });
    }

    // 1. Create customer record
    const customer = await prisma.customer.create({
      data: {
        type: reqRecord.companyName ? 'company' : 'individual',
        firstName: reqRecord.firstName,
        lastName: reqRecord.lastName,
        companyName: reqRecord.companyName,
        email: reqRecord.email,
        phone: reqRecord.phone,
        birthDate: reqRecord.birthDate || null,
        address: reqRecord.address || null,
        postalCode: reqRecord.postalCode || null,
        level: 'bronze',
        score: 0,
        walletBalance: BigInt(0),
        loyaltyPoints: 0,
        createdBy: reviewerId,
      },
    });

    // 2. Create User with the stored passwordHash (no re-hashing) + Profile
    const user = await prisma.user.create({
      data: {
        email: reqRecord.email,
        passwordHash: reqRecord.passwordHash,
        profile: {
          create: {
            userType: 'customer',
            role: 'personnel',
            firstName: reqRecord.firstName,
            lastName: reqRecord.lastName,
            phone: reqRecord.phone,
            customerId: customer.id,
            active: true,
          },
        },
      },
      include: { profile: true },
    });

    // 3. Update request status
    await prisma.registrationRequest.update({
      where: { id: requestId },
      data: {
        status: 'approved',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        authUserId: user.id,
        customerId: customer.id,
      },
    });

    return NextResponse.json({ success: true, userId: user.id, customerId: customer.id });
  } catch (error: any) {
    return NextResponse.json({ error: 'خطای سرور: ' + error.message }, { status: 500 });
  }
}
