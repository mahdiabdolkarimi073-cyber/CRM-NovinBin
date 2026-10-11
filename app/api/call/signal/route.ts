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
    console.error('[API call/signal] Unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { callSessionId, receiverId, signalType, signalData } = body as {
      callSessionId: string;
      receiverId: string;
      signalType: string;
      signalData: string;
    };
    console.log('[API call/signal]', { senderId: auth.userId, callSessionId, receiverId, signalType, signalDataLength: signalData?.length });

    if (!callSessionId || !receiverId || !signalType) {
      console.error('[API call/signal] missing params', { callSessionId, receiverId, signalType });
      return NextResponse.json({ error: 'پارامترهای ناقص' }, { status: 400 });
    }

    if (!['offer', 'answer', 'ice', 'end', 'reject'].includes(signalType)) {
      console.error('[API call/signal] invalid signalType', signalType);
      return NextResponse.json({ error: 'نوع سیگنال نامعتبر' }, { status: 400 });
    }

    const session = await prisma.socialCallSession.findUnique({ where: { id: callSessionId } });
    if (!session) {
      console.error('[API call/signal] session not found', callSessionId);
      return NextResponse.json({ error: 'تماس یافت نشد' }, { status: 404 });
    }
    if (session.callerId !== auth.userId && session.receiverId !== auth.userId) {
      console.error('[API call/signal] unauthorized access', { userId: auth.userId, callerId: session.callerId, receiverId: session.receiverId });
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    if (signalType === 'offer') {
      await prisma.socialCallSession.update({
        where: { id: callSessionId },
        data: { offerSdp: signalData, status: 'ringing' },
      });
      console.log('[API call/signal] offer saved, status -> ringing');
    } else if (signalType === 'answer') {
      await prisma.socialCallSession.update({
        where: { id: callSessionId },
        data: { answerSdp: signalData },
      });
      console.log('[API call/signal] answer saved');
    }

    const signal = await prisma.socialCallSignal.create({
      data: {
        callSessionId,
        senderId: auth.userId,
        receiverId,
        signalType,
        signalData,
      },
    });
    console.log('[API call/signal] signal created', { signalId: signal.id });

    return NextResponse.json({ signal });
  } catch (e: any) {
    console.error('[API call/signal] error', e?.message || e);
    return NextResponse.json({ error: e.message || 'خطای سرور' }, { status: 500 });
  }
}
