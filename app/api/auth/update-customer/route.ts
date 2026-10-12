import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { normalizePhone } from '@/lib/phone';

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

// POST /api/auth/update-customer
// Updates a customer and ensures a portal login account exists or is completed.
// Body: { customerId, mobile, phone, ...other fields }
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
    const {
      customerId,
      mobile,
      phone,
      type,
      firstName,
      lastName,
      companyName,
      email,
      address,
      city,
      activityType,
      serviceTypes,
      additionalPhones,
      level,
      notes,
      projectManagerId,
    } = body;

    if (!customerId) {
      return NextResponse.json({ error: 'شناسه مشتری الزامی است' }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      return NextResponse.json({ error: 'مشتری یافت نشد' }, { status: 404 });
    }

    // Normalize mobile if provided
    const normalizedMobile = mobile !== undefined && mobile !== null && String(mobile).trim()
      ? normalizePhone(mobile)
      : mobile === null
        ? null
        : customer.mobile;

    // If mobile was provided but invalid, error
    if (mobile !== undefined && mobile !== null && String(mobile).trim() && !normalizedMobile) {
      return NextResponse.json({ error: 'شماره موبایل نامعتبر است. فرمت صحیح: 09XXXXXXXXX یا +989XXXXXXXXX' }, { status: 400 });
    }

    // Check for duplicate phone on a different customer
    if (normalizedMobile && normalizedMobile !== customer.mobile) {
      const existingUser = await prisma.user.findFirst({ where: { phone: normalizedMobile } });
      if (existingUser) {
        const existingProfile = await prisma.profile.findUnique({
          where: { id: existingUser.id },
          select: { customerId: true },
        });
        if (existingProfile?.customerId && existingProfile.customerId !== customerId) {
          return NextResponse.json({ error: 'این شماره موبایل متعلق به مشتری دیگری است' }, { status: 409 });
        }
      }

      // Also check no other customer has this mobile
      const otherCustomer = await prisma.customer.findFirst({
        where: { mobile: normalizedMobile, id: { not: customerId } },
        select: { id: true },
      });
      if (otherCustomer) {
        return NextResponse.json({ error: 'این شماره موبایل متعلق به مشتری دیگری است' }, { status: 409 });
      }
    }

    const normalizedEmail = email !== undefined
      ? (email ? String(email).toLowerCase() : null)
      : customer.email;

    // Validate projectManagerId — must be an active internal staff profile
    let validManagerId: string | null | undefined = undefined;
    if (projectManagerId !== undefined) {
      if (projectManagerId === null || projectManagerId === '') {
        validManagerId = null;
      } else {
        const manager = await prisma.profile.findUnique({
          where: { id: projectManagerId },
          select: { id: true, userType: true, role: true, active: true },
        });
        if (manager && manager.userType === 'staff' && manager.active && ['owner', 'super_admin', 'admin', 'personnel'].includes(manager.role)) {
          validManagerId = manager.id;
        } else {
          return NextResponse.json({ error: 'کاربر انتخاب‌شده به‌عنوان مسئول پروژه مجاز نیست' }, { status: 400 });
        }
      }
    }

    // Update the customer record
    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        ...(type !== undefined && { type }),
        ...(firstName !== undefined && { firstName: firstName || null }),
        ...(lastName !== undefined && { lastName: lastName || null }),
        ...(companyName !== undefined && { companyName: companyName || null }),
        ...(normalizedEmail !== undefined && { email: normalizedEmail }),
        ...(normalizedMobile !== undefined && { mobile: normalizedMobile }),
        ...(phone !== undefined && { phone: phone ? String(phone).trim() : null }),
        ...(address !== undefined && { address: address || null }),
        ...(city !== undefined && { city: city || null }),
        ...(activityType !== undefined && { activityType: activityType || null }),
        ...(serviceTypes !== undefined && { serviceTypes: Array.isArray(serviceTypes) ? serviceTypes : [] }),
        ...(additionalPhones !== undefined && { additionalPhones: Array.isArray(additionalPhones) ? additionalPhones.filter((p: string) => p.trim()) : [] }),
        ...(level !== undefined && { level }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(validManagerId !== undefined && { projectManagerId: validManagerId }),
        updatedAt: new Date(),
      },
    });

    // Ensure portal account exists or is completed
    let portalAction = 'none';
    if (normalizedMobile) {
      let user = await prisma.user.findFirst({ where: { phone: normalizedMobile } });

      if (user) {
        // Check if this user's profile is linked to this customer
        const userProfile = await prisma.profile.findUnique({
          where: { id: user.id },
          select: { customerId: true, userType: true, firstName: true, lastName: true, fullName: true, companyName: true, phone: true, active: true },
        });

        if (userProfile?.customerId === customerId) {
          // Update profile info to stay in sync
          await prisma.profile.update({
            where: { id: user.id },
            data: {
              phone: normalizedMobile,
              ...(type !== undefined && { customerType: type === 'company' ? 'company' : 'individual' }),
              ...(firstName !== undefined && { firstName: firstName || null }),
              ...(lastName !== undefined && { lastName: lastName || null }),
              ...(companyName !== undefined && { companyName: companyName || null }),
              ...(type !== undefined && type === 'company'
                ? { fullName: companyName || null }
                : { fullName: [firstName, lastName].filter(Boolean).join(' ') || null }),
            },
          });
          // Update user phone if it changed
          if (user.phone !== normalizedMobile) {
            await prisma.user.update({
              where: { id: user.id },
              data: { phone: normalizedMobile },
            });
          }
          portalAction = 'updated';
        } else if (userProfile?.customerId && userProfile.customerId !== customerId) {
          // User belongs to a different customer — do NOT take over
          return NextResponse.json({
            error: 'این شماره موبایل متعلق به مشتری دیگری است و نمی‌توان حساب پورتال را به این مشتری متصل کرد',
          }, { status: 409 });
        } else {
          // User exists but no customerId — link it to this customer
          await prisma.profile.update({
            where: { id: user.id },
            data: {
              customerId: customerId,
              userType: 'customer',
              phone: normalizedMobile,
              ...(type !== undefined && { customerType: type === 'company' ? 'company' : 'individual' }),
              ...(firstName !== undefined && { firstName: firstName || null }),
              ...(lastName !== undefined && { lastName: lastName || null }),
              ...(companyName !== undefined && { companyName: companyName || null }),
            },
          });
          if (user.phone !== normalizedMobile) {
            await prisma.user.update({
              where: { id: user.id },
              data: { phone: normalizedMobile },
            });
          }
          portalAction = 'linked';
        }
      } else {
        // No user exists — create a portal account (without a password; admin or customer can set one later)
        let parsedFirstName = firstName ?? customer.firstName;
        let parsedLastName = lastName ?? customer.lastName;
        let parsedFullName: string | null = null;

        const effectiveType = type ?? customer.type;
        if (effectiveType === 'company') {
          parsedFullName = companyName ?? customer.companyName;
        } else {
          parsedFullName = [parsedFirstName, parsedLastName].filter(Boolean).join(' ') || null;
        }

        const org = await prisma.organization.findFirst({ where: { active: true } });

        user = await prisma.user.create({
          data: {
            email: normalizedEmail || undefined,
            phone: normalizedMobile,
            passwordHash: bcrypt.hashSync(Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2), 10),
            profile: {
              create: {
                id: undefined,
                userType: 'customer',
                role: 'personnel',
                customerType: effectiveType === 'company' ? 'company' : 'individual',
                firstName: parsedFirstName,
                lastName: parsedLastName,
                fullName: parsedFullName,
                companyName: effectiveType === 'company' ? (companyName ?? customer.companyName) : null,
                phone: normalizedMobile,
                customerId: customerId,
                active: true,
                orgId: org?.id || null,
              },
            },
          },
        });
        portalAction = 'created';
      }
    }

    const portalMessageMap: Record<string, string> = {
      none: 'حساب پورتال تغییر نکرد (شماره موبایل ثبت نشده است)',
      updated: 'حساب پورتال موجود به‌روزرسانی شد',
      linked: 'حساب پورتال موجود به این مشتری متصل شد',
      created: 'حساب پورتال جدید ایجاد شد (رمز عبور باید توسط مدیر تنظیم شود)',
    };

    return NextResponse.json({
      success: true,
      customerId: updatedCustomer.id,
      mobile: updatedCustomer.mobile,
      portalAction,
      portalMessage: portalMessageMap[portalAction],
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'خطای سرور: ' + error.message }, { status: 500 });
  }
}
