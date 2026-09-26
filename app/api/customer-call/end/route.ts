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
    console.error('[API customer-call/end] Unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { sessionId, reason, recordingUrl } = await req.json();
  console.log('[API customer-call/end]', { userId: auth.userId, sessionId, reason, recordingUrl: !!recordingUrl });
  if (!sessionId) return NextResponse.json({ error: 'sessionId الزامی است' }, { status: 400 });
  try {
    const session = await prisma.customerSocialCallSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      console.error('[API customer-call/end] session not found', sessionId);
      return NextResponse.json({ error: 'تماس یافت نشد' }, { status: 404 });
    }
    if (session.callerId !== auth.userId && session.receiverId !== auth.userId) {
      console.error('[API customer-call/end] unauthorized', { userId: auth.userId });
      return NextResponse.json({ error: 'شما طرف این تماس نیستید' }, { status: 403 });
    }
    const durationSeconds = session.startedAt ? Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000) : null;
    const isMissed = reason === 'timeout' && !session.startedAt;
    const finalStatus = isMissed ? 'missed' : 'ended';
    console.log('[API customer-call/end] computing final status', { sessionId, isMissed, finalStatus, durationSeconds });
    const updated = await prisma.customerSocialCallSession.update({ where: { id: sessionId }, data: { status: finalStatus, endedAt: new Date(), durationSeconds, endReason: reason || null } });
    console.log('[API customer-call/end] session updated', { sessionId, finalStatus });

    // Save recording to call_logs
    if (!isMissed) {
      try {
        await prisma.callLog.create({
          data: {
            callerId: session.callerId,
            receiverId: session.receiverId,
            callType: session.callType,
            source: 'customer',
            sessionId: sessionId,
            direction: 'outgoing',
            status: 'answered',
            durationSeconds: durationSeconds || 0,
            callDate: session.startedAt || session.createdAt,
            recordingUrl: recordingUrl || null,
            handledBy: auth.userId,
          },
        });
        console.log('[API customer-call/end] call_log created', { sessionId, recordingUrl });
      } catch (logErr) {
        console.error('[API customer-call/end] failed to create call_log', logErr);
      }
    }
    await prisma.customerSocialCallSignal.create({ data: { callSessionId: sessionId, senderId: auth.userId, receiverId: session.callerId === auth.userId ? session.receiverId : session.callerId, signalType: 'end', signalData: reason || 'ended' } });
    console.log('[API customer-call/end] end signal created', { sessionId });
    const otherUserId = session.callerId === auth.userId ? session.receiverId : session.callerId;
    let summaryContent: string;
    if (isMissed) {
      summaryContent = 'تماس پاسخ داده نشد';
    } else {
      const mins = durationSeconds != null ? Math.floor(durationSeconds / 60) : 0;
      const secs = durationSeconds != null ? durationSeconds % 60 : 0;
      const pad = (n: number) => n.toString().padStart(2, '0').replace(/\d/g, (d: string) => '۰۱۲۳۴۵۶۷۸۹'[+d]);
      summaryContent = `تماس پایان یافت — مدت: ${mins.toLocaleString('fa-IR')}:${pad(secs)}`;
    }
    await prisma.customerSocialMessage.create({
      data: {
        senderId: auth.userId,
        receiverId: otherUserId,
        content: summaryContent,
        attachmentType: 'call_log',
      },
    });
    return NextResponse.json({ data: { id: updated.id, status: updated.status } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
