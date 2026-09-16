import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

function getAuth(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  try { return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string }; } catch { return null; }
}

export async function POST(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { receiverId, callType } = await req.json();
  if (!receiverId || !callType) return NextResponse.json({ error: 'receiverId و callType الزامی است' }, { status: 400 });
  if (!['audio', 'video'].includes(callType)) return NextResponse.json({ error: 'نوع تماس نامعتبر' }, { status: 400 });
  try {
    const session = await prisma.customerSocialCallSession.create({
      data: { callerId: auth.userId, receiverId, callType, status: 'calling' }
    });
    return NextResponse.json({ data: { id: session.id, callerId: session.callerId, receiverId: session.receiverId, callType: session.callType, status: session.status } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
