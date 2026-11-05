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
    console.error('[API call/reject] Unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { sessionId } = body as { sessionId: string };
    console.log('[API call/reject]', { userId: auth.userId, sessionId });

    if (!sessionId) return NextResponse.json({ error: 'شناسه تماس الزامی است' }, { status: 400 });

    const session = await prisma.socialCallSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      console.error('[API call/reject] session not found', sessionId);
      return NextResponse.json({ error: 'تماس یافت نشد' }, { status: 404 });
    }
    if (session.receiverId !== auth.userId && session.callerId !== auth.userId) {
      console.error('[API call/reject] unauthorized', { userId: auth.userId, callerId: session.callerId, receiverId: session.receiverId });
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const updated = await prisma.socialCallSession.update({
      where: { id: sessionId },
      data: { status: 'rejected', endedAt: new Date() },
    });
    console.log('[API call/reject] session rejected', { sessionId, previousStatus: session.status });

    await prisma.socialCallSignal.create({
      data: {
        callSessionId: sessionId,
        senderId: auth.userId,
        receiverId: auth.userId === session.callerId ? session.receiverId : session.callerId,
        signalType: 'reject',
        signalData: 'rejected',
      },
    });
    console.log('[API call/reject] reject signal created', { sessionId });

    await prisma.socialDMMessage.create({
      data: {
        senderId: auth.userId,
        receiverId: auth.userId === session.callerId ? session.receiverId : session.callerId,
        content: 'تماس رد شد',
        attachmentType: 'call_log',
      },
    });

    return NextResponse.json({ session: updated });
  } catch (e: any) {
    console.error('[API call/reject] error', e?.message || e);
    return NextResponse.json({ error: e.message || 'خطای سرور' }, { status: 500 });
  }
}
