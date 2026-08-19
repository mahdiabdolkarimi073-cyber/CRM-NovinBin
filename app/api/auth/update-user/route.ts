import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let auth: { userId: string; role: string } | null = null;
  try {
    auth = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (auth.role !== 'super_admin' && auth.role !== 'owner') {
    return NextResponse.json({ error: 'فقط سوپرادمین می‌تواند کاربران را ویرایش کند' }, { status: 403 });
  }

  const body = await req.json();
  const { userId, email, password, firstName, lastName, phone, position, role, active, assignedPages } = body;

  if (!userId) return NextResponse.json({ error: 'شناسه کاربر الزامی است' }, { status: 400 });

  try {
    const target = await prisma.profile.findUnique({ where: { id: userId } });
    if (!target) return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });

    if (target.role === 'owner' && auth.role !== 'owner') {
      return NextResponse.json({ error: 'ویرایش مدیر سازمان فقط توسط مالک پلتفرم ممکن است' }, { status: 403 });
    }

    const profileUpdate: any = {};
    if (firstName !== undefined) profileUpdate.firstName = firstName || null;
    if (lastName !== undefined) profileUpdate.lastName = lastName || null;
    if (phone !== undefined) profileUpdate.phone = phone || null;
    if (position !== undefined) profileUpdate.position = position || null;
    if (role !== undefined) profileUpdate.role = role;
    if (active !== undefined) profileUpdate.active = active;
    if (assignedPages !== undefined && Array.isArray(assignedPages)) profileUpdate.assignedPages = assignedPages;

    const userUpdate: any = {};
    if (email !== undefined && email && String(email).trim() !== '') {
      const normalizedEmail = String(email).toLowerCase().trim();
      const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existing && existing.id !== userId) {
        return NextResponse.json({ error: 'این ایمیل قبلاً استفاده شده است' }, { status: 409 });
      }
      userUpdate.email = normalizedEmail;
    }
    if (password !== undefined && password && String(password).length >= 6) {
      userUpdate.passwordHash = bcrypt.hashSync(String(password), 10);
    }

    if (Object.keys(userUpdate).length > 0) {
      await prisma.user.update({ where: { id: userId }, data: userUpdate });
    }
    if (Object.keys(profileUpdate).length > 0) {
      await prisma.profile.update({ where: { id: userId }, data: profileUpdate });
    }

    // Notify the edited user
    try {
      const changes: string[] = [];
      if (email) changes.push('ایمیل');
      if (password) changes.push('رمز عبور');
      if (firstName !== undefined || lastName !== undefined) changes.push('نام');
      if (phone !== undefined) changes.push('تلفن');
      if (role !== undefined) changes.push('نقش');
      if (changes.length > 0) {
        await prisma.notification.create({
          data: {
            profileId: userId,
            title: 'پروفایل شما توسط سوپرادمین ویرایش شد',
            body: `تغییرات: ${changes.join('، ')}`,
            type: 'info',
            priority: 'normal',
          },
        });
      }
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'ویرایش ناموفق' }, { status: 500 });
  }
}
