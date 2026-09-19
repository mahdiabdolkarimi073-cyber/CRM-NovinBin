import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// POST /api/auth/register
// Body: { email?, phone?, password, firstName?, lastName?, fullName?, companyName?, customerType?, role?, userType?, customerId?, assignedPages? }
// At least one of email or phone is required. Creates a User + Profile and returns the created profile.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, phone, password, firstName, lastName, fullName, companyName, customerType, role, userType, customerId, assignedPages } = body;

    if (!password) {
      return NextResponse.json({ error: 'رمز عبور الزامی است' }, { status: 400 });
    }
    if (!email && !phone) {
      return NextResponse.json({ error: 'ایمیل یا شماره موبایل الزامی است' }, { status: 400 });
    }

    if (String(password).length < 6) {
      return NextResponse.json({ error: 'رمز عبور باید حداقل ۶ کاراکتر باشد' }, { status: 400 });
    }

    const normalizedEmail = email ? String(email).toLowerCase() : null;
    const normalizedPhone = phone ? String(phone).trim() : null;

    const requestedStaffRole = role === 'admin' || role === 'super_admin' || role === 'owner' || role === 'academy_admin';
    if (requestedStaffRole) {
      const token = req.cookies.get('token')?.value;
      if (!token) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
      let requesterId: string;
      try { requesterId = (jwt.verify(token, JWT_SECRET) as { userId: string }).userId; }
      catch { return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 }); }
      const requester = await prisma.profile.findUnique({ where: { id: requesterId }, select: { role: true, active: true } });
      if (!requester?.active || (requester.role !== 'owner' && requester.role !== 'super_admin')) {
        return NextResponse.json({ error: 'فقط سوپرادمین می‌تواند مدیر ایجاد کند' }, { status: 403 });
      }
    }

    // Check for existing user by email or phone
    if (normalizedEmail) {
      const existingByEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existingByEmail) {
        return NextResponse.json({ error: 'کاربری با این ایمیل قبلاً ثبت شده است' }, { status: 409 });
      }
    }
    if (normalizedPhone) {
      const existingByPhone = await prisma.user.findFirst({ where: { phone: normalizedPhone } });
      if (existingByPhone) {
        return NextResponse.json({ error: 'کاربری با این شماره موبایل قبلاً ثبت شده است' }, { status: 409 });
      }
    }

    const passwordHash = bcrypt.hashSync(String(password), 10);

    // Split fullName into firstName/lastName for backward compatibility
    let parsedFirstName = firstName || null;
    let parsedLastName = lastName || null;
    if (!parsedFirstName && !parsedLastName && fullName) {
      const parts = String(fullName).trim().split(/\s+/);
      parsedFirstName = parts[0] || null;
      parsedLastName = parts.slice(1).join(' ') || null;
    }

    // Create User + Profile in a transaction
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        phone: normalizedPhone,
        passwordHash,
        profile: {
          create: {
            userType: userType || 'customer',
            role: role || 'personnel',
            customerType: customerType || null,
            firstName: parsedFirstName,
            lastName: parsedLastName,
            fullName: fullName || null,
            companyName: companyName || null,
            customerId: customerId || null,
            assignedPages: Array.isArray(assignedPages) ? assignedPages : [],
            phone: normalizedPhone,
            active: true,
          },
        },
      },
      include: { profile: true },
    });

    // If role is academy_admin, also create a matching AcademyUser with AdminAcademy role
    if (role === 'academy_admin') {
      try {
        const baseUsername = (parsedFirstName || normalizedEmail || normalizedPhone || 'user').replace(/\s+/g, '').toLowerCase();
        let academyUsername = baseUsername;
        let suffix = 1;
        while (await (prisma as any).academyUser.findUnique({ where: { username: academyUsername } })) {
          academyUsername = `${baseUsername}${suffix++}`;
        }
        await (prisma as any).academyUser.create({
          data: {
            username: academyUsername,
            email: normalizedEmail || '',
            passwordHash,
            role: 'AdminAcademy',
            firstName: parsedFirstName || '',
            lastName: parsedLastName || '',
            phone: normalizedPhone || null,
            active: true,
          },
        });
      } catch {}
    }

    return NextResponse.json({
      user: { id: user.id, email: user.email, phone: user.phone },
      profile: user.profile,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'خطای سرور: ' + error.message }, { status: 500 });
  }
}
