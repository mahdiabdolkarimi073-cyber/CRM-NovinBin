import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

function getAuth(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) {
    console.error('[API call/initiate] Unauthorized - no valid token');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { receiverId, callType } = body as { receiverId: string; callType: string };
    console.log('[API call/initiate]', { callerId: auth.userId, receiverId, callType });

    if (!receiverId) {
      console.error('[API call/initiate] missing receiverId');
      return NextResponse.json({ error: 'شناسه گیرنده الزامی است' }, { status: 400 });
    }
    if (!['audio', 'video'].includes(callType)) {
      console.error('[API call/initiate] invalid callType', callType);
      return NextResponse.json({ error: 'نوع تماس نامعتبر است' }, { status: 400 });
    }

    const session = await prisma.socialCallSession.create({
      data: {
        callerId: auth.userId,
        receiverId,
        callType,
        status: 'calling',
      },
    });
    console.log('[API call/initiate] session created', { sessionId: session.id });

    return NextResponse.json({ session });
  } catch (e: any) {
    console.error('[API call/initiate] error', e?.message || e);
    return NextResponse.json({ error: e.message || 'خطای سرور' }, { status: 500 });
  }
}
