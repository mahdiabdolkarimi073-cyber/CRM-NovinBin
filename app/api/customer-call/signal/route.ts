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
  if (!auth) {
    console.error('[API customer-call/signal] Unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  const { callSessionId, receiverId, signalType, signalData } = body as {
    callSessionId: string;
    receiverId?: string;
    signalType: string;
    signalData: string;
  };
  const sessionId = callSessionId || body.sessionId;
  console.log('[API customer-call/signal]', { senderId: auth.userId, callSessionId: sessionId, receiverId, signalType, signalDataLength: signalData?.length });
  if (!sessionId || !signalType) return NextResponse.json({ error: 'callSessionId و signalType الزامی است' }, { status: 400 });
  if (!['offer', 'answer', 'ice', 'end', 'reject'].includes(signalType)) {
    console.error('[API customer-call/signal] invalid signalType', signalType);
    return NextResponse.json({ error: 'نوع سیگنال نامعتبر' }, { status: 400 });
  }
  try {
    const session = await prisma.customerSocialCallSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      console.error('[API customer-call/signal] session not found', sessionId);
      return NextResponse.json({ error: 'تماس یافت نشد' }, { status: 404 });
    }
    if (session.callerId !== auth.userId && session.receiverId !== auth.userId) {
      console.error('[API customer-call/signal] unauthorized', { userId: auth.userId, callerId: session.callerId, receiverId: session.receiverId });
      return NextResponse.json({ error: 'شما طرف این تماس نیستید' }, { status: 403 });
    }
    const sigReceiverId = receiverId || (session.callerId === auth.userId ? session.receiverId : session.callerId);
    if (signalType === 'offer') {
      await prisma.customerSocialCallSession.update({ where: { id: sessionId }, data: { offerSdp: signalData, status: 'ringing' } });
      console.log('[API customer-call/signal] offer saved, status -> ringing');
    } else if (signalType === 'answer') {
      await prisma.customerSocialCallSession.update({ where: { id: sessionId }, data: { answerSdp: signalData } });
      console.log('[API customer-call/signal] answer saved');
    }
    await prisma.customerSocialCallSignal.create({ data: { callSessionId: sessionId, senderId: auth.userId, receiverId: sigReceiverId, signalType, signalData: signalData || '' } });
    console.log('[API customer-call/signal] signal created', { sessionId, signalType });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[API customer-call/signal] error', e?.message || e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
