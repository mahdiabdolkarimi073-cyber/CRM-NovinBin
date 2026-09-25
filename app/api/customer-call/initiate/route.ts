import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

function getAuth(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  try { return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string }; } catch { return null; }
}

export async function POST(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) {
    console.error('[API customer-call/initiate] Unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { receiverId, callType } = await req.json();
  console.log('[API customer-call/initiate]', { callerId: auth.userId, receiverId, callType });
  if (!receiverId || !callType) return NextResponse.json({ error: 'receiverId و callType الزامی است' }, { status: 400 });
  if (!['audio', 'video'].includes(callType)) return NextResponse.json({ error: 'نوع تماس نامعتبر' }, { status: 400 });
  try {
    const session = await prisma.customerSocialCallSession.create({
      data: { callerId: auth.userId, receiverId, callType, status: 'calling' }
    });
    console.log('[API customer-call/initiate] session created', { sessionId: session.id });
    return NextResponse.json({ session });
  } catch (e: any) {
    console.error('[API customer-call/initiate] error', e?.message || e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
