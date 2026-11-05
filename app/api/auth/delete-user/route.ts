import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
    return NextResponse.json({ error: 'فقط سوپرادمین می‌تواند کاربر حذف کند' }, { status: 403 });
  }

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: 'شناسه کاربر الزامی است' }, { status: 400 });
  if (userId === auth.userId) return NextResponse.json({ error: 'نمی‌توانید حساب خود را حذف کنید' }, { status: 400 });

  try {
    const target = await prisma.profile.findUnique({ where: { id: userId } });
    if (!target) return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });
    if (target.role === 'owner' && auth.role !== 'owner') {
      return NextResponse.json({ error: 'حذف مدیر سازمان فقط توسط مالک پلتفرم ممکن است' }, { status: 403 });
    }

    await prisma.profile.delete({ where: { id: userId } });

    try {
      await prisma.user.delete({ where: { id: userId } });
    } catch {
      // User record may not exist if it was already removed
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'حذف ناموفق' }, { status: 500 });
  }
}
