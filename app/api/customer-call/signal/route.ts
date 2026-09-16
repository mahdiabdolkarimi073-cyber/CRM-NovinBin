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
  const { sessionId, signalType, signalData } = await req.json();
  if (!sessionId || !signalType) return NextResponse.json({ error: 'sessionId و signalType الزامی است' }, { status: 400 });
  if (!['offer', 'answer', 'ice', 'end', 'reject'].includes(signalType)) return NextResponse.json({ error: 'نوع سیگنال نامعتبر' }, { status: 400 });
  try {
    const session = await prisma.customerSocialCallSession.findUnique({ where: { id: sessionId } });
    if (!session) return NextResponse.json({ error: 'تماس یافت نشد' }, { status: 404 });
    if (session.callerId !== auth.userId && session.receiverId !== auth.userId) return NextResponse.json({ error: 'شما طرف این تماس نیستید' }, { status: 403 });
    const receiverId = session.callerId === auth.userId ? session.receiverId : session.callerId;
    if (signalType === 'offer') {
      await prisma.customerSocialCallSession.update({ where: { id: sessionId }, data: { offerSdp: signalData, status: 'ringing' } });
    } else if (signalType === 'answer') {
      await prisma.customerSocialCallSession.update({ where: { id: sessionId }, data: { answerSdp: signalData } });
    }
    await prisma.customerSocialCallSignal.create({ data: { callSessionId: sessionId, senderId: auth.userId, receiverId, signalType, signalData: signalData || '' } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
