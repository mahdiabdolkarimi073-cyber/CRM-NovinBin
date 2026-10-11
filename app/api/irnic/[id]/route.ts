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
  try { return jwt.verify(token, JWT_SECRET) as Auth; } catch { return null; }
}
function isSuperAdmin(role: string) { return role === 'owner' || role === 'super_admin'; }

async function access(id: string, userId: string, role: string) {
  const record = await prisma.irnicIdentity.findUnique({ where: { id } });
  if (!record) return { record: null, allowed: false };
  return { record, allowed: isSuperAdmin(role) || role === 'admin' || record.assignedTo === userId };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ error: 'نیاز به ورود دارید' }, { status: 401 });
  const profile = await prisma.profile.findUnique({ where: { id: auth.userId }, select: { active: true, role: true } });
  if (!profile?.active) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
  const current = await access(params.id, auth.userId, profile.role);
  if (!current.record) return NextResponse.json({ error: 'شناسه پیدا نشد' }, { status: 404 });
  if (!current.allowed) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
  return NextResponse.json({ data: current.record });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ error: 'نیاز به ورود دارید' }, { status: 401 });
  const profile = await prisma.profile.findUnique({ where: { id: auth.userId }, select: { active: true, role: true } });
  if (!profile?.active) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
  const current = await access(params.id, auth.userId, profile.role);
  if (!current.record) return NextResponse.json({ error: 'شناسه پیدا نشد' }, { status: 404 });
  if (!current.allowed) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
  const parsed = identitySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'اطلاعات نامعتبر است' }, { status: 400 });
  try {
    const record = await prisma.irnicIdentity.update({ where: { id: params.id }, data: { ...parsed.data, assignedTo: isSuperAdmin(profile.role) ? (parsed.data.assignedTo ?? current.record.assignedTo) : current.record.assignedTo } });
    return NextResponse.json({ data: record });
  } catch (error: unknown) {
    const message = error instanceof Error && error.message.includes('Unique constraint') ? 'این شناسه ایرنیک قبلاً ثبت شده است' : 'ویرایش شناسه ناموفق بود';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ error: 'نیاز به ورود دارید' }, { status: 401 });
  const profile = await prisma.profile.findUnique({ where: { id: auth.userId }, select: { active: true, role: true } });
  if (!profile?.active) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
  const current = await access(params.id, auth.userId, profile.role);
  if (!current.record) return NextResponse.json({ error: 'شناسه پیدا نشد' }, { status: 404 });
  if (!current.allowed) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
  await prisma.irnicIdentity.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
