import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

const CRM_ADMIN_ROLES = ['super_admin', 'admin'];

export async function POST(req: NextRequest) {
  try {
    const { identifier, password } = await req.json();
    if (!identifier || !password) return NextResponse.json({ error: 'نام کاربری و رمز عبور الزامی است' }, { status: 400 });

    const normalized = String(identifier).trim().toLowerCase();

    let account = await (prisma as any).academyUser.findFirst({
      where: { OR: [{ username: normalized }, { email: normalized }] },
    });

    // If no AcademyUser found, try CRM User with admin role
    if (!account) {
      const crmUser = await prisma.user.findUnique({
        where: { email: normalized },
        include: { profile: true },
      });
      if (crmUser?.profile && crmUser.profile.active && CRM_ADMIN_ROLES.includes(crmUser.profile.role) && bcrypt.compareSync(String(password), crmUser.passwordHash)) {
        // Find or create a matching AcademyUser with AdminAcademy role
        account = await (prisma as any).academyUser.findFirst({ where: { email: crmUser.email } });
        if (!account) {
          const baseUsername = (crmUser.profile.firstName || crmUser.email).replace(/\s+/g, '').toLowerCase();
          let username = baseUsername;
          let suffix = 1;
          while (await (prisma as any).academyUser.findUnique({ where: { username } })) {
            username = `${baseUsername}${suffix++}`;
          }
          account = await (prisma as any).academyUser.create({
            data: {
              username,
              email: crmUser.email,
              passwordHash: crmUser.passwordHash,
              role: 'AdminAcademy',
              firstName: crmUser.profile.firstName || '',
              lastName: crmUser.profile.lastName || '',
              phone: crmUser.profile.phone || null,
              active: true,
            },
          });
        }
      }
    }

    if (!account || !account.active || !bcrypt.compareSync(String(password), account.passwordHash)) {
      return NextResponse.json({ error: 'نام کاربری یا رمز عبور اشتباه است' }, { status: 401 });
    }

    const token = jwt.sign({ academyUserId: account.id, role: account.role, username: account.username }, JWT_SECRET, { expiresIn: '7d' });
    const response = NextResponse.json({ user: { id: account.id, username: account.username, role: account.role, firstName: account.firstName, lastName: account.lastName } });
    response.cookies.set('academy_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/' });
    return response;
  } catch {
    return NextResponse.json({ error: 'خطای سرور در ورود' }, { status: 500 });
  }
}