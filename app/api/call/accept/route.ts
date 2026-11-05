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
    console.error('[API call/accept] Unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { sessionId } = body as { sessionId: string };
    console.log('[API call/accept]', { userId: auth.userId, sessionId });

    if (!sessionId) return NextResponse.json({ error: 'شناسه تماس الزامی است' }, { status: 400 });

    const session = await prisma.socialCallSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      console.error('[API call/accept] session not found', sessionId);
      return NextResponse.json({ error: 'تماس یافت نشد' }, { status: 404 });
    }
    if (session.receiverId !== auth.userId) {
      console.error('[API call/accept] unauthorized', { userId: auth.userId, receiverId: session.receiverId });
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }
    if (session.status !== 'calling' && session.status !== 'ringing') {
      console.error('[API call/accept] wrong status', session.status);
      return NextResponse.json({ error: 'تماس در حالت قابل قبول نیست' }, { status: 400 });
    }

    const updated = await prisma.socialCallSession.update({
      where: { id: sessionId },
      data: { status: 'accepted', startedAt: new Date() },
    });
    console.log('[API call/accept] session accepted', { sessionId, hasOffer: !!updated.offerSdp });

    await prisma.socialDMMessage.create({
      data: {
        senderId: auth.userId,
        receiverId: session.callerId === auth.userId ? session.receiverId : session.callerId,
        content: 'تماس پاسخ داده شد',
        attachmentType: 'call_log',
      },
    });

    return NextResponse.json({ session: updated });
  } catch (e: any) {
    console.error('[API call/accept] error', e?.message || e);
    return NextResponse.json({ error: e.message || 'خطای سرور' }, { status: 500 });
  }
}
