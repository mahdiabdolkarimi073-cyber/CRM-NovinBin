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
    console.error('[API call/end] Unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { sessionId, reason, recordingUrl } = body as { sessionId: string; reason?: string; recordingUrl?: string | null };
    console.log('[API call/end]', { userId: auth.userId, sessionId, reason, recordingUrl: !!recordingUrl });

    if (!sessionId) return NextResponse.json({ error: 'شناسه تماس الزامی است' }, { status: 400 });

    const session = await prisma.socialCallSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      console.error('[API call/end] session not found', sessionId);
      return NextResponse.json({ error: 'تماس یافت نشد' }, { status: 404 });
    }
    if (session.receiverId !== auth.userId && session.callerId !== auth.userId) {
      console.error('[API call/end] unauthorized', { userId: auth.userId });
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const now = new Date();
    let durationSeconds: number | null = null;
    if (session.startedAt) {
      durationSeconds = Math.floor((now.getTime() - session.startedAt.getTime()) / 1000);
    }

    const isMissed = reason === 'timeout' && !session.startedAt;
    const finalStatus = isMissed ? 'missed' : 'ended';
    console.log('[API call/end] computing final status', { sessionId, isMissed, finalStatus, durationSeconds });

    const updated = await prisma.socialCallSession.update({
      where: { id: sessionId },
      data: { status: finalStatus, endedAt: now, durationSeconds, endReason: reason || 'ended' },
    });
    console.log('[API call/end] session updated', { sessionId, finalStatus });

    // Save recording to call_logs
    if (!isMissed) {
      try {
        await prisma.callLog.create({
          data: {
            callerId: session.callerId,
            receiverId: session.receiverId,
            callType: session.callType,
            source: 'social',
            sessionId: sessionId,
            direction: 'outgoing',
            status: 'answered',
            durationSeconds: durationSeconds || 0,
            callDate: session.startedAt || session.createdAt,
            recordingUrl: recordingUrl || null,
            handledBy: auth.userId,
          },
        });
        console.log('[API call/end] call_log created', { sessionId, recordingUrl });
      } catch (logErr) {
        console.error('[API call/end] failed to create call_log', logErr);
      }
    }

    await prisma.socialCallSignal.create({
      data: {
        callSessionId: sessionId,
        senderId: auth.userId,
        receiverId: auth.userId === session.callerId ? session.receiverId : session.callerId,
        signalType: 'end',
        signalData: reason || 'ended',
      },
    });
    console.log('[API call/end] end signal created', { sessionId });

    const otherUserId = auth.userId === session.callerId ? session.receiverId : session.callerId;
    let summaryContent: string;
    if (isMissed) {
      summaryContent = 'تماس پاسخ داده نشد';
    } else {
      const mins = durationSeconds != null ? Math.floor(durationSeconds / 60) : 0;
      const secs = durationSeconds != null ? durationSeconds % 60 : 0;
      const pad = (n: number) => n.toString().padStart(2, '0').replace(/\d/g, (d: string) => '۰۱۲۳۴۵۶۷۸۹'[+d]);
      summaryContent = `تماس پایان یافت — مدت: ${mins.toLocaleString('fa-IR')}:${pad(secs)}`;
    }
    await prisma.socialDMMessage.create({
      data: {
        senderId: auth.userId,
        receiverId: otherUserId,
        content: summaryContent,
        attachmentType: 'call_log',
      },
    });

    return NextResponse.json({ session: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'خطای سرور' }, { status: 500 });
  }
}
