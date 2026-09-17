import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

const CRM_ADMIN_ROLES = ['super_admin', 'admin', 'academy_admin'];

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
      console.log('[academy-login] No AcademyUser found, trying CRM user:', normalized);
      const crmUser = await prisma.user.findUnique({
        where: { email: normalized },
        include: { profile: true },
      });
      if (crmUser?.profile) {
        console.log('[academy-login] CRM user found', { email: crmUser.email, role: crmUser.profile.role, active: crmUser.profile.active, passwordMatch: bcrypt.compareSync(String(password), crmUser.passwordHash) });
      } else {
        console.log('[academy-login] CRM user not found or no profile');
      }
      if (crmUser?.profile && crmUser.profile.active && CRM_ADMIN_ROLES.includes(crmUser.profile.role) && bcrypt.compareSync(String(password), crmUser.passwordHash)) {
        // Find or create a matching AcademyUser with AdminAcademy role
        account = await (prisma as any).academyUser.findFirst({ where: { email: crmUser.email } });
        if (account) {
          // Ensure existing AcademyUser has AdminAcademy role
          if (account.role !== 'AdminAcademy') {
            account = await (prisma as any).academyUser.update({
              where: { id: account.id },
              data: { role: 'AdminAcademy', active: true, passwordHash: crmUser.passwordHash },
            });
          }
        } else {
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
      console.log('[academy-login] AUTH FAIL', { found: !!account, active: account?.active, identifier: normalized });
      return NextResponse.json({ error: 'نام کاربری یا رمز عبور اشتباه است' }, { status: 401 });
    }

    const token = jwt.sign({ academyUserId: account.id, role: account.role, username: account.username }, JWT_SECRET, { expiresIn: '7d' });
    const response = NextResponse.json({ user: { id: account.id, username: account.username, role: account.role, firstName: account.firstName, lastName: account.lastName } });
    response.cookies.set('academy_token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    console.log('[academy-login] SUCCESS', { userId: account.id, role: account.role, username: account.username, tokenPreview: token.slice(0, 20) + '...' });
    return response;
  } catch (err) {
    console.error('[academy-login] ERROR', err);
    return NextResponse.json({ error: 'خطای سرور در ورود' }, { status: 500 });
  }
}