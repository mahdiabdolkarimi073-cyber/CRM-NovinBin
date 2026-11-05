import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const identitySchema = z.object({
  customerName: z.string().trim().min(1, 'نام مشتری الزامی است'),
  siteName: z.string().trim().min(1, 'نام سایت الزامی است'),
  irnicId: z.string().trim().min(1, 'شناسه ایرنیک الزامی است'),
  password: z.string().min(1, 'رمز عبور الزامی است'),
  assignedTo: z.string().uuid().nullable().optional(),
});

type Auth = { userId: string; role: string };

function getAuth(req: NextRequest): Auth | null {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as Auth;
  } catch {
    return null;
  }
}

function isSuperAdmin(role: string) {
  return role === 'owner' || role === 'super_admin';
}

async function getProfile(userId: string) {
  return prisma.profile.findUnique({ where: { id: userId }, select: { active: true, role: true } });
}

export async function GET(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ error: 'نیاز به ورود دارید' }, { status: 401 });
  const profile = await getProfile(auth.userId);
  if (!profile?.active) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
  const records = await prisma.irnicIdentity.findMany({
    where: isSuperAdmin(profile.role) || profile.role === 'admin' ? {} : { assignedTo: auth.userId },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ data: records });
}

export async function POST(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ error: 'نیاز به ورود دارید' }, { status: 401 });
  const profile = await getProfile(auth.userId);
  if (!profile?.active) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
  const parsed = identitySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'اطلاعات نامعتبر است' }, { status: 400 });
  try {
    const record = await prisma.irnicIdentity.create({ data: { ...parsed.data, assignedTo: isSuperAdmin(profile.role) ? (parsed.data.assignedTo || auth.userId) : auth.userId } });
    return NextResponse.json({ data: record }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error && error.message.includes('Unique constraint') ? 'این شناسه ایرنیک قبلاً ثبت شده است' : 'ثبت شناسه ناموفق بود';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
