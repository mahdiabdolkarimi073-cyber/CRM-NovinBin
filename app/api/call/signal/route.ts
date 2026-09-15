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
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { callSessionId, receiverId, signalType, signalData } = body as {
      callSessionId: string;
      receiverId: string;
      signalType: string;
      signalData: string;
    };

    if (!callSessionId || !receiverId || !signalType) {
      return NextResponse.json({ error: 'پارامترهای ناقص' }, { status: 400 });
    }

    if (!['offer', 'answer', 'ice', 'end', 'reject'].includes(signalType)) {
      return NextResponse.json({ error: 'نوع سیگنال نامعتبر' }, { status: 400 });
    }

    const session = await prisma.socialCallSession.findUnique({ where: { id: callSessionId } });
    if (!session) return NextResponse.json({ error: 'تماس یافت نشد' }, { status: 404 });
    if (session.callerId !== auth.userId && session.receiverId !== auth.userId) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    if (signalType === 'offer') {
      await prisma.socialCallSession.update({
        where: { id: callSessionId },
        data: { offerSdp: signalData, status: 'ringing' },
      });
    } else if (signalType === 'answer') {
      await prisma.socialCallSession.update({
        where: { id: callSessionId },
        data: { answerSdp: signalData },
      });
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

    return NextResponse.json({ signal });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'خطای سرور' }, { status: 500 });
  }
}
