import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

async function getAdmin(req: NextRequest) {
  const token = req.cookies.get('academy_token')?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { academyUserId: string };
    const account = await (prisma as any).academyUser.findUnique({ where: { id: payload.academyUserId } });
    if (!account || !account.active || account.role !== 'AdminAcademy') return null;
    return account;
  } catch {
    return null;
  }
}

function generateApiKey(): string {
  return 'nva_' + crypto.randomBytes(32).toString('hex');
}

export async function GET(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin) return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 });

  const keys = await (prisma as any).academyApiKey.findMany({
    where: { adminId: admin.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    keys: keys.map((k: any) => ({
      id: k.id,
      label: k.label,
      apiKey: k.apiKey,
      active: k.active,
      createdAt: k.createdAt,
      lastUsedAt: k.lastUsedAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin) return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const label = String(body.label || 'افزونه').trim().slice(0, 100);

  const apiKey = generateApiKey();
  const record = await (prisma as any).academyApiKey.create({
    data: { adminId: admin.id, label, apiKey },
  });

  return NextResponse.json({
    id: record.id,
    label: record.label,
    apiKey: record.apiKey,
    active: record.active,
    createdAt: record.createdAt,
    lastUsedAt: record.lastUsedAt,
  });
}

export async function DELETE(req: NextRequest) {
  const admin = await getAdmin(req);
  if (!admin) return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'شناسه کلید الزامی است' }, { status: 400 });

  const existing = await (prisma as any).academyApiKey.findFirst({ where: { id, adminId: admin.id } });
  if (!existing) return NextResponse.json({ error: 'کلید یافت نشد' }, { status: 404 });

  await (prisma as any).academyApiKey.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
