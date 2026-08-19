import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// POST /api/auth/register
// Body: { email, password, firstName, lastName, role?, userType?, customerId? }
// Creates a User (with bcrypt-hashed password) + Profile and returns the created profile.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, firstName, lastName, role, userType, customerId, assignedPages, phone } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'ایمیل و رمز عبور الزامی است' }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase();
    const requestedStaffRole = role === 'admin' || role === 'super_admin' || role === 'owner';
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

    // Check for existing user
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: 'کاربری با این ایمیل قبلاً ثبت شده است' }, { status: 409 });
    }

    const passwordHash = bcrypt.hashSync(String(password), 10);

    // Create User + Profile in a transaction
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        profile: {
          create: {
            userType: userType || 'customer',
            role: role || 'personnel',
            firstName: firstName || null,
            lastName: lastName || null,
            customerId: customerId || null,
            assignedPages: Array.isArray(assignedPages) ? assignedPages : [],
            phone: phone || null,
            active: true,
          },
        },
      },
      include: { profile: true },
    });

    return NextResponse.json({
      user: { id: user.id, email: user.email },
      profile: user.profile,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'خطای سرور: ' + error.message }, { status: 500 });
  }
}
