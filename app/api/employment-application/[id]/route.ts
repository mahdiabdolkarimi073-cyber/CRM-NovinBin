import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

function getAuth(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  try { return jwt.verify(token, JWT_SECRET) as { userId: string; role: string }; } catch { return null; }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const app = await prisma.employmentApplication.findUnique({ where: { id: params.id } });
    if (!app) return NextResponse.json({ error: 'درخواست یافت نشد' }, { status: 404 });
    return NextResponse.json({ data: app });
  } catch {
    return NextResponse.json({ error: 'بارگذاری ناموفق بود' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (auth.role !== 'owner' && auth.role !== 'super_admin') {
    return NextResponse.json({ error: 'دسترسی حذف ندارید' }, { status: 403 });
  }
  try {
    await prisma.employmentApplication.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'حذف ناموفق بود' }, { status: 500 });
  }
}
